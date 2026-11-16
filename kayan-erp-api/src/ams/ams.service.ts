import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import {
  CreateAmsTaskDto,
  ResolveAmsTaskDto,
  EscalateAmsTaskDto,
} from './dto/ams.dto.js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AmsService {
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

  async getAllTasks(companyId: string | number = 1, status?: string) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const tasks = await this.prisma.ams_tasks.findMany({
      where,
      orderBy: [
        { priority: 'asc' },
        { sla_deadline: 'asc' },
      ],
    });

    const now = new Date().getTime();

    const enriched = tasks.map((t) => {
      const deadline = new Date(t.sla_deadline).getTime();
      const remainingMs = deadline - now;
      const remainingMinutes = Math.round(remainingMs / 60000);
      const isOverdue = remainingMinutes < 0 && t.status !== 'RESOLVED';

      // Escalation role label
      let escalationRole = 'مشرف الوردية';
      if (t.escalation_level === 2) escalationRole = 'مدير الإدارة / الجودة';
      if (t.escalation_level >= 3) escalationRole = 'المدير العام / الإدارة التنفيذية';

      return {
        ...t,
        remainingMinutes,
        isOverdue,
        escalationRole,
      };
    });

    return this.serializeBigInt(enriched);
  }

  async createTask(dto: CreateAmsTaskDto) {
    const companyId = BigInt(dto.companyId || 1);

    // Calculate deadline based on priority if not given
    let deadline = dto.slaDeadline ? new Date(dto.slaDeadline) : new Date();
    if (!dto.slaDeadline) {
      const mins = dto.slaMinutes || (
        dto.priority === 'CRITICAL' ? 60 :
        dto.priority === 'HIGH' ? 240 :
        dto.priority === 'MEDIUM' ? 720 : 1440
      );
      deadline = new Date(Date.now() + mins * 60000);
    }

    const task = await this.prisma.ams_tasks.create({
      data: {
        company_id: companyId,
        task_code: dto.taskCode,
        title: dto.title,
        description: dto.description,
        task_type: dto.taskType,
        priority: dto.priority || 'HIGH',
        assignee_name: dto.assigneeName,
        assignee_phone: dto.assigneePhone || null,
        sla_deadline: deadline,
        escalation_level: dto.escalationLevel || 1,
        status: 'PENDING',
        whatsapp_status: 'PENDING_DISPATCH',
      },
    });

    this.realtime.emitEvent('ams_task_created', {
      id: task.id.toString(),
      code: task.task_code,
      title: task.title,
      priority: task.priority,
    });

    return this.serializeBigInt(task);
  }

  async escalateTask(id: string | number, dto: EscalateAmsTaskDto) {
    const taskId = BigInt(id);
    const task = await this.prisma.ams_tasks.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('التذكرة غير موجودة');

    const nextLevel = Math.min(3, task.escalation_level + 1);
    let nextAssignee = task.assignee_name;
    if (nextLevel === 2) nextAssignee = dto.newAssigneeName || 'مدير عام الجودة والعمليات';
    if (nextLevel === 3) nextAssignee = dto.newAssigneeName || 'الإدارة العليا والمكتب الفني';

    const updated = await this.prisma.ams_tasks.update({
      where: { id: taskId },
      data: {
        escalation_level: nextLevel,
        status: 'ESCALATED',
        assignee_name: nextAssignee,
        assignee_phone: dto.newAssigneePhone || task.assignee_phone,
        whatsapp_status: 'PENDING_DISPATCH', // Re-dispatch alert for escalated level
      },
    });

    this.realtime.emitEvent('ams_task_escalated', {
      id: taskId.toString(),
      code: task.task_code,
      level: nextLevel,
      assignee: nextAssignee,
    });

    return this.serializeBigInt(updated);
  }

  async resolveTask(id: string | number, dto: ResolveAmsTaskDto) {
    const taskId = BigInt(id);
    const updated = await this.prisma.ams_tasks.update({
      where: { id: taskId },
      data: {
        status: 'RESOLVED',
        resolution_notes: dto.resolutionNotes,
        resolved_at: new Date(),
      },
    });

    this.realtime.emitEvent('ams_task_resolved', {
      id: taskId.toString(),
      code: updated.task_code,
    });

    return this.serializeBigInt(updated);
  }

  async notifyWhatsApp(id: string | number) {
    const taskId = BigInt(id);
    const task = await this.prisma.ams_tasks.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new NotFoundException('التذكرة غير موجودة');

    // Simulate sending WhatsApp dispatch payload
    const updated = await this.prisma.ams_tasks.update({
      where: { id: taskId },
      data: {
        whatsapp_status: 'SENT',
      },
    });

    this.realtime.emitEvent('ams_whatsapp_dispatched', {
      id: taskId.toString(),
      code: task.task_code,
      recipient: task.assignee_name,
    });

    return {
      success: true,
      message: `تم إرسال إشعار WhatsApp للمسؤول: ${task.assignee_name}`,
      task: this.serializeBigInt(updated),
    };
  }
}
