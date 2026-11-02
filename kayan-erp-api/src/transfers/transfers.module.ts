import { Module } from '@nestjs/common';
import { TransfersService } from './transfers.service.js';
import { TransfersController } from './transfers.controller.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  controllers: [TransfersController],
  providers: [TransfersService, RealtimeGateway],
  exports: [TransfersService],
})
export class TransfersModule {}
