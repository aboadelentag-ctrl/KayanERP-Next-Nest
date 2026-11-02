import { Controller, Get, Post, Patch, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { CratesService } from './crates.service.js';

// تعريف الكلاسات كـ class صريح ليتوافق مع emitDecoratorMetadata
export class CreateCrateMovementDto {
  crateId?: string;
  sourceType?: string;
  sourceId?: string;
  targetType?: string;
  targetId?: string;
  quantity!: number;
  notes?: string;
  containerName?: string;
  dispatchedQuantity?: number;
  sourceLocation?: string;
  destinationLocation?: string;
  dispatchedByName?: string;
  movementType?: 'DISPATCH_BRANCH' | 'RETURN_EMPTY' | 'DISPATCH_CLIENT' | 'RETURN_CLIENT';
}

export class ReceiveCrateMovementDto {
  movementId?: string;
  receivedQuantity?: number;
  notes?: string;
  damagedCount?: number;
  receiveNotes?: string;
  disputeNotes?: string;
}

@Controller('crates')
export class CratesController {
  constructor(private readonly cratesService: CratesService) {}

  @Get('summary')
  async getCratesSummary() {
    return await this.cratesService.getCratesSummary();
  }

  @Get('inventory')
  async getCratesInventory(@Query('branchId') branchId?: string) {
    return await this.cratesService.getCratesInventory(branchId);
  }

  @Get('containers')
  async getContainers() {
    return await this.cratesService.getContainers();
  }

  @Get('custody-balances')
  async getCustodyBalances() {
    return await this.cratesService.getCustodyBalances();
  }

  @Get('movements')
  async getCrateMovements(
    @Query('status') status?: string,
    @Query('movementType') movementType?: string,
  ) {
    return await this.cratesService.getMovements({ status, movementType });
  }

  @Post('movements/dispatch')
  async createDispatchMovement(@Body() body: CreateCrateMovementDto) {
    if (!body || (!body.quantity && !body.dispatchedQuantity)) {
      throw new BadRequestException('الكمية وبيانات حركة الصناديق مطلوبة');
    }
    return await this.cratesService.createCrateMovement(body);
  }

  @Post('movements')
  async createMovement(@Body() body: CreateCrateMovementDto) {
    if (!body || (!body.quantity && !body.dispatchedQuantity)) {
      throw new BadRequestException('الكمية وبيانات حركة الصناديق مطلوبة');
    }
    return await this.cratesService.createCrateMovement(body);
  }

  @Post('movements/receive')
  async receiveMovementFromPost(@Body() body: ReceiveCrateMovementDto) {
    if (!body || !body.movementId) {
      throw new BadRequestException('معرف حركة الصناديق مطلوب');
    }
    return await this.cratesService.receiveCrateMovement(body);
  }

  @Patch('movements/:id/receive')
  async receiveMovement(
    @Param('id') id: string,
    @Body() body: ReceiveCrateMovementDto,
  ) {
    if (!id) {
      throw new BadRequestException('معرف حركة الصناديق مطلوب');
    }
    return await this.cratesService.receiveMovement(id, body);
  }
}
