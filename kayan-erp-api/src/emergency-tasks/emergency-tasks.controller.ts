import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import {
  EmergencyTasksService,
  CreateEmergencyTaskDto,
  DelegateTaskDto,
  CompleteTaskDto,
} from './emergency-tasks.service.js';

@Controller('emergency-tasks')
export class EmergencyTasksController {
  constructor(private readonly tasksService: EmergencyTasksService) {}

  @Get()
  async getAll(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.tasksService.getAll(status, priority);
  }

  @Post()
  async create(@Body() dto: CreateEmergencyTaskDto) {
    return this.tasksService.create(dto);
  }

  @Post(':id/delegate')
  async delegate(@Param('id') id: string, @Body() dto: DelegateTaskDto) {
    return this.tasksService.delegate(id, dto);
  }

  @Post(':id/respond')
  async respond(@Param('id') id: string) {
    return this.tasksService.respond(id);
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @Body() dto: CompleteTaskDto) {
    return this.tasksService.complete(id, dto);
  }
}
