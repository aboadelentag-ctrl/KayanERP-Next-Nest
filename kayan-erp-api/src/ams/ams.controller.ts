import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { AmsService } from './ams.service.js';
import {
  CreateAmsTaskDto,
  ResolveAmsTaskDto,
  EscalateAmsTaskDto,
} from './dto/ams.dto.js';

@Controller('ams')
export class AmsController {
  constructor(private readonly amsService: AmsService) {}

  // 1. استعراض كافة تذاكر المهام التصحيحية
  @Get('tasks')
  async getAllTasks(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    return this.amsService.getAllTasks(companyId || 1, status);
  }

  // 2. إصدار تذكرة إجراء تصحيحي جديدة
  @Post('tasks')
  async createTask(@Body() body: CreateAmsTaskDto) {
    if (!body.taskCode || !body.title || !body.description || !body.taskType || !body.assigneeName) {
      throw new BadRequestException('كود المهمة، العنوان، الوصف، النوع والمسؤول حقول مطلوبة');
    }
    return this.amsService.createTask(body);
  }

  // 3. تصعيد التذكرة إلى المستوى الإداري التالي (Escalate Level 1 -> 2 -> 3)
  @Post('tasks/:id/escalate')
  async escalateTask(
    @Param('id') id: string,
    @Body() body: EscalateAmsTaskDto,
  ) {
    return this.amsService.escalateTask(id, body);
  }

  // 4. حل وإغلاق التذكرة
  @Post('tasks/:id/resolve')
  async resolveTask(
    @Param('id') id: string,
    @Body() body: ResolveAmsTaskDto,
  ) {
    if (!body.resolutionNotes) {
      throw new BadRequestException('ملاحظات وإجراءات الحل مطلوبة لإغلاق التذكرة');
    }
    return this.amsService.resolveTask(id, body);
  }

  // 5. إرسال تنبيه عبر WhatsApp
  @Post('tasks/:id/notify-whatsapp')
  async notifyWhatsApp(@Param('id') id: string) {
    return this.amsService.notifyWhatsApp(id);
  }
}
