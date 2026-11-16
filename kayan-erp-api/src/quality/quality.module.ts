import { Module } from '@nestjs/common';
import { QualityService } from './quality.service.js';
import { QualityController } from './quality.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeModule } from '../realtime.module.js';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
