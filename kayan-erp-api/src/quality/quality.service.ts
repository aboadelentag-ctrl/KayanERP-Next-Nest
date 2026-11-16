import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import {
  CreateInspectionDto,
  ReleaseQuarantineDto,
  CreateCcpLogDto,
  CreateNcrDto,
  CloseNcrDto,
} from './dto/quality.dto.js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class QualityService {
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

  // ==========================================
  // Quality Inspections (IQC, IPQC, OQC)
  // ==========================================

  async getAllInspections(companyId: string | number = 1, type?: string) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };
    if (type && type !== 'ALL') {
      where.inspection_type = type;
    }

    const inspections = await this.prisma.quality_inspections.findMany({
      where,
      include: {
        items: {
          select: { id: true, item_name: true, item_code: true, unit: true },
        },
        warehouses: {
          select: { id: true, warehouse_name: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const enriched = inspections.map((ins) => ({
      ...ins,
      itemName: ins.items?.item_name || 'غير محدد',
      itemCode: ins.items?.item_code || '',
      unit: ins.items?.unit || '',
      warehouseName: ins.warehouses?.warehouse_name || 'مستودع الاستلام',
      isQuarantine: ins.status === 'QUARANTINE' || ins.status === 'PENDING',
    }));

    return this.serializeBigInt(enriched);
  }

  async createInspection(dto: CreateInspectionDto) {
    const companyId = BigInt(dto.companyId || 1);
    const itemId = BigInt(dto.itemId);
    const warehouseId = dto.warehouseId ? BigInt(dto.warehouseId) : null;
    const prodOrderId = dto.productionOrderId ? BigInt(dto.productionOrderId) : null;

    // IQC (Incoming raw materials) default to QUARANTINE until laboratory approval
    const defaultStatus = dto.status || (dto.inspectionType === 'IQC' ? 'QUARANTINE' : 'PENDING');

    const created = await this.prisma.quality_inspections.create({
      data: {
        company_id: companyId,
        item_id: itemId,
        warehouse_id: warehouseId,
        production_order_id: prodOrderId,
        inspection_type: dto.inspectionType,
        quantity: new Decimal(dto.quantity),
        status: defaultStatus,
        result: dto.result || 'تحت الفحص المخبري والحجر الصحي',
        notes: dto.notes,
        IsGmpPassed: dto.isGmpPassed ?? true,
        IsHaccpPassed: dto.isHaccpPassed ?? true,
        IsWeightsPassed: dto.isWeightsPassed ?? true,
        QualityScore: new Decimal(dto.qualityScore || 100),
        InspectorName: dto.inspectorName || 'فني ضبط الجودة',
      },
      include: {
        items: { select: { item_name: true, item_code: true } },
      },
    });

    this.realtime.emitEvent('quality_inspection_created', {
      id: created.id.toString(),
      type: created.inspection_type,
      status: created.status,
    });

    return this.serializeBigInt(created);
  }

  async releaseQuarantine(id: string | number, dto: ReleaseQuarantineDto) {
    const inspId = BigInt(id);
    const inspection = await this.prisma.quality_inspections.findUnique({
      where: { id: inspId },
    });
    if (!inspection) throw new NotFoundException('سجل فحص الجودة غير موجود');

    const updated = await this.prisma.quality_inspections.update({
      where: { id: inspId },
      data: {
        status: dto.status, // PASSED / REJECTED
        result: dto.result,
        InspectorName: dto.inspectorName || inspection.InspectorName,
        QualityScore: dto.qualityScore ? new Decimal(dto.qualityScore) : inspection.QualityScore,
        notes: dto.notes ? `${inspection.notes || ''} | إفراج حجر: ${dto.notes}` : inspection.notes,
      },
    });

    this.realtime.emitEvent('quarantine_released', {
      id: inspId.toString(),
      status: dto.status,
      result: dto.result,
    });

    return this.serializeBigInt(updated);
  }

  // ==========================================
  // CCP Telemetry & Monitoring (HACCP)
  // ==========================================

  async getCcpLogs(companyId: string | number = 1, ccpPointCode?: string) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };
    if (ccpPointCode && ccpPointCode !== 'ALL') {
      where.ccp_point_code = ccpPointCode;
    }

    const logs = await this.prisma.ccp_logs.findMany({
      where,
      orderBy: { checked_at: 'desc' },
      take: 100,
    });

    return this.serializeBigInt(logs);
  }

  async logCcpReading(dto: CreateCcpLogDto) {
    const companyId = BigInt(dto.companyId || 1);

    // Calculate critical deviation
    let isDeviation = false;
    if (dto.valueNumeric !== undefined && dto.valueNumeric !== null) {
      if (dto.criticalLimitMin !== undefined && dto.valueNumeric < dto.criticalLimitMin) {
        isDeviation = true;
      }
      if (dto.criticalLimitMax !== undefined && dto.valueNumeric > dto.criticalLimitMax) {
        isDeviation = true;
      }
    }

    const log = await this.prisma.ccp_logs.create({
      data: {
        company_id: companyId,
        ccp_point_code: dto.ccpPointCode,
        ccp_point_name: dto.ccpPointName,
        reading_type: dto.readingType,
        value_numeric: dto.valueNumeric !== undefined ? new Decimal(dto.valueNumeric) : null,
        value_text: dto.valueText || null,
        critical_limit_min: dto.criticalLimitMin !== undefined ? new Decimal(dto.criticalLimitMin) : null,
        critical_limit_max: dto.criticalLimitMax !== undefined ? new Decimal(dto.criticalLimitMax) : null,
        is_deviation: isDeviation,
        checked_by: dto.checkedBy || 'مراقب سلامة الغذاء',
        corrective_action_taken: dto.correctiveActionTaken,
      },
    });

    // If deviation detected, automatically create an AMS Task with Critical Priority!
    if (isDeviation) {
      const taskCode = `AMS-CCP-${Date.now().toString().slice(-6)}`;
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 1); // 1 hour SLA for CCP critical deviation

      await this.prisma.ams_tasks.create({
        data: {
          company_id: companyId,
          task_code: taskCode,
          title: `حيود حرجة في نقطة التحكم: ${dto.ccpPointName} (${dto.ccpPointCode})`,
          description: `تم رصد قراءة ${dto.valueNumeric} وهي خارج الحدود الحرجة المسموحة (${dto.criticalLimitMin || '-'} إلى ${dto.criticalLimitMax || '-'}). يلزم اتخاذ إجراء تصحيحي فوري.`,
          task_type: 'CCP_DEVIATION',
          priority: 'CRITICAL',
          assignee_name: 'مدير الجودة والسلامة الغذائية',
          sla_deadline: deadline,
          escalation_level: 1,
          status: 'PENDING',
          whatsapp_status: 'PENDING_DISPATCH',
        },
      });

      this.realtime.emitEvent('ccp_deviation_detected', {
        pointCode: dto.ccpPointCode,
        pointName: dto.ccpPointName,
        value: dto.valueNumeric,
        taskCode,
      });
    }

    this.realtime.emitEvent('ccp_reading_logged', {
      id: log.id.toString(),
      pointCode: log.ccp_point_code,
      isDeviation,
    });

    return this.serializeBigInt(log);
  }

  // ==========================================
  // Non-Conformance Reports (NCR)
  // ==========================================

  async getAllNcrs(companyId: string | number = 1) {
    const ncrs = await this.prisma.non_conformance_reports.findMany({
      where: { company_id: BigInt(companyId) },
      orderBy: { created_at: 'desc' },
    });

    const itemIds = Array.from(new Set(ncrs.map((n) => n.item_id).filter(Boolean))) as bigint[];
    const items = await this.prisma.items.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, item_name: true, item_code: true },
    });
    const itemMap = new Map(items.map((i) => [i.id.toString(), i]));

    const enriched = ncrs.map((n) => ({
      ...n,
      itemName: n.item_id ? itemMap.get(n.item_id.toString())?.item_name || 'غير محدد' : 'عام',
    }));

    return this.serializeBigInt(enriched);
  }

  async createNcr(dto: CreateNcrDto) {
    const companyId = BigInt(dto.companyId || 1);
    const itemId = dto.itemId ? BigInt(dto.itemId) : null;

    const ncr = await this.prisma.non_conformance_reports.create({
      data: {
        company_id: companyId,
        ncr_number: dto.ncrNumber,
        source_type: dto.sourceType,
        item_id: itemId,
        batch_number: dto.batchNumber,
        defect_title: dto.defectTitle,
        defect_description: dto.defectDescription,
        root_cause_analysis: dto.rootCauseAnalysis,
        disposition: dto.disposition || 'SCRAP',
        status: 'OPEN',
        reported_by: dto.reportedBy || 'مفتش الجودة',
      },
    });

    // Create corresponding AMS Task for tracking
    const taskCode = `AMS-NCR-${Date.now().toString().slice(-6)}`;
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 24); // 24 hours SLA for NCR resolution

    await this.prisma.ams_tasks.create({
      data: {
        company_id: companyId,
        task_code: taskCode,
        title: `تقرير عدم مطابقة: ${dto.defectTitle} (${dto.ncrNumber})`,
        description: dto.defectDescription,
        task_type: 'QUALITY_NCR',
        priority: 'HIGH',
        assignee_name: 'رئيس قسم ضبط الجودة',
        sla_deadline: deadline,
        escalation_level: 1,
        status: 'PENDING',
        whatsapp_status: 'PENDING_DISPATCH',
      },
    });

    this.realtime.emitEvent('ncr_created', {
      id: ncr.id.toString(),
      ncrNumber: ncr.ncr_number,
      title: ncr.defect_title,
    });

    return this.serializeBigInt(ncr);
  }

  async closeNcr(id: string | number, dto: CloseNcrDto) {
    const nId = BigInt(id);
    const updated = await this.prisma.non_conformance_reports.update({
      where: { id: nId },
      data: {
        status: 'CLOSED',
        closed_at: new Date(),
        root_cause_analysis: dto.rootCauseAnalysis,
        disposition: dto.disposition,
      },
    });

    this.realtime.emitEvent('ncr_closed', { id: nId.toString(), ncrNumber: updated.ncr_number });
    return this.serializeBigInt(updated);
  }
}
