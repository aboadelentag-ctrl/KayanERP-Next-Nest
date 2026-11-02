import { Controller, Get, Post, Patch, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { SalesService } from './sales.service.js';

// تعريف DTOs كـ class صريح لمنع خطأ TS1272 مع emitDecoratorMetadata
export class PosCheckoutItemDto {
  itemId!: string | number;
  quantity!: number;
  unitPrice!: number;
  notes?: string;
}

export class PosCheckoutDto {
  branchId?: string | number;
  warehouseId?: string | number;
  customerId?: string | number;
  customerName?: string;
  cashierName?: string;
  paymentMethod?: 'CASH' | 'CARD' | 'SPLIT';
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
  items!: PosCheckoutItemDto[];
}

export class CreateWholesaleOrderDto {
  branchId?: string | number;
  warehouseId?: string | number;
  customerId!: string | number;
  orderNumber?: string;
  orderDate?: string;
  paymentTerms?: string;
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
  items!: PosCheckoutItemDto[];
}

export class CreateSalesSlipItemDto {
  itemId!: string | number;
  itemName?: string;
  quantity!: number;
  weight?: number;
  unitPrice!: number;
  totalPrice?: number;
  notes?: string;
}

export class CreateSalesSlipDto {
  salesmanCode?: string;
  salesmanName?: string;
  branchId?: string | number;
  branchName?: string;
  customerId?: string | number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  discountAmount?: number;
  items!: CreateSalesSlipItemDto[];
}

export class PaySalesSlipDto {
  paymentMethod?: 'CASH' | 'CARD' | 'SPLIT';
  paidAmount?: number;
  discountAmount?: number;
  cashierName?: string;
  treasuryId?: string | number;
}

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  // جلب التصنيفات والأقسام الحقيقية لمعارض وحلواني أبو عادل من الداتابيز
  @Get('categories')
  async getCategories() {
    return await this.salesService.getCategories();
  }

  // جلب الأصناف والمنتجات الحقيقية من الداتابيز مع الأسعار والوحدات
  @Get('products')
  async getProducts(@Query('category') category?: string) {
    return await this.salesService.getProducts(category);
  }

  // 1. جلب قائمة العملاء وأرصدة حساباتهم
  @Get('customers')
  async getCustomers() {
    return await this.salesService.getCustomers();
  }

  // 2. جلب فواتير وأوامر البيع مع الفلترة
  @Get('orders')
  async getSalesOrders(
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
  ) {
    return await this.salesService.getSalesOrders({ status, branchId });
  }

  // 3. نقطة البيع السريعة لمعارض التجزئة (POS Checkout)
  @Post('pos/checkout')
  async posCheckout(@Body() body: PosCheckoutDto) {
    if (!body || !body.items || body.items.length === 0) {
      throw new BadRequestException('سلة المبيعات فارغة، يرجى إضافة صنف واحد على الأقل');
    }
    return await this.salesService.posCheckout(body);
  }

  // 4. استرجاع بيانات الفاتورة الرسمية للطباعة
  @Get('invoices/:id')
  async getInvoiceById(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('معرف الفاتورة مطلوب');
    }
    return await this.salesService.getInvoiceById(id);
  }

  // 5. إنشاء أمر بيع جملة جديد
  @Post('orders')
  async createWholesaleOrder(@Body() body: CreateWholesaleOrderDto) {
    if (!body || !body.customerId || !body.items || body.items.length === 0) {
      throw new BadRequestException('بيانات العميل وأصناف البيع مطلوبة');
    }
    return await this.salesService.createWholesaleOrder(body);
  }

  // 6. التوافق مع استدعاءات لوحة العمليات السابقة (pre-order & pay)
  @Post('pre-order')
  async createPreOrderSlip(@Body() body: any) {
    const companyId = body.companyId || body.company_id;
    const branchId = body.branchId || body.branch_id;
    const items = body.items || body.details;

    if (!companyId || !branchId || !Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('البيانات الأساسية للبوليصة والبنود مطلوبة');
    }

    return await this.salesService.createPreOrderSlip(body);
  }

  @Post('pay')
  async completeOrderPayment(@Body() body: any) {
    const orderId = body.orderId || body.order_id;
    const paidAmount = body.paidAmount || body.paid_amount || body.amount;
    const invoiceNumber = body.invoiceNumber || body.invoice_number;

    if (!orderId) {
      throw new BadRequestException('معرف الطلب مطلوب لتأكيد الدفع');
    }

    return await this.salesService.completeOrderPayment(orderId, paidAmount, invoiceNumber);
  }

  // 7. دورة المبيعات ونقاط البيع الحديثة (Showroom Slip -> Cashier -> Dispatch)

  // أ. إنشاء بوليصة تجهيز مبدئية للبائع مع توليد باركود فريد
  @Post('slips')
  async createSlip(@Body() body: CreateSalesSlipDto) {
    if (!body || !body.items || body.items.length === 0) {
      throw new BadRequestException('يجب إضافة صنف واحد على الأقل في بوليصة التجهيز');
    }
    return await this.salesService.createSlip(body);
  }

  // ب. استرجاع قائمة بوالص الصالة بانتظار السداد للكاشير
  @Get('slips/pending')
  async getPendingSlips() {
    return await this.salesService.getPendingSlips();
  }

  // ج. استرجاع تفاصيل البوليصة فور مسح الباركود على جهاز الكاشير
  @Get('slips/:barcode')
  async getSlipByBarcode(@Param('barcode') barcode: string) {
    if (!barcode) {
      throw new BadRequestException('كود الباركود مطلوب للبحث');
    }
    return await this.salesService.getSlipByBarcode(barcode);
  }

  // ج. سداد البوليصة في الخزينة وإصدار الفاتورة الضريبية النهائية
  @Post('slips/:id/pay')
  async paySlip(@Param('id') id: string, @Body() body: PaySalesSlipDto) {
    if (!id) {
      throw new BadRequestException('معرف أو باركود البوليصة مطلوب');
    }
    return await this.salesService.paySlip(id, body);
  }

  // د. إثبات تسليم الطلب للعميل عند شباك التسليم
  @Patch('orders/:id/deliver')
  async deliverOrder(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('معرف الطلب مطلوب لإثبات التسليم');
    }
    return await this.salesService.deliverOrder(id);
  }

  // هـ. جلب الطلبات المدفوعة الجاهزة لشباك التسليم
  @Get('dispatch')
  async getDispatchOrders() {
    return await this.salesService.getDispatchOrders();
  }
}
