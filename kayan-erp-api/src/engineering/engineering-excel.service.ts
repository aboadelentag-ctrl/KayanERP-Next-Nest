import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as XLSX from 'xlsx';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class EngineeringExcelService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. تصدير الأصول الهندسية كملف Excel
  async exportAssets(companyId: string | number = 1): Promise<Buffer> {
    const cid = BigInt(companyId);
    const list = await this.prisma.engineering_assets.findMany({
      where: { company_id: cid },
      include: { branches: true },
      orderBy: { asset_code: 'asc' },
    });

    const rows = list.map((a) => ({
      'كود الأصل': a.asset_code,
      'اسم الأصل': a.name,
      'التصنيف': a.category,
      'الفرع المخصص': a.branches?.branch_name || 'عام',
      'الرقم التسلسلي': a.serial_number || 'غير مسجل',
      'حالة الأصل': a.status,
      'تكلفة الصيانة التراكمية': Number(a.total_maintenance_cost || 0),
      'تصنيع داخلي بالورش': a.is_internally_fabricated ? 'نعم' : 'لا',
      'تاريخ الإدخال': a.created_at.toISOString().split('T')[0],
    }));

    return this.buildExcelBuffer(rows, 'الأصول الهندسية');
  }

  // 2. استيراد الأصول الهندسية من ملف Excel
  async importAssets(rows: any[], companyId: string | number = 1) {
    const cid = BigInt(companyId);
    let insertedCount = 0;

    for (const r of rows) {
      const code = String(r['كود الأصل'] || r.assetCode || r.code || '').trim();
      const name = String(r['اسم الأصل'] || r.name || '').trim();
      const category = String(r['التصنيف'] || r.category || 'PRODUCTION_LINE').trim();
      if (!code || !name) continue;

      await this.prisma.engineering_assets.upsert({
        where: {
          company_id_asset_code: {
            company_id: cid,
            asset_code: code,
          },
        },
        create: {
          company_id: cid,
          asset_code: code,
          name,
          category,
          serial_number: r['الرقم التسلسلي'] || r.serialNumber || null,
          status: 'OPERATIONAL',
        },
        update: {
          name,
          category,
        },
      });
      insertedCount++;
    }

    return {
      success: true,
      message: `تم استيراد ومعالجة (${insertedCount}) أصل هندسي بنجاح`,
      count: insertedCount,
    };
  }

  // 3. تصدير تذاكر الصيانة والطوارئ
  async exportTickets(companyId: string | number = 1): Promise<Buffer> {
    const cid = BigInt(companyId);
    const list = await this.prisma.maintenance_tickets.findMany({
      where: { company_id: cid },
      include: {
        engineering_assets: true,
        engineering_workshops: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const rows = list.map((t) => ({
      'رقم البلاغ': t.ticket_number,
      'عنوان البلاغ': t.title,
      'مصدر البلاغ': t.source_type,
      'الأولوية': t.priority,
      'الورشة المختصة': t.engineering_workshops?.name || 'عام',
      'الأصل المرتبط': t.engineering_assets?.name || 'غير محدد',
      'الفني/المهندس المكلف': t.assigned_staff_name || 'لم يعين',
      'الحالة': t.status,
      'الخطوة الحالية': t.current_step_name || 'بدء الفحص',
      'زمن التوقف (دقائق)': t.downtime_minutes,
      'التكلفة الإجمالية': Number(t.total_cost || 0),
      'اعتماد الجودة QMS': t.qa_cleared_at ? 'تم الاعتماد' : t.requires_qa_clearance ? 'بانتظار الاعتماد' : 'غير مطلوب',
      'تاريخ البلاغ': t.created_at.toISOString().split('T')[0],
    }));

    return this.buildExcelBuffer(rows, 'تذاكر الصيانة والطوارئ');
  }

  // 4. استيراد تذاكر الصيانة
  async importTickets(rows: any[], companyId: string | number = 1) {
    const cid = BigInt(companyId);
    let count = 0;

    for (const r of rows) {
      const title = String(r['عنوان البلاغ'] || r.title || '').trim();
      if (!title) continue;

      const ticketNumber = r['رقم البلاغ'] || r.ticketNumber || `MNT-IMP-${Date.now().toString().slice(-5)}-${count}`;
      const priority = r['الأولوية'] || r.priority || 'NORMAL';
      const sourceType = r['مصدر البلاغ'] || r.sourceType || 'EMERGENCY_BREAKDOWN';

      await this.prisma.maintenance_tickets.create({
        data: {
          company_id: cid,
          ticket_number: String(ticketNumber),
          title,
          source_type: String(sourceType),
          priority: String(priority),
          status: 'PENDING',
          current_step_name: 'مستورد من Excel',
          sla_minutes: 60,
        },
      });
      count++;
    }

    return {
      success: true,
      message: `تم استيراد (${count}) بلاغ صيانة بنجاح`,
      count,
    };
  }

  // 5. تصدير مخزون الخامات وقطع الغيار
  async exportMaterials(companyId: string | number = 1): Promise<Buffer> {
    const cid = BigInt(companyId);
    const list = await this.prisma.engineering_materials.findMany({
      where: { company_id: cid },
      orderBy: { code: 'asc' },
    });

    const rows = list.map((m) => ({
      'كود البند': m.code,
      'اسم الخامة / قطعة الغيار': m.name,
      'النوع': m.material_type,
      'الوحدة': m.unit,
      'الرصيد الفعلي': Number(m.current_stock),
      'حد الطلب الأدنى': Number(m.min_stock_level),
      'تكلفة الوحدة (ج.م)': Number(m.unit_cost),
      'بواقي وفضلات صالحة': m.is_remnant ? 'نعم' : 'لا',
      'أبعاد القطعة': m.remnant_dimension || '',
    }));

    return this.buildExcelBuffer(rows, 'الخامات وقطع الغيار');
  }

  // 6. استيراد الخامات وقطع الغيار
  async importMaterials(rows: any[], companyId: string | number = 1) {
    const cid = BigInt(companyId);
    let count = 0;

    for (const r of rows) {
      const code = String(r['كود البند'] || r.code || '').trim();
      const name = String(r['اسم الخامة / قطعة الغيار'] || r.name || '').trim();
      const unit = String(r['الوحدة'] || r.unit || 'قطعة').trim();
      const type = String(r['النوع'] || r.materialType || 'SPARE_PART').trim();
      if (!code || !name) continue;

      const stock = new Decimal(r['الرصيد الفعلي'] || r.currentStock || 0);
      const minStock = new Decimal(r['حد الطلب الأدنى'] || r.minStockLevel || 0);
      const cost = new Decimal(r['تكلفة الوحدة (ج.م)'] || r.unitCost || 0);
      const isRemnant = String(r['بواقي وفضلات صالحة'] || '').includes('نعم');

      await this.prisma.engineering_materials.upsert({
        where: {
          company_id_code: {
            company_id: cid,
            code,
          },
        },
        create: {
          company_id: cid,
          code,
          name,
          material_type: type,
          unit,
          current_stock: stock,
          min_stock_level: minStock,
          unit_cost: cost,
          is_remnant: isRemnant,
          remnant_dimension: r['أبعاد القطعة'] || null,
        },
        update: {
          name,
          current_stock: stock,
          unit_cost: cost,
        },
      });
      count++;
    }

    return {
      success: true,
      message: `تم استيراد وتحديث (${count}) خامة وقطعة غيار بنجاح`,
      count,
    };
  }

  // 7. تصدير فريق المهندسين والفنيين
  async exportStaff(companyId: string | number = 1): Promise<Buffer> {
    const cid = BigInt(companyId);
    const list = await this.prisma.engineering_staff.findMany({
      where: { company_id: cid },
      include: { engineering_workshops: true },
      orderBy: { name: 'asc' },
    });

    const rows = list.map((s) => ({
      'الاسم': s.name,
      'رقم الهاتف': s.phone || 'غير مسجل',
      'الصفة': s.role,
      'الورشة': s.engineering_workshops?.name || 'عام',
      'التخصص الفني': s.specialty,
      'أجر الساعة (ج.م)': Number(s.hourly_cost_rate),
      'الحالة': s.is_available ? 'متاح للعمل' : 'في مهمة عمل',
    }));

    return this.buildExcelBuffer(rows, 'فريق المهندسين والفنيين');
  }

  // 8. استيراد فريق المهندسين والفنيين
  async importStaff(rows: any[], companyId: string | number = 1) {
    const cid = BigInt(companyId);
    let count = 0;

    // جلب أول ورشة افتراضية
    const defaultWs = await this.prisma.engineering_workshops.findFirst({
      where: { company_id: cid },
    });
    const wsId = defaultWs ? defaultWs.id : BigInt(1);

    for (const r of rows) {
      const name = String(r['الاسم'] || r.name || '').trim();
      const specialty = String(r['التخصص الفني'] || r.specialty || 'فني صيانة عامة').trim();
      if (!name) continue;

      const rate = new Decimal(r['أجر الساعة (ج.م)'] || r.hourlyCostRate || 50);

      await this.prisma.engineering_staff.create({
        data: {
          company_id: cid,
          name,
          phone: r['رقم الهاتف'] || r.phone || null,
          role: String(r['الصفة'] || r.role || 'TECHNICIAN').includes('مهندس') ? 'ENGINEER' : 'TECHNICIAN',
          workshop_id: wsId,
          specialty,
          hourly_cost_rate: rate,
          is_available: true,
        },
      });
      count++;
    }

    return {
      success: true,
      message: `تم استيراد (${count}) عضو من الفريق الفني بنجاح`,
      count,
    };
  }

  // 9. تصدير أوامر التصنيع الداخلي
  async exportFabricationOrders(companyId: string | number = 1): Promise<Buffer> {
    const cid = BigInt(companyId);
    const list = await this.prisma.fabrication_orders.findMany({
      where: { company_id: cid },
      include: {
        engineering_workshops: true,
        branches: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const rows = list.map((o) => ({
      'رقم أمر التصنيع': o.order_number,
      'المنتج المطلوب': o.item_name,
      'الكمية': o.quantity,
      'الورشة المنفذة': o.engineering_workshops?.name || 'ورشة التصنيع',
      'الفرع المستلم': o.branches?.branch_name || 'عام',
      'تكلفة الخامات': Number(o.materials_cost),
      'ساعات العمل': Number(o.labor_hours),
      'تكلفة العمالة': Number(o.labor_cost),
      'إجمالي التكلفة الفعلية': Number(o.total_actual_cost),
      'الحالة': o.status,
      'المرحلة الحالية': o.current_step_name,
      'تاريخ الإصدار': o.created_at.toISOString().split('T')[0],
    }));

    return this.buildExcelBuffer(rows, 'أوامر التصنيع الداخلي');
  }

  // Helper: بناء وتوليد ملف Excel بافر
  private buildExcelBuffer(rows: any[], sheetName: string): Buffer {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
