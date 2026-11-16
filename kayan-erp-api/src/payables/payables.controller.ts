import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PayablesService, CreatePayableDto } from './payables.service.js';

export class PayBillBodyDto {
  amount!: number;
}

@Controller('payables')
export class PayablesController {
  constructor(private readonly payablesService: PayablesService) {}

  @Get()
  async getAllPayables(@Query('category') category?: string, @Query('status') status?: string) {
    return await this.payablesService.getAllPayables(category, status);
  }

  @Get('summary')
  async getSummary() {
    return await this.payablesService.getSummary();
  }

  @Get('suppliers-lookup')
  async getSuppliersLookup() {
    return await this.payablesService.getSuppliersLookup();
  }

  @Post()
  async createPayable(@Body() body: CreatePayableDto) {
    return await this.payablesService.createPayable(body);
  }

  @Post(':id/pay')
  async payBill(@Param('id') id: string, @Body() body: PayBillBodyDto) {
    return await this.payablesService.payBill(id, body.amount);
  }
}
