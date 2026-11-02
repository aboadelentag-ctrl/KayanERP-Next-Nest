import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { getCurrentTenant } from '../common/tenant.context.js';

export class StockMovementDto {
  companyId?: string | number;
  branchId?: string | number;
  warehouseId: string | number;
  itemId: string | number;
  movementType: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceId?: string | number;
  notes?: string;
}

export class WarehouseTransferDto {
  fromWarehouseId: string | number;
  toWarehouseId: string | number;
  itemId: string | number;
  quantity: number;
  notes?: string;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. استعراض قائمة المستودعات الحقيقية من قاعدة بيانات Neon
  async getWarehouses() {
    const dbWarehouses = await this.prisma.warehouses.findMany({
      include: { branches: true },
      orderBy: { id: 'asc' },
    });

    const serialized = dbWarehouses.map((w: any) => ({
      id: String(w.id),
      warehouseCode: w.warehouse_code,
      warehouseName: w.warehouse_name,
      warehouseType: w.warehouse_type || 'General',
      active: w.active ?? true,
      branchName: w.branches?.branch_name || 'المركز الرئيسي',
    }));

    return { success: true, data: serialized };
  }

  // 2. دليل الأصناف والمكونات الحقيقية
  async getItems(category?: string) {
    const where: any = { active: true };
    if (category && category !== 'ALL' && category !== 'الكل') {
      if (!isNaN(Number(category))) {
        where.category_id = BigInt(category);
      } else {
        where.item_categories = { category_name: category };
      }
    }

    const dbItems = await this.prisma.items.findMany({
      where,
      include: { item_categories: true },
      orderBy: { id: 'asc' },
    });

    const serialized = dbItems.map((i: any) => ({
      id: String(i.id),
      itemCode: i.item_code,
      itemName: i.item_name,
      category: i.item_categories?.category_name || 'عام',
      categoryId: String(i.category_id),
      unit: i.unit || 'وحدة',
      standardCost: Number(i.base_price || 0),
      retailPrice: Number(i.base_price || 0),
      reorderPoint: Number(i.reorder_level || 50),
      currentStock: 0,
      barcode: i.barcode || i.item_code,
    }));

    return { success: true, data: serialized };
  }

  // 3. جرد الأرصدة للمستودعات الحي من جدول stock_balances
  async getStockBalances(warehouseId?: string) {
    const where: any = {};
    if (warehouseId && !isNaN(Number(warehouseId))) {
      where.warehouse_id = BigInt(warehouseId);
    }

    const balances = await this.prisma.stock_balances.findMany({
      where,
      include: {
        items: {
          include: { item_categories: true },
        },
        warehouses: true,
      },
      orderBy: { id: 'asc' },
    });

    const serialized = balances.map((b: any) => {
      const currentStock = Number(b.quantity || 0);
      const reorderLevel = Number(b.items?.reorder_level || 50);
      const standardCost = Number(b.items?.base_price || 0);

      return {
        id: String(b.id),
        itemId: String(b.item_id),
        itemCode: b.items?.item_code || `ITEM-${b.item_id}`,
        itemName: b.items?.item_name || 'صنف غير محدد',
        category: b.items?.item_categories?.category_name || 'عام',
        unit: b.items?.unit || 'وحدة',
        warehouseId: String(b.warehouse_id),
        warehouseName: b.warehouses?.warehouse_name || 'المستودع الرئيسي',
        currentBalance: currentStock,
        reorderPoint: reorderLevel,
        isUnderReorder: currentStock <= reorderLevel,
        totalValue: currentStock * standardCost,
      };
    });

    return { success: true, data: serialized };
  }

  // 4. استعلام رصيد صنف في مستودع محدد
  async getStockBalance(companyId: string, warehouseId: string, itemId: string) {
    const balance = await this.prisma.stock_balances.findFirst({
      where: {
        warehouse_id: BigInt(warehouseId),
        item_id: BigInt(itemId),
      },
      include: { items: true, warehouses: true },
    });

    return {
      itemId,
      warehouseId,
      currentBalance: Number(balance?.quantity || 0),
      availableBalance: Number(balance?.available_quantity || 0),
      reservedBalance: Number(balance?.reserved_quantity || 0),
    };
  }

  // 5. بطاقة حركة الصنف التفصيلية (Stock Card) من قاعدة البيانات الحية
  async getStockCard(itemId: string) {
    if (!itemId) throw new BadRequestException('معرف الصنف مطلوب');
    const parsedId = BigInt(itemId);

    const item = await this.prisma.items.findFirst({
      where: { id: parsedId },
      include: { item_categories: true },
    });

    if (!item) {
      throw new NotFoundException('الصنف المطلوب غير موجود بقاعدة البيانات');
    }

    const movements = await this.prisma.stock_movements.findMany({
      where: { item_id: parsedId },
      include: { warehouses: true },
      orderBy: { id: 'desc' },
      take: 100,
    });

    return {
      success: true,
      data: {
        item: {
          id: String(item.id),
          itemCode: item.item_code,
          itemName: item.item_name,
          category: item.item_categories?.category_name || 'عام',
          unit: item.unit || 'وحدة',
          basePrice: Number(item.base_price || 0),
          reorderLevel: Number(item.reorder_level || 50),
        },
        movements: movements.map((m: any) => ({
          id: String(m.id),
          date: m.created_at ? new Date(m.created_at).toLocaleString('ar-EG') : '',
          itemId: String(m.item_id),
          warehouseId: String(m.warehouse_id),
          warehouseName: m.warehouses?.warehouse_name || 'مستودع',
          movementType: m.movement_type,
          quantity: Number(m.quantity || 0),
          unitCost: Number(m.unit_cost || 0),
          balanceAfter: Number(m.balance_after || 0),
          referenceType: m.reference_type || 'MANUAL',
          referenceNumber: m.reference_id ? String(m.reference_id) : `REF-${m.id}`,
          notes: m.notes || '',
        })),
      },
    };
  }

  // 6. تسجيل حركة مخزنية فعلية في Neon DB
  async recordStockMovement(dto: StockMovementDto) {
    if (!dto.itemId || !dto.warehouseId || !dto.quantity) {
      throw new BadRequestException('الصنف، المستودع، والكمية حقول مطلوبة');
    }

    const tenant = getCurrentTenant();
    const companyId = tenant?.companyId || BigInt(dto.companyId || 1);
    const parsedItemId = BigInt(dto.itemId);
    const parsedWhId = BigInt(dto.warehouseId);
    const qty = Number(dto.quantity);

    // التحقق من الرصيد الحالي
    const balance = await this.prisma.stock_balances.findFirst({
      where: {
        warehouse_id: parsedWhId,
        item_id: parsedItemId,
      },
    });

    let currentStock = Number(balance?.quantity || 0);
    let balanceAfter = currentStock;

    if (dto.movementType === 'IN') {
      balanceAfter = currentStock + qty;
    } else if (dto.movementType === 'OUT') {
      balanceAfter = Math.max(0, currentStock - qty);
    } else if (dto.movementType === 'ADJUST') {
      balanceAfter = qty;
    }

    // تحديث أو إنشاء الرصيد في stock_balances
    if (balance) {
      await this.prisma.stock_balances.update({
        where: { id: balance.id },
        data: {
          quantity: balanceAfter,
          available_quantity: balanceAfter,
          last_updated_at: new Date(),
        },
      });
    } else {
      await this.prisma.stock_balances.create({
        data: {
          company_id: companyId,
          warehouse_id: parsedWhId,
          item_id: parsedItemId,
          quantity: balanceAfter,
          reserved_quantity: 0,
          available_quantity: balanceAfter,
          last_updated_at: new Date(),
        },
      });
    }

    const refId = dto.referenceId && !isNaN(Number(dto.referenceId)) ? BigInt(dto.referenceId) : null;

    // إنشاء سجل الحركة
    const createdMovement = await this.prisma.stock_movements.create({
      data: {
        company_id: companyId,
        warehouse_id: parsedWhId,
        item_id: parsedItemId,
        movement_type: dto.movementType,
        quantity: qty,
        unit_cost: dto.unitCost || 0,
        balance_after: balanceAfter,
        reference_type: dto.referenceType || 'MANUAL',
        reference_id: refId,
        notes: dto.notes || '',
      },
    });

    // بث تحديث لحظي معزول للمستأجر
    this.realtime.emitTenantUpdate(companyId, 'stock_updated', {
      itemId: String(dto.itemId),
      movementType: dto.movementType,
      quantity: qty,
      warehouseId: String(dto.warehouseId),
      balanceAfter,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'تم تسجيل الحركة المخزنية بنجاح في قاعدة البيانات',
      data: {
        id: String(createdMovement.id),
        balanceAfter,
      },
    };
  }

  // 7. تحويل مخزني فعلي بين مستودعين
  async transferStock(dto: WarehouseTransferDto) {
    if (!dto.fromWarehouseId || !dto.toWarehouseId || !dto.itemId || !dto.quantity) {
      throw new BadRequestException('كافة بيانات التحويل مطلوبة');
    }

    await this.recordStockMovement({
      warehouseId: dto.fromWarehouseId,
      itemId: dto.itemId,
      movementType: 'OUT',
      quantity: dto.quantity,
      referenceType: 'TRANSFER_OUT',
      notes: `تحويل صادر إلى مستودع ${dto.toWarehouseId} - ${dto.notes || ''}`,
    });

    await this.recordStockMovement({
      warehouseId: dto.toWarehouseId,
      itemId: dto.itemId,
      movementType: 'IN',
      quantity: dto.quantity,
      referenceType: 'TRANSFER_IN',
      notes: `تحويل وارد من مستودع ${dto.fromWarehouseId} - ${dto.notes || ''}`,
    });

    return {
      success: true,
      message: 'تم تنفيذ التحويل المخزني بنجاح بين المستودعين وتحديث الأرصدة الحقيقية',
    };
  }
}
