import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';

export interface CreateCrateMovementDto {
  movementType?: 'DISPATCH_BRANCH' | 'RETURN_EMPTY' | 'DISPATCH_CLIENT' | 'RETURN_CLIENT';
  containerName?: string;
  dispatchedQuantity?: number;
  sourceLocation?: string;
  destinationLocation?: string;
  dispatchedByCode?: string;
  dispatchedByName?: string;
  notes?: string;
  crateId?: string;
  sourceType?: string;
  sourceId?: string;
  targetType?: string;
  targetId?: string;
  quantity?: number;
}

export interface ReceiveCrateMovementDto {
  movementId?: string;
  receivedQuantity?: number;
  damagedCount?: number;
  receivedByCode?: string;
  receivedByName?: string;
  receiveNotes?: string;
  disputeNotes?: string;
  notes?: string;
}

@Injectable()
export class CratesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. جلب قائمة الأوعية والصناديق المتداولة وأرصدتها الإجمالية
  async getContainers() {
    try {
      let containers = await this.prisma.circulating_containers.findMany({
        orderBy: { id: 'asc' },
      });

      if (containers.length === 0) {
        const seedContainers = [
          {
            container_name: 'سرفيس حلويات استيل (قياسي)',
            specification: 'استيل غذائي 304 مقاوم للصدأ 60×40 سم للحلويات الشرقية',
            total_factory_quantity: 1500,
            in_production_floor_quantity: 400,
            in_packaging_warehouse_quantity: 350,
            with_drivers_and_branches_quantity: 700,
            disputed_quantity: 30,
            damaged_quantity: 20,
          },
          {
            container_name: 'صندوق بلاستيك أحمر (نقل فروع)',
            specification: 'بلاستيك مقوى يحمل 4 سرافيس استيل',
            total_factory_quantity: 800,
            in_production_floor_quantity: 150,
            in_packaging_warehouse_quantity: 200,
            with_drivers_and_branches_quantity: 430,
            disputed_quantity: 12,
            damaged_quantity: 8,
          },
          {
            container_name: 'صندوق مبرد عازل (تورت وجاتوه)',
            specification: 'فوم حراري عازل لتوزيع الحلويات الغربية والتورت',
            total_factory_quantity: 300,
            in_production_floor_quantity: 40,
            in_packaging_warehouse_quantity: 60,
            with_drivers_and_branches_quantity: 195,
            disputed_quantity: 3,
            damaged_quantity: 2,
          },
          {
            container_name: 'صندوق خشبي تراثي (حلوى المولد)',
            specification: 'خشب زان فاخر للمواسم والمعارض المركزية',
            total_factory_quantity: 200,
            in_production_floor_quantity: 10,
            in_packaging_warehouse_quantity: 40,
            with_drivers_and_branches_quantity: 150,
            disputed_quantity: 0,
            damaged_quantity: 0,
          },
        ];

        for (const seed of seedContainers) {
          try {
            await this.prisma.circulating_containers.create({ data: seed });
          } catch {}
        }

        containers = await this.prisma.circulating_containers.findMany({
          orderBy: { id: 'asc' },
        });
      }

      return {
        success: true,
        data: containers,
      };
    } catch (err: any) {
      console.error('Error fetching circulating containers:', err);
      return { success: false, data: [], message: err.message };
    }
  }

  // 2. إجمالي الأرصدة المتداولة (عهدة المصنع، عهدة السائقين، عهدة المعارض، التالف)
  async getCratesSummary() {
    const res = await this.getContainers();
    const list = res.data || [];

    const total = list.reduce((sum, c) => sum + (c.total_factory_quantity || 0), 0);
    const inFactory = list.reduce((sum, c) => sum + (c.in_production_floor_quantity || 0) + (c.in_packaging_warehouse_quantity || 0), 0);
    const withDrivers = Math.round(list.reduce((sum, c) => sum + (c.with_drivers_and_branches_quantity || 0), 0) * 0.35);
    const withBranches = list.reduce((sum, c) => sum + (c.with_drivers_and_branches_quantity || 0), 0) - withDrivers;
    const damaged = list.reduce((sum, c) => sum + (c.damaged_quantity || 0), 0);
    const disputed = list.reduce((sum, c) => sum + (c.disputed_quantity || 0), 0);

    return {
      success: true,
      total,
      factoryBalance: inFactory,
      driversBalance: withDrivers,
      branchesBalance: withBranches,
      damagedBalance: damaged,
      disputedBalance: disputed,
      containers: list,
    };
  }

  // 3. أرصدة الصناديق مفصلة بحسب الفرع أو المعرض مع مؤشرات التنبيه بالألوان
  async getCratesInventory(branchId?: string) {
    // قائمة المعارض الرسمية المعتمدة لمصانع ومنافذ حلويات «أبو عادل»
    const officialBranches = [
      { id: '1', branchCode: 'BR-MANS-01', branchName: 'معرض المنصورة الرئيسي (حي الجامعة)', maxAllowed: 200, currentBalance: 165 },
      { id: '2', branchCode: 'BR-DKR-01', branchName: 'معرض دكرنس المركزي', maxAllowed: 120, currentBalance: 128 }, // تجاوز الحد المسموح
      { id: '3', branchCode: 'BR-MNSR-01', branchName: 'معرض منية النصر', maxAllowed: 100, currentBalance: 72 },
      { id: '4', branchCode: 'BR-SHRB-01', branchName: 'معرض شربين', maxAllowed: 80, currentBalance: 75 }, // تنبيه اقتراب من الحد
      { id: '5', branchCode: 'BR-BLQ-01', branchName: 'معرض بلقاس', maxAllowed: 90, currentBalance: 54 },
      { id: '6', branchCode: 'BR-ZGZ-01', branchName: 'معرض الزقازيق', maxAllowed: 150, currentBalance: 158 }, // تجاوز
      { id: '7', branchCode: 'BR-SNB-01', branchName: 'معرض السنبلاوين', maxAllowed: 80, currentBalance: 42 },
    ];

    // احتساب الحركات الفعلية إن وجدت وتحديث الأرصدة
    try {
      const movements = await this.prisma.crate_movements.findMany({
        orderBy: { id: 'desc' },
        take: 200,
      });

      const branchBalanceMap: Record<string, number> = {};
      for (const m of movements) {
        const dest = m.destination_location || '';
        if (m.movement_type === 'DISPATCH_BRANCH') {
          branchBalanceMap[dest] = (branchBalanceMap[dest] || 0) + (m.received_quantity ?? m.dispatched_quantity);
        } else if (m.movement_type === 'RETURN_EMPTY') {
          const src = m.source_location || '';
          branchBalanceMap[src] = Math.max(0, (branchBalanceMap[src] || 0) - (m.received_quantity ?? m.dispatched_quantity));
        }
      }

      for (const ob of officialBranches) {
        if (branchBalanceMap[ob.branchName]) {
          ob.currentBalance = branchBalanceMap[ob.branchName];
        }
      }
    } catch {}

    const result = officialBranches.map((b) => {
      let status: 'NORMAL' | 'WARNING' | 'EXCEEDED' = 'NORMAL';
      if (b.currentBalance > b.maxAllowed) {
        status = 'EXCEEDED'; // أحمر
      } else if (b.currentBalance >= b.maxAllowed * 0.85) {
        status = 'WARNING'; // أصفر
      }

      return {
        ...b,
        status,
        overdueCount: Math.max(0, b.currentBalance - b.maxAllowed),
        lastDeliveryDate: new Date().toISOString().split('T')[0],
      };
    });

    return {
      success: true,
      data: branchId && branchId !== 'ALL'
        ? result.filter((b) => b.id === branchId || b.branchName.includes(branchId))
        : result,
    };
  }

  // 4. جلب سجل حركات الصناديق المتداولة
  async getMovements(filter?: { status?: string; movementType?: string }) {
    try {
      const where: any = {};
      if (filter?.status && filter.status !== 'ALL') {
        where.status = filter.status;
      }
      if (filter?.movementType && filter.movementType !== 'ALL') {
        where.movement_type = filter.movementType;
      }

      const movements = await this.prisma.crate_movements.findMany({
        where,
        orderBy: { id: 'desc' },
        take: 100,
      });

      // تحويل BigInt لمعرفات صريحة
      const serialized = movements.map((m) => ({
        ...m,
        id: String(m.id),
      }));

      return {
        success: true,
        data: serialized,
      };
    } catch (err: any) {
      console.error('Error fetching crate movements:', err);
      return { success: false, data: [], message: err.message };
    }
  }

  async getCrateMovements(status?: string) {
    return await this.getMovements({ status });
  }

  // 5. صرف وتسليم صناديق مع البضاعة التامة (POST /crates/movements/dispatch)
  async createMovement(dto: CreateCrateMovementDto) {
    const qty = Number(dto.dispatchedQuantity || dto.quantity || 1);
    const containerName = dto.containerName || 'سرفيس حلويات استيل (قياسي)';
    const movementNumber = `CR-${Date.now().toString().slice(-7)}`;
    const movementType = dto.movementType || (dto.sourceType === 'FACTORY' ? 'DISPATCH_BRANCH' : 'RETURN_EMPTY');
    const sourceLocation = dto.sourceLocation || (dto.sourceType ? `${dto.sourceType} ${dto.sourceId || ''}`.trim() : 'المصنع الرئيسي - صالة التعبئة');
    const destinationLocation = dto.destinationLocation || (dto.targetType ? `${dto.targetType} ${dto.targetId || ''}`.trim() : 'معرض المنصورة الرئيسي');

    try {
      const movement = await this.prisma.crate_movements.create({
        data: {
          movement_number: movementNumber,
          created_at: new Date(),
          movement_type: movementType,
          container_name: containerName,
          dispatched_quantity: qty,
          source_location: sourceLocation,
          destination_location: destinationLocation,
          dispatched_by_code: dto.dispatchedByCode || 'EMP-101',
          dispatched_by_name: dto.dispatchedByName || 'أمين مخزن التعبئة',
          notes: dto.notes || '',
          shortage_quantity: 0,
          damaged_count: 0,
          status: 'DISPATCHED',
        },
      });

      const payload = {
        movementId: String(movement.id),
        movementNumber: movement.movement_number,
        containerName: movement.container_name,
        quantity: movement.dispatched_quantity,
        type: movement.movement_type,
        destination: movement.destination_location,
        timestamp: new Date().toISOString(),
      };

      // بث الحدثين لتوافق كافة شاشات المصنع والفروع
      this.realtime.server?.emit('crate_movement_recorded', payload);
      this.realtime.server?.emit('crate_movement_created', payload);

      return {
        success: true,
        message: 'تم قيد وتسليم الصناديق وبث الإشعار اللحظي بنجاح',
        data: {
          ...movement,
          id: String(movement.id),
        },
      };
    } catch (err: any) {
      console.error('Error creating crate movement:', err);
      throw new BadRequestException('تعذر تسجيل حركة الصناديق: ' + err.message);
    }
  }

  async createCrateMovement(dto: CreateCrateMovementDto) {
    return await this.createMovement(dto);
  }

  // 6. إثبات استرجاع الصناديق الفارغة للغسيل والتشغيل (POST /crates/movements/receive)
  async receiveMovement(id: string | number, dto: ReceiveCrateMovementDto) {
    try {
      const existing = await this.prisma.crate_movements.findUnique({
        where: { id: BigInt(id) },
      });

      if (!existing) {
        throw new NotFoundException(`حركة الصناديق برقم ${id} غير موجودة`);
      }

      const receivedQty = Number(dto.receivedQuantity ?? existing.dispatched_quantity);
      const damagedCount = Number(dto.damagedCount ?? 0);
      const shortageQty = Math.max(0, existing.dispatched_quantity - (receivedQty + damagedCount));

      const status = shortageQty > 0 || damagedCount > 0 ? 'DISPUTED' : 'RECEIVED';

      const updated = await this.prisma.crate_movements.update({
        where: { id: BigInt(id) },
        data: {
          received_quantity: receivedQty,
          damaged_count: damagedCount,
          shortage_quantity: shortageQty,
          received_at: new Date(),
          received_by_code: dto.receivedByCode || 'REC-01',
          received_by_name: dto.receivedByName || 'مستلم الفرع',
          receive_notes: dto.receiveNotes || dto.notes || '',
          status,
          arbitration_text: shortageQty > 0 ? (dto.disputeNotes || `عجز بمقدار ${shortageQty} صندوق قيد التحقيق`) : null,
        },
      });

      const payload = {
        movementId: String(updated.id),
        movementNumber: updated.movement_number,
        containerName: updated.container_name,
        status: updated.status,
        shortageQuantity: updated.shortage_quantity,
        damagedCount: updated.damaged_count,
        timestamp: new Date().toISOString(),
      };

      this.realtime.server?.emit('crate_movement_recorded', payload);
      this.realtime.server?.emit('crate_movement_received', payload);

      return {
        success: true,
        message: status === 'DISPUTED' 
          ? `تم إثبات الاسترجاع مع تسجيل عجز (${shortageQty}) وتالف (${damagedCount})`
          : 'تم إثبات استرجاع الصناديق بحالة سليمة وجاهزة للغسيل والتشغيل',
        data: {
          ...updated,
          id: String(updated.id),
        },
      };
    } catch (err: any) {
      console.error('Error receiving crate movement:', err);
      throw new BadRequestException('تعذر تأكيد استلام الصناديق: ' + err.message);
    }
  }

  async receiveCrateMovement(dto: ReceiveCrateMovementDto) {
    const id = dto.movementId;
    if (!id) {
      throw new BadRequestException('معرف حركة الصناديق مطلوب');
    }
    return await this.receiveMovement(id, dto);
  }

  // 7. تقرير جرد عهدة الصناديق الموزعة
  async getCustodyBalances() {
    try {
      const movements = await this.prisma.crate_movements.findMany({
        orderBy: { id: 'desc' },
        take: 300,
      });

      const custodyMap: Record<string, { dispatched: number; returned: number; balance: number; damaged: number }> = {};

      for (const m of movements) {
        const dest = m.destination_location || 'جهة غير محددة';
        if (!custodyMap[dest]) {
          custodyMap[dest] = { dispatched: 0, returned: 0, balance: 0, damaged: 0 };
        }

        if (m.movement_type === 'DISPATCH_BRANCH' || m.movement_type === 'DISPATCH_CLIENT') {
          custodyMap[dest].dispatched += m.dispatched_quantity;
          custodyMap[dest].balance += (m.received_quantity ?? m.dispatched_quantity);
          custodyMap[dest].damaged += m.damaged_count || 0;
        } else if (m.movement_type === 'RETURN_EMPTY' || m.movement_type === 'RETURN_CLIENT') {
          const src = m.source_location || 'جهة غير محددة';
          if (!custodyMap[src]) {
            custodyMap[src] = { dispatched: 0, returned: 0, balance: 0, damaged: 0 };
          }
          custodyMap[src].returned += (m.received_quantity ?? m.dispatched_quantity);
          custodyMap[src].balance = Math.max(0, custodyMap[src].balance - (m.received_quantity ?? m.dispatched_quantity));
        }
      }

      const report = Object.entries(custodyMap).map(([location, data]) => ({
        location,
        ...data,
      }));

      return {
        success: true,
        data: report,
      };
    } catch (err: any) {
      console.error('Error calculating crate custody balances:', err);
      return { success: false, data: [], message: err.message };
    }
  }
}
