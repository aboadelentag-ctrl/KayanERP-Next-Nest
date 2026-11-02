import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [DashboardService, RealtimeGateway],
  exports: [DashboardService],
})
export class DashboardModule {}
