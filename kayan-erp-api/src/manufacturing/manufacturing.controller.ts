import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ManufacturingService } from './manufacturing.service.js';

@Controller('manufacturing')
export class ManufacturingController {
  constructor(private readonly service: ManufacturingService) {}

  @Get('lines')
  async getLines() {
    return await this.service.getProductionLines();
  }

  @Get('items')
  async getItems() {
    return await this.service.getProductionItems();
  }

  @Get('orders')
  async getOrders(@Query('status') status?: string) {
    return await this.service.getProductionOrders(status);
  }

  @Get('orders/:id')
  async getOrderById(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('معرف أمر التشغيل مطلوب');
    }
    return await this.service.getOrderDetails(id);
  }

  @Post('orders')
  async createOrder(@Body() body: any) {
    if (!body || !body.details || !Array.isArray(body.details) || body.details.length === 0) {
      throw new BadRequestException('يجب تحديد صنف واحد على الأقل داخل أمر التشغيل');
    }
    return await this.service.createProductionOrder(body);
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    if (!id || !status) {
      throw new BadRequestException('معرف أمر التشغيل والحالة الجديدة مطلوبان');
    }
    return await this.service.updateOrderStatus(id, status);
  }

  @Patch('stages/:id/status')
  async updateStageStatus(
    @Param('id') id: string,
    @Body() body: { status: string; producedQuantity?: number; notes?: string },
  ) {
    if (!id || !body || !body.status) {
      throw new BadRequestException('معرف المرحلة وحالتها مطلوبان');
    }
    return await this.service.updateStageStatus(id, body);
  }
}