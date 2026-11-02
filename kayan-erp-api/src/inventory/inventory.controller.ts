import { Controller, Get, Post, Body, Query, Param, BadRequestException } from '@nestjs/common';
import { InventoryService, StockMovementDto, WarehouseTransferDto } from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // 1. المستودعات التخصصية: GET /inventory/warehouses
  @Get('warehouses')
  async getWarehouses() {
    return this.inventoryService.getWarehouses();
  }

  // 2. دليل الأصناف والمكونات: GET /inventory/items
  @Get('items')
  async getItems(@Query('category') category?: string) {
    return this.inventoryService.getItems(category);
  }

  // 3. جرد الأرصدة للمستودعات: GET /inventory/balances
  @Get('balances')
  async getBalances(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.getStockBalances(warehouseId);
  }

  // 4. بطاقة حركة الصنف التفصيلية: GET /inventory/stock-card/:itemId
  @Get('stock-card/:itemId')
  async getStockCard(@Param('itemId') itemId: string) {
    return this.inventoryService.getStockCard(itemId);
  }

  // 5. تحويل مخزني داخلي: POST /inventory/transfer
  @Post('transfer')
  async transferStock(@Body() body: WarehouseTransferDto) {
    if (!body.fromWarehouseId || !body.toWarehouseId || !body.itemId || !body.quantity) {
      throw new BadRequestException('المستودع المصدر، المستودع المستلم، الصنف والكمية حقول مطلوبة');
    }
    return this.inventoryService.transferStock(body);
  }

  // 6. تسجيل حركة مخزنية: POST /inventory/movement
  @Post('movement')
  async createMovement(@Body() body: any) {
    if (!body.warehouseId || !body.itemId || !body.quantity || !body.movementType) {
      throw new BadRequestException('الحقول الأساسية مطلوبة لإتمام الحركة المخزنية');
    }
    return this.inventoryService.recordStockMovement(body);
  }

  // 7. جلب رصيد صنف مفرد
  @Get('balance')
  async getBalance(
    @Query('companyId') companyId: string,
    @Query('warehouseId') warehouseId: string,
    @Query('itemId') itemId: string,
  ) {
    const balance = await this.inventoryService.getStockBalance(
      companyId || '1',
      warehouseId || '1',
      itemId || '101',
    );
    return {
      success: true,
      data: balance,
    };
  }
}
