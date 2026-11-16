import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import {
  CreateFabricationOrderDto,
  IssueMaterialDto,
  CompleteFabricationOrderDto,
  CreateMaterialDto,
  CreateAssetDto,
  CreateStaffDto,
} from './dto/engineering.dto.js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class FabricationService {
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

  // 1. استرجاع أوامر التصنيع الداخلي بالورش
  async getFabricationOrders(
    companyId: string | number = 1,
    query?: { status?: string; workshopId?: string; search?: string },
  ) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query?.workshopId && query.workshopId !== 'ALL') {
      where.workshop_id = BigInt(query.workshopId);
    }
    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { order_number: { contains: s, mode: 'insensitive' } },
        { item_name: { contains: s, mode: 'insensitive' } },
      ];
    }

    const orders = await this.prisma.fabrication_orders.findMany({
      where,
      include: {
        engineering_workshops: true,
        fabrication_workflow_routes: true,
        branches: true,
        material_issuance_logs: {
          include: { engineering_materials: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return this.serializeBigInt({
      success: true,
      data: orders,
    });
  }

  // 2. إنشاء أمر تصنيع داخلي جديد (تروليات، ترابيزات، مكاتب، كراسي)
  async createFabricationOrder(dto: CreateFabricationOrderDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const orderNumber = `FAB-${Date.now().toString().slice(-6)}`;

    const workshopId = BigInt(dto.workshopId);
    const routeId = dto.routeId ? BigInt(dto.routeId) : null;
    const targetBranchId = dto.targetBranchId ? BigInt(dto.targetBranchId) : null;

    // استخراج اسم أول خطوة في المسار إن وُجد
    let firstStepName = 'تصميم ومقايسة الأبعاد والمواصفات';
    if (routeId) {
      const route = await this.prisma.fabrication_workflow_routes.findFirst({
        where: { id: routeId, company_id: cid },
      });
      if (route && Array.isArray(route.steps_json) && route.steps_json.length > 0) {
        const steps = route.steps_json as any[];
        firstStepName = steps[0].name || steps[0].title || firstStepName;
      }
    }

    const order = await this.prisma.fabrication_orders.create({
      data: {
        company_id: cid,
        order_number: orderNumber,
        workshop_id: workshopId,
        route_id: routeId,
        item_name: dto.itemName,
        quantity: dto.quantity || 1,
        target_branch_id: targetBranchId,
        bom_materials_json: dto.bomMaterialsJson || null,
        labor_hours: new Decimal(dto.laborHours || 0),
        status: 'IN_PROGRESS',
        current_step_name: firstStepName,
        notes: dto.notes,
      },
      include: {
        engineering_workshops: true,
        branches: true,
      },
    });

    return this.serializeBigInt({
      success: true,
      message: `تم إنشاء أمر التصنيع الداخلي برقم ${orderNumber}`,
      data: order,
    });
  }

  // 3. صرف خامات هندسية (استانلس/حديد/خشب) أو إرجاع فضلات وبواقي (Remnants)
  async issueMaterial(dto: IssueMaterialDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const materialId = BigInt(dto.materialId);

    const material = await this.prisma.engineering_materials.findFirst({
      where: { id: materialId, company_id: cid },
    });

    if (!material) {
      throw new NotFoundException('الخامة أو قطعة الغيار غير موجودة بالمخزن الهندسي');
    }

    const qty = new Decimal(dto.quantity);
    const unitCost = material.unit_cost;
    const totalCost = qty.mul(unitCost);

    const isReturn = dto.isRemnantReturn ?? false;

    // تحديث رصيد المخزن الهندسي
    if (isReturn) {
      // إعادة فضلات وبواقي صالحة لإعادة الاستخدام -> زيادة الرصيد
      await this.prisma.engineering_materials.update({
        where: { id: materialId },
        data: { current_stock: { increment: qty } },
      });
    } else {
      // صرف خامات -> خصم الرصيد
      await this.prisma.engineering_materials.update({
        where: { id: materialId },
        data: { current_stock: { decrement: qty } },
      });
    }

    // تسجيل حركة الصرف/الإرجاع
    const log = await this.prisma.material_issuance_logs.create({
      data: {
        company_id: cid,
        material_id: materialId,
        ticket_id: dto.ticketId ? BigInt(dto.ticketId) : null,
        fabrication_order_id: dto.fabricationOrderId ? BigInt(dto.fabricationOrderId) : null,
        quantity: qty,
        unit_cost: unitCost,
        total_cost: totalCost,
        is_remnant_return: isReturn,
        notes: dto.notes,
        issued_by_name: dto.issuedByName || 'أمين المخزن الهندسي',
      },
      include: { engineering_materials: true },
    });

    // تحديث تكلفة أمر التصنيع أو أمر الصيانة
    if (dto.fabricationOrderId) {
      const fId = BigInt(dto.fabricationOrderId);
      if (isReturn) {
        await this.prisma.fabrication_orders.update({
          where: { id: fId },
          data: {
            materials_cost: { decrement: totalCost },
            total_actual_cost: { decrement: totalCost },
          },
        });
      } else {
        await this.prisma.fabrication_orders.update({
          where: { id: fId },
          data: {
            materials_cost: { increment: totalCost },
            total_actual_cost: { increment: totalCost },
          },
        });
      }
    } else if (dto.ticketId) {
      const tId = BigInt(dto.ticketId);
      await this.prisma.maintenance_tickets.update({
        where: { id: tId },
        data: {
          total_cost: { increment: isReturn ? totalCost.negated() : totalCost },
        },
      });
    }

    return this.serializeBigInt({
      success: true,
      message: isReturn
        ? `تم تسجيل استلام الفضلات وبواقي القص وإعادتها للرصيد`
        : `تم صرف ${qty} ${material.unit} بنجاح من مخزن الخامات`,
      data: log,
    });
  }

  // 4. إغلاق أمر التصنيع والرسملة الآلية بسجل الأصول (Capitalization to Assets)
  async completeAndCapitalizeOrder(
    orderId: string | number,
    dto: CompleteFabricationOrderDto,
    companyId: string | number = 1,
  ) {
    const cid = BigInt(companyId);
    const oId = BigInt(orderId);

    const order = await this.prisma.fabrication_orders.findFirst({
      where: { id: oId, company_id: cid },
      include: { engineering_workshops: true, branches: true },
    });

    if (!order) {
      throw new NotFoundException('أمر التصنيع غير موجود');
    }

    const hours = new Decimal(dto.laborHours || order.labor_hours || 0);
    // متوسط أجر ساعة الفني (افتراضي 75 ج.م/ساعة)
    const hourlyRate = new Decimal(75);
    const laborCost = hours.mul(hourlyRate);
    const materialsCost = order.materials_cost;
    const totalActualCost = materialsCost.add(laborCost);

    const qty = order.quantity || 1;
    const unitAssetCost = totalActualCost.div(new Decimal(qty));

    // إنشاء الأصول المصنعة داخلياً تلقائياً في جدول الأصول الهندسية
    const generatedAssetIds: string[] = [];

    for (let i = 1; i <= qty; i++) {
      const assetCode = `AST-FAB-${order.order_number}-${i}`;
      const asset = await this.prisma.engineering_assets.create({
        data: {
          company_id: cid,
          asset_code: assetCode,
          name: `${order.item_name} (تصنيع داخلي)`,
          category: 'FURNITURE_TROLLEY',
          branch_id: order.target_branch_id,
          status: 'OPERATIONAL',
          total_maintenance_cost: new Decimal(0),
          is_internally_fabricated: true,
          fabrication_order_id: order.id,
        },
      });
      generatedAssetIds.push(String(asset.id));
    }

    // تحديث أمر التصنيع
    const updatedOrder = await this.prisma.fabrication_orders.update({
      where: { id: oId },
      data: {
        status: 'COMPLETED_CAPITALIZED',
        labor_hours: hours,
        labor_cost: laborCost,
        total_actual_cost: totalActualCost,
        generated_asset_ids: generatedAssetIds,
        current_step_name: 'تم التسليم والرسملة بسجل الأصول',
        notes: dto.notes ? `${order.notes || ''}\n${dto.notes}` : order.notes,
      },
    });

    return this.serializeBigInt({
      success: true,
      message: `تم إغلاق أمر التصنيع ورسملة عدد (${qty}) أصل جديد تلقائياً في سجل الأصول وتوجيهها لعهدة الفرع`,
      data: {
        order: updatedOrder,
        generatedAssetIds,
        totalActualCost: Number(totalActualCost),
        unitAssetCost: Number(unitAssetCost),
      },
    });
  }

  // 5. استرجاع مخزون الخامات وقطع الغيار
  async getMaterials(companyId: string | number = 1, query?: { materialType?: string; isRemnant?: boolean; search?: string }) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };

    if (query?.materialType && query.materialType !== 'ALL') {
      where.material_type = query.materialType;
    }
    if (query?.isRemnant !== undefined) {
      where.is_remnant = query.isRemnant;
    }
    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }

    const list = await this.prisma.engineering_materials.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return this.serializeBigInt({
      success: true,
      data: list,
    });
  }

  // 6. إضافة خامة أو قطعة غيار جديدة
  async createMaterial(dto: CreateMaterialDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);

    const m = await this.prisma.engineering_materials.create({
      data: {
        company_id: cid,
        code: dto.code,
        name: dto.name,
        material_type: dto.materialType,
        unit: dto.unit,
        current_stock: new Decimal(dto.currentStock || 0),
        min_stock_level: new Decimal(dto.minStockLevel || 0),
        unit_cost: new Decimal(dto.unitCost || 0),
        is_remnant: dto.isRemnant || false,
        remnant_dimension: dto.remnantDimension,
      },
    });

    return this.serializeBigInt({
      success: true,
      message: 'تم إضافة البند لمخزن الخامات الهندسية بنجاح',
      data: m,
    });
  }

  // 7. استرجاع الأصول الهندسية
  async getAssets(companyId: string | number = 1, query?: { category?: string; status?: string; branchId?: string; search?: string }) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };

    if (query?.category && query.category !== 'ALL') {
      where.category = query.category;
    }
    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query?.branchId && query.branchId !== 'ALL') {
      where.branch_id = BigInt(query.branchId);
    }
    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { asset_code: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
      ];
    }

    const list = await this.prisma.engineering_assets.findMany({
      where,
      include: { branches: true },
      orderBy: { created_at: 'desc' },
    });

    return this.serializeBigInt({
      success: true,
      data: list,
    });
  }

  // 8. إضافة أصل هندسي جديد
  async createAsset(dto: CreateAssetDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);

    const a = await this.prisma.engineering_assets.create({
      data: {
        company_id: cid,
        asset_code: dto.assetCode,
        name: dto.name,
        category: dto.category,
        branch_id: dto.branchId ? BigInt(dto.branchId) : null,
        serial_number: dto.serialNumber,
        warranty_expiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
        status: 'OPERATIONAL',
      },
      include: { branches: true },
    });

    return this.serializeBigInt({
      success: true,
      message: 'تم إضافة الأصل الهندسي بنجاح',
      data: a,
    });
  }

  // 9. استرجاع فريق المهندسين والفنيين
  async getStaff(companyId: string | number = 1, query?: { workshopId?: string; role?: string; search?: string }) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };

    if (query?.workshopId && query.workshopId !== 'ALL') {
      where.workshop_id = BigInt(query.workshopId);
    }
    if (query?.role && query.role !== 'ALL') {
      where.role = query.role;
    }
    if (query?.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { specialty: { contains: s, mode: 'insensitive' } },
      ];
    }

    const list = await this.prisma.engineering_staff.findMany({
      where,
      include: { engineering_workshops: true },
      orderBy: { name: 'asc' },
    });

    return this.serializeBigInt({
      success: true,
      data: list,
    });
  }

  // 10. إضافة مهندس أو فني
  async createStaff(dto: CreateStaffDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);

    const s = await this.prisma.engineering_staff.create({
      data: {
        company_id: cid,
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        workshop_id: BigInt(dto.workshopId),
        specialty: dto.specialty,
        hourly_cost_rate: new Decimal(dto.hourlyCostRate || 50),
      },
      include: { engineering_workshops: true },
    });

    return this.serializeBigInt({
      success: true,
      message: 'تم إضافة الفني/المهندس للفريق بنجاح',
      data: s,
    });
  }
}
