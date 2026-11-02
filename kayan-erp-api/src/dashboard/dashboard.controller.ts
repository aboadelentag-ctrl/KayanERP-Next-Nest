import { Controller, Get } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  async getExecutiveKpis() {
    return await this.dashboardService.getExecutiveKpis();
  }

  @Get('branch-performance')
  async getBranchPerformance() {
    return await this.dashboardService.getBranchPerformance();
  }

  @Get('production-throughput')
  async getProductionThroughput() {
    return await this.dashboardService.getProductionThroughput();
  }
}
