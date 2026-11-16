import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import {
  CreateBomHeaderDto,
  CreateWorkOrderDto,
  StartRoutingStepDto,
  CompleteRoutingStepDto,
  LogScrapDto,
  CreateShiftLogDto,
} from './dto/mes.dto.js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MesService {
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

  // ==========================================
  // BOM (Bill of Materials) Management
  // ==========================================

  async getAllBoms(companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const boms = await this.prisma.bom_headers.findMany({
      where: { company_id: cid },
      include: {
        bom_items: {
          orderBy: { line_number: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    // Enrich with item names
    const itemIds = new Set<bigint>();
    boms.forEach((b) => {
      itemIds.add(b.item_id);
      b.bom_items.forEach((bi) => itemIds.add(bi.component_item_id));
    });

    const items = await this.prisma.items.findMany({
      where: { id: { in: Array.from(itemIds) } },
      select: { id: true, item_name: true, item_code: true, unit: true },
    });
    const itemMap = new Map(items.map((i) => [i.id.toString(), i]));

    const enriched = boms.map((b) => {
      const mainItem = itemMap.get(b.item_id.toString());
      return {
        ...b,
        itemName: mainItem ? mainItem.item_name : 'غير محدد',
        itemCode: mainItem ? mainItem.item_code : '',
        bom_items: b.bom_items.map((bi) => {
          const compItem = itemMap.get(bi.component_item_id.toString());
          return {
            ...bi,
            componentName: compItem ? compItem.item_name : 'غير محدد',
            componentCode: compItem ? compItem.item_code : '',
          };
        }),
      };
    });

    return this.serializeBigInt(enriched);
  }

  async getBomById(id: string | number) {
    const bomId = BigInt(id);
    const bom = await this.prisma.bom_headers.findUnique({
      where: { id: bomId },
      include: {
        bom_items: {
          include: {
            child_items: true,
          },
          orderBy: { line_number: 'asc' },
        },
      },
    });

    if (!bom) throw new NotFoundException('التركيبة الصناعية غير موجودة');

    const itemIds = [bom.item_id, ...bom.bom_items.map((bi) => bi.component_item_id)];
    const items = await this.prisma.items.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, item_name: true, item_code: true, unit: true },
    });
    const itemMap = new Map(items.map((i) => [i.id.toString(), i]));

    const mainItem = itemMap.get(bom.item_id.toString());
    const enriched = {
      ...bom,
      itemName: mainItem ? mainItem.item_name : 'غير محدد',
      itemCode: mainItem ? mainItem.item_code : '',
      bom_items: bom.bom_items.map((bi) => {
        const comp = itemMap.get(bi.component_item_id.toString());
        return {
          ...bi,
          componentName: comp ? comp.item_name : 'غير محدد',
          componentCode: comp ? comp.item_code : '',
        };
      }),
    };

    return this.serializeBigInt(enriched);
  }

  async createBom(dto: CreateBomHeaderDto) {
    const companyId = BigInt(dto.companyId || 1);
    const itemId = BigInt(dto.itemId);

    const created = await this.prisma.bom_headers.create({
      data: {
        company_id: companyId,
        item_id: itemId,
        bom_code: dto.bomCode,
        bom_name: dto.bomName,
        version: dto.version || '1.0',
        standard_batch_qty: new Decimal(dto.standardBatchQty),
        batch_unit: dto.batchUnit,
        total_cost: dto.totalCost ? new Decimal(dto.totalCost) : new Decimal(0),
        notes: dto.notes,
        bom_items: dto.items && dto.items.length > 0 ? {
          create: dto.items.map((it, idx) => ({
            component_item_id: BigInt(it.componentItemId),
            quantity: new Decimal(it.quantity),
            unit: it.unit,
            scrap_factor_pct: new Decimal(it.scrapFactorPct || 0),
            item_type: it.itemType || 'RAW_MATERIAL',
            parent_bom_item_id: it.parentBomItemId ? BigInt(it.parentBomItemId) : null,
            line_number: it.lineNumber || (idx + 1),
            notes: it.notes,
          })),
        } : undefined,
      },
      include: { bom_items: true },
    });

    this.realtime.emitEvent('bom_created', { id: created.id.toString(), code: created.bom_code });
    return this.serializeBigInt(created);
  }

  // ==========================================
  // Work Orders & Shop Floor
  // ==========================================

  async getAllWorkOrders(companyId: string | number = 1, status?: string) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const orders = await this.prisma.work_orders.findMany({
      where,
      include: {
        routing_steps: {
          orderBy: { step_number: 'asc' },
        },
        work_order_scraps: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Get item names & warehouses
    const itemIds = Array.from(new Set(orders.map((o) => o.item_id)));
    const whIds = Array.from(new Set(orders.map((o) => o.warehouse_id)));

    const [items, warehouses] = await Promise.all([
      this.prisma.items.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, item_name: true, item_code: true, unit: true },
      }),
      this.prisma.warehouses.findMany({
        where: { id: { in: whIds } },
        select: { id: true, warehouse_name: true, warehouse_code: true },
      }),
    ]);

    const itemMap = new Map(items.map((i) => [i.id.toString(), i]));
    const whMap = new Map(warehouses.map((w) => [w.id.toString(), w]));

    const enriched = orders.map((o) => {
      const it = itemMap.get(o.item_id.toString());
      const wh = whMap.get(o.warehouse_id.toString());
      const totalScrap = o.work_order_scraps.reduce((acc, s) => acc + Number(s.quantity), 0);
      const targetQty = Number(o.target_quantity);
      const producedQty = Number(o.produced_quantity);
      const varianceQty = producedQty - targetQty;
      const progressPct = targetQty > 0 ? Math.min(100, Math.round((producedQty / targetQty) * 100)) : 0;

      return {
        ...o,
        itemName: it ? it.item_name : 'غير محدد',
        itemCode: it ? it.item_code : '',
        unit: it ? it.unit : 'كجم',
        warehouseName: wh ? wh.warehouse_name : 'مستودع التصنيع',
        totalScrap,
        varianceQty,
        progressPct,
      };
    });

    return this.serializeBigInt(enriched);
  }

  async getWorkOrderById(id: string | number) {
    const orderId = BigInt(id);
    const order = await this.prisma.work_orders.findUnique({
      where: { id: orderId },
      include: {
        bom_headers: {
          include: {
            bom_items: true,
          },
        },
        routing_steps: {
          orderBy: { step_number: 'asc' },
        },
        work_order_scraps: true,
      },
    });

    if (!order) throw new NotFoundException('أمر التشغيل غير موجود');

    const [item, warehouse] = await Promise.all([
      this.prisma.items.findUnique({
        where: { id: order.item_id },
        select: { id: true, item_name: true, item_code: true, unit: true },
      }),
      this.prisma.warehouses.findUnique({
        where: { id: order.warehouse_id },
        select: { id: true, warehouse_name: true },
      }),
    ]);

    const totalScrap = order.work_order_scraps.reduce((acc, s) => acc + Number(s.quantity), 0);
    const targetQty = Number(order.target_quantity);
    const producedQty = Number(order.produced_quantity);

    const enriched = {
      ...order,
      itemName: item ? item.item_name : 'غير محدد',
      itemCode: item ? item.item_code : '',
      unit: item ? item.unit : 'كجم',
      warehouseName: warehouse ? warehouse.warehouse_name : '',
      totalScrap,
      varianceQty: producedQty - targetQty,
      progressPct: targetQty > 0 ? Math.min(100, Math.round((producedQty / targetQty) * 100)) : 0,
    };

    return this.serializeBigInt(enriched);
  }

  async createWorkOrder(dto: CreateWorkOrderDto) {
    const companyId = BigInt(dto.companyId || 1);
    const itemId = BigInt(dto.itemId);
    const warehouseId = BigInt(dto.warehouseId);
    const bomHeaderId = dto.bomHeaderId ? BigInt(dto.bomHeaderId) : null;

    // Standard routing steps for sweets/confectionery manufacturing:
    const defaultSteps = dto.customRoutingSteps && dto.customRoutingSteps.length > 0
      ? dto.customRoutingSteps
      : [
          '1. عجن وخلط المكونات والأساسات',
          '2. تشكيل وخبيز الأفران',
          '3. تبريد وتهوية الصواني',
          '4. تزيين وحشو وتغليف نهائي',
        ];

    const order = await this.prisma.work_orders.create({
      data: {
        company_id: companyId,
        work_order_number: dto.workOrderNumber,
        batch_id: dto.batchId,
        bom_header_id: bomHeaderId,
        item_id: itemId,
        warehouse_id: warehouseId,
        target_quantity: new Decimal(dto.targetQuantity),
        produced_quantity: new Decimal(0),
        scrap_quantity: new Decimal(0),
        status: 'IN_PROGRESS',
        priority: dto.priority || 'MEDIUM',
        start_date: dto.startDate ? new Date(dto.startDate) : new Date(),
        end_date: dto.endDate ? new Date(dto.endDate) : null,
        notes: dto.notes,
        routing_steps: {
          create: defaultSteps.map((stepName, idx) => ({
            step_number: idx + 1,
            step_name: stepName,
            status: idx === 0 ? 'RUNNING' : 'PENDING',
            planned_minutes: 60,
            started_at: idx === 0 ? new Date() : null,
          })),
        },
      },
      include: {
        routing_steps: true,
      },
    });

    this.realtime.emitEvent('work_order_created', {
      id: order.id.toString(),
      workOrderNumber: order.work_order_number,
      batchId: order.batch_id,
    });

    return this.serializeBigInt(order);
  }

  async startRoutingStep(stepId: string | number, dto: StartRoutingStepDto) {
    const sid = BigInt(stepId);
    const step = await this.prisma.routing_steps.findUnique({
      where: { id: sid },
      include: { work_orders: true },
    });
    if (!step) throw new NotFoundException('المرحلة الصناعية غير موجودة');

    const updated = await this.prisma.routing_steps.update({
      where: { id: sid },
      data: {
        status: 'RUNNING',
        started_at: new Date(),
        operator_name: dto.operatorName || step.operator_name,
        machine_code: dto.machineCode || step.machine_code,
        input_quantity: dto.inputQuantity ? new Decimal(dto.inputQuantity) : step.input_quantity,
        notes: dto.notes || step.notes,
      },
    });

    // Update parent work order status to IN_PROGRESS if planned
    if (step.work_orders.status === 'PLANNED') {
      await this.prisma.work_orders.update({
        where: { id: step.work_order_id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    this.realtime.emitEvent('routing_step_started', {
      stepId: sid.toString(),
      workOrderId: step.work_order_id.toString(),
      stepName: step.step_name,
    });

    return this.serializeBigInt(updated);
  }

  async completeRoutingStep(stepId: string | number, dto: CompleteRoutingStepDto) {
    const sid = BigInt(stepId);
    const step = await this.prisma.routing_steps.findUnique({
      where: { id: sid },
      include: { work_orders: true },
    });
    if (!step) throw new NotFoundException('المرحلة الصناعية غير موجودة');

    const completedAt = new Date();
    let actualMins = dto.actualMinutes;
    if (!actualMins && step.started_at) {
      actualMins = Math.round((completedAt.getTime() - step.started_at.getTime()) / 60000);
    }

    const updated = await this.prisma.routing_steps.update({
      where: { id: sid },
      data: {
        status: 'COMPLETED',
        completed_at: completedAt,
        actual_minutes: actualMins || step.planned_minutes,
        output_quantity: dto.outputQuantity ? new Decimal(dto.outputQuantity) : step.output_quantity,
        notes: dto.notes || step.notes,
      },
    });

    // If there is a next step, auto-start or set ready
    const nextStep = await this.prisma.routing_steps.findFirst({
      where: {
        work_order_id: step.work_order_id,
        step_number: step.step_number + 1,
      },
    });

    if (nextStep && nextStep.status === 'PENDING') {
      await this.prisma.routing_steps.update({
        where: { id: nextStep.id },
        data: {
          status: 'RUNNING',
          started_at: new Date(),
          input_quantity: dto.outputQuantity ? new Decimal(dto.outputQuantity) : null,
        },
      });
    }

    // Check if this was the final step
    const allSteps = await this.prisma.routing_steps.findMany({
      where: { work_order_id: step.work_order_id },
    });
    const allDone = allSteps.every((s) => s.id === sid || s.status === 'COMPLETED');

    if (allDone) {
      const finalQty = dto.outputQuantity ? new Decimal(dto.outputQuantity) : step.work_orders.target_quantity;
      await this.prisma.work_orders.update({
        where: { id: step.work_order_id },
        data: {
          status: 'COMPLETED',
          end_date: completedAt,
          produced_quantity: finalQty,
        },
      });
    }

    this.realtime.emitEvent('routing_step_completed', {
      stepId: sid.toString(),
      workOrderId: step.work_order_id.toString(),
      stepName: step.step_name,
    });

    return this.serializeBigInt(updated);
  }

  async logScrap(workOrderId: string | number, dto: LogScrapDto) {
    const wId = BigInt(workOrderId);
    const order = await this.prisma.work_orders.findUnique({
      where: { id: wId },
    });
    if (!order) throw new NotFoundException('أمر التشغيل غير موجود');

    const scrap = await this.prisma.work_order_scraps.create({
      data: {
        work_order_id: wId,
        routing_step_id: dto.routingStepId ? BigInt(dto.routingStepId) : null,
        item_id: BigInt(dto.itemId),
        quantity: new Decimal(dto.quantity),
        scrap_reason_category: dto.scrapReasonCategory,
        scrap_reason_detail: dto.scrapReasonDetail,
        logged_by: dto.loggedBy || 'مشرف الصالة',
      },
    });

    // Update scrap quantity on parent order
    await this.prisma.work_orders.update({
      where: { id: wId },
      data: {
        scrap_quantity: { increment: new Decimal(dto.quantity) },
      },
    });

    this.realtime.emitEvent('scrap_logged', {
      workOrderId: wId.toString(),
      quantity: dto.quantity,
      category: dto.scrapReasonCategory,
    });

    return this.serializeBigInt(scrap);
  }

  async completeWorkOrder(id: string | number, producedQuantity?: number) {
    const orderId = BigInt(id);
    const order = await this.prisma.work_orders.findUnique({
      where: { id: orderId },
      include: { routing_steps: true },
    });
    if (!order) throw new NotFoundException('أمر التشغيل غير موجود');

    const finalProduced = producedQuantity !== undefined
      ? new Decimal(producedQuantity)
      : order.target_quantity;

    // Complete all remaining steps
    await this.prisma.routing_steps.updateMany({
      where: { work_order_id: orderId, status: { not: 'COMPLETED' } },
      data: { status: 'COMPLETED', completed_at: new Date() },
    });

    const updated = await this.prisma.work_orders.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        end_date: new Date(),
        produced_quantity: finalProduced,
      },
    });

    // Automatically create or update inventory batch for the produced goods
    const prodDate = new Date();
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 30); // 30-day sweet shelf-life default

    const existingBatch = await this.prisma.inventory_batches.findFirst({
      where: {
        company_id: order.company_id,
        warehouse_id: order.warehouse_id,
        item_id: order.item_id,
        batch_number: order.batch_id,
      },
    });

    if (existingBatch) {
      await this.prisma.inventory_batches.update({
        where: { id: existingBatch.id },
        data: { current_quantity: { increment: finalProduced } },
      });
    } else {
      await this.prisma.inventory_batches.create({
        data: {
          company_id: order.company_id,
          warehouse_id: order.warehouse_id,
          item_id: order.item_id,
          batch_number: order.batch_id,
          production_date: prodDate,
          expiry_date: expDate,
          initial_quantity: finalProduced,
          current_quantity: finalProduced,
          status: 'RELEASED',
        },
      });
    }

    this.realtime.emitEvent('work_order_completed', {
      id: orderId.toString(),
      workOrderNumber: order.work_order_number,
      batchId: order.batch_id,
      producedQuantity: Number(finalProduced),
    });

    return this.serializeBigInt(updated);
  }

  // ==========================================
  // OEE & Shop Floor Telemetry
  // ==========================================

  async getOeeStats(companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const [orders, scraps, steps] = await Promise.all([
      this.prisma.work_orders.findMany({ where: { company_id: cid } }),
      this.prisma.work_order_scraps.findMany({
        where: { work_orders: { company_id: cid } },
      }),
      this.prisma.routing_steps.findMany({
        where: { work_orders: { company_id: cid } },
      }),
    ]);

    const totalTarget = orders.reduce((acc, o) => acc + Number(o.target_quantity), 0);
    const totalProduced = orders.reduce((acc, o) => acc + Number(o.produced_quantity), 0);
    const totalScrap = scraps.reduce((acc, s) => acc + Number(s.quantity), 0);

    // Scrap distribution by category
    const scrapByCategory: Record<string, number> = {
      MATERIAL: 0,
      MACHINE: 0,
      HUMAN: 0,
      ENVIRONMENTAL: 0,
    };
    scraps.forEach((s) => {
      const cat = s.scrap_reason_category || 'MATERIAL';
      scrapByCategory[cat] = (scrapByCategory[cat] || 0) + Number(s.quantity);
    });

    // OEE Metrics estimation
    // Availability: Ratio of planned operating time vs downtime
    // Performance: Actual output vs expected standard speed
    // Quality: Good output vs total output
    const goodOutput = Math.max(0, totalProduced - totalScrap);
    const qualityRate = totalProduced > 0 ? (goodOutput / totalProduced) * 100 : 96.5;
    const performanceRate = totalTarget > 0 ? Math.min(100, (totalProduced / totalTarget) * 100) : 92.0;
    const availabilityRate = 95.0; // Standard automated line availability
    const oeeScore = Math.round((availabilityRate * performanceRate * qualityRate) / 10000);

    return {
      oeeScore: Math.min(100, Math.max(0, oeeScore || 88)),
      availabilityRate: 95.0,
      performanceRate: Math.round(performanceRate),
      qualityRate: Math.round(qualityRate),
      totalTarget,
      totalProduced,
      totalScrap,
      activeOrdersCount: orders.filter((o) => o.status === 'IN_PROGRESS').length,
      completedOrdersCount: orders.filter((o) => o.status === 'COMPLETED').length,
      scrapByCategory,
    };
  }

  // ==========================================
  // Shift Logs & Handover
  // ==========================================

  async getShiftLogs(companyId: string | number = 1) {
    const logs = await this.prisma.shift_logs.findMany({
      where: { company_id: BigInt(companyId) },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
    return this.serializeBigInt(logs);
  }

  async createShiftLog(dto: CreateShiftLogDto) {
    const log = await this.prisma.shift_logs.create({
      data: {
        company_id: BigInt(dto.companyId || 1),
        shift_name: dto.shiftName,
        supervisor_name: dto.supervisorName,
        wip_notes: dto.wipNotes,
        handover_notes: dto.handoverNotes,
      },
    });
    return this.serializeBigInt(log);
  }
}
