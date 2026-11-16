import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';

@Injectable()
export class HousekeepingExcelService {
  constructor(private readonly prisma: PrismaService) {}

  private buildExcelBuffer(rows: any[], sheetName: string): Buffer {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // =================== تصدير واستيراد العمال ===================

  async exportWorkers(companyId: bigint): Promise<Buffer> {
    const list = await this.prisma.housekeeping_workers.findMany({
      where: { company_id: companyId },
      include: { branches: true },
      orderBy: { worker_code: 'asc' },
    });

    const rows = list.map((w) => ({
      'كود العامل': w.worker_code,
      'الاسم بالكامل': w.full_name,
      'رقم الهاتف': w.phone || 'غير مسجل',
      'منطقة التعيين': w.assigned_zone_type,
      'الفرع المخصص': w.branches?.branch_name || 'المركز الرئيسي',
      'المشرف المباشر': w.supervisor_name || 'عام',
      'مؤشر تقييم الأداء': Number(w.performance_score || 100),
      'الحالة': w.is_active ? 'نشط' : 'معطل',
    }));

    return this.buildExcelBuffer(rows, 'عمال الإشراف الداخلي');
  }

  async importWorkers(rows: any[], companyId: bigint) {
    let count = 0;
    for (const r of rows) {
      const code = String(r['كود العامل'] || r.workerCode || r.code || '').trim();
      const name = String(r['الاسم بالكامل'] || r.fullName || r.name || '').trim();
      if (!code || !name) continue;

      const zone = String(r['منطقة التعيين'] || r.assignedZoneType || 'PRODUCTION_HALL').trim();
      const phone = String(r['رقم الهاتف'] || r.phone || '').trim();
      const score = Number(r['مؤشر تقييم الأداء'] || r.performanceScore || 100);

      await this.prisma.housekeeping_workers.upsert({
        where: {
          company_id_worker_code: {
            company_id: companyId,
            worker_code: code,
          },
        },
        create: {
          company_id: companyId,
          worker_code: code,
          full_name: name,
          phone: phone || null,
          assigned_zone_type: zone,
          performance_score: new Prisma.Decimal(score),
          is_active: true,
        },
        update: {
          full_name: name,
          phone: phone || null,
          assigned_zone_type: zone,
          performance_score: new Prisma.Decimal(score),
        },
      });
      count++;
    }
    return { importedCount: count, message: `تم استيراد/تحديث ${count} من عمال الإشراف الداخلي بنجاح` };
  }

  // =================== تصدير واستيراد المناطق ===================

  async exportZones(companyId: bigint): Promise<Buffer> {
    const list = await this.prisma.sanitation_zones.findMany({
      where: { company_id: companyId },
      include: { branches: true },
      orderBy: { zone_code: 'asc' },
    });

    const rows = list.map((z) => ({
      'كود المنطقة': z.zone_code,
      'اسم المنطقة': z.name,
      'نوع البيئة': z.environment_type,
      'دورية النظافة': z.frequency_type,
      'الفرع المخصص': z.branches?.branch_name || 'عام',
      'عدد بنود الفحص': Array.isArray(z.checklist_items_json) ? z.checklist_items_json.length : 0,
      'الحالة': z.is_active ? 'نشط' : 'معطل',
    }));

    return this.buildExcelBuffer(rows, 'مناطق النظافة والتطهير');
  }

  async importZones(rows: any[], companyId: bigint) {
    let count = 0;
    for (const r of rows) {
      const code = String(r['كود المنطقة'] || r.zoneCode || r.code || '').trim();
      const name = String(r['اسم المنطقة'] || r.name || '').trim();
      if (!code || !name) continue;

      const env = String(r['نوع البيئة'] || r.environmentType || 'PRODUCTION_SSOP').trim();
      const freq = String(r['دورية النظافة'] || r.frequencyType || 'DAILY').trim();

      await this.prisma.sanitation_zones.upsert({
        where: {
          company_id_zone_code: {
            company_id: companyId,
            zone_code: code,
          },
        },
        create: {
          company_id: companyId,
          zone_code: code,
          name: name,
          environment_type: env,
          frequency_type: freq,
          checklist_items_json: [
            { id: 1, text: 'تطهير الأسطح بمطهر معتمد', required: true },
            { id: 2, text: 'كنس وغسيل الأرضية وتجفيفها', required: true },
          ],
          is_active: true,
        },
        update: {
          name,
          environment_type: env,
          frequency_type: freq,
        },
      });
      count++;
    }
    return { importedCount: count, message: `تم استيراد/تحديث ${count} من مناطق النظافة والـ SSOP بنجاح` };
  }

  // =================== تصدير واستيراد المهام والتفتيش ===================

  async exportTasks(companyId: bigint): Promise<Buffer> {
    const list = await this.prisma.sanitation_task_logs.findMany({
      where: { company_id: companyId },
      include: { sanitation_zones: true, housekeeping_workers: true },
      orderBy: { created_at: 'desc' },
      take: 500,
    });

    const rows = list.map((t) => ({
      'رقم المهمة': t.task_number,
      'المنطقة': t.sanitation_zones?.name || 'غير محدد',
      'كود العامل': t.worker_code_snapshot || '',
      'اسم العامل': t.worker_name_snapshot || '',
      'المشرف المعتمد': t.supervisor_name || '',
      'نوع المهمة': t.task_type,
      'نسبة الامتثال %': Number(t.compliance_score || 100),
      'حالة المهمة': t.status,
      'اعتماد الجودة': t.qa_verified_by_name || 'قيد المراجعة',
      'تاريخ الإتمام': t.completed_at ? t.completed_at.toISOString().split('T')[0] : '',
      'ملاحظات': t.notes || '',
    }));

    return this.buildExcelBuffer(rows, 'سجل مهام النظافة');
  }

  // =================== تصدير واستيراد مخزن المنظفات ===================

  async exportSupplies(companyId: bigint): Promise<Buffer> {
    const list = await this.prisma.sanitation_supplies.findMany({
      where: { company_id: companyId },
      orderBy: { code: 'asc' },
    });

    const rows = list.map((s) => ({
      'كود الصنف': s.code,
      'اسم الصنف': s.name,
      'التصنيف': s.category,
      'الكود اللوني': s.color_code,
      'الوحدة': s.unit,
      'الرصيد الحالي': Number(s.current_stock || 0),
      'حد الطلب الأدنى': Number(s.min_stock_level || 5),
      'تكلفة الوحدة': Number(s.unit_cost || 0),
      'الحالة': s.is_active ? 'نشط' : 'معطل',
    }));

    return this.buildExcelBuffer(rows, 'مخزن المنظفات والأدوات');
  }

  async importSupplies(rows: any[], companyId: bigint) {
    let count = 0;
    for (const r of rows) {
      const code = String(r['كود الصنف'] || r.code || '').trim();
      const name = String(r['اسم الصنف'] || r.name || '').trim();
      if (!code || !name) continue;

      const cat = String(r['التصنيف'] || r.category || 'GENERAL_DETERGENT').trim();
      const color = String(r['الكود اللوني'] || r.colorCode || 'BLUE_PRODUCTION').trim();
      const unit = String(r['الوحدة'] || r.unit || 'لتر').trim();
      const stock = Number(r['الرصيد الحالي'] || r.currentStock || 0);
      const minStock = Number(r['حد الطلب الأدنى'] || r.minStockLevel || 5);
      const cost = Number(r['تكلفة الوحدة'] || r.unitCost || 0);

      await this.prisma.sanitation_supplies.upsert({
        where: {
          company_id_code: {
            company_id: companyId,
            code: code,
          },
        },
        create: {
          company_id: companyId,
          code: code,
          name: name,
          category: cat,
          color_code: color,
          unit: unit,
          current_stock: new Prisma.Decimal(stock),
          min_stock_level: new Prisma.Decimal(minStock),
          unit_cost: new Prisma.Decimal(cost),
          is_active: true,
        },
        update: {
          name,
          category: cat,
          color_code: color,
          unit,
          current_stock: new Prisma.Decimal(stock),
          min_stock_level: new Prisma.Decimal(minStock),
          unit_cost: new Prisma.Decimal(cost),
        },
      });
      count++;
    }
    return { importedCount: count, message: `تم استيراد/تحديث ${count} من أصناف المنظفات والأدوات بنجاح` };
  }

  // =================== تصدير سجلات النظافة الشخصية ===================

  async exportHygiene(companyId: bigint): Promise<Buffer> {
    const list = await this.prisma.personal_hygiene_checks.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      take: 500,
    });

    const rows = list.map((h) => ({
      'اسم العامل/الموظف': h.worker_or_employee_name,
      'كود الموظف': h.employee_code,
      'القسم': h.department || 'الإنتاج',
      'المشرف الفاحص': h.supervisor_name || '',
      'نظافة الزي': h.uniform_clean ? 'نعم' : 'لا',
      'غطاء الرأس': h.hair_net_worn ? 'نعم' : 'لا',
      'تقليم الأظافر': h.nails_trimmed ? 'نعم' : 'لا',
      'خلو الجروح': h.no_open_wounds ? 'نعم' : 'لا',
      'النتيجة': h.passed ? 'مطابق ومجتاز' : 'غير مطابق',
      'تاريخ الفحص': h.checked_at.toISOString().split('T')[0],
      'ملاحظات': h.notes || '',
    }));

    return this.buildExcelBuffer(rows, 'سجلات النظافة الشخصية');
  }

  // =================== الموزع الموحد Universal Dispatcher ===================

  async exportEntity(entity: string, companyId: bigint): Promise<{ buffer: Buffer; fileName: string }> {
    switch (entity.toLowerCase()) {
      case 'workers':
        return {
          buffer: await this.exportWorkers(companyId),
          fileName: 'سجل_عمال_الإشراف_الداخلي.xlsx',
        };
      case 'zones':
        return {
          buffer: await this.exportZones(companyId),
          fileName: 'خريطة_مناطق_النظافة_والتطهير.xlsx',
        };
      case 'tasks':
        return {
          buffer: await this.exportTasks(companyId),
          fileName: 'سجل_تفتيش_ومهام_النظافة_SSOP.xlsx',
        };
      case 'supplies':
        return {
          buffer: await this.exportSupplies(companyId),
          fileName: 'مخزن_المنظفات_والأدوات_الملونة.xlsx',
        };
      case 'hygiene':
        return {
          buffer: await this.exportHygiene(companyId),
          fileName: 'سجلات_النظافة_الشخصية.xlsx',
        };
      default:
        throw new BadRequestException(`الكيان ${entity} غير مدعوم للتصدير`);
    }
  }

  async importEntity(entity: string, rows: any[], companyId: bigint) {
    switch (entity.toLowerCase()) {
      case 'workers':
        return await this.importWorkers(rows, companyId);
      case 'zones':
        return await this.importZones(rows, companyId);
      case 'supplies':
        return await this.importSupplies(rows, companyId);
      default:
        throw new BadRequestException(`الكيان ${entity} غير مدعوم للاستيراد`);
    }
  }
}
