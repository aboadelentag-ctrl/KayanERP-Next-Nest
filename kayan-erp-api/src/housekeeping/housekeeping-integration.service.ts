import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConvertToMaintenanceDto, QaVerificationDto } from './dto/housekeeping.dto.js';
import { Prisma } from '@prisma/client';

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Prisma.Decimal) return Number(obj.toString());
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = serializeBigInt(obj[key]);
    }
    return res;
  }
  return obj;
}

@Injectable()
export class HousekeepingIntegrationService {
  constructor(private readonly prisma: PrismaService) {}

  async convertToMaintenanceTicket(companyId: bigint, dto: ConvertToMaintenanceDto) {
    const taskId = BigInt(dto.taskId);
    const task = await this.prisma.sanitation_task_logs.findFirst({
      where: { id: taskId, company_id: companyId },
      include: { sanitation_zones: true },
    });

    if (!task) {
      throw new NotFoundException(`مهمة النظافة غير موجودة`);
    }

    const ticketNumber = `ENG-HK-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
    const priority = dto.priority || 'NORMAL';
    const sourceType = priority === 'CRITICAL' || priority === 'HIGH' ? 'EMERGENCY_BREAKDOWN' : 'BRANCH_REQUEST';

    // إنشاء تذكرة الصيانة الموحدة
    const maintTicket = await this.prisma.maintenance_tickets.create({
      data: {
        company_id: companyId,
        ticket_number: ticketNumber,
        title: `بلاغ من الإشراف الداخلي: ${dto.title} (${task.sanitation_zones.name})`,
        description: `${dto.description}\n\n[تم الإبلاغ تلقائياً أثناء تفتيش النظافة بواسطة المشرف: ${dto.supervisorName || task.supervisor_name || 'مشرف النظافة'}]`,
        source_type: sourceType,
        priority: priority,
        workshop_id: dto.workshopId ? BigInt(dto.workshopId) : null,
        asset_id: dto.assetId ? BigInt(dto.assetId) : (task.sanitation_zones.linked_asset_id || null),
        status: 'PENDING',
        requires_qa_clearance: true, // صالات الأغذية تتطلب اعتماد الجودة بعد الصيانة
        sla_minutes: priority === 'CRITICAL' ? 30 : priority === 'HIGH' ? 60 : 120,
      },
    });

    // ربط التذكرة بمهمة النظافة
    const updatedTask = await this.prisma.sanitation_task_logs.update({
      where: { id: taskId },
      data: {
        linked_maintenance_ticket_id: maintTicket.id,
        notes: (task.notes ? task.notes + '\n' : '') + `[تم تحويل بلاغ صيانة رقم: ${ticketNumber}]`,
      },
      include: {
        sanitation_zones: true,
        maintenance_tickets: true,
      },
    });

    return {
      maintenanceTicket: serializeBigInt(maintTicket),
      task: serializeBigInt(updatedTask),
    };
  }

  async verifyTaskByQa(companyId: bigint, dto: QaVerificationDto) {
    const taskId = BigInt(dto.taskId);
    const task = await this.prisma.sanitation_task_logs.findFirst({
      where: { id: taskId, company_id: companyId },
    });

    if (!task) {
      throw new NotFoundException(`مهمة النظافة غير موجودة`);
    }

    const updatedTask = await this.prisma.sanitation_task_logs.update({
      where: { id: taskId },
      data: {
        status: dto.status,
        qa_verified_by_name: dto.qaVerifiedByName,
        qa_verified_by_id: dto.qaVerifiedById ? BigInt(dto.qaVerifiedById) : null,
        qa_verified_at: new Date(),
        qa_notes: dto.qaNotes || null,
      },
      include: {
        sanitation_zones: true,
        housekeeping_workers: true,
      },
    });

    // إذا فشل التطهير، خصم نقاط من تقييم العامل المنفذ
    if (dto.status === 'FAILED_RECLEAN_REQUIRED' && task.worker_id) {
      const worker = await this.prisma.housekeeping_workers.findFirst({
        where: { id: task.worker_id },
      });
      if (worker) {
        const currentScore = Number(worker.performance_score || 100);
        const penalizedScore = Math.max(0, currentScore - 15);
        await this.prisma.housekeeping_workers.update({
          where: { id: worker.id },
          data: { performance_score: new Prisma.Decimal(penalizedScore) },
        });
      }
    }

    return serializeBigInt(updatedTask);
  }

  async logFleetSanitization(companyId: bigint, data: {
    vehiclePlateNumber: string;
    fleetVehicleId?: string | number;
    workerCode: string;
    workerName?: string;
    supervisorName?: string;
    temperatureReading?: number;
    sanitizerUsed?: string;
    notes?: string;
    beforePhotoUrl?: string;
    afterPhotoUrl?: string;
  }) {
    // العثور على منطقة خاصة بالسيارات أو إنشاؤها تلقائياً
    let fleetZone = await this.prisma.sanitation_zones.findFirst({
      where: {
        company_id: companyId,
        environment_type: 'FLEET_VEHICLE',
      },
    });

    if (!fleetZone) {
      fleetZone = await this.prisma.sanitation_zones.create({
        data: {
          company_id: companyId,
          zone_code: 'ZN-FLEET-MAIN',
          name: 'شاحنات وسيارات التوزيع المبردة',
          environment_type: 'FLEET_VEHICLE',
          frequency_type: 'DAILY',
          checklist_items_json: [
            { id: 1, text: 'غسيل وتطهير أرضية الصندوق المبرد بمطهر غذائي معتمد', required: true },
            { id: 2, text: 'التأكد من خلو الصندوق من الروائح والشوائب والغبار', required: true },
            { id: 3, text: 'فحص سلامة كاوتش الأبواب وعوازل الحرارة', required: true },
            { id: 4, text: 'التأكد من جاهزية وحدة التبريد ودرجة الحرارة المستهدفة', required: true },
          ],
        },
      });
    }

    // البحث عن العامل
    const worker = await this.prisma.housekeeping_workers.findFirst({
      where: { worker_code: data.workerCode.trim(), company_id: companyId },
    });

    const taskNumber = `SSOP-FLEET-${Date.now().toString().slice(-6)}`;

    const task = await this.prisma.sanitation_task_logs.create({
      data: {
        company_id: companyId,
        task_number: taskNumber,
        zone_id: fleetZone.id,
        worker_id: worker ? worker.id : null,
        worker_code_snapshot: worker ? worker.worker_code : data.workerCode,
        worker_name_snapshot: worker ? worker.full_name : (data.workerName || 'سائق/عامل أسطول'),
        supervisor_name: data.supervisorName || 'مشرف تطهير الأسطول',
        task_type: 'FLEET_SANITIZATION',
        checklist_results_json: [
          { item: 'تطهير الصندوق الداخلي', passed: true },
          { item: `رقم اللوحة: ${data.vehiclePlateNumber}`, passed: true },
          { item: `درجة الحرارة: ${data.temperatureReading ?? '-'} °م`, passed: true },
        ],
        before_photo_url: data.beforePhotoUrl || null,
        after_photo_url: data.afterPhotoUrl || null,
        notes: `تطهير شاحنة مبردة (${data.vehiclePlateNumber}) - ${data.notes || ''}`,
        compliance_score: new Prisma.Decimal(100),
        status: 'COMPLETED_BY_SUPERVISOR',
        completed_at: new Date(),
      },
    });

    return serializeBigInt(task);
  }
}
