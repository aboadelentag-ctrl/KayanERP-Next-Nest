import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import {
  CreateMaintenanceTicketDto,
  UpdateTicketStepDto,
  QaClearanceDto,
  CloseTicketDto,
} from './dto/engineering.dto.js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class UnifiedMaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (obj instanceof Decimal) return Number(obj);
    if (Array.isArray(obj)) return obj.map((item) => this.serializeBigInt(item));
    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const res: any = {};
      for (const key of Object.keys(obj)) {
        res[key] = this.serializeBigInt(obj[key]);
      }
      return res;
    }
    return obj;
  }

  // 1. جلب قائمة تذاكر الصيانة والمهام الطارئة
  async getTickets(
    companyId: string | number = 1,
    query?: { status?: string; priority?: string; sourceType?: string; workshopId?: string; search?: string },
  ) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query?.priority && query.priority !== 'ALL') {
      where.priority = query.priority;
    }
    if (query?.sourceType && query.sourceType !== 'ALL') {
      where.source_type = query.sourceType;
    }
    if (query?.workshopId && query.workshopId !== 'ALL') {
      where.workshop_id = BigInt(query.workshopId);
    }
    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { ticket_number: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } },
        { assigned_staff_name: { contains: s, mode: 'insensitive' } },
      ];
    }

    const tickets = await this.prisma.maintenance_tickets.findMany({
      where,
      include: {
        engineering_assets: true,
        engineering_workshops: true,
        maintenance_workflow_routes: true,
        engineering_staff: true,
        material_issuance_logs: {
          include: { engineering_materials: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 80,
    });

    return this.serializeBigInt({
      success: true,
      data: tickets,
    });
  }

  // 2. إنشاء بلاغ صيانة أو مهمة طارئة موحدة
  async createTicket(dto: CreateMaintenanceTicketDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const ticketNumber = `MNT-${Date.now().toString().slice(-6)}`;

    const assetId = dto.assetId ? BigInt(dto.assetId) : null;
    let workshopId = dto.workshopId ? BigInt(dto.workshopId) : null;
    let routeId = dto.routeId ? BigInt(dto.routeId) : null;

    // توجيه ذكي للورشة حسب نوع الأصل إذا لم يتم تحديدها يدوياً
    if (!workshopId && assetId) {
      const asset = await this.prisma.engineering_assets.findFirst({
        where: { id: assetId, company_id: cid },
      });
      if (asset) {
        if (asset.category === 'RETAIL_REFRIGERATION' || asset.category === 'FLEET_COOLING') {
          const hvacWorkshop = await this.prisma.engineering_workshops.findFirst({
            where: { company_id: cid, specialty_type: 'HVAC_COOLING' },
          });
          if (hvacWorkshop) workshopId = hvacWorkshop.id;
        } else if (asset.category === 'FURNITURE_TROLLEY') {
          const weldWorkshop = await this.prisma.engineering_workshops.findFirst({
            where: { company_id: cid, specialty_type: 'WELDING_FABRICATION' },
          });
          if (weldWorkshop) workshopId = weldWorkshop.id;
        }
      }
    }

    // استخراج المسار الافتراضي للورشة إن وُجد
    let firstStepName = 'فحص العطل وتحديد الاحتياجات';
    const slaMinutes = dto.slaMinutes || (dto.priority === 'CRITICAL' ? 30 : 60);

    if (workshopId && !routeId) {
      const defaultRoute = await this.prisma.maintenance_workflow_routes.findFirst({
        where: { company_id: cid, workshop_id: workshopId, is_active: true },
      });
      if (defaultRoute) {
        routeId = defaultRoute.id;
        const steps = defaultRoute.steps_json as any[];
        if (Array.isArray(steps) && steps.length > 0) {
          firstStepName = steps[0].name || steps[0].title || firstStepName;
        }
      }
    }

    const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000);

    // التحقق من اشتراط سلامة الغذاء (إذا كان الأصل في صالة إنتاج أو تم تفعيله صراحة)
    let requiresQa = dto.requiresQaClearance ?? false;
    if (assetId) {
      const asset = await this.prisma.engineering_assets.findFirst({
        where: { id: assetId },
      });
      if (asset?.category === 'PRODUCTION_LINE') {
        requiresQa = true; // إلزامي لماكينات خطوط الإنتاج الغذائي
      }
    }

    const ticket = await this.prisma.maintenance_tickets.create({
      data: {
        company_id: cid,
        ticket_number: ticketNumber,
        title: dto.title,
        description: dto.description,
        source_type: dto.sourceType || 'EMERGENCY_BREAKDOWN',
        priority: dto.priority || 'NORMAL',
        asset_id: assetId,
        workshop_id: workshopId,
        route_id: routeId,
        assigned_staff_id: dto.assignedStaffId ? BigInt(dto.assignedStaffId) : null,
        assigned_staff_name: dto.assignedStaffName,
        status: 'PENDING',
        current_step_index: 0,
        current_step_name: firstStepName,
        sla_minutes: slaMinutes,
        sla_deadline: slaDeadline,
        requires_qa_clearance: requiresQa,
        steps_progress_json: [
          {
            stepIndex: 0,
            stepName: firstStepName,
            status: 'INITIALIZED',
            timestamp: new Date().toISOString(),
          },
        ],
      },
      include: {
        engineering_assets: true,
        engineering_workshops: true,
      },
    });

    // تحديث حالة الأصل إلى قيد الصيانة
    if (assetId) {
      await this.prisma.engineering_assets.update({
        where: { id: assetId },
        data: { status: 'UNDER_MAINTENANCE' },
      });
    }

    // إرسال تنبيه في الوقت الحقيقي
    try {
      this.realtime?.server?.emit('maintenance:ticket_created', {
        ticketNumber,
        title: dto.title,
        priority: dto.priority,
        timestamp: new Date(),
      });
    } catch (e) {
      // ignore
    }

    return this.serializeBigInt({
      success: true,
      message: `تم فتح بلاغ الصيانة بنجاح برقم ${ticketNumber}`,
      data: ticket,
    });
  }

  // 3. التقدم في خطوات مسار الصيانة الديناميكي
  async advanceStep(ticketId: string | number, dto: UpdateTicketStepDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const tId = BigInt(ticketId);

    const ticket = await this.prisma.maintenance_tickets.findFirst({
      where: { id: tId, company_id: cid },
    });

    if (!ticket) {
      throw new NotFoundException('أمر الصيانة غير موجود');
    }

    const progress = (ticket.steps_progress_json as any[]) || [];
    progress.push({
      stepIndex: dto.stepIndex,
      stepName: dto.stepName,
      notes: dto.notes,
      timestamp: new Date().toISOString(),
    });

    // فحص ما إذا كانت الخطوة تتطلب انتظار اعتماد الجودة
    let newStatus = 'IN_PROGRESS';
    if (ticket.requires_qa_clearance && !ticket.qa_cleared_at && dto.stepIndex >= 3) {
      newStatus = 'PENDING_QA_CLEARANCE';
    }

    const updated = await this.prisma.maintenance_tickets.update({
      where: { id: tId },
      data: {
        current_step_index: dto.stepIndex,
        current_step_name: dto.stepName || ticket.current_step_name,
        status: newStatus,
        steps_progress_json: progress,
      },
    });

    // تحديث حالة الأصل إذا كانت بانتظار توقيع الجودة
    if (newStatus === 'PENDING_QA_CLEARANCE' && ticket.asset_id) {
      await this.prisma.engineering_assets.update({
        where: { id: ticket.asset_id },
        data: { status: 'PENDING_QA_CLEARANCE' },
      });
    }

    return this.serializeBigInt({
      success: true,
      message: `تم الانتقال إلى خطوة: ${dto.stepName || dto.stepIndex}`,
      data: updated,
    });
  }

  // 4. بروتوكول اعتماد سلامة الغذاء (Food Safety Clearance QMS)
  async qaClearance(ticketId: string | number, dto: QaClearanceDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const tId = BigInt(ticketId);

    const ticket = await this.prisma.maintenance_tickets.findFirst({
      where: { id: tId, company_id: cid },
    });

    if (!ticket) {
      throw new NotFoundException('أمر الصيانة غير موجود');
    }

    const updated = await this.prisma.maintenance_tickets.update({
      where: { id: tId },
      data: {
        qa_cleared_at: new Date(),
        qa_cleared_by_name: dto.qaClearedByName,
        qa_cleared_by_id: dto.qaClearedById ? BigInt(dto.qaClearedById) : null,
        status: 'IN_PROGRESS', // تصريح الجودة تم، يمكن الإغلاق
      },
    });

    // في حال الأصل كان معلقاً، يُصبح جاهزاً للتشغيل
    if (ticket.asset_id) {
      await this.prisma.engineering_assets.update({
        where: { id: ticket.asset_id },
        data: { status: 'OPERATIONAL' },
      });
    }

    return this.serializeBigInt({
      success: true,
      message: `تم توقيع واعتماد سلامة الغذاء بنجاح بواسطة ${dto.qaClearedByName}`,
      data: updated,
    });
  }

  // 5. إغلاق أمر الصيانة وحساب زمن التوقف التراكمي وتكلفة الصيانة
  async closeTicket(ticketId: string | number, dto: CloseTicketDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const tId = BigInt(ticketId);

    const ticket = await this.prisma.maintenance_tickets.findFirst({
      where: { id: tId, company_id: cid },
    });

    if (!ticket) {
      throw new NotFoundException('أمر الصيانة غير موجود');
    }

    // فحص قفل سلامة الغذاء الإلزامي
    if (ticket.requires_qa_clearance && !ticket.qa_cleared_at) {
      throw new BadRequestException(
        'قفل سلامة الغذاء مفعل! لا يمكن إغلاق أمر الصيانة ولا تشغيل الماكينة إلا بعد توقيع مفتش الجودة (QMS Food Safety Sign-off).'
      );
    }

    const downtime = dto.downtimeMinutes ?? ticket.downtime_minutes ?? 0;
    const finalCost = new Decimal(dto.totalCost || ticket.total_cost || 0);

    const updated = await this.prisma.maintenance_tickets.update({
      where: { id: tId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        downtime_minutes: downtime,
        closure_notes: dto.closureNotes,
        total_cost: finalCost,
      },
    });

    // إعادة الأصل لحالة التشغيل الكامل وتراكم تكلفة الصيانة
    if (ticket.asset_id) {
      await this.prisma.engineering_assets.update({
        where: { id: ticket.asset_id },
        data: {
          status: 'OPERATIONAL',
          total_maintenance_cost: { increment: finalCost },
        },
      });
    }

    return this.serializeBigInt({
      success: true,
      message: `تم إغلاق البلاغ بنجاح وإعادة تشغيل الأصل (زمن التوقف: ${downtime} دقيقة)`,
      data: updated,
    });
  }

  // 6. مؤشرات زمن التوقف (Downtime) وتأثيره على كفاءة المعدات OEE
  async getDowntimeAndOeeMetrics(companyId: string | number = 1) {
    const cid = BigInt(companyId);

    const tickets = await this.prisma.maintenance_tickets.findMany({
      where: { company_id: cid },
      include: { engineering_assets: true, engineering_workshops: true },
    });

    const totalDowntimeMinutes = tickets.reduce((acc, t) => acc + (t.downtime_minutes || 0), 0);
    const emergencyCount = tickets.filter((t) => t.source_type === 'EMERGENCY_BREAKDOWN').length;
    const pendingQaCount = tickets.filter((t) => t.status === 'PENDING_QA_CLEARANCE').length;
    const openCount = tickets.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;

    // حساب كفاءة المعدات التقديرية (OEE Availability Index)
    // بافتراض 30 يوم عمل × 16 ساعة تشغيل = 28,800 دقيقة تشغيلية
    const plannedOperatingMinutes = 28800;
    const availabilityRate = Math.max(
      65,
      Math.min(99.5, Number((((plannedOperatingMinutes - totalDowntimeMinutes) / plannedOperatingMinutes) * 100).toFixed(1)))
    );

    return this.serializeBigInt({
      success: true,
      data: {
        totalDowntimeMinutes,
        totalDowntimeHours: Number((totalDowntimeMinutes / 60).toFixed(1)),
        emergencyCount,
        pendingQaCount,
        openCount,
        availabilityRate,
        totalTickets: tickets.length,
      },
    });
  }
}
