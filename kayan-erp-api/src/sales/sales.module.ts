import { Module } from '@nestjs/common';
import { SalesService } from './sales.service.js';
import { SalesController } from './sales.controller.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  controllers: [SalesController],
  providers: [SalesService, RealtimeGateway],
  exports: [SalesService],
})
export class SalesModule {}