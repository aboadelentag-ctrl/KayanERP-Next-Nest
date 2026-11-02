import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { getCurrentTenant } from '../common/tenant.context.js';

export class CreateEmergencyTaskDto {
  title: string;
  description: string;
  senderDepartment: string;
  senderEmployeeCode?: string;
  senderEmployeeName?: string;
  targetDepartment: string;
  targetEmployeeName?: string;
  priority?: 'NORMAL' | 'URGENT' | 'CRITICAL';
  mediaType?: 'TEXT' | 'IMAGE' | 'VOICE';
  mediaUrl?: string;
  targetResolutionMinutes?: number;
  assetCode?: string;
}

export class DelegateTaskDto {
  assignedTechnicianCode: string;
  assignedTechnicianName: string;
  notes?: string;
  assignmentNotes?: string;
}

export class CompleteTaskDto {
  closureNotes?: string;
  notes?: string;
  closureProofMediaUrl?: string;
  closedBy?: string;
  costImpact?: string;
  sparePartsUsed?: string;
  rootCause?: string;
  downtimeMinutes?: number;
}

export { DelegateTaskDto as AssignTechnicianDto, CompleteTaskDto as CloseEmergencyTaskDto };

@Injectable()
export class EmergencyTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. استعراض كافة بلاغات الأعطال والطوارئ من Neon DB
  async getAll(status?: string, priority?: string, department?: string) {
    const where: any = {};
    if (status && status !== 'ALL' && status !== 'الكل') {
      where.status = status;
    }
    if (priority && priority !== 'ALL' && priority !== 'الكل') {
      where.priority = priority;
    }
    if (department && department !== 'ALL' && department !== 'الكل') {
      where.sender_department = department;
    }

    const tasks = await this.prisma.emergency_tasks.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 100,
    });

    const serialized = tasks.map((t: any) => ({
      id: String(t.id),
      taskNumber: t.task_number || `EMG-${t.id}`,
      title: t.title,
      description: t.description || '',
      senderDepartment: t.sender_department,
      senderEmployeeCode: t.sender_employee_code || '',
      senderEmployeeName: t.sender_employee_name || '',
      targetDepartment: t.target_department,
      targetEmployeeName: t.target_employee_name || '',
      assignedTechnicianCode: t.assigned_technician_code || '',
      assignedTechnicianName: t.assigned_technician_name || '',
      priority: t.priority || 'NORMAL',
      mediaType: t.media_type || 'TEXT',
      mediaUrl: t.media_url || null,
      status: t.status || 'PENDING',
      createdAt: t.created_at ? new Date(t.created_at).toISOString().slice(0, 16).replace('T', ' ') : '',
      targetResolutionMinutes: t.target_resolution_minutes || 30,
      respondedAt: t.responded_at ? new Date(t.responded_at).toISOString().slice(0, 16).replace('T', ' ') : null,
      completedAt: t.completed_at ? new Date(t.completed_at).toISOString().slice(0, 16).replace('T', ' ') : null,
      assetCode: t.asset_code || null,
      downtimeMinutes: t.downtime_minutes || 0,
      rootCause: t.root_cause || null,
      sparePartsUsed: t.spare_parts_used || null,
      closureNotes: t.closure_notes || null,
    }));

    return {
      success: true,
      data: serialized,
    };
  }

  async findAll(status?: string, priority?: string, department?: string) {
    return this.getAll(status, priority, department);
  }

  // 2. تفاصيل بلاغ محدد
  async findOne(id: string) {
    const parsedId = !isNaN(Number(id)) ? BigInt(id) : -1n;
    const task = await this.prisma.emergency_tasks.findFirst({
      where: {
        OR: [{ id: parsedId }, { task_number: id }],
      },
    });

    if (!task) {
      throw new NotFoundException(`بلاغ الطوارئ [${id}] غير موجود بقاعدة البيانات`);
    }

    return {
      success: true,
      data: {
        id: String(task.id),
        taskNumber: task.task_number,
        title: task.title,
        description: task.description,
        senderDepartment: task.sender_department,
        senderEmployeeName: task.sender_employee_name,
        targetDepartment: task.target_department,
        assignedTechnicianName: task.assigned_technician_name,
        priority: task.priority,
        status: task.status,
        createdAt: task.created_at ? new Date(task.created_at).toISOString().slice(0, 16).replace('T', ' ') : '',
        assetCode: task.asset_code,
        closureNotes: task.closure_notes,
        rootCause: task.root_cause,
      },
    };
  }

  // 3. إصدار بلاغ طوارئ جديد في Neon DB
  async create(dto: CreateEmergencyTaskDto) {
    if (!dto.title || !dto.senderDepartment || !dto.targetDepartment) {
      throw new BadRequestException('عنوان البلاغ والقسم الصادر والموجه إليه حقول إجبارية');
    }

    const taskNum = `EMG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const tenant = getCurrentTenant();
    const companyId = tenant?.companyId || 1n;

    const created = await this.prisma.emergency_tasks.create({
      data: {
        task_number: taskNum,
        title: dto.title.trim(),
        description: dto.description?.trim() || '',
        sender_department: dto.senderDepartment.trim(),
        sender_employee_code: dto.senderEmployeeCode || '',
        sender_employee_name: dto.senderEmployeeName || '',
        target_department: dto.targetDepartment.trim(),
        target_employee_name: dto.targetEmployeeName || '',
        priority: dto.priority || 'NORMAL',
        media_type: dto.mediaType || 'TEXT',
        media_url: dto.mediaUrl || null,
        target_resolution_minutes: dto.targetResolutionMinutes || 30,
        asset_code: dto.assetCode || null,
        status: 'PENDING',
        created_at: new Date(),
      },
    });

    this.realtime.emitTenantUpdate(companyId, 'emergency_task_created', {
      id: String(created.id),
      taskNumber: taskNum,
      title: dto.title,
      priority: dto.priority || 'NORMAL',
      senderDepartment: dto.senderDepartment,
    });

    return {
      success: true,
      message: `تم تسجيل بلاغ الطوارئ رقم [${taskNum}] وتوجيهه فوراً لقسم الصيانة`,
      data: {
        id: String(created.id),
        taskNumber: taskNum,
      },
    };
  }

  // 4. تكليف فني صيانة بالبلاغ (delegate)
  async delegate(id: string, dto: DelegateTaskDto) {
    const parsedId = !isNaN(Number(id)) ? BigInt(id) : -1n;
    const task = await this.prisma.emergency_tasks.findFirst({
      where: {
        OR: [{ id: parsedId }, { task_number: id }],
      },
    });

    if (!task) {
      throw new NotFoundException(`البلاغ غير موجود`);
    }

    await this.prisma.emergency_tasks.update({
      where: { id: task.id },
      data: {
        assigned_technician_code: dto.assignedTechnicianCode,
        assigned_technician_name: dto.assignedTechnicianName,
        assignment_notes: dto.assignmentNotes || dto.notes || '',
        status: 'IN_PROGRESS',
        responded_at: new Date(),
      },
    });

    return {
      success: true,
      message: `تم تكليف الفني [${dto.assignedTechnicianName}] بالبلاغ وبدء العمل الميداني`,
    };
  }

  async assignTechnician(dto: any) {
    return this.delegate(dto.taskId, dto);
  }

  // 5. استجابة وبدء المعاينة (respond)
  async respond(id: string) {
    const parsedId = !isNaN(Number(id)) ? BigInt(id) : -1n;
    const task = await this.prisma.emergency_tasks.findFirst({
      where: {
        OR: [{ id: parsedId }, { task_number: id }],
      },
    });

    if (!task) throw new NotFoundException('البلاغ غير موجود');

    await this.prisma.emergency_tasks.update({
      where: { id: task.id },
      data: {
        status: 'IN_PROGRESS',
        responded_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'تم إثبات استجابة الفني الميداني وبدء فحص العطل',
    };
  }

  // 6. إغلاق البلاغ وحل العطل (complete)
  async complete(id: string, dto: CompleteTaskDto) {
    const parsedId = !isNaN(Number(id)) ? BigInt(id) : -1n;
    const task = await this.prisma.emergency_tasks.findFirst({
      where: {
        OR: [{ id: parsedId }, { task_number: id }],
      },
    });

    if (!task) {
      throw new NotFoundException(`البلاغ غير موجود`);
    }

    await this.prisma.emergency_tasks.update({
      where: { id: task.id },
      data: {
        closure_notes: dto.closureNotes || dto.notes || '',
        closure_proof_media_url: dto.closureProofMediaUrl || null,
        closed_by: dto.closedBy || 'مدير الصيانة',
        cost_impact: dto.costImpact || '',
        spare_parts_used: dto.sparePartsUsed || '',
        root_cause: dto.rootCause || '',
        downtime_minutes: dto.downtimeMinutes || 0,
        status: 'RESOLVED',
        completed_at: new Date(),
      },
    });

    return {
      success: true,
      message: 'تم إغلاق البلاغ بنجاح وتوثيق الإصلاح وقطع الغيار المستخدمة',
    };
  }

  async closeTask(dto: any) {
    return this.complete(dto.taskId, dto);
  }
}
