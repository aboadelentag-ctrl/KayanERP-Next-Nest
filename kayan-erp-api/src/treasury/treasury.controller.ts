import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { TreasuryService, CreateTreasuryVoucherDto } from './treasury.service.js';

@Controller('treasury')
export class TreasuryController {
  constructor(private readonly treasuryService: TreasuryService) {}

  @Get('vouchers')
  async getVouchers(
    @Query('type') voucherType?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.treasuryService.findAll(voucherType, branchId);
  }

  @Get('stats')
  async getStats() {
    return this.treasuryService.getStats();
  }

  @Post('vouchers')
  async createVoucher(@Body() dto: CreateTreasuryVoucherDto) {
    return this.treasuryService.create(dto);
  }
}
