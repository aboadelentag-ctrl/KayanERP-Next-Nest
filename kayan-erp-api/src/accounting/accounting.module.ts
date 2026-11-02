import { Module } from '@nestjs/common';
import { AccountingController } from './accounting.controller.js';
import { AccountingService } from './accounting.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  imports: [PrismaModule],
  controllers: [AccountingController],
  providers: [AccountingService, RealtimeGateway],
  exports: [AccountingService],
})
export class AccountingModule {}
