import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateFinishedGoodsTransferDto,
  CostingAuditDto,
  ResolveCostingDisputeDto,
  QcInspectionDto,
  ControlReceiptDto,
  ResolveControlDisputeDto,
  ResubmitReworkDto,
  TransferItemDto,
} from './dto/finished-goods.dto.js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FinishedGoodsService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (obj instanceof Decimal) return Number(obj);
    if (Array.isArray(obj)) return obj.map((item) => this.serializeBigInt(item));
    if (typeof obj === 'object') {
      const serialized: any = {};
      for (const key of Object.keys(obj)) {
        serialized[key] = this.serializeBigInt(obj[key]);
      }
      return serialized;
    }
    return obj;
  }

  async getAll(companyId?: string, status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const records = await this.prisma.finished_goods_transfers.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        warehouses_finished_goods_transfers_source_warehouse_idTowarehouses: {
          select: { id: true, warehouse_name: true, warehouse_code: true, warehouse_type: true },
        },
        warehouses_finished_goods_transfers_destination_warehouse_idTowarehouses: {
          select: { id: true, warehouse_name: true, warehouse_code: true, warehouse_type: true },
        },
        items: {
          select: { id: true, item_name: true, item_code: true, unit: true, shelf_life_days: true },
        },
        finished_goods_transfer_items: {
          include: {
            items: {
              select: { id: true, item_name: true, item_code: true, unit: true },
            },
          },
        },
      },
    });

    // جلب أرقام أوامر التشغيل المرتبطة
    const poIds = records
      .map((r) => r.production_order_id)
      .filter((id): id is bigint => id !== null && id !== undefined);

    let poMap = new Map<string, string>();
    if (poIds.length > 0) {
      const pos = await this.prisma.production_orders.findMany({
        where: { id: { in: poIds } },
        select: { id: true, order_number: true },
      });
      pos.forEach((p) => poMap.set(p.id.toString(), p.order_number));
    }

    const mapped = records.map((t) => {
      let itemsList: any[] = [];

      if (t.finished_goods_transfer_items && t.finished_goods_transfer_items.length > 0) {
        itemsList = t.finished_goods_transfer_items.map((it) => ({
          id: it.id.toString(),
          itemId: it.item_id.toString(),
          itemName: it.items?.item_name || 'منتج تام',
          itemCode: it.items?.item_code || '',
          itemUnit: it.items?.unit || 'كجم',
          batchNumber: it.batch_number || t.batch_number,
          expiryDate: it.expiry_date ? it.expiry_date.toISOString().split('T')[0] : null,
          dispatchedQty: Number(it.prod_dispatched_qty || 0),
          dispatchedCount: it.prod_dispatched_count || 0,
          workOrderTargetQty: it.work_order_target_qty ? Number(it.work_order_target_qty) : null,
          workOrderDeliveredQty: it.work_order_delivered_qty ? Number(it.work_order_delivered_qty) : null,
          workOrderRemainingQty: it.work_order_remaining_qty ? Number(it.work_order_remaining_qty) : null,
          costingActualQty: it.costing_actual_qty !== null ? Number(it.costing_actual_qty) : null,
          costingActualCount: it.costing_actual_count || 0,
          qcApprovedQty: Number(it.qc_approved_qty || 0),
          qcSampleQty: Number(it.qc_sample_qty || 0),
          qcReworkQty: Number(it.qc_rework_qty || 0),
          qcScrapQty: Number(it.qc_scrap_qty || 0),
          receivedActualQty: it.received_actual_qty !== null ? Number(it.received_actual_qty) : null,
          receivedActualCount: it.received_actual_count || 0,
          notes: it.notes || '',
        }));
      } else if (t.items_json && Array.isArray(t.items_json) && t.items_json.length > 0) {
        itemsList = t.items_json;
      } else {
        // Fallback للبند الفردي القديم
        itemsList = [
          {
            itemId: t.item_id.toString(),
            itemName: t.items?.item_name || 'منتج تام',
            itemCode: t.items?.item_code || '',
            itemUnit: t.items?.unit || 'كجم',
            batchNumber: t.batch_number,
            expiryDate: t.expiry_date ? t.expiry_date.toISOString().split('T')[0] : null,
            dispatchedQty: Number(t.prod_dispatched_qty || 0),
            dispatchedCount: t.prod_dispatched_count || 0,
            costingActualQty: t.costing_actual_qty !== null ? Number(t.costing_actual_qty) : null,
            costingActualCount: t.costing_actual_count || 0,
            qcApprovedQty: Number(t.qc_approved_qty || 0),
            qcSampleQty: Number(t.qc_sample_qty || 0),
            qcReworkQty: Number(t.qc_rework_qty || 0),
            qcScrapQty: Number(t.qc_scrap_qty || 0),
            receivedActualQty: t.received_actual_qty !== null ? Number(t.received_actual_qty) : null,
            receivedActualCount: t.received_actual_count || 0,
          },
        ];
      }

      return {
        id: t.id.toString(),
        transferNumber: t.transfer_number,
        transferDate: t.transfer_date ? t.transfer_date.toISOString().split('T')[0] : null,
        productionOrderId: t.production_order_id ? t.production_order_id.toString() : null,
        productionOrderNumber: t.production_order_id ? poMap.get(t.production_order_id.toString()) || '' : '',
        sourceWarehouseId: t.source_warehouse_id.toString(),
        sourceWarehouseName:
          t.warehouses_finished_goods_transfers_source_warehouse_idTowarehouses?.warehouse_name || 'صالة الإنتاج',
        destinationWarehouseId: t.destination_warehouse_id.toString(),
        destinationWarehouseName:
          t.warehouses_finished_goods_transfers_destination_warehouse_idTowarehouses?.warehouse_name || 'مخزن الكنترول',
        itemId: t.item_id.toString(),
        itemName: t.items?.item_name || 'منتج تام',
        itemCode: t.items?.item_code || '',
        itemUnit: t.items?.unit || 'كجم',
        batchNumber: t.batch_number,
        expiryDate: t.expiry_date ? t.expiry_date.toISOString().split('T')[0] : null,
        prodDispatchedQty: Number(t.prod_dispatched_qty || 0),
        prodDispatchedCount: t.prod_dispatched_count || 0,
        itemsCount: t.items_count || itemsList.length,
        items: itemsList,
        prodNotes: t.prod_notes,
        prodSubmittedBy: t.prod_submitted_by,
        costingActualQty: t.costing_actual_qty !== null ? Number(t.costing_actual_qty) : null,
        costingActualCount: t.costing_actual_count,
        costingWeightDiff: Number(t.costing_weight_diff || 0),
        costingCountDiff: t.costing_count_diff || 0,
        costingDiscrepancyFlag: Boolean(t.costing_discrepancy_flag),
        costingAuditor: t.costing_auditor,
        costingAuditedAt: t.costing_audited_at,
        costingNotes: t.costing_notes,
        costingDisputeStatus: t.costing_dispute_status || 'NONE',
        costingDisputeReason: t.costing_dispute_reason,
        costingDisputeChargeTo: t.costing_dispute_charge_to,
        qcApprovedQty: Number(t.qc_approved_qty || 0),
        qcSampleQty: Number(t.qc_sample_qty || 0),
        qcReworkQty: Number(t.qc_rework_qty || 0),
        qcScrapQty: Number(t.qc_scrap_qty || 0),
        qcInspector: t.qc_inspector,
        qcInspectedAt: t.qc_inspected_at,
        qcNotes: t.qc_notes,
        receivedActualQty: t.received_actual_qty !== null ? Number(t.received_actual_qty) : null,
        receivedActualCount: t.received_actual_count,
        controlReceiverName: t.control_receiver_name,
        controlReceivedAt: t.control_received_at,
        controlNotes: t.control_notes,
        hasDispute: Boolean(t.has_dispute),
        disputeReason: t.dispute_reason,
        disputeStatus: t.dispute_status || 'NONE',
        controlDisputeChargeTo: t.control_dispute_charge_to,
        status: t.status || 'PENDING_COSTING',
        createdAt: t.created_at,
      };
    });

    return {
      success: true,
      count: mapped.length,
      data: mapped,
    };
  }

  async getLookups(companyId?: string) {
    const [warehouses, finishedItems, departments, productionOrdersRaw] = await Promise.all([
      this.prisma.warehouses.findMany({
        orderBy: { warehouse_name: 'asc' },
        select: {
          id: true,
          warehouse_name: true,
          warehouse_code: true,
          warehouse_type: true,
          department_id: true,
        },
      }),
      this.prisma.items.findMany({
        where: { active: true },
        orderBy: { item_name: 'asc' },
        select: {
          id: true,
          item_code: true,
          item_name: true,
          item_type: true,
          unit: true,
          department_id: true,
          shelf_life_days: true,
        },
      }),
      this.prisma.departments.findMany({
        orderBy: { department_name: 'asc' },
        select: {
          id: true,
          department_name: true,
          department_code: true,
        },
      }),
      this.prisma.production_orders.findMany({
        orderBy: { id: 'desc' },
        take: 30,
        include: {
          production_order_details: {
            include: {
              items: {
                select: { id: true, item_name: true, item_code: true, unit: true, shelf_life_days: true },
              },
            },
          },
          warehouses: {
            select: { id: true, warehouse_name: true },
          },
        },
      }),
    ]);

    // حساب الكميات المسلمة سابقاً والمتبقية لكل أمر تشغيل وبنوده
    const poList = await Promise.all(
      productionOrdersRaw.map(async (po) => {
        const detailsWithBalance = await Promise.all(
          po.production_order_details.map(async (pod) => {
            const targetQty = Number(pod.planned_quantity || pod.produced_quantity || 0);

            // حساب ما تم تسليمه من هذا البند في هذا الأمر
            const pastTransfers = await this.prisma.finished_goods_transfers.findMany({
              where: {
                production_order_id: po.id,
                item_id: pod.item_id,
              },
              select: { prod_dispatched_qty: true },
            });

            const deliveredQty = pastTransfers.reduce(
              (acc, curr) => acc + Number(curr.prod_dispatched_qty || 0),
              0
            );
            const remainingQty = Math.max(0, targetQty - deliveredQty);

            return {
              id: pod.id.toString(),
              itemId: pod.item_id.toString(),
              itemName: pod.items?.item_name || 'صنف',
              itemCode: pod.items?.item_code || '',
              unit: pod.items?.unit || pod.Unit || 'كجم',
              shelfLifeDays: pod.items?.shelf_life_days || 3,
              batchNumber: pod.BatchNumber || `LOT-${po.order_number}-${pod.item_id}`,
              plannedQuantity: targetQty,
              deliveredQuantity: deliveredQty,
              remainingQuantity: remainingQty,
            };
          })
        );

        return {
          id: po.id.toString(),
          orderNumber: po.order_number,
          orderDate: po.order_date ? po.order_date.toISOString().split('T')[0] : null,
          status: po.status,
          warehouseId: po.warehouse_id.toString(),
          warehouseName: po.warehouses?.warehouse_name || 'صالة التشغيل',
          items: detailsWithBalance,
        };
      })
    );

    return {
      success: true,
      data: {
        warehouses: this.serializeBigInt(warehouses),
        finishedItems: this.serializeBigInt(finishedItems),
        departments: this.serializeBigInt(departments),
        productionOrders: poList,
      },
    };
  }

  async getProductionOrderBalance(orderId: string) {
    if (!orderId) {
      throw new BadRequestException('معرف أمر التشغيل مطلوب');
    }

    const po = await this.prisma.production_orders.findUnique({
      where: { id: BigInt(orderId) },
      include: {
        production_order_details: {
          include: {
            items: {
              select: { id: true, item_name: true, item_code: true, unit: true, shelf_life_days: true },
            },
          },
        },
        warehouses: {
          select: { id: true, warehouse_name: true },
        },
      },
    });

    if (!po) {
      throw new NotFoundException('أمر التشغيل غير موجود');
    }

    const items = await Promise.all(
      po.production_order_details.map(async (pod) => {
        const targetQty = Number(pod.planned_quantity || pod.produced_quantity || 0);

        const pastTransfers = await this.prisma.finished_goods_transfers.findMany({
          where: {
            production_order_id: po.id,
            item_id: pod.item_id,
          },
          select: { prod_dispatched_qty: true },
        });

        const deliveredQty = pastTransfers.reduce(
          (acc, curr) => acc + Number(curr.prod_dispatched_qty || 0),
          0
        );
        const remainingQty = Math.max(0, targetQty - deliveredQty);

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const code = pod.items?.item_code || pod.item_id.toString();
        const autoBatch = pod.BatchNumber || `LOT-PRD-${today}-${code}-1`;
        const shelfDays = pod.items?.shelf_life_days || 3;
        const autoExp = new Date(Date.now() + shelfDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        return {
          itemId: pod.item_id.toString(),
          itemName: pod.items?.item_name || 'صنف',
          itemCode: pod.items?.item_code || '',
          itemUnit: pod.items?.unit || pod.Unit || 'كجم',
          batchNumber: autoBatch,
          expiryDate: autoExp,
          workOrderTargetQty: targetQty,
          workOrderDeliveredQty: deliveredQty,
          workOrderRemainingQty: remainingQty,
          dispatchedQty: remainingQty > 0 ? remainingQty : targetQty,
          dispatchedCount: 1,
          notes: '',
        };
      })
    );

    return {
      success: true,
      data: {
        orderId: po.id.toString(),
        orderNumber: po.order_number,
        warehouseId: po.warehouse_id.toString(),
        warehouseName: po.warehouses?.warehouse_name || '',
        items,
      },
    };
  }

  async createTransfer(dto: CreateFinishedGoodsTransferDto, companyId?: string) {
    if (!dto.sourceWarehouseId || !dto.destinationWarehouseId) {
      throw new BadRequestException('بيانات صالة المصدر ومخزن الوجهة مطلوبة.');
    }

    // التحقق من وجود أصناف (سواء عبر مصفوفة items أو الحقول الفردية)
    const items = dto.items && dto.items.length > 0
      ? dto.items
      : dto.itemId && dto.dispatchedQty
        ? [
            {
              itemId: dto.itemId,
              batchNumber: dto.batchNumber,
              expiryDate: dto.expiryDate,
              dispatchedQty: dto.dispatchedQty,
              dispatchedCount: dto.dispatchedCount || 0,
              notes: dto.notes,
            },
          ]
        : [];

    if (items.length === 0) {
      throw new BadRequestException('يجب إضافة صنف واحد على الأقل من المنتج التام إلى إذن التسليم.');
    }

    const now = new Date();
    const count = await this.prisma.finished_goods_transfers.count();
    const transferNumber = `FGT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

    // إجمالي الكميات والأعداد لكل الأصناف المضافة في الإذن
    const totalDispatchedQty = items.reduce((acc, curr) => acc + Number(curr.dispatchedQty || 0), 0);
    const totalDispatchedCount = items.reduce((acc, curr) => acc + Number(curr.dispatchedCount || 0), 0);

    const primaryItem = items[0];
    let batchNumber = primaryItem.batchNumber;
    if (!batchNumber) {
      const todayStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      batchNumber = `LOT-PRD-${todayStr}-${primaryItem.itemId}-1`;
    }

    let expiryDate: Date | null = null;
    if (primaryItem.expiryDate) {
      expiryDate = new Date(primaryItem.expiryDate);
    } else {
      expiryDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    }

    const created = await this.prisma.finished_goods_transfers.create({
      data: {
        transfer_number: transferNumber,
        transfer_date: now,
        production_order_id: dto.productionOrderId ? BigInt(dto.productionOrderId) : null,
        source_warehouse_id: BigInt(dto.sourceWarehouseId),
        destination_warehouse_id: BigInt(dto.destinationWarehouseId),
        item_id: BigInt(primaryItem.itemId),
        batch_number: batchNumber,
        expiry_date: expiryDate,
        prod_dispatched_qty: new Decimal(totalDispatchedQty),
        prod_dispatched_count: totalDispatchedCount,
        prod_notes: dto.notes || null,
        prod_submitted_by: dto.submittedBy || 'مشرف الصالة المعتمد',
        status: 'PENDING_COSTING',
        created_at: now,
        company_id: companyId ? BigInt(companyId) : 1n,
        tenant_id: 'tenant_1',
        items_count: items.length,
        items_json: items as any,
      },
    });

    // إنشاء البنود التفصيلية في جدول finished_goods_transfer_items
    for (const itm of items) {
      await this.prisma.finished_goods_transfer_items.create({
        data: {
          transfer_id: created.id,
          item_id: BigInt(itm.itemId),
          batch_number: itm.batchNumber || batchNumber,
          expiry_date: itm.expiryDate ? new Date(itm.expiryDate) : expiryDate,
          prod_dispatched_qty: new Decimal(itm.dispatchedQty),
          prod_dispatched_count: itm.dispatchedCount || 0,
          work_order_target_qty: itm.workOrderTargetQty ? new Decimal(itm.workOrderTargetQty) : null,
          work_order_delivered_qty: itm.workOrderDeliveredQty ? new Decimal(itm.workOrderDeliveredQty) : null,
          work_order_remaining_qty: itm.workOrderRemainingQty ? new Decimal(itm.workOrderRemainingQty) : null,
          notes: itm.notes || null,
          created_at: now,
        },
      });
    }

    return {
      success: true,
      message: `تم إصدار إذن تسليم المنتج التام بنجاح بعدد (${items.length}) صنف وتمريره لميزان التكاليف`,
      data: this.serializeBigInt(created),
    };
  }

  async auditCosting(dto: CostingAuditDto, companyId?: string) {
    if (!dto.transferId || dto.actualWeight === undefined || dto.actualWeight === null) {
      throw new BadRequestException('معرف الإذن والوزن الفعلي بالميزان مطلوبان.');
    }

    const transfer = await this.prisma.finished_goods_transfers.findUnique({
      where: { id: BigInt(dto.transferId) },
    });

    if (!transfer) {
      throw new NotFoundException('إذن التحويل غير موجود.');
    }

    const actualWeight = Number(dto.actualWeight);
    const prodQty = Number(transfer.prod_dispatched_qty);
    const actualCount = dto.actualCount ?? (transfer.prod_dispatched_count || 0);
    const prodCount = transfer.prod_dispatched_count || 0;

    const weightDiff = actualWeight - prodQty;
    const countDiff = actualCount - prodCount;

    const escalate = Boolean(dto.escalateDispute);
    const status = escalate ? 'DISPUTE_COSTING' : 'PENDING_QC';

    // تحديث البنود إن تم إرسال تفاصيل الأصناف
    let updatedItemsJson = transfer.items_json;
    if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
      updatedItemsJson = dto.items as any;
      for (const it of dto.items) {
        if (it.itemId && it.costingActualQty !== undefined) {
          await this.prisma.finished_goods_transfer_items.updateMany({
            where: {
              transfer_id: BigInt(dto.transferId),
              item_id: BigInt(it.itemId),
            },
            data: {
              costing_actual_qty: new Decimal(it.costingActualQty),
              costing_actual_count: it.costingActualCount || 0,
            },
          });
        }
      }
    }

    const updated = await this.prisma.finished_goods_transfers.update({
      where: { id: BigInt(dto.transferId) },
      data: {
        costing_actual_qty: new Decimal(actualWeight),
        costing_actual_count: actualCount,
        costing_weight_diff: new Decimal(weightDiff),
        costing_count_diff: countDiff,
        costing_discrepancy_flag: escalate || Math.abs(weightDiff) > 0.1,
        costing_auditor: dto.auditorName || 'مراجع التكاليف المعتمد',
        costing_audited_at: new Date(),
        costing_notes: dto.notes || null,
        costing_dispute_status: escalate ? 'OPEN' : 'NONE',
        costing_dispute_reason: escalate ? `تضارب وزن: الصالة ${prodQty} كجم مقابل ميزان التكاليف ${actualWeight} كجم` : null,
        status,
        items_json: updatedItemsJson || undefined,
      },
    });

    return {
      success: true,
      message: escalate
        ? 'تم تصعيد الإذن إلى لجنة الإنتاج والتكاليف لبحث الانحراف'
        : 'تم اعتماد ميزان التكاليف وإحالة الإذن إلى فحص الجودة',
      data: this.serializeBigInt(updated),
    };
  }

  async resolveCostingDispute(dto: ResolveCostingDisputeDto, companyId?: string) {
    if (!dto.transferId || !dto.finalAcceptedWeight) {
      throw new BadRequestException('معرف الإذن والوزن النهائي المعتمد مطلوبان.');
    }

    const transfer = await this.prisma.finished_goods_transfers.findUnique({
      where: { id: BigInt(dto.transferId) },
    });

    if (!transfer) {
      throw new NotFoundException('إذن التحويل غير موجود.');
    }

    const updated = await this.prisma.finished_goods_transfers.update({
      where: { id: BigInt(dto.transferId) },
      data: {
        costing_actual_qty: new Decimal(dto.finalAcceptedWeight),
        costing_actual_count: dto.finalAcceptedCount ?? transfer.costing_actual_count,
        costing_dispute_status: 'RESOLVED',
        costing_dispute_charge_to: dto.chargeTo || 'عجز تصنيع يُحمّل على تقرير وردية الصالة',
        costing_dispute_notes: dto.resolutionNotes || 'تم فض النزاع واعتماد الوزن النهائي',
        costing_dispute_resolved_by: dto.resolvedBy || 'لجنة الإنتاج والتكاليف',
        costing_dispute_resolved_at: new Date(),
        status: 'PENDING_QC',
      },
    });

    return {
      success: true,
      message: 'تم حسم نزاع التكاليف والإنتاج وتمرير الإذن لمحطة الجودة بنجاح',
      data: this.serializeBigInt(updated),
    };
  }

  async inspectQc(dto: QcInspectionDto, companyId?: string) {
    if (!dto.transferId || dto.approvedQty === undefined || dto.approvedQty === null) {
      throw new BadRequestException('معرف الإذن والكمية المقبولة مطلوبان.');
    }

    const transfer = await this.prisma.finished_goods_transfers.findUnique({
      where: { id: BigInt(dto.transferId) },
    });

    if (!transfer) {
      throw new NotFoundException('إذن التحويل غير موجود.');
    }

    const approvedQty = Number(dto.approvedQty);
    const reworkQty = Number(dto.reworkQty || 0);
    const sampleQty = Number(dto.sampleQty || 0);
    const scrapQty = Number(dto.scrapQty || 0);

    let status = 'PENDING_RECEIPT';
    if (reworkQty > 0 && approvedQty <= 0) {
      status = 'REWORK_IN_PRODUCTION';
    } else if (approvedQty > 0) {
      status = 'PENDING_RECEIPT';
    } else if (scrapQty > 0 && approvedQty <= 0) {
      status = 'QC_REJECTED';
    }

    // تحديث تفاصيل بنود الأصناف للجودة
    let updatedItemsJson = transfer.items_json;
    if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
      updatedItemsJson = dto.items as any;
      for (const it of dto.items) {
        if (it.itemId) {
          await this.prisma.finished_goods_transfer_items.updateMany({
            where: {
              transfer_id: BigInt(dto.transferId),
              item_id: BigInt(it.itemId),
            },
            data: {
              qc_approved_qty: it.qcApprovedQty ? new Decimal(it.qcApprovedQty) : new Decimal(0),
              qc_sample_qty: it.qcSampleQty ? new Decimal(it.qcSampleQty) : new Decimal(0),
              qc_rework_qty: it.qcReworkQty ? new Decimal(it.qcReworkQty) : new Decimal(0),
              qc_scrap_qty: it.qcScrapQty ? new Decimal(it.qcScrapQty) : new Decimal(0),
            },
          });
        }
      }
    }

    const updated = await this.prisma.finished_goods_transfers.update({
      where: { id: BigInt(dto.transferId) },
      data: {
        qc_approved_qty: new Decimal(approvedQty),
        qc_sample_qty: new Decimal(sampleQty),
        qc_rework_qty: new Decimal(reworkQty),
        qc_scrap_qty: new Decimal(scrapQty),
        qc_inspector: dto.inspectorName || 'مراقب الجودة وتوكيد السلامة',
        qc_inspected_at: new Date(),
        qc_notes: dto.notes || null,
        status,
        items_json: updatedItemsJson || undefined,
      },
    });

    return {
      success: true,
      message: `تم اعتماد فحص الجودة بصافي (${approvedQty} كجم) للكنترول ${reworkQty > 0 ? `وتوجيه (${reworkQty} كجم) للتعديل بالصالة` : ''}`,
      data: this.serializeBigInt(updated),
    };
  }

  async resubmitRework(dto: ResubmitReworkDto, companyId?: string) {
    if (!dto.transferId || !dto.adjustedQty) {
      throw new BadRequestException('معرف الإذن والكمية بعد التعديل مطلوبان.');
    }

    const transfer = await this.prisma.finished_goods_transfers.findUnique({
      where: { id: BigInt(dto.transferId) },
    });

    if (!transfer) {
      throw new NotFoundException('إذن التحويل غير موجود.');
    }

    const updated = await this.prisma.finished_goods_transfers.update({
      where: { id: BigInt(dto.transferId) },
      data: {
        prod_dispatched_qty: new Decimal(dto.adjustedQty),
        prod_dispatched_count: dto.adjustedCount ?? transfer.prod_dispatched_count,
        prod_notes: `${transfer.prod_notes || ''} | إعادة تسليم بعد التعديل: ${dto.notes || 'تم الإصلاح بالصالة'}`,
        status: 'PENDING_COSTING',
      },
    });

    return {
      success: true,
      message: 'تم تسجيل انتهاء التعديل بالصالة وإعادة توجيه الدفعة لميزان التكاليف',
      data: this.serializeBigInt(updated),
    };
  }

  async receiveControl(dto: ControlReceiptDto, companyId?: string) {
    if (!dto.transferId || dto.receivedQty === undefined || dto.receivedQty === null) {
      throw new BadRequestException('معرف الإذن والكمية المستلمة فعلياً مطلوبان.');
    }

    const transfer = await this.prisma.finished_goods_transfers.findUnique({
      where: { id: BigInt(dto.transferId) },
      include: {
        finished_goods_transfer_items: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('إذن التحويل غير موجود.');
    }

    const receivedQty = Number(dto.receivedQty);
    const approvedQc = Number(transfer.qc_approved_qty || transfer.costing_actual_qty || transfer.prod_dispatched_qty);
    const hasDispute = receivedQty < approvedQc - 0.05;

    const status = hasDispute ? 'IN_DISPUTE' : 'COMPLETED';

    // تحديث تفاصيل بنود الاستلام
    let updatedItemsJson = transfer.items_json;
    if (dto.items && Array.isArray(dto.items) && dto.items.length > 0) {
      updatedItemsJson = dto.items as any;
      for (const it of dto.items) {
        if (it.itemId) {
          await this.prisma.finished_goods_transfer_items.updateMany({
            where: {
              transfer_id: BigInt(dto.transferId),
              item_id: BigInt(it.itemId),
            },
            data: {
              received_actual_qty: it.receivedActualQty !== undefined ? new Decimal(it.receivedActualQty) : null,
              received_actual_count: it.receivedActualCount || 0,
            },
          });
        }
      }
    }

    const updated = await this.prisma.finished_goods_transfers.update({
      where: { id: BigInt(dto.transferId) },
      data: {
        received_actual_qty: new Decimal(receivedQty),
        received_actual_count: dto.receivedCount ?? transfer.costing_actual_count ?? transfer.prod_dispatched_count,
        control_receiver_name: dto.receiverName || 'أمين مخزن الكنترول',
        control_received_at: new Date(),
        control_notes: dto.notes || null,
        has_dispute: hasDispute,
        dispute_status: hasDispute ? 'OPEN' : 'NONE',
        dispute_reason: hasDispute ? `عجز في الاستلام: المعتمد من الجودة ${approvedQc} كجم، المستلم فعلياً ${receivedQty} كجم` : null,
        dispute_opened_at: hasDispute ? new Date() : null,
        status,
        items_json: updatedItemsJson || undefined,
      },
    });

    // ترصيد الكميات المستلمة في رصيد مخزن الكنترول (stock_balances) إن لم يكن هناك نزاع
    if (!hasDispute) {
      if (transfer.finished_goods_transfer_items && transfer.finished_goods_transfer_items.length > 0) {
        for (const it of transfer.finished_goods_transfer_items) {
          const qty = Number(it.received_actual_qty || it.qc_approved_qty || it.prod_dispatched_qty);
          await this.updateStockBalance(
            transfer.destination_warehouse_id,
            it.item_id,
            qty,
            it.received_actual_count || it.prod_dispatched_count || 0
          );
        }
      } else {
        await this.updateStockBalance(
          transfer.destination_warehouse_id,
          transfer.item_id,
          receivedQty,
          dto.receivedCount ?? 0
        );
      }
    }

    return {
      success: true,
      message: hasDispute
        ? 'تم تسجيل الاستلام وتصعيد الإذن للجنة فض المنازعات لوجود عجز كمي'
        : 'تم تأكيد استلام الشحنة وترصيد كافة الأصناف في مخزن الكنترول بنجاح',
      data: this.serializeBigInt(updated),
    };
  }

  async resolveControlDispute(dto: ResolveControlDisputeDto, companyId?: string) {
    if (!dto.transferId || !dto.finalAcceptedQty) {
      throw new BadRequestException('معرف الإذن والكمية المعتمدة نهائياً مطلوبة.');
    }

    const transfer = await this.prisma.finished_goods_transfers.findUnique({
      where: { id: BigInt(dto.transferId) },
    });

    if (!transfer) {
      throw new NotFoundException('إذن التحويل غير موجود.');
    }

    const updated = await this.prisma.finished_goods_transfers.update({
      where: { id: BigInt(dto.transferId) },
      data: {
        received_actual_qty: new Decimal(dto.finalAcceptedQty),
        dispute_status: 'RESOLVED',
        control_dispute_charge_to: dto.chargeTo || 'عهدة سائق وعامل النقل الداخلي',
        dispute_resolution_notes: dto.resolutionNotes || 'محضر تسوية لجنة فض المنازعات المشتركة',
        dispute_resolved_by: dto.resolvedBy || 'لجنة فض المنازعات',
        dispute_resolved_at: new Date(),
        status: 'COMPLETED',
      },
    });

    // ترصيد الكمية المعتمدة في المخزن
    await this.updateStockBalance(
      transfer.destination_warehouse_id,
      transfer.item_id,
      Number(dto.finalAcceptedQty),
      transfer.received_actual_count || 0
    );

    return {
      success: true,
      message: 'تم اعتماد قرار لجنة فض المنازعات وترصيد الشحنة بالكنترول بنجاح',
      data: this.serializeBigInt(updated),
    };
  }

  private async updateStockBalance(warehouseId: bigint, itemId: bigint, qty: number, count: number) {
    try {
      const existing = await this.prisma.stock_balances.findFirst({
        where: {
          warehouse_id: warehouseId,
          item_id: itemId,
        },
      });

      if (existing) {
        await this.prisma.stock_balances.update({
          where: { id: existing.id },
          data: {
            quantity: {
              increment: new Decimal(qty),
            },
            last_updated_at: new Date(),
          },
        });
      } else {
        await this.prisma.stock_balances.create({
          data: {
            company_id: 1n,
            warehouse_id: warehouseId,
            item_id: itemId,
            quantity: new Decimal(qty),
            reserved_quantity: new Decimal(0),
            last_updated_at: new Date(),
          },
        });
      }
    } catch (err) {
      console.warn('Failed to auto-update stock_balance:', err);
    }
  }
}
