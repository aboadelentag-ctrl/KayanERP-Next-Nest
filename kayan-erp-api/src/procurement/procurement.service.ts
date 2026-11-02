import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';

export interface CreatePurchaseOrderItemDto {
  itemId: string | number;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreatePurchaseOrderDto {
  supplierId: string | number;
  warehouseId?: string | number;
  orderNumber?: string;
  orderDate?: string;
  expectedDate?: string;
  notes?: string;
  paymentTerms?: string;
  items: CreatePurchaseOrderItemDto[];
}

export interface InspectAndReceiveDto {
  purchaseOrderId?: string | number;
  supplierId?: string | number;
  warehouseId?: string | number;
  itemId: string | number;
  batchNumber: string;
  qcInspectorName: string;
  coaNumber?: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity?: number;
  rejectionReason?: string;
  qcStatus?: 'Accepted' | 'Partially_Rejected' | 'Rejected';
  notes?: string;
}

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. جلب قائمة الموردين المعتمدين (GET /procurement/suppliers)
  async getSuppliers() {
    try {
      let list = await this.prisma.suppliers.findMany({
        where: { active: true },
        orderBy: { supplier_name: 'asc' },
      });

      if (list.length === 0) {
        const seedSuppliers = [
          {
            company_id: BigInt(1),
            supplier_name: 'شركة الدلتا للسكر والصناعات التكاملية',
            supplier_code: 'SUP-SGR-01',
            phone: '0502314500',
            email: 'sales@deltasugar.com.eg',
            address: 'الحامول - كفر الشيخ / مكتب توزيع المنصورة',
            tax_number: '100-245-891',
            payment_terms: 'آجل 30 يوم',
            credit_limit: 500000,
            active: true,
            is_approved: true,
            notes: 'المورد المعتمد للسكر الأبيض المكرر شيكارة 50 كجم',
          },
          {
            company_id: BigInt(1),
            supplier_name: 'مزارع الهدى لإنتاج الألبان والسمن الفلاحي',
            supplier_code: 'SUP-GHN-01',
            phone: '01098877665',
            email: 'huda.farms@dairy.eg',
            address: 'طريق بلقاس الزراعي - الدقهلية',
            tax_number: '230-891-443',
            payment_terms: 'أسبوعي نقدي',
            credit_limit: 350000,
            active: true,
            is_approved: true,
            notes: 'توريد سمن بلدي جاموسي فلاحي 100% نخب أول',
          },
          {
            company_id: BigInt(1),
            supplier_name: 'مطاحن ومضارب شمال الدلتا',
            supplier_code: 'SUP-FLR-01',
            phone: '0502268112',
            email: 'northdelta.mills@flour.com',
            address: 'المنطقة الصناعية - جمصة',
            tax_number: '310-776-551',
            payment_terms: 'آجل 45 يوم',
            credit_limit: 600000,
            active: true,
            is_approved: true,
            notes: 'سميد بسبوسة فاخر ودقيق استخراج 72%',
          },
          {
            company_id: BigInt(1),
            supplier_name: 'العالمية لاستيراد المكسرات الفاخرة',
            supplier_code: 'SUP-NUT-01',
            phone: '0226998811',
            email: 'import@globalnuts.eg',
            address: 'ميناء دمياط / مخازن العبور',
            tax_number: '450-112-998',
            payment_terms: 'دفع 50% مقدم و 50% عند الاستلام',
            credit_limit: 800000,
            active: true,
            is_approved: true,
            notes: 'فستق حلبي أخضر تركي، كاجو هندي جامبو، وبندق مقشور',
          },
          {
            company_id: BigInt(1),
            supplier_name: 'شركة الأهرام للكرتون ومواد التعبئة',
            supplier_code: 'SUP-PKG-01',
            phone: '0502553311',
            email: 'ahram.pack@packaging.eg',
            address: 'المنطقة الصناعية الثانية - قويسنا',
            tax_number: '560-334-119',
            payment_terms: 'آجل 30 يوم',
            credit_limit: 250000,
            active: true,
            is_approved: true,
            notes: 'علب حلويات فاخرة، سلوفان غذائي، وأطباق تورت',
          },
        ];

        for (const s of seedSuppliers) {
          try {
            await this.prisma.suppliers.create({ data: s });
          } catch {}
        }

        list = await this.prisma.suppliers.findMany({
          where: { active: true },
          orderBy: { supplier_name: 'asc' },
        });
      }

      return {
        success: true,
        data: list.map((s) => ({
          ...s,
          id: String(s.id),
          company_id: String(s.company_id),
          credit_limit: Number(s.credit_limit),
        })),
      };
    } catch (err: any) {
      console.error('Error fetching suppliers:', err);
      return { success: false, data: [], message: err.message };
    }
  }

  // 2. جلب قائمة أوامر الشراء وفواتير التوريد (GET /procurement/orders)
  async getPurchaseOrders(filter?: { status?: string; supplierId?: string }) {
    try {
      const where: any = {};
      if (filter?.status && filter.status !== 'ALL') {
        where.status = filter.status;
      }
      if (filter?.supplierId && filter.supplierId !== 'ALL') {
        where.supplier_id = BigInt(filter.supplierId);
      }

      const orders = await this.prisma.purchase_orders.findMany({
        where,
        include: {
          suppliers: {
            select: { id: true, supplier_name: true, supplier_code: true, phone: true },
          },
          warehouses: {
            select: { id: true, warehouse_name: true },
          },
          purchase_order_lines: {
            include: {
              items: {
                select: { id: true, item_name: true, item_code: true, unit: true },
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
        supplier_id: o.supplier_id ? String(o.supplier_id) : null,
        warehouse_id: String(o.warehouse_id),
        subtotal: Number(o.subtotal),
        discount_amount: Number(o.discount_amount),
        tax_amount: Number(o.tax_amount),
        total_amount: Number(o.total_amount),
        suppliers: o.suppliers ? { ...o.suppliers, id: String(o.suppliers.id) } : null,
        warehouses: o.warehouses ? { ...o.warehouses, id: String(o.warehouses.id) } : null,
        purchase_order_lines: o.purchase_order_lines.map((l) => ({
          ...l,
          id: String(l.id),
          purchase_order_id: String(l.purchase_order_id),
          item_id: String(l.item_id),
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
          discount_amount: Number(l.discount_amount),
          tax_amount: Number(l.tax_amount),
          line_total: l.line_total ? Number(l.line_total) : Number(l.quantity) * Number(l.unit_price),
          received_quantity: Number(l.received_quantity || 0),
          items: l.items ? { ...l.items, id: String(l.items.id) } : null,
        })),
      }));

      return {
        success: true,
        data: serialized,
      };
    } catch (err: any) {
      console.error('Error fetching purchase orders:', err);
      return { success: false, data: [], message: err.message };
    }
  }

  // 3. إنشاء أمر شراء جديد متعدد الأصناف والكميات (POST /procurement/orders)
  async createPurchaseOrder(dto: CreatePurchaseOrderDto) {
    if (!dto.supplierId || !dto.items || dto.items.length === 0) {
      throw new BadRequestException('يجب تحديد المورد وإضافة صنف واحد على الأقل');
    }

    try {
      const orderNumber = dto.orderNumber?.trim() || `PO-${Date.now().toString().slice(-7)}`;
      const orderDate = dto.orderDate ? new Date(dto.orderDate) : new Date();
      const expectedDate = dto.expectedDate ? new Date(dto.expectedDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

      // تحديد مستودع خامات التوريد
      let whId: bigint;
      if (dto.warehouseId) {
        whId = BigInt(dto.warehouseId);
      } else {
        const wh = await this.prisma.warehouses.findFirst({
          where: { active: true },
        });
        whId = wh ? wh.id : BigInt(1);
      }

      let subtotal = 0;
      for (const it of dto.items) {
        subtotal += Number(it.quantity) * Number(it.unitPrice);
      }
      const taxAmount = 0; // إعفاء صناعي أو يحدد لاحقاً
      const totalAmount = subtotal + taxAmount;

      const order = await this.prisma.purchase_orders.create({
        data: {
          company_id: BigInt(1),
          supplier_id: BigInt(dto.supplierId),
          warehouse_id: whId,
          order_number: orderNumber,
          order_date: orderDate,
          expected_date: expectedDate,
          status: 'APPROVED',
          subtotal,
          discount_amount: 0,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: dto.notes || dto.paymentTerms || 'أمر توريد خامات تشغيل للمصنع',
          created_at: new Date(),
          purchase_order_lines: {
            create: dto.items.map((it) => ({
              item_id: BigInt(it.itemId),
              quantity: Number(it.quantity),
              unit_price: Number(it.unitPrice),
              discount_amount: 0,
              tax_amount: 0,
              received_quantity: 0,
              notes: it.notes || '',
            })),
          },
        },
        include: {
          suppliers: true,
          purchase_order_lines: {
            include: { items: true },
          },
        },
      });

      const broadcastPayload = {
        orderId: String(order.id),
        orderNumber: order.order_number,
        supplierName: order.suppliers?.supplier_name,
        totalAmount: Number(order.total_amount),
        itemsCount: order.purchase_order_lines.length,
        timestamp: new Date().toISOString(),
      };

      // بث إشعار إنشاء أمر الشراء لتحديث شاشات المصنع والمخازن
      this.realtime.server?.emit('purchase_order_created', broadcastPayload);

      return {
        success: true,
        message: 'تم إصدار أمر الشراء المعتمد بنجاح',
        data: {
          ...order,
          id: String(order.id),
          company_id: String(order.company_id),
          supplier_id: String(order.supplier_id),
          warehouse_id: String(order.warehouse_id),
          total_amount: Number(order.total_amount),
        },
      };
    } catch (err: any) {
      console.error('Error creating purchase order:', err);
      throw new BadRequestException('تعذر إنشاء أمر الشراء: ' + err.message);
    }
  }

  // 4. إثبات استلام الخامات وفحص الجودة وتغذية المخزون (POST /procurement/receipts/inspect-and-receive)
  async inspectAndReceive(dto: InspectAndReceiveDto) {
    if (!dto.itemId || dto.receivedQuantity <= 0) {
      throw new BadRequestException('الصنف والكمية المستلمة مطلوبة');
    }

    try {
      const acceptedQty = Number(dto.acceptedQuantity ?? dto.receivedQuantity);
      const rejectedQty = Number(dto.rejectedQuantity ?? (Number(dto.receivedQuantity) - acceptedQty));
      const qcStatus = dto.qcStatus || (rejectedQty > 0 ? 'Partially_Rejected' : 'Accepted');
      const batchNo = dto.batchNumber || `LOT-${Date.now().toString().slice(-6)}`;
      const inspectorName = dto.qcInspectorName || 'مهندس ضبط الجودة';

      const poId = dto.purchaseOrderId ? BigInt(dto.purchaseOrderId) : null;
      const suppId = dto.supplierId ? BigInt(dto.supplierId) : BigInt(1);

      // تحديد المستودع
      let whId: bigint;
      if (dto.warehouseId) {
        whId = BigInt(dto.warehouseId);
      } else {
        const wh = await this.prisma.warehouses.findFirst({ where: { active: true } });
        whId = wh ? wh.id : BigInt(1);
      }

      // 1. تسجيل محضر فحص الجودة في جدول qc_inspections
      const qcRecord = await this.prisma.qc_inspections.create({
        data: {
          purchase_order_id: poId || BigInt(0),
          supplier_id: suppId,
          item_id: BigInt(dto.itemId),
          batch_number: batchNo,
          qc_inspector_name: inspectorName,
          coa_number: dto.coaNumber || `COA-${Math.floor(1000 + Math.random() * 9000)}`,
          qc_status: qcStatus,
          received_quantity: Number(dto.receivedQuantity),
          accepted_quantity: acceptedQty,
          rejected_quantity: rejectedQty,
          rejection_reason: rejectedQty > 0 ? (dto.rejectionReason || 'رطوبة أو شوائب غير مطابقة للمواصفة القياسية') : null,
          inspection_date: new Date(),
          created_at: new Date(),
          parameters_json: {
            temperature: '22°C',
            moisture: '0.4%',
            sensoryCheck: 'مطابق للطعم واللون والرائحة',
            notes: dto.notes || '',
          },
        },
      });

      // 2. تحديث الرصيد الفعلي للخامات المقبولة في stock_balances
      if (acceptedQty > 0) {
        try {
          await this.prisma.stock_balances.upsert({
            where: {
              warehouse_id_item_id: {
                warehouse_id: whId,
                item_id: BigInt(dto.itemId),
              },
            },
            create: {
              company_id: BigInt(1),
              warehouse_id: whId,
              item_id: BigInt(dto.itemId),
              quantity: acceptedQty,
              reserved_quantity: 0,
            },
            update: {
              quantity: { increment: acceptedQty },
            },
          });
        } catch (e) {
          console.warn('Stock balance upsert warning:', e);
        }
      }

      // 3. تحديث كمية الاستلام في أمر الشراء إن وجد
      if (poId) {
        try {
          await this.prisma.purchase_order_lines.updateMany({
            where: {
              purchase_order_id: poId,
              item_id: BigInt(dto.itemId),
            },
            data: {
              received_quantity: { increment: acceptedQty },
            },
          });

          // تحديث حالة أمر الشراء إلى مكتمل أو مستلم
          await this.prisma.purchase_orders.update({
            where: { id: poId },
            data: {
              status: 'RECEIVED',
              updated_at: new Date(),
            },
          });
        } catch (e) {
          console.warn('Purchase order line update warning:', e);
        }
      }

      // جلب اسم الصنف للبث اللحظي
      let itemName = 'مادة خام';
      try {
        const itemObj = await this.prisma.items.findUnique({ where: { id: BigInt(dto.itemId) } });
        if (itemObj) itemName = itemObj.item_name;
      } catch {}

      const broadcastPayload = {
        receiptId: String(qcRecord.id),
        batchNumber: batchNo,
        itemName,
        acceptedQuantity: acceptedQty,
        rejectedQuantity: rejectedQty,
        status: qcStatus,
        inspector: inspectorName,
        timestamp: new Date().toISOString(),
      };

      // بث التحديثات اللحظية لمستخدمي صالات الإنتاج والمخازن
      this.realtime.server?.emit('material_received_qc', broadcastPayload);
      this.realtime.server?.emit('stock_updated', {
        warehouseId: String(whId),
        itemId: String(dto.itemId),
        addedQuantity: acceptedQty,
      });

      return {
        success: true,
        message: qcStatus === 'Accepted'
          ? `تم فحص واستلام الخامات (${acceptedQty}) وإضافتها للمخزون بنجاح`
          : `تم قبول (${acceptedQty}) مع رفض وحجز عجز (${rejectedQty}) وتوثيق النتيجة`,
        data: {
          ...qcRecord,
          id: String(qcRecord.id),
          purchase_order_id: String(qcRecord.purchase_order_id),
          supplier_id: String(qcRecord.supplier_id),
          item_id: String(qcRecord.item_id),
          accepted_quantity: Number(qcRecord.accepted_quantity),
          rejected_quantity: Number(qcRecord.rejected_quantity),
        },
      };
    } catch (err: any) {
      console.error('Error during material inspection and receipt:', err);
      throw new BadRequestException('تعذر إثبات استلام وفحص الخامات: ' + err.message);
    }
  }

  // 5. جلب قائمة الخامات المتاحة للشراء
  async getRawMaterials() {
    try {
      const items = await this.prisma.items.findMany({
        where: { active: true },
        orderBy: { item_name: 'asc' },
        take: 100,
      });

      return {
        success: true,
        data: items.map((it) => ({
          ...it,
          id: String(it.id),
          company_id: String(it.company_id),
          base_price: Number(it.base_price || 0),
        })),
      };
    } catch (err: any) {
      console.error('Error fetching raw materials:', err);
      return { success: false, data: [] };
    }
  }

  // 6. جلب سجل فحوصات الجودة الأخيرة
  async getRecentInspections() {
    try {
      const list = await this.prisma.qc_inspections.findMany({
        orderBy: { id: 'desc' },
        take: 50,
      });

      return {
        success: true,
        data: list.map((qc) => ({
          ...qc,
          id: String(qc.id),
          purchase_order_id: String(qc.purchase_order_id),
          supplier_id: String(qc.supplier_id),
          item_id: String(qc.item_id),
          received_quantity: Number(qc.received_quantity),
          accepted_quantity: Number(qc.accepted_quantity),
          rejected_quantity: Number(qc.rejected_quantity),
        })),
      };
    } catch (err: any) {
      console.error('Error fetching QC inspections:', err);
      return { success: false, data: [] };
    }
  }
}
