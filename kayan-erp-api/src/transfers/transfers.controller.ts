import { Controller, Get, Post, Patch, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { TransfersService, CreateBranchTransferDto as ServiceCreateDto, ReceiveBranchTransferDto as ServiceReceiveDto } from './transfers.service.js';

// تعريف الكلاسات كـ class صريح لمنع خطأ TS1272 مع الحفاظ على مرونة استقبال البيانات
export class CreateBranchTransferDto {
  transferNumber?: string;
  fromBranchId?: string;
  toBranchId?: string;
  destinationBranchId?: string;
  itemId?: string;
  dispatchedQty?: number;
  driverName?: string;
  vehicleNumber?: string;
  cratesCount?: number;
  crateCount?: number;
  containerType?: string;
  notes?: string;
  items?: Array<{
    itemId: string;
    quantity: number;
    notes?: string;
  }>;
}

export class ReceiveBranchTransferDto {
  transferId?: string;
  receivedQty?: number;
  receivedCount?: number;
  receivedCratesCount?: number;
  receivedCrateCount?: number;
  receiverName?: string;
  disputeReason?: string;
  disputeChargeTo?: string;
  notes?: string;
}

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  async getTransfers(@Query('status') status?: string) {
    return await this.transfersService.getTransfers(status);
  }

  @Get('branches')
  async getBranches() {
    return await this.transfersService.getBranches();
  }

  @Get('warehouses')
  async getWarehouses() {
    return await this.transfersService.getWarehouses();
  }

  @Get('branch-transfers')
  async getBranchTransfers(
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
  ) {
    return await this.transfersService.getBranchTransfers({ status, branchId });
  }

  @Get(':id')
  async getTransferById(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('معرف التحويل مطلوب');
    }
    return await this.transfersService.getTransferById(id);
  }

  @Post()
  async createBranchTransfer(@Body() body: CreateBranchTransferDto) {
    const dest = body.toBranchId || body.destinationBranchId;
    if (!body || !dest) {
      throw new BadRequestException('بيانات الفرع المستلم وبنود الأصناف مطلوبة');
    }
    return await this.transfersService.createBranchTransfer(body as any);
  }

  @Post('branch-transfers')
  async createBranchTransferAlias(@Body() body: CreateBranchTransferDto) {
    return await this.createBranchTransfer(body);
  }

  @Post('receive')
  async receiveBranchTransfer(@Body() body: ReceiveBranchTransferDto) {
    if (!body || !body.transferId) {
      throw new BadRequestException('معرف التحويل مطلوب لتأكيد الاستلام');
    }
    return await this.transfersService.receiveBranchTransfer(body as any);
  }

  @Patch('branch-transfers/:id/receive')
  async receiveBranchTransferPatch(
    @Param('id') id: string,
    @Body() body: ReceiveBranchTransferDto,
  ) {
    if (!id) {
      throw new BadRequestException('معرف إذن التحويل مطلوب');
    }
    return await this.transfersService.receiveBranchTransfer(id, body as any);
  }
}
