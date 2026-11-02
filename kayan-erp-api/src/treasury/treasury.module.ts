import { Module } from '@nestjs/common';
import { TreasuryService } from './treasury.service.js';
import { TreasuryController } from './treasury.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  imports: [PrismaModule],
  controllers: [TreasuryController],
  providers: [TreasuryService, RealtimeGateway],
  exports: [TreasuryService],
})
export class TreasuryModule {}
