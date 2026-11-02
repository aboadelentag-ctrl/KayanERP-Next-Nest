import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { AssetsService, CreateFixedAssetDto, UpdateFixedAssetDto } from './assets.service.js';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  async getAll(
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
  ) {
    return this.assetsService.getAll(search, department, status);
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.assetsService.getHistory(id);
  }

  @Post()
  async create(@Body() dto: CreateFixedAssetDto) {
    return this.assetsService.create(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFixedAssetDto) {
    return this.assetsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.assetsService.delete(id);
  }
}
