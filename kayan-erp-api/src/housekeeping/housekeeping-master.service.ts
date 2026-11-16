import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateWorkerDto,
  UpdateWorkerDto,
  CreateZoneDto,
  UpdateZoneDto,
  CreateSupplyDto,
  IssueSupplyDto,
  CreateHygieneCheckDto,
} from './dto/housekeeping.dto.js';
import { Prisma } from '@prisma/client';

function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (obj instanceof Prisma.Decimal) return Number(obj.toString());
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj)) {
      res[key] = serializeBigInt(obj[key]);
    }
    return res;
  }
  return obj;
}

@Injectable()
export class HousekeepingMasterService {
  constructor(private readonly prisma: PrismaService) {}

  // =================== عمال الإشراف الداخلي ===================

  async getWorkers(companyId: bigint, query?: { search?: string; zoneType?: string }) {
    const where: any = { company_id: companyId, is_active: true };

    if (query?.zoneType && query.zoneType !== 'ALL') {
      where.assigned_zone_type = query.zoneType;
    }

    if (query?.search) {
      where.OR = [
        { worker_code: { contains: query.search, mode: 'insensitive' } },
        { full_name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const workers = await this.prisma.housekeeping_workers.findMany({
      where,
      include: {
        branches: true,
        _count: {
          select: { sanitation_task_logs: true },
        },
      },
      orderBy: { worker_code: 'asc' },
    });

    return serializeBigInt(workers);
  }

  async createWorker(companyId: bigint, dto: CreateWorkerDto) {
    const existing = await this.prisma.housekeeping_workers.findFirst({
      where: { company_id: companyId, worker_code: dto.workerCode.trim() },
    });

    if (existing) {
      throw new BadRequestException(`كود العامل ${dto.workerCode} مسجل مسبقاً`);
    }

    const worker = await this.prisma.housekeeping_workers.create({
      data: {
        company_id: companyId,
        worker_code: dto.workerCode.trim(),
        full_name: dto.fullName.trim(),
        phone: dto.phone || null,
        branch_id: dto.branchId ? BigInt(dto.branchId) : null,
        assigned_zone_type: dto.assignedZoneType || 'PRODUCTION_HALL',
        supervisor_id: dto.supervisorId ? BigInt(dto.supervisorId) : null,
        supervisor_name: dto.supervisorName || null,
        performance_score: new Prisma.Decimal(dto.performanceScore ?? 100),
      },
    });

    return serializeBigInt(worker);
  }

  async updateWorker(companyId: bigint, id: bigint, dto: UpdateWorkerDto) {
    const worker = await this.prisma.housekeeping_workers.findFirst({
      where: { id, company_id: companyId },
    });

    if (!worker) {
      throw new NotFoundException(`العامل غير موجود`);
    }

    const updated = await this.prisma.housekeeping_workers.update({
      where: { id },
      data: {
        full_name: dto.fullName !== undefined ? dto.fullName.trim() : worker.full_name,
        phone: dto.phone !== undefined ? dto.phone : worker.phone,
        branch_id: dto.branchId !== undefined ? (dto.branchId ? BigInt(dto.branchId) : null) : worker.branch_id,
        assigned_zone_type: dto.assignedZoneType || worker.assigned_zone_type,
        supervisor_id: dto.supervisorId !== undefined ? (dto.supervisorId ? BigInt(dto.supervisorId) : null) : worker.supervisor_id,
        supervisor_name: dto.supervisorName !== undefined ? dto.supervisorName : worker.supervisor_name,
        performance_score: dto.performanceScore !== undefined ? new Prisma.Decimal(dto.performanceScore) : worker.performance_score,
        is_active: dto.isActive !== undefined ? dto.isActive : worker.is_active,
      },
    });

    return serializeBigInt(updated);
  }

  // =================== مناطق النظافة والـ SSOP ===================

  async getZones(companyId: bigint, query?: { envType?: string; search?: string }) {
    await this.seedDefaultZonesAndSupplies(companyId);

    const where: any = { company_id: companyId, is_active: true };

    if (query?.envType && query.envType !== 'ALL') {
      where.environment_type = query.envType;
    }

    if (query?.search) {
      where.OR = [
        { zone_code: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const zones = await this.prisma.sanitation_zones.findMany({
      where,
      include: {
        branches: true,
        sanitation_task_logs: {
          take: 1,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            status: true,
            completed_at: true,
            compliance_score: true,
            worker_name_snapshot: true,
            after_photo_url: true,
          },
        },
        _count: {
          select: { sanitation_task_logs: true },
        },
      },
      orderBy: { zone_code: 'asc' },
    });

    return serializeBigInt(zones);
  }

  async createZone(companyId: bigint, dto: CreateZoneDto) {
    const existing = await this.prisma.sanitation_zones.findFirst({
      where: { company_id: companyId, zone_code: dto.zoneCode.trim() },
    });

    if (existing) {
      throw new BadRequestException(`كود المنطقة ${dto.zoneCode} مسجل مسبقاً`);
    }

    const zone = await this.prisma.sanitation_zones.create({
      data: {
        company_id: companyId,
        zone_code: dto.zoneCode.trim(),
        name: dto.name.trim(),
        environment_type: dto.environmentType || 'PRODUCTION_SSOP',
        branch_id: dto.branchId ? BigInt(dto.branchId) : null,
        linked_asset_id: dto.linkedAssetId ? BigInt(dto.linkedAssetId) : null,
        frequency_type: dto.frequencyType || 'DAILY',
        checklist_items_json: dto.checklistItemsJson || [],
      },
    });

    return serializeBigInt(zone);
  }

  async updateZone(companyId: bigint, id: bigint, dto: UpdateZoneDto) {
    const zone = await this.prisma.sanitation_zones.findFirst({
      where: { id, company_id: companyId },
    });

    if (!zone) {
      throw new NotFoundException(`المنطقة غير موجودة`);
    }

    const updated = await this.prisma.sanitation_zones.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : zone.name,
        environment_type: dto.environmentType || zone.environment_type,
        branch_id: dto.branchId !== undefined ? (dto.branchId ? BigInt(dto.branchId) : null) : zone.branch_id,
        linked_asset_id: dto.linkedAssetId !== undefined ? (dto.linkedAssetId ? BigInt(dto.linkedAssetId) : null) : zone.linked_asset_id,
        frequency_type: dto.frequencyType || zone.frequency_type,
        checklist_items_json: dto.checklistItemsJson !== undefined ? dto.checklistItemsJson : zone.checklist_items_json,
        is_active: dto.isActive !== undefined ? dto.isActive : zone.is_active,
      },
    });

    return serializeBigInt(updated);
  }

  // =================== مخزن المنظفات والأدوات الملونة ===================

  async getSupplies(companyId: bigint, query?: { category?: string; colorCode?: string }) {
    await this.seedDefaultZonesAndSupplies(companyId);

    const where: any = { company_id: companyId, is_active: true };

    if (query?.category && query.category !== 'ALL') {
      where.category = query.category;
    }
    if (query?.colorCode && query.colorCode !== 'ALL') {
      where.color_code = query.colorCode;
    }

    const supplies = await this.prisma.sanitation_supplies.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    return serializeBigInt(supplies);
  }

  async createSupply(companyId: bigint, dto: CreateSupplyDto) {
    const existing = await this.prisma.sanitation_supplies.findFirst({
      where: { company_id: companyId, code: dto.code.trim() },
    });

    if (existing) {
      throw new BadRequestException(`كود الصنف ${dto.code} مسجل مسبقاً`);
    }

    const supply = await this.prisma.sanitation_supplies.create({
      data: {
        company_id: companyId,
        code: dto.code.trim(),
        name: dto.name.trim(),
        category: dto.category || 'GENERAL_DETERGENT',
        color_code: dto.colorCode || 'BLUE_PRODUCTION',
        unit: dto.unit || 'لتر',
        current_stock: new Prisma.Decimal(dto.currentStock ?? 0),
        min_stock_level: new Prisma.Decimal(dto.minStockLevel ?? 5),
        unit_cost: new Prisma.Decimal(dto.unitCost ?? 0),
      },
    });

    return serializeBigInt(supply);
  }

  async issueSupply(companyId: bigint, dto: IssueSupplyDto) {
    const supplyId = BigInt(dto.supplyId);
    const supply = await this.prisma.sanitation_supplies.findFirst({
      where: { id: supplyId, company_id: companyId },
    });

    if (!supply) {
      throw new NotFoundException(`المنظف أو الأداة غير موجودة بالمخزن`);
    }

    const qty = Number(dto.quantity);
    const currentStock = Number(supply.current_stock);

    if (currentStock < qty) {
      throw new BadRequestException(`الرصيد المتاح بالمخزن (${currentStock} ${supply.unit}) غير كافٍ لصرف (${qty} ${supply.unit})`);
    }

    const unitCost = Number(supply.unit_cost);
    const totalCost = qty * unitCost;

    // خصم الرصيد
    await this.prisma.sanitation_supplies.update({
      where: { id: supplyId },
      data: {
        current_stock: new Prisma.Decimal(currentStock - qty),
      },
    });

    // تسجيل إذن الصرف
    const issuance = await this.prisma.sanitation_supply_issuances.create({
      data: {
        company_id: companyId,
        supply_id: supplyId,
        quantity: new Prisma.Decimal(qty),
        issued_to_type: dto.issuedToType || 'SUPERVISOR',
        issued_to_id: dto.issuedToId ? BigInt(dto.issuedToId) : null,
        issued_to_name: dto.issuedToName || null,
        supervisor_id: dto.supervisorId ? BigInt(dto.supervisorId) : null,
        supervisor_name: dto.supervisorName || 'مشرف الإشراف الداخلي',
        unit_cost: new Prisma.Decimal(unitCost),
        total_cost: new Prisma.Decimal(totalCost),
        notes: dto.notes || null,
      },
      include: {
        sanitation_supplies: true,
      },
    });

    return serializeBigInt(issuance);
  }

  async getIssuances(companyId: bigint) {
    const issuances = await this.prisma.sanitation_supply_issuances.findMany({
      where: { company_id: companyId },
      include: { sanitation_supplies: true },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    return serializeBigInt(issuances);
  }

  // =================== تفتيش النظافة الشخصية ===================

  async getHygieneChecks(companyId: bigint) {
    const checks = await this.prisma.personal_hygiene_checks.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    return serializeBigInt(checks);
  }

  async logHygieneCheck(companyId: bigint, dto: CreateHygieneCheckDto) {
    const uniform = dto.uniformClean ?? true;
    const hair = dto.hairNetWorn ?? true;
    const nails = dto.nailsTrimmed ?? true;
    const wounds = dto.noOpenWounds ?? true;
    const passed = uniform && hair && nails && wounds;

    const check = await this.prisma.personal_hygiene_checks.create({
      data: {
        company_id: companyId,
        worker_or_employee_name: dto.workerOrEmployeeName.trim(),
        employee_code: dto.employeeCode.trim(),
        department: dto.department || 'صالة الإنتاج',
        supervisor_id: dto.supervisorId ? BigInt(dto.supervisorId) : null,
        supervisor_name: dto.supervisorName || 'مشرف الإشراف الداخلي',
        uniform_clean: uniform,
        hair_net_worn: hair,
        nails_trimmed: nails,
        no_open_wounds: wounds,
        passed: passed,
        notes: dto.notes || null,
        checked_at: new Date(),
      },
    });

    return serializeBigInt(check);
  }

  // =================== البذر التلقائي الافتراضي ===================

  async seedDefaultZonesAndSupplies(companyId: bigint) {
    const zoneCount = await this.prisma.sanitation_zones.count({
      where: { company_id: companyId },
    });

    if (zoneCount === 0) {
      // بذر عمال افتراضيين
      const defaultWorkers = [
        { code: 'CLN-001', name: 'أحمد محمود إسماعيل', zone: 'PRODUCTION_HALL', phone: '01011223344' },
        { code: 'CLN-002', name: 'سيد عبد العال مبروك', zone: 'PRODUCTION_HALL', phone: '01122334455' },
        { code: 'CLN-003', name: 'رمضان حسن عطية', zone: 'RETAIL_BRANCH', phone: '01233445566' },
        { code: 'CLN-004', name: 'فريد شوقي عبد ربه', zone: 'WAREHOUSE', phone: '01544556677' },
        { code: 'CLN-005', name: 'عصام عبد النبي نصر', zone: 'FLEET', phone: '01099887766' },
      ];

      for (const w of defaultWorkers) {
        await this.prisma.housekeeping_workers.create({
          data: {
            company_id: companyId,
            worker_code: w.code,
            full_name: w.name,
            phone: w.phone,
            assigned_zone_type: w.zone,
            performance_score: new Prisma.Decimal(98.5),
          },
        });
      }

      // بذر مناطق الـ SSOP والنظافة
      const defaultZones = [
        {
          code: 'ZN-PROD-TORT',
          name: 'صالة تصنيع وتزيين التورت والحلويات الغربية',
          env: 'PRODUCTION_SSOP',
          freq: 'EVERY_2_HOURS',
          checklist: [
            { id: 1, text: 'تنظيف وتطهير أسطح طاولات الاستانلس 304 بمطهر كحولي غذائي', required: true },
            { id: 2, text: 'كشط وغسيل أرضية الصالة بممسحة زرقاء (مخصصة للإنتاج)', required: true },
            { id: 3, text: 'تفريغ صناديق المخلفات وغسل الحاويات', required: true },
            { id: 4, text: 'التأكد من نظافة ستائر الهواء ومصائد الحشرات الكهربائية', required: true },
          ],
        },
        {
          code: 'ZN-PROD-DOUGH',
          name: 'قسم العجن والمخبوزات والأفران المركزية',
          env: 'PRODUCTION_SSOP',
          freq: 'DAILY',
          checklist: [
            { id: 1, text: 'تنظيف أحواض ومضارب العجانات الصناعية من بقايا العجين الجاف', required: true },
            { id: 2, text: 'كنس وشفط مسحوق الدقيق ومسح محيط صوامع التخزين', required: true },
            { id: 3, text: 'غسيل مجاري الصرف الأرضية وصيانة مصيدة الردة', required: true },
          ],
        },
        {
          code: 'ZN-RETAIL-MAADI',
          name: 'صالة عرض ومبيعات فرع المعادي الرئيسي',
          env: 'RETAIL_SHOWROOM',
          freq: 'DAILY',
          checklist: [
            { id: 1, text: 'تلميع زجاج فاترينات وتورت العرض بمنظف زجاج غير عطري', required: true },
            { id: 2, text: 'مسح وتعقيم أرضيات الصالة بممسحة خضراء مخصصة للمعارض', required: true },
            { id: 3, text: 'تعقيم كاونترات الدفع وأجهزة نقاط البيع POS', required: true },
          ],
        },
        {
          code: 'ZN-WC-PUBLIC',
          name: 'دورات مياه العملاء والرواد (فرع المعادي)',
          env: 'RETAIL_SHOWROOM',
          freq: 'EVERY_2_HOURS',
          checklist: [
            { id: 1, text: 'استخدام الممسحة الحمراء والأدوات الحمراء حصراً (ممنوع دخولها الإنتاج)', required: true },
            { id: 2, text: 'تطهير القواعد والأحواض بمطهر كلور مركز', required: true },
            { id: 3, text: 'تزويد صابون الأيدي الرغوي ومناديل التنشيف', required: true },
            { id: 4, text: 'تعطير وتجفيف الأرضية تماماً لمنع الانزلاق', required: true },
          ],
        },
        {
          code: 'ZN-WH-RAW',
          name: 'مستودع الخامات الجافة والسكر والدقيق',
          env: 'WAREHOUSE',
          freq: 'WEEKLY',
          checklist: [
            { id: 1, text: 'فحص خلو الفواصل بين البالتات من أية شوائب أو حشرات', required: true },
            { id: 2, text: 'شفط الأتربة وتنظيف مسارات الرافعات الشوكية', required: true },
            { id: 3, text: 'التأكد من نظافة أجهزة الصعق ومصائد الفئران المعتمدة', required: true },
          ],
        },
        {
          code: 'ZN-FLEET-COOL',
          name: 'صناديق شاحنات التوزيع المبردة (أسطول أبو عادل)',
          env: 'FLEET_VEHICLE',
          freq: 'DAILY',
          checklist: [
            { id: 1, text: 'غسيل وتطهير قاع الصندوق بمطهر مخصص للمركبات الغذائية', required: true },
            { id: 2, text: 'فحص فتحات تصريف مياه إذابة التبريد', required: true },
            { id: 3, text: 'التأكد من عدم وجود روائح غريبة قبل تحميل التورت والحلويات', required: true },
          ],
        },
      ];

      for (const z of defaultZones) {
        await this.prisma.sanitation_zones.create({
          data: {
            company_id: companyId,
            zone_code: z.code,
            name: z.name,
            environment_type: z.env,
            frequency_type: z.freq,
            checklist_items_json: z.checklist,
          },
        });
      }
    }

    const supplyCount = await this.prisma.sanitation_supplies.count({
      where: { company_id: companyId },
    });

    if (supplyCount === 0) {
      const defaultSupplies = [
        {
          code: 'SUP-SAN-01',
          name: 'مطهر كحولي غذائي سريع الجفاف (Food-Grade 70%)',
          cat: 'FOOD_GRADE_SANITIZER',
          color: 'BLUE_PRODUCTION',
          unit: 'جركن 20 لتر',
          stock: 45,
          min: 10,
          cost: 320,
        },
        {
          code: 'SUP-CL-02',
          name: 'كلور تطهير فائق التركيز (للحمامات فقط)',
          cat: 'GENERAL_DETERGENT',
          color: 'RED_BATHROOM',
          unit: 'جركن 10 لتر',
          stock: 30,
          min: 8,
          cost: 110,
        },
        {
          code: 'SUP-SOAP-03',
          name: 'صابون صناعي رغوي لإزالة دهون الأفران والشوكولاتة',
          cat: 'GENERAL_DETERGENT',
          color: 'BLUE_PRODUCTION',
          unit: 'جركن 25 كجم',
          stock: 60,
          min: 15,
          cost: 450,
        },
        {
          code: 'SUP-MOP-RED',
          name: 'ممسحة أرضيات حمراء كودية (خاصة بالحمامات فقط)',
          cat: 'COLOR_CODED_TOOL',
          color: 'RED_BATHROOM',
          unit: 'قطعة',
          stock: 25,
          min: 5,
          cost: 85,
        },
        {
          code: 'SUP-MOP-BLUE',
          name: 'ممسحة أرضيات زرقاء كودية (خاصة بصالات الإنتاج)',
          cat: 'COLOR_CODED_TOOL',
          color: 'BLUE_PRODUCTION',
          unit: 'قطعة',
          stock: 40,
          min: 10,
          cost: 95,
        },
        {
          code: 'SUP-MOP-GREEN',
          name: 'ممسحة أرضيات خضراء كودية (خاصة بصالات البيع والمعارض)',
          cat: 'COLOR_CODED_TOOL',
          color: 'GREEN_RETAIL',
          unit: 'قطعة',
          stock: 20,
          min: 5,
          cost: 90,
        },
        {
          code: 'SUP-PEST-01',
          name: 'أشرطة لاصقة خالية من السموم لمصائد الآفات المعتمدة',
          cat: 'PEST_CONTROL',
          color: 'YELLOW_GENERAL',
          unit: 'علبة (50 شريط)',
          stock: 18,
          min: 5,
          cost: 150,
        },
      ];

      for (const s of defaultSupplies) {
        await this.prisma.sanitation_supplies.create({
          data: {
            company_id: companyId,
            code: s.code,
            name: s.name,
            category: s.cat,
            color_code: s.color,
            unit: s.unit,
            current_stock: new Prisma.Decimal(s.stock),
            min_stock_level: new Prisma.Decimal(s.min),
            unit_cost: new Prisma.Decimal(s.cost),
          },
        });
      }
    }
  }
}
