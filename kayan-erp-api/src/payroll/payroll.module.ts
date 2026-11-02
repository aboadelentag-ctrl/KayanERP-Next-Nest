import { Module } from '@nestjs/common';
import { PayrollController } from './payroll.controller.js';
import { PayrollService } from './payroll.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { HrModule } from '../hr/hr.module.js';

@Module({
  imports: [PrismaModule, HrModule],
  controllers: [PayrollController],
  providers: [PayrollService, RealtimeGateway],
  exports: [PayrollService],
})
export class PayrollModule {}
