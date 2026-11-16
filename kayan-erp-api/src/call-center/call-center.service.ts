import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import {
  CreateCallCenterOrderDto,
  CreateCustomerAddressDto,
  UpdateDispatchStatusDto,
} from './dto/call-center.dto.js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class CallCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (obj instanceof Decimal) return Number(obj);
    if (Array.isArray(obj)) return obj.map((item) => this.serializeBigInt(item));
    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const res: any = {};
      for (const key of Object.keys(obj)) {
        res[key] = this.serializeBigInt(obj[key]);
      }
      return res;
    }
    return obj;
  }

  // 1. البحث الفوري عن العميل برقم الهاتف والتوجيه الذكي
  async lookupCustomer(phone: string, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const cleanPhone = phone.trim();

    if (!cleanPhone) {
      return { success: false, message: 'يرجى إدخال رقم الهاتف' };
    }

    // تسجيل المكالمة الواردة في سجل الاتصالات
    try {
      await this.prisma.call_logs.create({
        data: {
          company_id: cid,
          call_type: 'ORDER',
          phone_number: cleanPhone,
          notes: 'بحث مكالمة طلب كول سنتر',
        },
      });
    } catch (e) {
      // ignore log failure
    }

    // البحث في جدول العملاء
    const customer = await this.prisma.customers.findFirst({
      where: {
        company_id: cid,
        OR: [
          { phone: cleanPhone },
          { phone: { contains: cleanPhone } },
        ],
      },
      include: {
        customer_addresses: {
          include: {
            delivery_zones: {
              include: {
                branches: true,
              },
            },
          },
          orderBy: { is_default: 'desc' },
        },
      },
    });

    if (!customer) {
      return this.serializeBigInt({
        success: true,
        data: {
          isFound: false,
          phone: cleanPhone,
          customer: null,
          recentOrders: [],
        },
      });
    }

    // استرجاع آخر 5 طلبات سابقة للعميل لإتاحة "إعادة الطلب بضغطة واحدة"
    const recentOrders = await this.prisma.sales_orders.findMany({
      where: {
        company_id: cid,
        customer_id: customer.id,
      },
      include: {
        sales_order_lines: {
          include: {
            items: true,
            inventory_batches: true,
          },
        },
        branches: true,
      },
      orderBy: { created_at: 'desc' },
      take: 5,
    });

    return this.serializeBigInt({
      success: true,
      data: {
        isFound: true,
        customer: {
          id: String(customer.id),
          customerName: customer.customer_name,
          customerCode: customer.customer_code,
          phone: customer.phone,
          email: customer.email,
          trustScore: customer.trust_score ?? 100,
          complaintsCount: customer.complaints_count ?? 0,
          preferencesNotes: customer.preferences_notes,
          addresses: customer.customer_addresses.map((addr) => ({
            id: String(addr.id),
            label: addr.label,
            streetAddress: addr.street_address,
            landmark: addr.landmark,
            floor: addr.floor,
            apartment: addr.apartment,
            isDefault: addr.is_default,
            zoneId: addr.zone_id ? String(addr.zone_id) : null,
            zoneName: addr.delivery_zones?.name,
            deliveryFee: Number(addr.delivery_zones?.delivery_fee || 0),
            estimatedMinutes: addr.delivery_zones?.estimated_minutes || 45,
            branchId: addr.delivery_zones?.branch_id ? String(addr.delivery_zones.branch_id) : null,
            branchName: addr.delivery_zones?.branches?.branch_name,
          })),
        },
        recentOrders: recentOrders.map((ord) => ({
          id: String(ord.id),
          orderNumber: ord.order_number,
          orderDate: ord.order_date,
          status: ord.status,
          deliveryStatus: ord.delivery_status,
          totalAmount: Number(ord.total_amount),
          branchName: ord.branches?.branch_name,
          items: ord.sales_order_lines.map((l) => ({
            lineId: String(l.id),
            itemId: String(l.item_id),
            itemName: l.items?.item_name,
            itemCode: l.items?.item_code,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unit_price),
            lineTotal: Number(l.line_total || 0),
            batchId: l.batch_id ? String(l.batch_id) : null,
            batchNumber: l.inventory_batches?.batch_number,
          })),
        })),
      },
    });
  }

  // 2. إنشاء عميل جديد وتخزين بياناته
  async createQuickCustomer(dto: { name: string; phone: string; address?: string; notes?: string }, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const code = `CUST-${Date.now().toString().slice(-5)}`;

    const newCust = await this.prisma.customers.create({
      data: {
        company_id: cid,
        customer_name: dto.name,
        customer_code: code,
        phone: dto.phone,
        address: dto.address,
        notes: dto.notes,
        trust_score: 100,
        complaints_count: 0,
        credit_limit: new Decimal(0),
      },
    });

    return this.serializeBigInt({
      success: true,
      message: 'تم إضافة العميل بنجاح',
      data: newCust,
    });
  }

  // 3. إضافة عنوان جديد لعميل
  async addCustomerAddress(dto: CreateCustomerAddressDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const cId = BigInt(dto.customerId);
    const zId = dto.zoneId ? BigInt(dto.zoneId) : null;

    if (dto.isDefault) {
      await this.prisma.customer_addresses.updateMany({
        where: { customer_id: cId, company_id: cid },
        data: { is_default: false },
      });
    }

    const addr = await this.prisma.customer_addresses.create({
      data: {
        company_id: cid,
        customer_id: cId,
        zone_id: zId,
        label: dto.label || 'المنزل',
        street_address: dto.streetAddress,
        landmark: dto.landmark,
        floor: dto.floor,
        apartment: dto.apartment,
        is_default: dto.isDefault || false,
      },
      include: {
        delivery_zones: {
          include: { branches: true },
        },
      },
    });

    return this.serializeBigInt({
      success: true,
      message: 'تم حفظ العنوان بنجاح',
      data: addr,
    });
  }

  // 4. استرجاع مناطق التوصيل المعتمدة والفروع المغطية
  async getDeliveryZones(companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const zones = await this.prisma.delivery_zones.findMany({
      where: { company_id: cid, is_active: true },
      include: { branches: true },
      orderBy: { name: 'asc' },
    });

    return this.serializeBigInt({
      success: true,
      data: zones.map((z) => ({
        id: String(z.id),
        name: z.name,
        branchId: String(z.branch_id),
        branchName: z.branches?.branch_name,
        deliveryFee: Number(z.delivery_fee),
        estimatedMinutes: z.estimated_minutes,
      })),
    });
  }

  // 5. استرجاع الرصيد المتاح الفعلي للفرع المغطي مع أولوية الصرف FEFO
  async getBranchStockFEFO(branchId: string | number, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const bId = BigInt(branchId);

    // العثور على مستودع الفرع
    const warehouses = await this.prisma.warehouses.findMany({
      where: { company_id: cid, branch_id: bId },
    });

    const warehouseIds = warehouses.map((w) => w.id);

    // جلب كافة الأصناف مع تشغيلاتها المتاحة وغير المجمدة (FEFO: أقدم تاريخ صلاحية أولاً)
    const batches = await this.prisma.inventory_batches.findMany({
      where: {
        company_id: cid,
        warehouse_id: { in: warehouseIds },
        is_frozen: false,
        current_quantity: { gt: 0 },
      },
      orderBy: { expiry_date: 'asc' },
    });

    // جلب بيانات الأصناف
    const items = await this.prisma.items.findMany({
      where: { company_id: cid, active: true },
      include: {
        item_categories: true,
      },
      orderBy: { item_name: 'asc' },
    });

    // دمج الرصيد اللحظي والتشغيلات
    const stockCatalog = items.map((item) => {
      const itemBatches = batches.filter((b) => b.item_id === item.id);
      const totalAvailable = itemBatches.reduce((acc, b) => acc + Number(b.current_quantity), 0);

      return {
        id: String(item.id),
        name: item.item_name,
        code: item.item_code,
        category: item.item_categories?.category_name || 'عام',
        unit: item.unit || 'قطعة',
        basePrice: Number(item.base_price || 0) || 50,
        totalStock: totalAvailable,
        batches: itemBatches.map((b) => ({
          batchId: String(b.id),
          batchNumber: b.batch_number,
          currentQuantity: Number(b.current_quantity),
          expiryDate: b.expiry_date,
          productionDate: b.production_date,
        })),
        recommendedBatch: itemBatches.length > 0 ? {
          batchId: String(itemBatches[0].id),
          batchNumber: itemBatches[0].batch_number,
          currentQuantity: Number(itemBatches[0].current_quantity),
          expiryDate: itemBatches[0].expiry_date,
        } : null,
      };
    });

    return this.serializeBigInt({
      success: true,
      data: stockCatalog,
    });
  }

  // 6. إنشاء وتوجيه طلب الكول سنتر (Branch Ready vs Custom Production)
  async createCallCenterOrder(dto: CreateCallCenterOrderDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const branchId = BigInt(dto.branchId);
    const customerId = BigInt(dto.customerId);

    // تحديد مستودع الصرف التابع للفرع
    let warehouse = await this.prisma.warehouses.findFirst({
      where: { company_id: cid, branch_id: branchId },
    });

    if (!warehouse) {
      warehouse = await this.prisma.warehouses.findFirst({
        where: { company_id: cid },
      });
    }

    const warehouseId = warehouse?.id || BigInt(1);

    let subtotal = 0;
    const orderLinesData: any[] = [];

    // حساب المجاميع والتشغيلات
    for (const item of dto.items) {
      const qty = Number(item.quantity);
      const price = Number(item.unitPrice);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      let assignedBatchId: bigint | null = null;

      if (dto.orderType === 'BRANCH_READY') {
        if (item.batchId) {
          assignedBatchId = BigInt(item.batchId);
          // خصم الرصيد من التشغيلة المحددة
          await this.prisma.inventory_batches.update({
            where: { id: assignedBatchId },
            data: {
              current_quantity: { decrement: new Decimal(qty) },
            },
          });
        } else {
          // استهلاك تلقائي بأولوية FEFO
          const earliestBatch = await this.prisma.inventory_batches.findFirst({
            where: {
              company_id: cid,
              warehouse_id: warehouseId,
              item_id: BigInt(item.itemId),
              is_frozen: false,
              current_quantity: { gte: new Decimal(qty) },
            },
            orderBy: { expiry_date: 'asc' },
          });

          if (earliestBatch) {
            assignedBatchId = earliestBatch.id;
            await this.prisma.inventory_batches.update({
              where: { id: earliestBatch.id },
              data: {
                current_quantity: { decrement: new Decimal(qty) },
              },
            });
          }
        }
      }

      orderLinesData.push({
        item_id: BigInt(item.itemId),
        batch_id: assignedBatchId,
        quantity: new Decimal(qty),
        unit_price: new Decimal(price),
        discount_amount: new Decimal(0),
        tax_amount: new Decimal(0),
        line_total: new Decimal(lineTotal),
        delivered_quantity: new Decimal(0),
        notes: item.notes,
      });
    }

    const deliveryFee = Number(dto.deliveryFee || 0);
    const totalAmount = subtotal + deliveryFee;
    const orderNumber = `CCO-${Date.now().toString().slice(-6)}`;

    // مسار 1: أوردر جاهز من الفرع
    const deliveryStatus = dto.orderType === 'CUSTOM_PRODUCTION' ? 'PENDING_BRANCH' : 'PREPARING';
    const initialStatus = dto.orderType === 'CUSTOM_PRODUCTION' ? 'PENDING_PRODUCTION' : 'CONFIRMED';

    const order = await this.prisma.sales_orders.create({
      data: {
        company_id: cid,
        branch_id: branchId,
        warehouse_id: warehouseId,
        customer_id: customerId,
        order_number: orderNumber,
        status: initialStatus,
        order_source: 'CALL_CENTER',
        delivery_status: deliveryStatus,
        delivery_fee: new Decimal(deliveryFee),
        delivery_zone_id: dto.deliveryZoneId ? BigInt(dto.deliveryZoneId) : null,
        subtotal: new Decimal(subtotal),
        discount_amount: new Decimal(0),
        tax_amount: new Decimal(0),
        total_amount: new Decimal(totalAmount),
        notes: `[طلب كول سنتر - ${dto.orderType === 'CUSTOM_PRODUCTION' ? 'تصنيع خاص' : 'فوري من الفرع'}] ${dto.notes || ''}`,
        sales_order_lines: {
          create: orderLinesData,
        },
      },
      include: {
        sales_order_lines: {
          include: { items: true },
        },
        customers: true,
        branches: true,
      },
    });

    // مسار 2: في حال كان الطلب طلب تصنيع خاص (CUSTOM_PRODUCTION) -> توجيه أمر إنتاج للمصنع
    let mesWorkOrderNumber: string | null = null;
    if (dto.orderType === 'CUSTOM_PRODUCTION') {
      mesWorkOrderNumber = `PO-CUSTOM-${Date.now().toString().slice(-5)}`;
      await this.prisma.production_orders.create({
        data: {
          company_id: cid,
          warehouse_id: warehouseId,
          order_number: mesWorkOrderNumber,
          status: 'PENDING_PRODUCTION',
          notes: `[أوردر خاص للمصنع من الكول سنتر] رقم طلب البيع: ${orderNumber} - العميل: ${order.customers?.customer_name || ''} - الملاحظات: ${dto.notes || 'مطلوب تجهيز وتوريد خاص'}`,
        },
      });
    }

    // إرسال تنبيه فوري بالـ WebSocket للفرع وقسم التوصيل
    try {
      this.realtime?.server?.emit('callcenter:new_order', {
        orderId: String(order.id),
        orderNumber,
        branchId: String(branchId),
        orderType: dto.orderType,
        totalAmount,
        customerName: order.customers?.customer_name,
        timestamp: new Date(),
      });
    } catch (e) {
      // ignore websocket errors
    }

    return this.serializeBigInt({
      success: true,
      message: dto.orderType === 'CUSTOM_PRODUCTION'
        ? `تم تسجيل الطلب وتوجيه أمر تصنيع خاص للمصنع برقم ${mesWorkOrderNumber}`
        : `تم إصدار وتوجيه الطلب للفرع برقم ${orderNumber}`,
      data: {
        order,
        mesWorkOrderNumber,
      },
    });
  }

  // 7. استرجاع طلبات التوصيل لشاشة الدليفري والطيارين
  async getDispatchOrders(
    companyId: string | number = 1,
    query?: { deliveryStatus?: string; branchId?: string; search?: string },
  ) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };

    if (query?.deliveryStatus && query.deliveryStatus !== 'ALL') {
      where.delivery_status = query.deliveryStatus;
    }
    if (query?.branchId && query.branchId !== 'ALL') {
      where.branch_id = BigInt(query.branchId);
    }

    const orders = await this.prisma.sales_orders.findMany({
      where,
      include: {
        customers: {
          include: {
            customer_addresses: {
              where: { is_default: true },
            },
          },
        },
        branches: true,
        sales_order_lines: {
          include: { items: true, inventory_batches: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 60,
    });

    return this.serializeBigInt({
      success: true,
      data: orders.map((o) => ({
        id: String(o.id),
        orderNumber: o.order_number,
        orderDate: o.order_date,
        createdAt: o.created_at,
        orderSource: o.order_source || 'CALL_CENTER',
        deliveryStatus: o.delivery_status || 'PREPARING',
        totalAmount: Number(o.total_amount),
        deliveryFee: Number(o.delivery_fee || 0),
        driverId: o.driver_id ? String(o.driver_id) : null,
        driverName: o.driver_name,
        branchId: o.branch_id ? String(o.branch_id) : null,
        branchName: o.branches?.branch_name,
        notes: o.notes,
        customer: {
          id: o.customers ? String(o.customers.id) : null,
          name: o.customers?.customer_name || 'عميل نقدي',
          phone: o.customers?.phone || 'غير مسجل',
          address: o.customers?.customer_addresses?.[0]?.street_address || o.customers?.address || 'استلام بالفرع',
        },
        itemsCount: o.sales_order_lines.length,
        items: o.sales_order_lines.map((l) => ({
          name: l.items?.item_name,
          quantity: Number(l.quantity),
          batchNumber: l.inventory_batches?.batch_number,
        })),
      })),
    });
  }

  // 8. تحديث حالة التوصيل وتعيين الطيار
  async updateDispatchStatus(orderId: string | number, dto: UpdateDispatchStatusDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const ordId = BigInt(orderId);

    const updateData: any = {
      delivery_status: dto.deliveryStatus,
    };

    if (dto.driverId) {
      updateData.driver_id = BigInt(dto.driverId);
    }
    if (dto.driverName) {
      updateData.driver_name = dto.driverName;
    }
    if (dto.deliveryStatus === 'DELIVERED') {
      updateData.delivered_at = new Date();
      updateData.status = 'COMPLETED';
    }

    const updated = await this.prisma.sales_orders.update({
      where: { id: ordId },
      data: updateData,
    });

    // إرسال تنبيه بالـ WebSocket
    try {
      this.realtime?.server?.emit('dispatch:status_changed', {
        orderId: String(ordId),
        deliveryStatus: dto.deliveryStatus,
        driverName: dto.driverName,
      });
    } catch (e) {
      // ignore
    }

    return this.serializeBigInt({
      success: true,
      message: 'تم تحديث حالة التوصيل بنجاح',
      data: updated,
    });
  }

  // 9. استرجاع قائمة الطيارين المتاحين
  async getDispatchDrivers(companyId: string | number = 1) {
    const cid = BigInt(companyId);

    // من أسطول المركبات أو الموظفين
    const fleet = await this.prisma.fleet_vehicles.findMany({
      where: { company_id: cid },
    });

    const drivers = fleet.map((f) => ({
      id: String(f.id),
      name: f.driver_name,
      phone: f.driver_phone,
      vehicleType: f.vehicle_type,
      plateNumber: f.plate_number,
      status: f.status,
    }));

    // إضافة طيارين افتراضيين معتمدين إذا لم تتوفر مركبات
    if (drivers.length === 0) {
      return {
        success: true,
        data: [
          { id: '101', name: 'أحمد محمود (طيار 1 - دراجة نارية)', phone: '01012345671', vehicleType: 'موتوسيكل', status: 'AVAILABLE' },
          { id: '102', name: 'كريم عبد الله (طيار 2 - دراجة نارية)', phone: '01012345672', vehicleType: 'موتوسيكل', status: 'AVAILABLE' },
          { id: '103', name: 'محمود الصاوي (طيار 3 - سيارة مبردة)', phone: '01012345673', vehicleType: 'سيارة مبردة', status: 'AVAILABLE' },
        ],
      };
    }

    return this.serializeBigInt({
      success: true,
      data: drivers,
    });
  }
}
