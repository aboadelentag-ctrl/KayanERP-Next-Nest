import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { BranchesService, CreateBranchDto, UpdateBranchDto } from './branches.service.js';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get('operations-summary')
  async getOperationsSummary() {
    return this.branchesService.getOperationsSummary();
  }

  @Get()
  async getAllBranches() {
    return this.branchesService.getAllBranches();
  }

  @Post()
  async createBranch(@Body() dto: CreateBranchDto) {
    return this.branchesService.createBranch(dto);
  }

  @Put(':id')
  async updateBranch(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.updateBranch(id, dto);
  }
}
