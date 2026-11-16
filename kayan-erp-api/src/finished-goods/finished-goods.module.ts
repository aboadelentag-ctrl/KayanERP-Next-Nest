import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { FinishedGoodsController, FinishedGoodsLegacyController } from './finished-goods.controller.js';
import { FinishedGoodsService } from './finished-goods.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [FinishedGoodsController, FinishedGoodsLegacyController],
  providers: [FinishedGoodsService],
  exports: [FinishedGoodsService],
})
export class FinishedGoodsModule {}
