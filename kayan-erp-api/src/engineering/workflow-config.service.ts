import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkshopDto, CreateWorkflowRouteDto } from './dto/engineering.dto.js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WorkflowConfigService {
  constructor(private readonly prisma: PrismaService) {}

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

  // 1. استرجاع قائمة الورش الهندسية
  async getWorkshops(companyId: string | number = 1) {
    const cid = BigInt(companyId);

    // التحقق من وجود ورش، وإذا لم توجد، نقوم بالتهيئة الأولية التلقائية
    const count = await this.prisma.engineering_workshops.count({
      where: { company_id: cid },
    });

    if (count === 0) {
      await this.seedDefaultWorkshops(cid);
    }

    const workshops = await this.prisma.engineering_workshops.findMany({
      where: { company_id: cid, is_active: true },
      include: {
        engineering_staff: true,
        maintenance_workflow_routes: true,
        fabrication_workflow_routes: true,
        fabrication_orders: {
          where: { status: 'IN_PROGRESS' },
        },
        maintenance_tickets: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS', 'PENDING_QA_CLEARANCE'] } },
        },
      },
      orderBy: { created_at: 'asc' },
    });

    return this.serializeBigInt({
      success: true,
      data: workshops.map((w) => ({
        id: String(w.id),
        code: w.code,
        name: w.name,
        specialtyType: w.specialty_type,
        supervisorName: w.supervisor_name || 'المهندس المسؤول',
        staffCount: w.engineering_staff.length,
        maintenanceRoutesCount: w.maintenance_workflow_routes.length,
        fabricationRoutesCount: w.fabrication_workflow_routes.length,
        activeOrdersCount: w.fabrication_orders.length,
        activeTicketsCount: w.maintenance_tickets.length,
        maintenanceRoutes: w.maintenance_workflow_routes,
        fabricationRoutes: w.fabrication_workflow_routes,
      })),
    });
  }

  // 2. إنشاء ورشة عمل جديدة ديناميكياً
  async createWorkshop(dto: CreateWorkshopDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);

    const workshop = await this.prisma.engineering_workshops.create({
      data: {
        company_id: cid,
        code: dto.code,
        name: dto.name,
        specialty_type: dto.specialtyType,
        supervisor_name: dto.supervisorName,
        supervisor_id: dto.supervisorId ? BigInt(dto.supervisorId) : null,
      },
    });

    // إنشاء مسار صيانة افتراضي للورشة
    await this.prisma.maintenance_workflow_routes.create({
      data: {
        company_id: cid,
        workshop_id: workshop.id,
        name: `المسار القياسي - ${workshop.name}`,
        steps_json: [
          { step: 1, name: 'فحص أولي وتحديد العطل', role: 'TECHNICIAN' },
          { step: 2, name: 'طلب وصرف قطع الغيار/الخامات', role: 'ENGINEER' },
          { step: 3, name: 'التنفيذ والإصلاح الهندسي', role: 'TECHNICIAN' },
          { step: 4, name: 'اعتماد سلامة الغذاء (QMS)', role: 'QA_INSPECTOR' },
          { step: 5, name: 'إغلاق البلاغ والتشغيل', role: 'SUPERVISOR' },
        ],
        sla_minutes: 60,
      },
    });

    return this.serializeBigInt({
      success: true,
      message: `تم إنشاء ورشة (${workshop.name}) ومساراتها بنجاح`,
      data: workshop,
    });
  }

  // 3. إضافة مسار عمل ديناميكي (صيانة أو تصنيع)
  async createWorkflowRoute(dto: CreateWorkflowRouteDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const workshopId = BigInt(dto.workshopId);

    if (dto.type === 'FABRICATION') {
      const route = await this.prisma.fabrication_workflow_routes.create({
        data: {
          company_id: cid,
          workshop_id: workshopId,
          name: dto.name,
          steps_json: dto.stepsJson,
        },
      });
      return this.serializeBigInt({
        success: true,
        message: 'تم إضافة مسار التصنيع الداخلي بنجاح',
        data: route,
      });
    } else {
      const route = await this.prisma.maintenance_workflow_routes.create({
        data: {
          company_id: cid,
          workshop_id: workshopId,
          name: dto.name,
          severity: dto.severity || 'NORMAL',
          sla_minutes: dto.slaMinutes || 60,
          steps_json: dto.stepsJson,
        },
      });
      return this.serializeBigInt({
        success: true,
        message: 'تم إضافة مسار الصيانة الميداني بنجاح',
        data: route,
      });
    }
  }

  // تهيئة الورش ومسارات العمل الافتراضية
  private async seedDefaultWorkshops(cid: bigint) {
    const defaultWorkshops = [
      {
        code: 'WS-WELD',
        name: 'ورشة لحام وتشكيل الاستانلس والحديد',
        specialtyType: 'WELDING_FABRICATION',
        supervisorName: 'م. إبراهيم خليل (كبير مهندسي المعادن)',
        maintSteps: [
          { step: 1, name: 'معاينة شروخ اللحام وسلامة الهيكل' },
          { step: 2, name: 'صرف أسلاك أرغون وألواح استانلس 304' },
          { step: 3, name: 'اللحام والتجليخ والتنعيم الغذائي' },
          { step: 4, name: 'فحص خلو الرايش واعتماد سلامة الغذاء (QMS)' },
          { step: 5, name: 'إعادة الأصل للخدمة' },
        ],
        fabSteps: [
          { step: 1, name: 'تصميم ومقايسة الأبعاد (تروليات/ترابيزات)' },
          { step: 2, name: 'صرف ألواح ومواسير استانلس 304 عذائي' },
          { step: 3, name: 'التقطيع بالليزر والمقصات الهيدروليكية' },
          { step: 4, name: 'التجميع ولحام الأرغون' },
          { step: 5, name: 'تركيب عجلات حرارية وتشطيب وتلميع' },
          { step: 6, name: 'فحص الجودة واعتماد الرسملة بسجل الأصول' },
        ],
      },
      {
        code: 'WS-CARP',
        name: 'ورشة النجارة والديكور والأثاث',
        specialtyType: 'CARPENTRY',
        supervisorName: 'الأسطى فتحي عبد الرازق',
        maintSteps: [
          { step: 1, name: 'فحص التلفيات والمفصلات والكوالين' },
          { step: 2, name: 'صرف أخشاب ومثبتات وغراء' },
          { step: 3, name: 'الإصلاح والدهان المقاوم للبكتيريا' },
          { step: 4, name: 'إشراف الجودة للنظافة والتسليم' },
        ],
        fabSteps: [
          { step: 1, name: 'مقايسة وتصميم كاونترات ومكاتب وكراسي المعارض' },
          { step: 2, name: 'صرف خشب زان وألواح MDF وفورمايكا' },
          { step: 3, name: 'القص والتفريغ والتجميع' },
          { step: 4, name: 'الدهان والتشطيب النهائي' },
          { step: 5, name: 'التسليم لعهدة المعرض ورسملة الأصل' },
        ],
      },
      {
        code: 'WS-HVAC',
        name: 'ورشة التكييف والتبريد وغرف التجميد',
        specialtyType: 'HVAC_COOLING',
        supervisorName: 'م. تامر مصطفى (مهندس أنظمة التبريد)',
        maintSteps: [
          { step: 1, name: 'فحص ضغوط الفريون والتسريبات ودرجات الحرارة' },
          { step: 2, name: 'صرف فريون R404a وفلاتر وزيوت كباسات' },
          { step: 3, name: 'شحن الفريون وإصلاح المبخرات والمكثفات' },
          { step: 4, name: 'معايرة حساسات CCP وتحقيق درجة -18 مئوية' },
          { step: 5, name: 'اعتماد طبيب ومفتش سلامة الغذاء والإغلاق' },
        ],
        fabSteps: [
          { step: 1, name: 'تصميم عزل وتجميع ثلاجات العرض المعرضية' },
          { step: 2, name: 'تثبيت ألواح الساندوتش بانل ووحدات التبريد' },
          { step: 3, name: 'التشغيل التجريبي والاعتماد الرأسمالي' },
        ],
      },
      {
        code: 'WS-ELEC',
        name: 'ورشة الكهرباء والتحكم الآلي (PLC)',
        specialtyType: 'ELECTRICAL',
        supervisorName: 'م. حازم الصاوي (مهندس كهرباء وأتمتة)',
        maintSteps: [
          { step: 1, name: 'فحص دوائر الكنترول وقواطع القوى والإنفرترات' },
          { step: 2, name: 'صرف كونتكتورات ومرحلات وحساسات حرارية' },
          { step: 3, name: 'توصيل وضبط برامج التشغيل وخطوط الأفران' },
          { step: 4, name: 'إجراءات العزل والأمان الكهربائي' },
          { step: 5, name: 'اختبار الحمل وإغلاق التذكرة' },
        ],
        fabSteps: [
          { step: 1, name: 'تجميع لوحات التحكم والتوزيع الكهربائية' },
          { step: 2, name: 'برمجة شاشات اللمس HMI ووحدات PLC' },
          { step: 3, name: 'الرسملة وإرفاق المخطط الكهربائي' },
        ],
      },
      {
        code: 'WS-PLUMB',
        name: 'ورشة السباكة والمضخات والصرف الصحي',
        specialtyType: 'PLUMBING',
        supervisorName: 'فني أول عبد السلام منصور',
        maintSteps: [
          { step: 1, name: 'كشف التسريب وانسدادات مصائد الزيوت' },
          { step: 2, name: 'صرف مواسير وبلوف وجوانات ومحابس استانلس' },
          { step: 3, name: 'الإصلاح وضغط الخطوط والتطهير' },
          { step: 4, name: 'تفتيش الجودة والصحة العامة' },
        ],
        fabSteps: [
          { step: 1, name: 'تصنيع مصائد دهون وستانلس ستيل للمطابخ المركزية' },
          { step: 2, name: 'اختبار التدفق وإدخال الأصل في سجل المعرض' },
        ],
      },
    ];

    for (const ws of defaultWorkshops) {
      const createdWs = await this.prisma.engineering_workshops.create({
        data: {
          company_id: cid,
          code: ws.code,
          name: ws.name,
          specialty_type: ws.specialtyType,
          supervisor_name: ws.supervisorName,
        },
      });

      // مسار الصيانة
      await this.prisma.maintenance_workflow_routes.create({
        data: {
          company_id: cid,
          workshop_id: createdWs.id,
          name: `مسار الصيانة السريع - ${ws.name}`,
          steps_json: ws.maintSteps,
          sla_minutes: 60,
        },
      });

      // مسار التصنيع
      await this.prisma.fabrication_workflow_routes.create({
        data: {
          company_id: cid,
          workshop_id: createdWs.id,
          name: `مسار التصنيع القياسي - ${ws.name}`,
          steps_json: ws.fabSteps,
        },
      });
    }
  }
}
