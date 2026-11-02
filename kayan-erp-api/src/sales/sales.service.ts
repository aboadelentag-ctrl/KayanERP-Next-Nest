import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';

export interface PosCheckoutItemDto {
  itemId: string | number;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface PosCheckoutDto {
  branchId?: string | number;
  warehouseId?: string | number;
  customerId?: string | number;
  customerName?: string;
  cashierName?: string;
  paymentMethod?: 'CASH' | 'CARD' | 'SPLIT';
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
  items: PosCheckoutItemDto[];
}

export interface CreateWholesaleOrderDto {
  branchId?: string | number;
  warehouseId?: string | number;
  customerId: string | number;
  orderNumber?: string;
  orderDate?: string;
  paymentTerms?: string;
  discountAmount?: number;
  taxAmount?: number;
  notes?: string;
  items: PosCheckoutItemDto[];
}

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. جلب قائمة العملاء (تجزئة، جملة، فنادق وشركات) (GET /sales/customers)
  async getCustomers() {
    try {
      let list = await this.prisma.customers.findMany({
        where: { active: true },
        orderBy: { customer_name: 'asc' },
      });

      if (list.length === 0) {
        const seedCustomers = [
          {
            company_id: BigInt(1),
            customer_name: 'عميل نقدي عام (معارض التجزئة)',
            customer_code: 'CUST-CASH-01',
            customer_type: 'RETAIL',
            phone: '01000000000',
            address: 'معارض حلويات أبو عادل',
            payment_terms: 'نقدي فوري',
            credit_limit: 0,
            active: true,
            notes: 'مبيعات الكاشير المباشرة لرواد المعارض',
          },
          {
            company_id: BigInt(1),
            customer_name: 'حلواني السلام (توزيع جملة - المنصورة)',
            customer_code: 'CUST-WHS-01',
            customer_type: 'WHOLESALE',
            phone: '0502213455',
            email: 'salam.sweets@gmail.com',
            address: 'شارع الجلاء - المنصورة',
            tax_number: '200-112-445',
            payment_terms: 'آجل 15 يوم',
            credit_limit: 150000,
            active: true,
            notes: 'سحب أسبوعي بسبوسة وكنافة وهريسة',
          },
          {
            company_id: BigInt(1),
            customer_name: 'فندق رويال بالاس (توريدات ضيافة ومناسبات)',
            customer_code: 'CUST-CORP-01',
            customer_type: 'CORPORATE',
            phone: '0502334411',
            email: 'procurement@royalpalace.eg',
            address: 'المشاية السفلية - النيل - المنصورة',
            tax_number: '310-889-771',
            payment_terms: 'تحويل بنكي 30 يوم',
            credit_limit: 300000,
            active: true,
            notes: 'توريد تورت وبوفيهات حلويات غربية وشرقية',
          },
          {
            company_id: BigInt(1),
            customer_name: 'سوبر ماركت خير زمان (فرع دكرنس)',
            customer_code: 'CUST-WHS-02',
            customer_type: 'WHOLESALE',
            phone: '0507481100',
            address: 'شارع البحر - دكرنس',
            tax_number: '412-334-998',
            payment_terms: 'أسبوعي نقدي',
            credit_limit: 100000,
            active: true,
            notes: 'أطباق وعلب نواعم ومعمول وبسكويت مغلفة',
          },
          {
            company_id: BigInt(1),
            customer_name: 'قاعة الماسة للحفلات والمؤتمرات',
            customer_code: 'CUST-CORP-02',
            customer_type: 'CORPORATE',
            phone: '01011223344',
            address: 'طريق المحلة الزراعي - المنصورة',
            tax_number: '501-778-223',
            payment_terms: 'عربون 50% والباقي بعد المناسبة',
            credit_limit: 200000,
            active: true,
            notes: 'حلويات سواريه وجاتوه مشكل للحفلات الكبرى',
          },
        ];

        for (const c of seedCustomers) {
          try {
            await this.prisma.customers.create({ data: c });
          } catch {}
        }

        list = await this.prisma.customers.findMany({
          where: { active: true },
          orderBy: { customer_name: 'asc' },
        });
      }

      return {
        success: true,
        data: list.map((c) => ({
          ...c,
          id: String(c.id),
          company_id: String(c.company_id),
          credit_limit: Number(c.credit_limit),
        })),
      };
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      return { success: false, data: [], message: err.message };
    }
  }

  // 2. استعراض فواتير وأوامر البيع (GET /sales/orders)
  async getSalesOrders(filter?: { status?: string; branchId?: string }) {
    try {
      const where: any = {};
      if (filter?.status && filter.status !== 'ALL') {
        where.status = filter.status;
      }
      if (filter?.branchId && filter.branchId !== 'ALL') {
        where.branch_id = BigInt(filter.branchId);
      }

      const orders = await this.prisma.sales_orders.findMany({
        where,
        include: {
          customers: {
            select: { id: true, customer_name: true, customer_code: true, customer_type: true, phone: true },
          },
          branches: {
            select: { id: true, branch_name: true, branch_code: true },
          },
          warehouses: {
            select: { id: true, warehouse_name: true },
          },
          sales_order_lines: {
            include: {
              items: {
                select: { id: true, item_name: true, item_code: true, unit: true, base_price: true },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
        take: 100,
      });

      const serialized = orders.map((o) => ({
        ...o,
        id: String(o.id),
        company_id: String(o.company_id),
        branch_id: o.branch_id ? String(o.branch_id) : null,
        customer_id: o.customer_id ? String(o.customer_id) : null,
        warehouse_id: String(o.warehouse_id),
        subtotal: Number(o.subtotal || 0),
        discount_amount: Number(o.discount_amount || 0),
        tax_amount: Number(o.tax_amount || 0),
        total_amount: Number(o.total_amount || 0),
        customers: o.customers ? { ...o.customers, id: String(o.customers.id) } : null,
        branches: o.branches ? { ...o.branches, id: String(o.branches.id) } : null,
        warehouses: o.warehouses ? { ...o.warehouses, id: String(o.warehouses.id) } : null,
        sales_order_lines: o.sales_order_lines.map((l) => ({
          ...l,
          id: String(l.id),
          sales_order_id: String(l.sales_order_id),
          item_id: String(l.item_id),
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          discount_amount: Number(l.discount_amount || 0),
          tax_amount: Number(l.tax_amount || 0),
          line_total: Number(l.line_total || Number(l.quantity) * Number(l.unit_price)),
          delivered_quantity: Number(l.delivered_quantity || 0),
          items: l.items ? { ...l.items, id: String(l.items.id), base_price: Number(l.items.base_price || 0) } : null,
        })),
      }));

      return {
        success: true,
        data: serialized,
      };
    } catch (err: any) {
      console.error('Error fetching sales orders:', err);
      return { success: false, data: [], message: err.message };
    }
  }

  // 3. نقطة البيع السريعة لمعارض التجزئة (POST /sales/pos/checkout)
  async posCheckout(dto: PosCheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('سلة المبيعات فارغة، يرجى إضافة صنف واحد على الأقل');
    }

    try {
      const branchId = dto.branchId ? BigInt(dto.branchId) : BigInt(1);
      const invoiceNumber = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const cashier = dto.cashierName || 'كاشير المعرض الرئيسي';
      const paymentMethod = dto.paymentMethod || 'CASH';

      // جلب معرف المستودع التابع للفرع أو المعرض
      let whId: bigint;
      if (dto.warehouseId) {
        whId = BigInt(dto.warehouseId);
      } else {
        const wh = await this.prisma.warehouses.findFirst({
          where: { branch_id: branchId, active: true },
        });
        whId = wh ? wh.id : BigInt(1);
      }

      // حساب الإجماليات
      let subtotal = 0;
      for (const it of dto.items) {
        subtotal += Number(it.quantity) * Number(it.unitPrice);
      }
      const discount = Number(dto.discountAmount || 0);
      const tax = Number(dto.taxAmount || 0);
      const totalAmount = Math.max(0, subtotal - discount + tax);

      // تحديد العميل (عميل نقدي افتراضياً)
      let customerIdVal: bigint = BigInt(1);
      if (dto.customerId) {
        customerIdVal = BigInt(dto.customerId);
      } else {
        const cashCust = await this.prisma.customers.findFirst({
          where: { customer_type: 'RETAIL', active: true },
        });
        if (cashCust) customerIdVal = cashCust.id;
      }

      // 1. إنشاء الفاتورة الرسمية في sales_invoices
      const invoice = await this.prisma.sales_invoices.create({
        data: {
          invoice_number: invoiceNumber,
          invoice_date: new Date(),
          customer_id: customerIdVal,
          total_amount: totalAmount,
          branch_id: branchId,
          company_id: BigInt(1),
          created_at: new Date(),
          sales_invoice_lines: {
            create: dto.items.map((it) => ({
              item_id: BigInt(it.itemId),
              quantity: Math.round(Number(it.quantity)),
              unit_price: Number(it.unitPrice),
              line_total: Math.round(Number(it.quantity) * Number(it.unitPrice) * 100) / 100,
              created_at: new Date(),
            })),
          },
        },
        include: {
          sales_invoice_lines: true,
          branches: true,
        },
      });

      // 2. إنشاء أمر بيع مسجل للمطابقة المحاسبية
      try {
        await this.prisma.sales_orders.create({
          data: {
            company_id: BigInt(1),
            branch_id: branchId,
            customer_id: customerIdVal,
            warehouse_id: whId,
            order_number: `SO-${invoiceNumber}`,
            order_date: new Date(),
            status: 'COMPLETED',
            subtotal,
            discount_amount: discount,
            tax_amount: tax,
            total_amount: totalAmount,
            notes: `فاتورة كاشير معارض - طريقة الدفع: ${paymentMethod} - الكاشير: ${cashier}`,
            created_at: new Date(),
            sales_order_lines: {
              create: dto.items.map((it) => ({
                item_id: BigInt(it.itemId),
                quantity: Number(it.quantity),
                unit_price: Number(it.unitPrice),
                discount_amount: 0,
                tax_amount: 0,
                line_total: Number(it.quantity) * Number(it.unitPrice),
                delivered_quantity: Number(it.quantity),
                notes: it.notes || '',
              })),
            },
          },
        });
      } catch (e) {
        console.warn('Sales order sync skipped:', e);
      }

      // 3. خصم الكميات المباعة مباشرة من رصيد المعرض في stock_balances
      for (const it of dto.items) {
        try {
          await this.prisma.stock_balances.updateMany({
            where: {
              warehouse_id: whId,
              item_id: BigInt(it.itemId),
            },
            data: {
              quantity: { decrement: Number(it.quantity) },
            },
          });
        } catch (e) {
          console.warn('Stock decrement skipped for item:', it.itemId, e);
        }
      }

      const receiptPayload = {
        invoiceId: String(invoice.id),
        invoiceNumber: invoice.invoice_number,
        branchName: invoice.branches?.branch_name || 'معرض المنصورة الرئيسي',
        totalAmount,
        subtotal,
        discount,
        paymentMethod,
        cashier,
        itemsCount: dto.items.length,
        timestamp: new Date().toISOString(),
      };

      // بث التحديثات اللحظية عبر WebSockets لتحديث شاشات المخازن والإدارة
      this.realtime.server?.emit('sales_order_created', receiptPayload);
      this.realtime.server?.emit('stock_updated', {
        warehouseId: String(whId),
        branchId: String(branchId),
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'تم إتمام عملية البيع وخصم المخزون وإصدار الفاتورة بنجاح',
        data: {
          ...invoice,
          id: String(invoice.id),
          customer_id: String(invoice.customer_id),
          branch_id: String(invoice.branch_id),
          total_amount: Number(invoice.total_amount),
          paymentMethod,
          cashier,
          subtotal,
          discount,
          tax,
        },
      };
    } catch (err: any) {
      console.error('Error during POS checkout:', err);
      throw new BadRequestException('تعذر إتمام عملية البيع: ' + err.message);
    }
  }

  // 4. استرجاع بيانات الفاتورة الرسمية للطباعة (GET /sales/invoices/:id)
  async getInvoiceById(id: string | number) {
    try {
      const invoice = await this.prisma.sales_invoices.findFirst({
        where: {
          OR: [
            { id: BigInt(id) },
            { invoice_number: String(id) },
          ],
        },
        include: {
          branches: true,
          sales_invoice_lines: true,
        },
      });

      if (!invoice) {
        throw new NotFoundException(`الفاتورة برقم ${id} غير موجودة`);
      }

      // جلب بيانات الأصناف المشمولة بالفاتورة
      const linesList = invoice.sales_invoice_lines || [];
      const itemIds = linesList.map((l: any) => l.item_id);
      let itemsMap = new Map<string, any>();
      try {
        const items = await this.prisma.items.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, item_name: true, item_code: true, unit: true },
        });
        itemsMap = new Map(items.map((it: any) => [String(it.id), it]));
      } catch {}

      // جلب بيانات العميل
      let customerObj: any = null;
      try {
        customerObj = await this.prisma.customers.findUnique({
          where: { id: invoice.customer_id },
        });
      } catch {}

      return {
        success: true,
        data: {
          ...invoice,
          id: String(invoice.id),
          customer_id: String(invoice.customer_id),
          branch_id: invoice.branch_id ? String(invoice.branch_id) : null,
          total_amount: Number(invoice.total_amount),
          customer: customerObj ? {
            ...customerObj,
            id: String(customerObj.id),
            credit_limit: Number(customerObj.credit_limit || 0),
          } : {
            customer_name: 'عميل نقدي عام',
            customer_type: 'RETAIL',
            phone: '-',
          },
          lines: linesList.map((l: any) => {
            const itemObj = itemsMap.get(String(l.item_id));
            return {
              ...l,
              id: String(l.id),
              invoice_id: String(l.invoice_id),
              item_id: String(l.item_id),
              quantity: Number(l.quantity),
              unit_price: Number(l.unit_price),
              line_total: Number(l.line_total),
              item: itemObj ? { ...itemObj, id: String(itemObj.id) } : { item_name: 'صنف حلويات', item_code: 'ITM-01', unit: 'كجم' },
            };
          }),
        },
      };
    } catch (err: any) {
      console.error('Error fetching invoice by id:', err);
      throw new BadRequestException('تعذر جلب بيانات الفاتورة: ' + err.message);
    }
  }

  // 5. إنشاء أمر بيع جملة جديد (POST /sales/orders)
  async createWholesaleOrder(dto: CreateWholesaleOrderDto) {
    if (!dto.customerId || !dto.items || dto.items.length === 0) {
      throw new BadRequestException('بيانات العميل وبنود أصناف البيع مطلوبة');
    }

    try {
      const orderNumber = dto.orderNumber?.trim() || `SO-${Date.now().toString().slice(-7)}`;
      const orderDate = dto.orderDate ? new Date(dto.orderDate) : new Date();
      const branchId = dto.branchId ? BigInt(dto.branchId) : BigInt(1);

      let whId: bigint;
      if (dto.warehouseId) {
        whId = BigInt(dto.warehouseId);
      } else {
        const wh = await this.prisma.warehouses.findFirst({ where: { active: true } });
        whId = wh ? wh.id : BigInt(1);
      }

      let subtotal = 0;
      for (const it of dto.items) {
        subtotal += Number(it.quantity) * Number(it.unitPrice);
      }
      const discount = Number(dto.discountAmount || 0);
      const tax = Number(dto.taxAmount || 0);
      const totalAmount = Math.max(0, subtotal - discount + tax);

      const order = await this.prisma.sales_orders.create({
        data: {
          company_id: BigInt(1),
          branch_id: branchId,
          customer_id: BigInt(dto.customerId),
          warehouse_id: whId,
          order_number: orderNumber,
          order_date: orderDate,
          status: 'PENDING_DELIVERY',
          subtotal,
          discount_amount: discount,
          tax_amount: tax,
          total_amount: totalAmount,
          notes: dto.notes || dto.paymentTerms || 'أمر بيع جملة وتوريد معتمد',
          created_at: new Date(),
          sales_order_lines: {
            create: dto.items.map((it) => ({
              item_id: BigInt(it.itemId),
              quantity: Number(it.quantity),
              unit_price: Number(it.unitPrice),
              discount_amount: 0,
              tax_amount: 0,
              line_total: Number(it.quantity) * Number(it.unitPrice),
              delivered_quantity: 0,
              notes: it.notes || '',
            })),
          },
        },
        include: {
          customers: true,
          sales_order_lines: {
            include: { items: true },
          },
        },
      });

      this.realtime.server?.emit('sales_order_created', {
        orderNumber: order.order_number,
        customerName: order.customers?.customer_name,
        totalAmount: Number(order.total_amount),
        status: order.status,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        message: 'تم إصدار أمر بيع الجملة المعتمد بنجاح',
        data: {
          ...order,
          id: String(order.id),
          customer_id: String(order.customer_id),
          branch_id: String(order.branch_id),
          warehouse_id: String(order.warehouse_id),
          total_amount: Number(order.total_amount),
        },
      };
    } catch (err: any) {
      console.error('Error creating wholesale order:', err);
      throw new BadRequestException('تعذر إنشاء أمر بيع الجملة: ' + err.message);
    }
  }

  // 6. التوافق مع استدعاءات لوحة العمليات السابقة (pre-order & pay)
  async createPreOrder(dto: any) {
    return this.createPreOrderSlip(dto);
  }

  // Helper لتحويل أمر البيع من قاعدة البيانات إلى JSON سليم بدون أخطاء BigInt
  private serializeDbOrder(d: any) {
    const slipNumber = d.slip_number || d.order_number;
    return {
      id: String(d.id),
      slipNumber,
      barcode: slipNumber,
      orderNumber: d.order_number,
      salesmanCode: 'SLM-01',
      salesmanName: d.salesman_name || 'بائع الصالة الرئيسي',
      branchId: String(d.branch_id || '1'),
      branchName: d.branches?.branch_name || 'معرض المنصورة الرئيسي (حلواني أبو عادل)',
      customerName: d.customers?.customer_name || 'عميل صالة نقدي',
      customerPhone: d.customers?.phone || '',
      createdAt: d.created_at ? d.created_at.toISOString() : new Date().toISOString(),
      paidAt: d.paid_at ? d.paid_at.toISOString() : undefined,
      deliveredAt: d.delivered_at ? d.delivered_at.toISOString() : undefined,
      status: d.status,
      subtotal: Number(d.subtotal || 0),
      discountAmount: Number(d.discount_amount || 0),
      taxAmount: Number(d.tax_amount || 0),
      totalAmount: Number(d.total_amount || 0),
      paidAmount: Number(d.total_amount || 0),
      invoiceNumber: d.order_number,
      cashierName: undefined as string | undefined,
      paymentMethod: undefined as string | undefined,
      notes: d.notes || '',
      items: (d.sales_order_lines || []).map((l: any) => ({
        itemId: String(l.item_id),
        itemName: l.items?.item_name || 'صنف حلويات',
        quantity: Number(l.quantity || 1),
        weight: Number(l.quantity || 1),
        unitPrice: Number(l.unit_price || 0),
        totalPrice: Number(l.line_total || 0),
        notes: l.notes || '',
      })),
    };
  }

  // جلب كافة التصنيفات والأقسام الحقيقية من Neon DB
  async getCategories() {
    const categories = await this.prisma.item_categories.findMany({
      where: { active: true },
      select: {
        id: true,
        category_name: true,
        category_code: true,
        description: true,
      },
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      data: categories.map((c) => ({
        id: String(c.id),
        name: c.category_name,
        code: c.category_code,
        description: c.description || '',
      })),
    };
  }

  // جلب كافة الأصناف والمنتجات الحقيقية من Neon DB مع الأسعار والوحدات
  async getProducts(categoryId?: string) {
    const where: any = { active: true };
    if (categoryId && categoryId !== 'ALL' && categoryId !== 'الكل') {
      if (!isNaN(Number(categoryId))) {
        where.category_id = BigInt(categoryId);
      } else {
        where.item_categories = { category_name: categoryId };
      }
    }

    const items = await this.prisma.items.findMany({
      where,
      include: {
        item_categories: true,
      },
      orderBy: { id: 'asc' },
    });

    return {
      success: true,
      data: items.map((it) => ({
        id: String(it.id),
        itemCode: it.item_code,
        name: it.item_name,
        itemName: it.item_name,
        category: it.item_categories?.category_name || 'عام',
        categoryId: String(it.category_id),
        pricePerKg: Number(it.base_price || 0),
        unitPrice: Number(it.base_price || 0),
        unit: it.unit || 'كجم',
        barcode: it.barcode || it.item_code,
        popular: Number(it.base_price) > 0,
      })),
    };
  }



  // 7. دورة المبيعات ونقاط البيع الحديثة (Showroom Slip -> Cashier -> Dispatch)

  // أ. إنشاء بوليصة تجهيز مبدئية للبائع وحفظها مباشرة في قاعدة البيانات Neon
  async createSlip(dto: any) {
    if (!dto || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('يجب إضافة صنف واحد على الأقل في بوليصة التجهيز');
    }

    const uniqueId = Math.floor(100000 + Math.random() * 900000);
    const slipBarcode = `SLIP-${uniqueId}`;

    let subtotal = 0;
    const linesToCreate: any[] = [];

    for (const it of dto.items) {
      const q = Number(it.quantity || 1);
      const w = Number(it.weight || q);
      const p = Number(it.unitPrice || 0);
      const lineTotal = Number(it.totalPrice || (p * (it.weight ? w : q)));
      subtotal += lineTotal;

      const itemId = !isNaN(Number(it.itemId)) ? BigInt(it.itemId) : BigInt(1);

      linesToCreate.push({
        item_id: itemId,
        quantity: it.weight ? w : q,
        unit_price: p,
        discount_amount: 0,
        tax_amount: 0,
        line_total: lineTotal,
        delivered_quantity: 0,
        notes: it.notes || '',
      });
    }

    const discountAmount = Number(dto.discountAmount || 0);
    const totalAmount = Math.max(0, subtotal - discountAmount);
    const branchId = dto.branchId && !isNaN(Number(dto.branchId)) ? BigInt(dto.branchId) : BigInt(1);
    const customerId = dto.customerId && !isNaN(Number(dto.customerId)) ? BigInt(dto.customerId) : BigInt(3);

    const createdDbOrder = await this.prisma.sales_orders.create({
      data: {
        company_id: BigInt(1),
        branch_id: branchId,
        warehouse_id: BigInt(1),
        customer_id: customerId,
        order_number: slipBarcode,
        slip_number: slipBarcode,
        salesman_id: BigInt(1),
        salesman_name: dto.salesmanName || 'بائع الصالة الرئيسي',
        status: 'PENDING_PAYMENT',
        order_date: new Date(),
        subtotal,
        discount_amount: discountAmount,
        tax_amount: 0,
        total_amount: totalAmount,
        notes: dto.notes ? `${dto.notes} | عميل: ${dto.customerName || 'نقدي'}` : `بوليصة تجهيز صالة - عميل: ${dto.customerName || 'نقدي'}`,
        sales_order_lines: {
          create: linesToCreate,
        },
      },
      include: {
        sales_order_lines: {
          include: {
            items: true,
          },
        },
        branches: true,
        customers: true,
      },
    });

    const slip = this.serializeDbOrder(createdDbOrder);

    // بث الحدث عبر WebSocket لتحديث شاشة الكاشير فورياً دون Refresh
    this.realtime.server?.emit('slip_created', slip);
    this.realtime.server?.emit('sales_order_created', {
      orderNumber: slip.slipNumber,
      customerName: slip.customerName,
      totalAmount: slip.totalAmount,
      status: 'PENDING_PAYMENT',
      timestamp: slip.createdAt,
    });

    return {
      success: true,
      message: 'تم إصدار بوليصة التجهيز للبائع وحفظها بقاعدة البيانات بنجاح',
      data: slip,
    };
  }

  // ب. استرجاع قائمة البوالص المعلقة بانتظار السداد للكاشير حصراً من قاعدة البيانات
  async getPendingSlips() {
    const dbPending = await this.prisma.sales_orders.findMany({
      where: { status: 'PENDING_PAYMENT' },
      include: {
        sales_order_lines: {
          include: {
            items: true,
          },
        },
        branches: true,
        customers: true,
      },
      orderBy: { id: 'desc' },
    });

    const list = dbPending.map((d) => this.serializeDbOrder(d));

    return {
      success: true,
      data: list,
    };
  }

  // ج. استرجاع تفاصيل البوليصة فور مسح الباركود على جهاز الكاشير مباشرة من قاعدة البيانات
  async getSlipByBarcode(barcode: string) {
    if (!barcode) {
      throw new BadRequestException('كود الباركود مطلوب للبحث');
    }

    const cleanCode = barcode.trim();
    const isNumeric = /^\d+$/.test(cleanCode);

    const dbOrder = await this.prisma.sales_orders.findFirst({
      where: {
        OR: [
          { slip_number: cleanCode },
          { order_number: cleanCode },
          ...(isNumeric ? [{ id: BigInt(cleanCode) }] : []),
        ],
      },
      include: {
        sales_order_lines: {
          include: {
            items: true,
          },
        },
        branches: true,
        customers: true,
      },
    });

    if (!dbOrder) {
      throw new NotFoundException(`البوليصة رقم [${cleanCode}] غير مسجلة بقاعدة البيانات`);
    }

    return {
      success: true,
      data: this.serializeDbOrder(dbOrder),
    };
  }

  // د. سداد البوليصة في الخزينة وتحديث الحالة في قاعدة البيانات إلى PAID_PENDING_DELIVERY
  async paySlip(idOrBarcode: string, dto: any) {
    const cleanCode = idOrBarcode.trim();
    const isNumeric = /^\d+$/.test(cleanCode);

    const dbOrder = await this.prisma.sales_orders.findFirst({
      where: {
        OR: [
          { slip_number: cleanCode },
          { order_number: cleanCode },
          ...(isNumeric ? [{ id: BigInt(cleanCode) }] : []),
        ],
      },
      include: {
        sales_order_lines: {
          include: {
            items: true,
          },
        },
        branches: true,
        customers: true,
      },
    });

    if (!dbOrder) {
      throw new NotFoundException(`البوليصة رقم [${cleanCode}] غير مسجلة بقاعدة البيانات`);
    }

    if (dbOrder.status === 'PAID_PENDING_DELIVERY' || dbOrder.status === 'COMPLETED') {
      return {
        success: true,
        message: 'البوليصة مسددة بالفعل مسبقاً وبانتظار التسليم بشباك الاستلام',
        data: this.serializeDbOrder(dbOrder),
      };
    }

    const invoiceCount = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-2026-${invoiceCount}`;
    const cashierName = dto?.cashierName || 'كاشير المعرض الرئيسي';
    const paymentMethod = dto?.paymentMethod || 'CASH';
    const discountAmount = dto?.discountAmount !== undefined ? Number(dto.discountAmount) : Number(dbOrder.discount_amount);
    const newTotal = Math.max(0, Number(dbOrder.subtotal) - discountAmount);
    const paidAt = new Date();

    const updatedOrder = await this.prisma.sales_orders.update({
      where: { id: dbOrder.id },
      data: {
        status: 'PAID_PENDING_DELIVERY',
        discount_amount: discountAmount,
        total_amount: newTotal,
        paid_at: paidAt,
        cashier_id: BigInt(1),
        notes: `تم السداد بالخزينة - الفاتورة: ${invoiceNumber} - طريقة الدفع: ${paymentMethod} - الكاشير: ${cashierName}`,
      },
      include: {
        sales_order_lines: {
          include: {
            items: true,
          },
        },
        branches: true,
        customers: true,
      },
    });

    const slip = this.serializeDbOrder(updatedOrder);
    slip.invoiceNumber = invoiceNumber;
    slip.cashierName = cashierName;
    slip.paymentMethod = paymentMethod;

    // بث الحدث عبر WebSocket إلى شباك التسليم والصالة فوراً
    this.realtime.server?.emit('slip_paid', {
      slipBarcode: slip.barcode,
      invoiceNumber: slip.invoiceNumber,
      customerName: slip.customerName,
      totalAmount: slip.totalAmount,
      cashierName: slip.cashierName,
      paidAt: slip.paidAt,
      itemsCount: slip.items.length,
      status: 'PAID_PENDING_DELIVERY',
      slip,
    });

    return {
      success: true,
      message: `تم سداد البوليصة بنجاح وإصدار الفاتورة الضريبية [${invoiceNumber}]، والطلب جاهز للتسليم بشباك الاستلام`,
      data: slip,
    };
  }

  // هـ. إثبات تسليم الطلب للعميل وتحديث الحالة في قاعدة البيانات إلى COMPLETED
  async deliverOrder(idOrBarcode: string) {
    const cleanCode = idOrBarcode.trim();
    const isNumeric = /^\d+$/.test(cleanCode);

    const dbOrder = await this.prisma.sales_orders.findFirst({
      where: {
        OR: [
          { slip_number: cleanCode },
          { order_number: cleanCode },
          ...(isNumeric ? [{ id: BigInt(cleanCode) }] : []),
        ],
      },
      include: {
        sales_order_lines: {
          include: {
            items: true,
          },
        },
        branches: true,
        customers: true,
      },
    });

    if (!dbOrder) {
      throw new NotFoundException(`الطلب رقم [${cleanCode}] غير مسجل بقاعدة البيانات`);
    }

    const deliveredAt = new Date();

    const updated = await this.prisma.sales_orders.update({
      where: { id: dbOrder.id },
      data: {
        status: 'COMPLETED',
        delivered_at: deliveredAt,
        dispatcher_id: BigInt(1),
      },
      include: {
        sales_order_lines: {
          include: {
            items: true,
          },
        },
        branches: true,
        customers: true,
      },
    });

    // خصم الكميات من stock_balances
    const whId = updated.warehouse_id || BigInt(1);
    for (const line of updated.sales_order_lines) {
      try {
        await this.prisma.stock_balances.upsert({
          where: {
            warehouse_id_item_id: {
              warehouse_id: whId,
              item_id: line.item_id,
            },
          },
          update: {
            quantity: { decrement: Number(line.quantity) },
          },
          create: {
            company_id: updated.company_id,
            warehouse_id: whId,
            item_id: line.item_id,
            quantity: -Number(line.quantity),
            reserved_quantity: 0,
          },
        });
      } catch {}
    }

    const slip = this.serializeDbOrder(updated);

    this.realtime.server?.emit('order_delivered', {
      slipBarcode: slip.barcode,
      invoiceNumber: slip.invoiceNumber,
      customerName: slip.customerName,
      deliveredAt: slip.deliveredAt,
      status: 'COMPLETED',
      slip,
    });

    this.realtime.server?.emit('stock_updated', {
      branchId: slip.branchId,
      timestamp: slip.deliveredAt,
    });

    return {
      success: true,
      message: 'تم إثبات تسليم الطلب للعميل وخصم المخزون الفعلي بنجاح ✓',
      data: slip,
    };
  }

  // و. جلب الطلبات الجاهزة للتسليم في شباك التسليم حصراً من قاعدة البيانات
  async getDispatchOrders() {
    const readyDbOrders = await this.prisma.sales_orders.findMany({
      where: {
        status: { in: ['PAID_PENDING_DELIVERY', 'PAID'] },
      },
      include: {
        sales_order_lines: {
          include: {
            items: true,
          },
        },
        branches: true,
        customers: true,
      },
      orderBy: {
        paid_at: 'asc',
      },
    });

    const completedDbOrders = await this.prisma.sales_orders.findMany({
      where: {
        status: 'COMPLETED',
      },
      include: {
        sales_order_lines: {
          include: {
            items: true,
          },
        },
        branches: true,
        customers: true,
      },
      orderBy: {
        delivered_at: 'desc',
      },
      take: 20,
    });

    const readyToDeliver = readyDbOrders.map((d) => this.serializeDbOrder(d));
    const recentlyDelivered = completedDbOrders.map((d) => this.serializeDbOrder(d));

    return {
      success: true,
      data: {
        readyToDeliver,
        recentlyDelivered,
        counts: {
          ready: readyToDeliver.length,
          deliveredToday: recentlyDelivered.length,
        },
      },
    };
  }

  async createPreOrderSlip(dto: any) {
    return this.createSlip(dto);
  }

  async confirmPayment(orderId: any, paidAmount?: any, invoiceNumber?: any) {
    return this.paySlip(orderId, { paidAmount, invoiceNumber });
  }

  async completeOrderPayment(orderId: any, paidAmount?: any, invoiceNumber?: any) {
    return this.paySlip(orderId, { paidAmount, invoiceNumber });
  }
}
