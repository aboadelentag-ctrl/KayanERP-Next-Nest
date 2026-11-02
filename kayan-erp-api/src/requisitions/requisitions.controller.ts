import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import {
  RequisitionsService,
  CreateRequisitionDto,
  DispatchRequisitionDto,
  ReceiveLineItemDto,
  ResolveDiscrepancyDto,
} from './requisitions.service.js';

@Controller('requisitions')
export class RequisitionsController {
  constructor(private readonly requisitionsService: RequisitionsService) {}

  @Get('lookups')
  async getLookups() {
    return this.requisitionsService.getLookups();
  }

  @Get()
  async getAll(@Query('status') status?: string) {
    return this.requisitionsService.getAll(status);
  }

  @Get('fefo-suggestions')
  async getFefoSuggestions(
    @Query('itemId') itemId: string,
    @Query('warehouseId') warehouseId: string,
  ) {
    return this.requisitionsService.getFefoSuggestions(itemId, warehouseId);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.requisitionsService.getById(id);
  }

  @Post()
  async create(@Body() dto: CreateRequisitionDto) {
    return this.requisitionsService.create(dto);
  }

  @Post('dispatch')
  async dispatch(@Body() dto: DispatchRequisitionDto) {
    return this.requisitionsService.dispatch(dto);
  }

  @Post('receive-line')
  async receiveLine(@Body() dto: ReceiveLineItemDto) {
    return this.requisitionsService.receiveLine(dto);
  }

  @Post('resolve-discrepancy')
  async resolveDiscrepancy(@Body() dto: ResolveDiscrepancyDto) {
    return this.requisitionsService.resolveDiscrepancy(dto);
  }
}
