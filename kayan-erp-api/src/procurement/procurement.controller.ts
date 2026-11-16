import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { ProcurementService } from './procurement.service.js';

// تعريف الـ DTO كـ class صريح لمنع خطأ TS1272 مع emitDecoratorMetadata
export class CreateSupplierDto {
  supplier_name!: string;
  supplier_code?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  payment_terms?: string;
  credit_limit?: number;
  notes?: string;
  is_approved?: boolean;
}

export class CreatePurchaseOrderItemDto {
  itemId!: string | number;
  quantity!: number;
  unitPrice!: number;
  notes?: string;
}

export class CreatePurchaseOrderDto {
  supplierId!: string | number;
  warehouseId?: string | number;
  orderNumber?: string;
  orderDate?: string;
  expectedDate?: string;
  notes?: string;
  paymentTerms?: string;
  items!: CreatePurchaseOrderItemDto[];
}

export class InspectAndReceiveDto {
  purchaseOrderId?: string | number;
  supplierId?: string | number;
  warehouseId?: string | number;
  itemId!: string | number;
  batchNumber!: string;
  qcInspectorName!: string;
  coaNumber?: string;
  receivedQuantity!: number;
  acceptedQuantity!: number;
  rejectedQuantity?: number;
  rejectionReason?: string;
  qcStatus?: 'Accepted' | 'Partially_Rejected' | 'Rejected';
  notes?: string;
}

@Controller('procurement')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  // 1. جلب قائمة الموردين المعتمدين وتصنيفاتهم ورصيد حساباتهم
  @Get('suppliers')
  async getSuppliers() {
    return await this.procurementService.getSuppliers();
  }

  // تسجيل مورد معتمد جديد
  @Post('suppliers')
  async createSupplier(@Body() body: CreateSupplierDto) {
    if (!body || !body.supplier_name) {
      throw new BadRequestException('اسم المورد مطلوب');
    }
    return await this.procurementService.createSupplier(body);
  }

  // 2. استعراض أوامر وفواتير الشراء
  @Get('orders')
  async getPurchaseOrders(
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return await this.procurementService.getPurchaseOrders({ status, supplierId });
  }

  // 3. جلب قائمة الخامات المتاحة للشراء
  @Get('raw-materials')
  async getRawMaterials() {
    return await this.procurementService.getRawMaterials();
  }

  // 4. جلب سجل فحوصات الجودة ومحاضر الاستلام
  @Get('inspections')
  async getRecentInspections() {
    return await this.procurementService.getRecentInspections();
  }

  // 5. إنشاء أمر شراء وتوريد خامات جديد متعدد الأصناف
  @Post('orders')
  async createPurchaseOrder(@Body() body: CreatePurchaseOrderDto) {
    if (!body || !body.supplierId || !body.items || body.items.length === 0) {
      throw new BadRequestException('بيانات المورد وبنود أصناف الشراء مطلوبة');
    }
    return await this.procurementService.createPurchaseOrder(body);
  }

  // 6. إثبات استلام وفحص الجودة للخامات الموردة وتغذية المخزون
  @Post('receipts/inspect-and-receive')
  async inspectAndReceive(@Body() body: InspectAndReceiveDto) {
    if (!body || !body.itemId || !body.receivedQuantity) {
      throw new BadRequestException('بيانات فحص واستلام الخامات مطلوبة');
    }
    return await this.procurementService.inspectAndReceive(body);
  }
}
