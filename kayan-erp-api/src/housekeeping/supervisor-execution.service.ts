import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExecuteTaskDto } from './dto/housekeeping.dto.js';
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
export class SupervisorExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  async executeTask(companyId: bigint, dto: ExecuteTaskDto) {
    const zoneId = BigInt(dto.zoneId);
    const zone = await this.prisma.sanitation_zones.findFirst({
      where: { id: zoneId, company_id: companyId },
    });

    if (!zone) {
      throw new NotFoundException(`المنطقة برقم ${dto.zoneId} غير موجودة`);
    }

    // البحث عن العامل المحدد بالكود أو بالمعرف
    let worker: any = null;
    if (dto.workerId) {
      worker = await this.prisma.housekeeping_workers.findFirst({
        where: { id: BigInt(dto.workerId), company_id: companyId },
      });
    } else if (dto.workerCode) {
      worker = await this.prisma.housekeeping_workers.findFirst({
        where: { worker_code: dto.workerCode.trim(), company_id: companyId },
      });
    }

    // حساب نسبة الامتثال من قائمة الفحص
    let complianceScore = 100;
    if (Array.isArray(dto.checklistResultsJson) && dto.checklistResultsJson.length > 0) {
      const totalItems = dto.checklistResultsJson.length;
      const passedItems = dto.checklistResultsJson.filter((item: any) => item.passed === true).length;
      complianceScore = Math.round((passedItems / totalItems) * 100);
    }

    const taskNumber = `SSOP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    const taskLog = await this.prisma.sanitation_task_logs.create({
      data: {
        company_id: companyId,
        task_number: taskNumber,
        zone_id: zoneId,
        worker_id: worker ? worker.id : null,
        worker_code_snapshot: worker ? worker.worker_code : (dto.workerCode || 'غير محدد'),
        worker_name_snapshot: worker ? worker.full_name : (dto.workerName || 'عامل غير مسجل'),
        supervisor_id: dto.supervisorId ? BigInt(dto.supervisorId) : null,
        supervisor_name: dto.supervisorName || 'مشرف الإشراف الداخلي',
        task_type: dto.taskType || 'SCHEDULED_SSOP',
        checklist_results_json: dto.checklistResultsJson || [],
        before_photo_url: dto.beforePhotoUrl || null,
        after_photo_url: dto.afterPhotoUrl || null,
        gps_coordinates: dto.gpsCoordinates || null,
        compliance_score: new Prisma.Decimal(complianceScore),
        status: dto.status || 'COMPLETED_BY_SUPERVISOR',
        notes: dto.notes || null,
        completed_at: new Date(),
      },
      include: {
        sanitation_zones: true,
        housekeeping_workers: true,
      },
    });

    // تحديث تقييم أداء العامل تلقائياً
    if (worker) {
      const currentScore = Number(worker.performance_score || 100);
      const newScore = Math.min(100, Math.max(0, Math.round(currentScore * 0.7 + complianceScore * 0.3)));
      await this.prisma.housekeeping_workers.update({
        where: { id: worker.id },
        data: { performance_score: new Prisma.Decimal(newScore) },
      });
    }

    return serializeBigInt(taskLog);
  }

  async getTaskLogs(companyId: bigint, filters: {
    zoneId?: string;
    workerId?: string;
    status?: string;
    taskType?: string;
  }) {
    const where: any = { company_id: companyId };

    if (filters.zoneId) {
      where.zone_id = BigInt(filters.zoneId);
    }
    if (filters.workerId) {
      where.worker_id = BigInt(filters.workerId);
    }
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters.taskType && filters.taskType !== 'ALL') {
      where.task_type = filters.taskType;
    }

    const tasks = await this.prisma.sanitation_task_logs.findMany({
      where,
      include: {
        sanitation_zones: true,
        housekeeping_workers: true,
        maintenance_tickets: true,
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });

    return serializeBigInt(tasks);
  }

  async getTaskById(companyId: bigint, id: bigint) {
    const task = await this.prisma.sanitation_task_logs.findFirst({
      where: { id, company_id: companyId },
      include: {
        sanitation_zones: true,
        housekeeping_workers: true,
        maintenance_tickets: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`مهمة النظافة غير موجودة`);
    }

    return serializeBigInt(task);
  }

  async getDashboardMetrics(companyId: bigint) {
    const totalWorkers = await this.prisma.housekeeping_workers.count({
      where: { company_id: companyId, is_active: true },
    });

    const totalZones = await this.prisma.sanitation_zones.count({
      where: { company_id: companyId, is_active: true },
    });

    // مهام اليوم
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const completedToday = await this.prisma.sanitation_task_logs.count({
      where: {
        company_id: companyId,
        created_at: { gte: startOfDay },
        status: { in: ['COMPLETED_BY_SUPERVISOR', 'QA_VERIFIED'] },
      },
    });

    const pendingQa = await this.prisma.sanitation_task_logs.count({
      where: {
        company_id: companyId,
        status: 'COMPLETED_BY_SUPERVISOR',
      },
    });

    const failedReclean = await this.prisma.sanitation_task_logs.count({
      where: {
        company_id: companyId,
        status: 'FAILED_RECLEAN_REQUIRED',
      },
    });

    const lowStockSupplies = await this.prisma.sanitation_supplies.count({
      where: {
        company_id: companyId,
        is_active: true,
        current_stock: { lte: this.prisma.sanitation_supplies.fields.min_stock_level },
      },
    });

    // حساب متوسط الامتثال
    const recentTasks = await this.prisma.sanitation_task_logs.findMany({
      where: { company_id: companyId },
      select: { compliance_score: true },
      take: 50,
      orderBy: { created_at: 'desc' },
    });

    let avgCompliance = 98;
    if (recentTasks.length > 0) {
      const sum = recentTasks.reduce((acc, t) => acc + Number(t.compliance_score || 100), 0);
      avgCompliance = Math.round(sum / recentTasks.length);
    }

    return {
      totalWorkers,
      totalZones,
      completedToday,
      pendingQa,
      failedReclean,
      lowStockSupplies,
      avgCompliance,
    };
  }
}
