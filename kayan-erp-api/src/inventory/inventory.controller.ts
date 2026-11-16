import { Controller, Get, Post, Body, Query, Param, BadRequestException } from '@nestjs/common';
import {
  InventoryService,
  StockMovementDto,
  WarehouseTransferDto,
  CreateBatchDto,
  FefoDispatchDto,
  CreateRecallDto,
} from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // 1. المستودعات التخصصية: GET /inventory/warehouses
  @Get('warehouses')
  async getWarehouses() {
    return this.inventoryService.getWarehouses();
  }

  // إضافة مستودع جديد: POST /inventory/warehouses
  @Post('warehouses')
  async createWarehouse(@Body() body: any) {
    if (!body.warehouseCode || !body.warehouseName) {
      throw new BadRequestException('كود واسم المستودع حقول إلزامية');
    }
    return this.inventoryService.createWarehouse(body);
  }

  // 2. دليل الأصناف والمكونات: GET /inventory/items
  @Get('items')
  async getItems(@Query('category') category?: string) {
    return this.inventoryService.getItems(category);
  }

  // إضافة صنف جديد: POST /inventory/items
  @Post('items')
  async createItem(@Body() body: any) {
    if (!body.itemCode || !body.itemName || !body.categoryId) {
      throw new BadRequestException('كود الصنف، اسم الصنف، والتصنيف حقول إلزامية');
    }
    return this.inventoryService.createItem(body);
  }

  // تصنيفات الأصناف: GET /inventory/categories
  @Get('categories')
  async getCategories() {
    return this.inventoryService.getCategories();
  }

  // الفروع والمواقع: GET /inventory/branches
  @Get('branches')
  async getBranches() {
    return this.inventoryService.getBranches();
  }

  // الإدارات وخطوط الإنتاج: GET /inventory/departments
  @Get('departments')
  async getDepartments() {
    return this.inventoryService.getDepartments();
  }

  // إضافة إدارة / قسم / خط إنتاج جديد: POST /inventory/departments
  @Post('departments')
  async createDepartment(@Body() body: any) {
    if (!body.departmentCode || !body.departmentName) {
      throw new BadRequestException('كود واسم الإدارة أو القسم حقول إلزامية');
    }
    return this.inventoryService.createDepartment(body);
  }

  // تقرير موجز المخازن والتفريعات: GET /inventory/reports/warehouse-summary
  @Get('reports/warehouse-summary')
  async getWarehouseSummaryReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('branchId') branchId?: string,
    @Query('orderType') orderType?: string,
    @Query('departmentId') departmentId?: string,
    @Query('itemCode') itemCode?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getWarehouseSummaryReport({
      startDate,
      endDate,
      branchId,
      orderType,
      departmentId,
      itemCode,
      search,
    });
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

  // 8. استعراض تشغيلات المخزون وتواريخ الصلاحية (Batches & FEFO)
  @Get('batches')
  async getBatches(
    @Query('companyId') companyId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('itemId') itemId?: string,
  ) {
    return this.inventoryService.getBatches(companyId || 1, warehouseId, itemId);
  }

  // 9. تسجيل تشغيلة مخزنية جديدة
  @Post('batches')
  async createBatch(@Body() body: CreateBatchDto) {
    if (!body.warehouseId || !body.itemId || !body.batchNumber || !body.expiryDate || !body.initialQuantity) {
      throw new BadRequestException('المستودع، الصنف، رقم التشغيلة، تاريخ الصلاحية والكمية حقول إلزامية');
    }
    return this.inventoryService.createBatch(body);
  }

  // 10. الصرف الإلزامي وفق معيار FEFO (First Expired, First Out)
  @Post('fefo-dispatch')
  async dispatchFefo(@Body() body: FefoDispatchDto) {
    if (!body.warehouseId || !body.itemId || !body.requestedQuantity) {
      throw new BadRequestException('المستودع، الصنف، والكمية المطلوبة للصرف حقول إلزامية');
    }
    return this.inventoryService.dispatchFefo(body);
  }

  // 11. استعراض أوامر استدعاء المنتجات (Product Recall)
  @Get('recalls')
  async getProductRecalls(@Query('companyId') companyId?: string) {
    return this.inventoryService.getProductRecalls(companyId || 1);
  }

  // 12. تفعيل أمر استدعاء وتجميد تشغيلة
  @Post('recalls')
  async createProductRecall(@Body() body: CreateRecallDto) {
    if (!body.recallNumber || !body.batchNumber || !body.itemId || !body.recallReason) {
      throw new BadRequestException('رقم الاستدعاء، رقم التشغيلة، الصنف وسبب الاستدعاء حقول إلزامية');
    }
    return this.inventoryService.createProductRecall(body);
  }

  // 13. أسطول النقل والشاحنات المبردة
  @Get('fleet-vehicles')
  async getFleetVehicles(@Query('companyId') companyId?: string) {
    return this.inventoryService.getFleetVehicles(companyId || 1);
  }

  // 14. بوالص التسليم (Proof of Delivery - POD)
  @Get('pods')
  async getProofOfDeliveries(@Query('companyId') companyId?: string) {
    return this.inventoryService.getProofOfDeliveries(companyId || 1);
  }
}
