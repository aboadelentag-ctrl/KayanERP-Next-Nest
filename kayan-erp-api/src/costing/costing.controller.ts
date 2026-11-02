import { Controller, Get, Post, Body, Param, BadRequestException } from '@nestjs/common';
import { CostingService } from './costing.service.js';

// تعريف الـ DTO كـ class صريح لمنع خطأ TS1272 مع emitDecoratorMetadata
export class SimulatePricingDto {
  rawMaterialId?: string;
  rawMaterialName?: string;
  priceChangePercent?: number;
  newPrice?: number;
  targetMarginPercent?: number;
  materialAdjustments?: Array<{
    rawMaterialName: string;
    priceChangePercent?: number;
    newPrice?: number;
  }>;
}

@Controller('costing')
export class CostingController {
  constructor(private readonly costingService: CostingService) {}

  // 1. ملخص ربحية الأصناف وهوامش الربح
  @Get('margins-overview')
  async getMarginsOverview() {
    return await this.costingService.getMarginsOverview();
  }

  // 2. تحليل شجرة تكلفة معادلة صنف حلويات بالتفصيل
  @Get('recipes/:id/breakdown')
  async getRecipeBreakdown(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('معرف معادلة التصنيع مطلوب');
    }
    return await this.costingService.getRecipeBreakdown(id);
  }

  // 3. حساب التكلفة الفعلية لأمر تشغيل منفذ ومقارنتها بالمعياري
  @Get('production-orders/:id')
  async getProductionOrderCosting(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('معرف أمر التشغيل مطلوب');
    }
    return await this.costingService.getProductionOrderCosting(id);
  }

  // 4. محاكي تسعير تفاعلي لتحديد أسعار البيع الجديدة عند تغير أسعار الخامات
  @Post('pricing-lists/simulate')
  async simulatePricingImpact(@Body() body: SimulatePricingDto) {
    return await this.costingService.simulatePricingImpact(body);
  }
}
