import { Module } from '@nestjs/common';
import { HousekeepingController } from './housekeeping.controller.js';
import { SupervisorExecutionService } from './supervisor-execution.service.js';
import { HousekeepingIntegrationService } from './housekeeping-integration.service.js';
import { HousekeepingMasterService } from './housekeeping-master.service.js';
import { HousekeepingExcelService } from './housekeeping-excel.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [HousekeepingController],
  providers: [
    SupervisorExecutionService,
    HousekeepingIntegrationService,
    HousekeepingMasterService,
    HousekeepingExcelService,
  ],
  exports: [
    SupervisorExecutionService,
    HousekeepingIntegrationService,
    HousekeepingMasterService,
    HousekeepingExcelService,
  ],
})
export class HousekeepingModule {}
