import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';

export interface CreateBranchTransferDto {
  transferNumber?: string;
  transferDate?: string;
  sourceWarehouseId?: string | number;
  destinationWarehouseId?: string | number;
  destinationBranchId?: string | number;
  fromBranchId?: string | number;
  toBranchId?: string | number;
  itemId?: string | number;
  dispatchedQty?: number;
  dispatchedCount?: number;
  driverName?: string;
  vehicleNumber?: string;
  dispatcherName?: string;
  containerType?: string;
  crateCount?: number;
  cratesCount?: number;
  innerCount?: number;
  batchNumber?: string;
  notes?: string;
  items?: Array<{
    itemId: string | number;
    itemName?: string;
    itemCode?: string;
    quantity: number;
    unit?: string;
    notes?: string;
  }>;
}

export interface ReceiveBranchTransferDto {
  transferId?: string | number;
  receivedQty?: number;
  receivedCount?: number;
  receivedCrateCount?: number;
  receivedCratesCount?: number;
  receiverName?: string;
  disputeReason?: string;
  disputeChargeTo?: string;
  disputeNotes?: string;
  notes?: string;
}

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. جلب قائمة الفروع والمعارض المتاحة مباشرة من Neon DB
  async getBranches() {
    try {
      const branchList = await this.prisma.branches.findMany({
        where: { active: true },
        orderBy: { branch_name: 'asc' },
      });

      return {
        success: true,
        data: branchList.map((b) => ({
          ...b,
          id: String(b.id),
          company_id: String(b.company_id),
        })),
      };
    } catch (err: any) {
      console.error('Error fetching branches:', err);
      return { success: false, data: [], message: err.message };
    }
  }

  // 2. جلب قائمة المستودعات مباشرة من Neon DB
  async getWarehouses() {
    try {
      const warehouses = await this.prisma.warehouses.findMany({
        where: { active: true },
        orderBy: { warehouse_name: 'asc' },
      });

      return {
        success: true,
        data: warehouses.map((w) => ({
          ...w,
          id: String(w.id),
          company_id: String(w.company_id),
        })),
      };
    } catch (err: any) {
      console.error('Error fetching warehouses:', err);
      return { success: false, data: [], message: err.message };
    }
  }

  // 3. جلب تحويلات الفروع مع الفلترة بحسب الحالة (PENDING / IN_TRANSIT / COMPLETED)
  async getBranchTransfers(filter?: { status?: string; branchId?: string }) {
    try {
      const where: any = {};
      if (filter?.status && filter.status !== 'ALL') {
        if (filter.status === 'COMPLETED') {
          where.status = { in: ['COMPLETED', 'RECEIVED'] };
        } else {
          where.status = filter.status;
        }
      }
      if (filter?.branchId && filter.branchId !== 'ALL') {
        where.destination_branch_id = BigInt(filter.branchId);
      }

      const transfers = await this.prisma.branch_transfers.findMany({
        where,
        include: {
          items: {
            select: { id: true, item_name: true, item_code: true, unit: true },
          },
          branches: {
            select: { id: true, branch_name: true, branch_code: true, phone: true },
          },
          warehouses_branch_transfers_source_warehouse_idTowarehouses: {
            select: { id: true, warehouse_name: true },
          },
          warehouses_branch_transfers_destination_warehouse_idTowarehouses: {
            select: { id: true, warehouse_name: true },
          },
        },
        orderBy: { id: 'desc' },
        take: 100,
      });

      // تحويل معرفات BigInt لنصوص صريحة
      const serialized = transfers.map((t) => ({
        ...t,
        id: String(t.id),
        company_id: t.company_id ? String(t.company_id) : '1',
        source_warehouse_id: String(t.source_warehouse_id),
        destination_warehouse_id: String(t.destination_warehouse_id),
        destination_branch_id: String(t.destination_branch_id),
        item_id: String(t.item_id),
        dispatched_qty: Number(t.dispatched_qty),
        received_qty: t.received_qty !== null ? Number(t.received_qty) : null,
        items: t.items ? { ...t.items, id: String(t.items.id) } : undefined,
        branches: t.branches ? { ...t.branches, id: String(t.branches.id) } : undefined,
      }));

      return {
        success: true,
        data: serialized,
      };
    } catch (err: any) {
      console.error('Error fetching branch transfers:', err);
      return { success: false, data: [], message: err.message };
    }
  }

  async getTransfers(status?: string) {
    return await this.getBranchTransfers({ status });
  }

  // 4. إنشاء إذن تحويل وصرف بضاعة تامة وصناديق إلى فرع مع دعم الأصناف المتعددة
  async createBranchTransfer(dto: CreateBranchTransferDto) {
    const branchIdVal = dto.destinationBranchId || dto.toBranchId;
    if (!branchIdVal) {
      throw new BadRequestException('الفرع المستلم مطلوب');
    }

    const itemsToProcess = (dto.items && dto.items.length > 0)
      ? dto.items
      : (dto.itemId ? [{ itemId: dto.itemId, quantity: dto.dispatchedQty || 1, notes: dto.notes }] : []);

    if (itemsToProcess.length === 0) {
      throw new BadRequestException('يجب إضافة صنف واحد على الأقل داخل إذن التحويل');
    }

    const transferNumber = dto.transferNumber?.trim() || `TR-${Date.now().toString().slice(-7)}`;
    const transferDate = dto.transferDate ? new Date(dto.transferDate) : new Date();

    let sourceWhId = dto.sourceWarehouseId || dto.fromBranchId ? BigInt(dto.sourceWarehouseId || dto.fromBranchId!) : null;
    let destWhId = dto.destinationWarehouseId ? BigInt(dto.destinationWarehouseId) : null;

    try {
      if (!sourceWhId || !destWhId) {
        const whList = await this.prisma.warehouses.findMany({ take: 2 });
        if (whList.length > 0) {
          if (!sourceWhId) sourceWhId = whList[0].id;
          if (!destWhId) destWhId = whList[whList.length - 1].id;
        }
      }
    } catch {}

    const branchId = BigInt(branchIdVal);
    const crateCount = Number(dto.crateCount ?? dto.cratesCount ?? 0);

    try {
      const createdRecords = [];
      let mainRecord: any = null;

      for (let i = 0; i < itemsToProcess.length; i++) {
        const it = itemsToProcess[i];
        const itemId = BigInt(it.itemId);
        const qty = Number(it.quantity);
        const isFirst = i === 0;

        const record = await this.prisma.branch_transfers.create({
          data: {
            transfer_number: isFirst ? transferNumber : `${transferNumber}-${i + 1}`,
            transfer_date: transferDate,
            source_warehouse_id: sourceWhId || BigInt(1),
            destination_warehouse_id: destWhId || BigInt(2),
            destination_branch_id: branchId,
            item_id: itemId,
            batch_number: dto.batchNumber || `B-${Date.now().toString().slice(-4)}`,
            dispatched_qty: qty,
            dispatched_count: isFirst ? (dto.dispatchedCount || 1) : 1,
            driver_name: dto.driverName || 'سائق التوزيع المركزي',
            vehicle_number: dto.vehicleNumber || 'د ق أ 1234',
            dispatcher_name: dto.dispatcherName || 'أمين مخزن التوزيع',
            status: 'IN_TRANSIT',
            container_type: dto.containerType || 'سرفيس استيل',
            crate_count: isFirst ? crateCount : 0,
            inner_count: dto.innerCount || 0,
            notes: it.notes || dto.notes || 'تسليم طلبية المعرض الصباحية',
          },
          include: {
            items: { select: { item_name: true, item_code: true, unit: true } },
            branches: { select: { branch_name: true } },
          },
        });

        if (isFirst) mainRecord = record;
        createdRecords.push(record);

        // خصم رصيد البضاعة التامة المنصرفة من المستودع
        try {
          if (sourceWhId) {
            await this.prisma.stock_balances.updateMany({
              where: {
                warehouse_id: sourceWhId,
                item_id: itemId,
              },
              data: {
                quantity: { decrement: qty },
              },
            });
          }
        } catch {}
      }

      // مزامنة حركة الصناديق المتداولة تلقائياً في جدول crate_movements
      if (crateCount > 0) {
        try {
          await this.prisma.crate_movements.create({
            data: {
              movement_number: `CR-TR-${mainRecord.id}`,
              created_at: new Date(),
              movement_type: 'DISPATCH_BRANCH',
              container_name: dto.containerType || 'سرفيس حلويات استيل',
              dispatched_quantity: crateCount,
              source_location: 'مخزن التوزيع المركزي',
              destination_location: mainRecord.branches?.branch_name || 'معرض الفرع',
              dispatched_by_code: 'DIST-01',
              dispatched_by_name: dto.dispatcherName || 'أمين التوزيع',
              notes: `صرف صناديق محملة مع إذن تحويل ${transferNumber}`,
              shortage_quantity: 0,
              damaged_count: 0,
              status: 'DISPATCHED',
            },
          });
        } catch (e) {
          console.warn('Auto crate movement link skipped:', e);
        }
      }

      const broadcastPayload = {
        transferId: String(mainRecord.id),
        transferNumber: transferNumber,
        branchName: mainRecord.branches?.branch_name,
        itemsCount: createdRecords.length,
        crateCount: crateCount,
        driverName: mainRecord.driver_name,
        vehicleNumber: mainRecord.vehicle_number,
        timestamp: new Date().toISOString(),
      };

      // بث الحدث اللحظي لتحديث شاشات المصنع والفروع فوراً
      this.realtime.server?.emit('branch_transfer_created', broadcastPayload);

      return {
        success: true,
        message: 'تم إصدار إذن التحويل وتوثيق عهدة الصناديق وبث الإشعار بنجاح',
        data: {
          ...mainRecord,
          id: String(mainRecord.id),
          itemsCount: createdRecords.length,
        },
      };
    } catch (err: any) {
      console.error('Error creating branch transfer:', err);
      throw new BadRequestException('تعذر إنشاء إذن التحويل: ' + err.message);
    }
  }

  // 5. تأكيد استلام التحويل في المعرض مع معالجة الفروقات (POST /transfers/receive)
  async receiveBranchTransfer(
    idOrDto: string | number | ReceiveBranchTransferDto,
    maybeDto?: ReceiveBranchTransferDto,
  ) {
    let id: string | number;
    let dto: ReceiveBranchTransferDto;

    if (typeof idOrDto === 'object' && idOrDto !== null) {
      if (!idOrDto.transferId) {
        throw new BadRequestException('معرف إذن التحويل transferId مطلوب');
      }
      id = idOrDto.transferId;
      dto = idOrDto;
    } else {
      id = idOrDto;
      dto = maybeDto || {};
    }

    try {
      const existing = await this.prisma.branch_transfers.findUnique({
        where: { id: BigInt(id) },
        include: {
          items: true,
          branches: true,
        },
      });

      if (!existing) {
        throw new NotFoundException(`إذن التحويل برقم ${id} غير موجود`);
      }

      const receivedQty = dto.receivedQty !== undefined ? Number(dto.receivedQty) : Number(existing.dispatched_qty);
      const receivedCrates = dto.receivedCrateCount ?? dto.receivedCratesCount ?? (existing.crate_count || 0);

      const qtyDiff = Number(existing.dispatched_qty) - receivedQty;
      const crateDiff = (existing.crate_count || 0) - Number(receivedCrates);

      const hasDispute = qtyDiff > 0 || crateDiff > 0;
      const status = hasDispute ? 'DISPUTED' : 'COMPLETED';

      const updated = await this.prisma.branch_transfers.update({
        where: { id: BigInt(id) },
        data: {
          received_qty: receivedQty,
          received_count: dto.receivedCount || existing.dispatched_count,
          received_crate_count: Number(receivedCrates),
          receiver_name: dto.receiverName || 'مشرف المعرض',
          status,
          dispute_reason: hasDispute ? (dto.disputeReason || `عجز في البضاعة (${qtyDiff.toFixed(2)} كجم) أو الصناديق (${crateDiff})`) : null,
          dispute_charge_to: hasDispute ? (dto.disputeChargeTo || 'سائق سيارة التوزيع') : null,
          dispute_notes: dto.disputeNotes || null,
          notes: dto.notes ? `${existing.notes || ''} - ${dto.notes}` : existing.notes,
          updated_at: new Date(),
        },
        include: {
          items: { select: { item_name: true } },
          branches: { select: { branch_name: true } },
        },
      });

      // إضافة رصيد البضاعة المستلمة لمستودع المعرض
      try {
        if (existing.destination_warehouse_id) {
          await this.prisma.stock_balances.upsert({
            where: {
              warehouse_id_item_id: {
                warehouse_id: existing.destination_warehouse_id,
                item_id: existing.item_id,
              },
            },
            create: {
              company_id: existing.company_id || BigInt(1),
              warehouse_id: existing.destination_warehouse_id,
              item_id: existing.item_id,
              quantity: receivedQty,
              reserved_quantity: 0,
            },
            update: {
              quantity: { increment: receivedQty },
            },
          });
        }
      } catch {}

      const broadcastPayload = {
        transferId: String(updated.id),
        transferNumber: updated.transfer_number,
        branchName: updated.branches?.branch_name,
        status: updated.status,
        receivedQty: Number(updated.received_qty),
        receivedCrateCount: updated.received_crate_count,
        timestamp: new Date().toISOString(),
      };

      // بث إشعار تأكيد الاستلام
      this.realtime.server?.emit('branch_transfer_received', broadcastPayload);

      return {
        success: true,
        message: hasDispute
          ? `تم تأكيد الاستلام بالمعرض مع تسجيل نزاع وعجز (${qtyDiff.toFixed(2)} كجم و ${crateDiff} صندوق)`
          : 'تم تأكيد استلام البضاعة والصناديق بالمعرض مطابقة بالكامل وتحديث رصيد المعرض',
        data: {
          ...updated,
          id: String(updated.id),
          dispatched_qty: Number(updated.dispatched_qty),
          received_qty: Number(updated.received_qty),
        },
      };
    } catch (err: any) {
      console.error('Error receiving branch transfer:', err);
      throw new BadRequestException('تعذر تأكيد استلام التحويل: ' + err.message);
    }
  }

  // 6. جلب تفاصيل تحويل محدد للطباعة الرسمية (GET /transfers/:id)
  async getTransferById(id: string | number) {
    try {
      const transfer = await this.prisma.branch_transfers.findUnique({
        where: { id: BigInt(id) },
        include: {
          items: true,
          branches: true,
          warehouses_branch_transfers_source_warehouse_idTowarehouses: true,
          warehouses_branch_transfers_destination_warehouse_idTowarehouses: true,
        },
      });

      if (!transfer) {
        throw new NotFoundException(`إذن التحويل برقم ${id} غير موجود`);
      }

      // البحث عن أي أصناف مرافقة لنفس رقم التحويل
      let siblingItems: any[] = [];
      try {
        const baseNum = transfer.transfer_number.split('-')[0] + '-' + transfer.transfer_number.split('-')[1];
        siblingItems = await this.prisma.branch_transfers.findMany({
          where: {
            transfer_number: { startsWith: baseNum },
            id: { not: transfer.id },
          },
          include: { items: true },
        });
      } catch {}

      return {
        success: true,
        data: {
          ...transfer,
          id: String(transfer.id),
          company_id: transfer.company_id ? String(transfer.company_id) : '1',
          source_warehouse_id: String(transfer.source_warehouse_id),
          destination_warehouse_id: String(transfer.destination_warehouse_id),
          destination_branch_id: String(transfer.destination_branch_id),
          item_id: String(transfer.item_id),
          dispatched_qty: Number(transfer.dispatched_qty),
          received_qty: transfer.received_qty !== null ? Number(transfer.received_qty) : null,
          allTransferItems: [
            transfer,
            ...siblingItems,
          ].map((item) => ({
            itemId: String(item.item_id),
            itemName: item.items?.item_name,
            itemCode: item.items?.item_code,
            quantity: Number(item.dispatched_qty),
            unit: item.items?.unit || 'كجم',
            crateCount: item.crate_count || 0,
            receivedQty: item.received_qty !== null ? Number(item.received_qty) : null,
          })),
        },
      };
    } catch (err: any) {
      console.error('Error fetching transfer details:', err);
      throw new BadRequestException('تعذر جلب تفاصيل التحويل: ' + err.message);
    }
  }
}
