import { Controller, Get, Post, Body, Query, Req } from '@nestjs/common';
import { FinishedGoodsService } from './finished-goods.service.js';
import {
  CreateFinishedGoodsTransferDto,
  CostingAuditDto,
  ResolveCostingDisputeDto,
  QcInspectionDto,
  ControlReceiptDto,
  ResolveControlDisputeDto,
  ResubmitReworkDto,
} from './dto/finished-goods.dto.js';

@Controller('finished-goods-transfers')
export class FinishedGoodsController {
  constructor(private readonly service: FinishedGoodsService) {}

  @Get()
  async getAll(@Query('status') status?: string, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.getAll(companyId, status);
  }

  @Get('lookups')
  async getLookups(@Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.getLookups(companyId);
  }

  @Get('order-balance/:orderId')
  async getOrderBalance(@Query('orderId') queryId?: string, @Req() req?: any) {
    const orderId = req?.params?.orderId || queryId;
    return await this.service.getProductionOrderBalance(orderId);
  }

  @Post()
  async createTransfer(@Body() dto: CreateFinishedGoodsTransferDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.createTransfer(dto, companyId);
  }

  @Post('create')
  async createTransferAlias(@Body() dto: CreateFinishedGoodsTransferDto, @Req() req?: any) {
    return await this.createTransfer(dto, req);
  }

  @Post('audit-costing')
  async auditCosting(@Body() dto: CostingAuditDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.auditCosting(dto, companyId);
  }

  @Post('resolve-costing-dispute')
  async resolveCostingDispute(@Body() dto: ResolveCostingDisputeDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.resolveCostingDispute(dto, companyId);
  }

  @Post('inspect-qc')
  async inspectQc(@Body() dto: QcInspectionDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.inspectQc(dto, companyId);
  }

  @Post('resubmit-rework')
  async resubmitRework(@Body() dto: ResubmitReworkDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.resubmitRework(dto, companyId);
  }

  @Post('re-submit-rework')
  async resubmitReworkAlias(
    @Body() dto: ResubmitReworkDto,
    @Query('transferId') transferId?: string,
    @Query('adjustedQty') adjustedQty?: string,
    @Query('adjustedCount') adjustedCount?: string,
    @Query('notes') notes?: string,
    @Req() req?: any,
  ) {
    const payload: ResubmitReworkDto = {
      transferId: dto.transferId || transferId || '',
      adjustedQty: dto.adjustedQty || (adjustedQty ? Number(adjustedQty) : 0),
      adjustedCount: dto.adjustedCount || (adjustedCount ? Number(adjustedCount) : 0),
      notes: dto.notes || notes || '',
    };
    return await this.resubmitRework(payload, req);
  }

  @Post('receive-control')
  async receiveControl(@Body() dto: ControlReceiptDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.receiveControl(dto, companyId);
  }

  @Post('resolve-dispute')
  async resolveDispute(@Body() dto: ResolveControlDisputeDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.resolveControlDispute(dto, companyId);
  }
}

// Controller إضافي للمسار القديم api/FinishedGoodsTransfers
@Controller('api/FinishedGoodsTransfers')
export class FinishedGoodsLegacyController {
  constructor(private readonly service: FinishedGoodsService) {}

  @Get()
  async getAll(@Query('status') status?: string, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    const res = await this.service.getAll(companyId, status);
    return res.data;
  }

  @Get('lookups')
  async getLookups(@Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    const res = await this.service.getLookups(companyId);
    return res.data;
  }

  @Get('order-balance/:orderId')
  async getOrderBalance(@Req() req?: any) {
    const orderId = req?.params?.orderId;
    return await this.service.getProductionOrderBalance(orderId);
  }

  @Post('create')
  async createTransfer(@Body() dto: CreateFinishedGoodsTransferDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.createTransfer(dto, companyId);
  }

  @Post('audit-costing')
  async auditCosting(@Body() dto: CostingAuditDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.auditCosting(dto, companyId);
  }

  @Post('resolve-costing-dispute')
  async resolveCostingDispute(@Body() dto: ResolveCostingDisputeDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.resolveCostingDispute(dto, companyId);
  }

  @Post('inspect-qc')
  async inspectQc(@Body() dto: QcInspectionDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.inspectQc(dto, companyId);
  }

  @Post('receive-control')
  async receiveControl(@Body() dto: ControlReceiptDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.receiveControl(dto, companyId);
  }

  @Post('resolve-dispute')
  async resolveDispute(@Body() dto: ResolveControlDisputeDto, @Req() req?: any) {
    const companyId = req?.tenantId || req?.headers?.['x-company-id'] || '1';
    return await this.service.resolveControlDispute(dto, companyId);
  }
}
