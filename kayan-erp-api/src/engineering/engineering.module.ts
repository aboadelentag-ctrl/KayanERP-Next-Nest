import { Module } from '@nestjs/common';
import { EngineeringController } from './engineering.controller.js';
import { UnifiedMaintenanceService } from './unified-maintenance.service.js';
import { FabricationService } from './fabrication.service.js';
import { WorkflowConfigService } from './workflow-config.service.js';
import { EngineeringExcelService } from './engineering-excel.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  imports: [PrismaModule],
  controllers: [EngineeringController],
  providers: [
    UnifiedMaintenanceService,
    FabricationService,
    WorkflowConfigService,
    EngineeringExcelService,
    RealtimeGateway,
  ],
  exports: [
    UnifiedMaintenanceService,
    FabricationService,
    WorkflowConfigService,
    EngineeringExcelService,
  ],
})
export class EngineeringModule {}
