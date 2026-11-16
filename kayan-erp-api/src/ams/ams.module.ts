import { Module } from '@nestjs/common';
import { AmsService } from './ams.service.js';
import { AmsController } from './ams.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeModule } from '../realtime.module.js';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [AmsController],
  providers: [AmsService],
  exports: [AmsService],
})
export class AmsModule {}
