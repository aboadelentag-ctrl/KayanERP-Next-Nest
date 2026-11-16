import { Module } from '@nestjs/common';
import { PayablesController } from './payables.controller.js';
import { PayablesService } from './payables.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  imports: [PrismaModule],
  controllers: [PayablesController],
  providers: [PayablesService, RealtimeGateway],
  exports: [PayablesService],
})
export class PayablesModule {}
