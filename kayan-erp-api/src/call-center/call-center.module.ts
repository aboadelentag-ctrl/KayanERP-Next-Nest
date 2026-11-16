import { Module } from '@nestjs/common';
import { CallCenterController } from './call-center.controller.js';
import { CallCenterService } from './call-center.service.js';
import { ComplaintTraceabilityService } from './complaint-traceability.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  imports: [PrismaModule],
  controllers: [CallCenterController],
  providers: [CallCenterService, ComplaintTraceabilityService, RealtimeGateway],
  exports: [CallCenterService, ComplaintTraceabilityService],
})
export class CallCenterModule {}
