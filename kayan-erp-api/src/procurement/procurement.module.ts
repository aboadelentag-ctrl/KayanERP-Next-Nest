import { Module } from '@nestjs/common';
import { ProcurementService } from './procurement.service.js';
import { ProcurementController } from './procurement.controller.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  controllers: [ProcurementController],
  providers: [ProcurementService, RealtimeGateway],
  exports: [ProcurementService],
})
export class ProcurementModule {}
