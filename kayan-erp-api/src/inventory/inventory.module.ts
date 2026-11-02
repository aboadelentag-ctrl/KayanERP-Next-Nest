import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { InventoryController } from './inventory.controller.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, RealtimeGateway],
  exports: [InventoryService],
})
export class InventoryModule {}