import { Module } from '@nestjs/common';
import { EmergencyTasksController } from './emergency-tasks.controller.js';
import { EmergencyTasksService } from './emergency-tasks.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [EmergencyTasksController],
  providers: [EmergencyTasksService],
  exports: [EmergencyTasksService],
})
export class EmergencyTasksModule {}
