import { Module } from '@nestjs/common';
import { MesService } from './mes.service.js';
import { MesController } from './mes.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RealtimeModule } from '../realtime.module.js';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [MesController],
  providers: [MesService],
  exports: [MesService],
})
export class MesModule {}
