import { Module } from '@nestjs/common';
import { CratesService } from './crates.service.js';
import { CratesController } from './crates.controller.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  controllers: [CratesController],
  providers: [CratesService, RealtimeGateway],
  exports: [CratesService],
})
export class CratesModule {}
