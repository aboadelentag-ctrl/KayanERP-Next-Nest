import { Module } from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service.js';
import { ManufacturingController } from './manufacturing.controller.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  controllers: [ManufacturingController],
  providers: [ManufacturingService, RealtimeGateway],
  exports: [ManufacturingService],
})
export class ManufacturingModule {}