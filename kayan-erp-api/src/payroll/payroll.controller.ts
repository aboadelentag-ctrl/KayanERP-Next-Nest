import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { PayrollService } from './payroll.service.js';

export class CalculatePayrollDto {
  month?: number;
  year?: number;
}

export class GeneratePayrollDto {
  month!: number;
  year!: number;
  approvedBy?: string;
  notes?: string;
}

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get('calculate')
  async calculatePayroll(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const m = month ? parseInt(month, 10) : undefined;
    const y = year ? parseInt(year, 10) : undefined;
    return await this.payrollService.calculatePayroll(m, y);
  }

  @Post('generate')
  async generatePayroll(@Body() body: GeneratePayrollDto) {
    if (!body || !body.month || !body.year) {
      throw new BadRequestException('الشهر والسنة مطلوبان لاعتماد وإصدار المسير المالي');
    }
    return await this.payrollService.generatePayroll(body);
  }

  @Get('periods')
  async getPayrollPeriods() {
    return await this.payrollService.getPayrollPeriods();
  }
}
