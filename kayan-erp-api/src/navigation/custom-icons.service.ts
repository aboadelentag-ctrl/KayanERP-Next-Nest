import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCustomIconDto, UpdateCustomIconDto } from './dto/navigation.dto.js';
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
export class CustomIconsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomIcons(companyId: bigint) {
    let icons = await this.prisma.custom_app_icons.findMany({
      where: { company_id: companyId },
      orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
    });

    if (icons.length === 0) {
      await this.seedDefaults(companyId);
      icons = await this.prisma.custom_app_icons.findMany({
        where: { company_id: companyId },
        orderBy: [{ order_index: 'asc' }, { id: 'asc' }],
      });
    }

    return serializeBigInt(icons);
  }

  async createCustomIcon(companyId: bigint, dto: CreateCustomIconDto) {
    const icon = await this.prisma.custom_app_icons.create({
      data: {
        company_id: companyId,
        title: dto.title.trim(),
        icon_name: dto.iconName || 'LayoutGrid',
        color: dto.color || 'amber',
        badge_text: dto.badgeText || null,
        show_in_navbar: dto.showInNavbar ?? true,
        show_in_tabs: dto.showInTabs ?? true,
        order_index: dto.orderIndex ?? 0,
        screens_json: dto.screensJson || [],
      },
    });

    return serializeBigInt(icon);
  }

  async updateCustomIcon(companyId: bigint, id: bigint, dto: UpdateCustomIconDto) {
    const existing = await this.prisma.custom_app_icons.findFirst({
      where: { id, company_id: companyId },
    });

    if (!existing) {
      throw new NotFoundException('الأيقونة غير موجودة');
    }

    const updated = await this.prisma.custom_app_icons.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : existing.title,
        icon_name: dto.iconName !== undefined ? dto.iconName : existing.icon_name,
        color: dto.color !== undefined ? dto.color : existing.color,
        badge_text: dto.badgeText !== undefined ? dto.badgeText : existing.badge_text,
        show_in_navbar: dto.showInNavbar !== undefined ? dto.showInNavbar : existing.show_in_navbar,
        show_in_tabs: dto.showInTabs !== undefined ? dto.showInTabs : existing.show_in_tabs,
        order_index: dto.orderIndex !== undefined ? dto.orderIndex : existing.order_index,
        screens_json: dto.screensJson !== undefined ? (dto.screensJson as any) : (existing.screens_json as any),
      },
    });

    return serializeBigInt(updated);
  }

  async deleteCustomIcon(companyId: bigint, id: bigint) {
    const existing = await this.prisma.custom_app_icons.findFirst({
      where: { id, company_id: companyId },
    });

    if (!existing) {
      throw new NotFoundException('الأيقونة غير موجودة');
    }

    await this.prisma.custom_app_icons.delete({
      where: { id },
    });

    return { success: true, message: 'تم حذف الأيقونة بنجاح' };
  }

  async seedDefaults(companyId: bigint) {
    const defaults = [
      {
        title: 'الإنتاج و MES',
        iconName: 'Factory',
        color: 'amber',
        badgeText: 'صناعي',
        showInNavbar: true,
        showInTabs: true,
        orderIndex: 1,
        screens: [
          {
            href: '/mes/shop-floor',
            label: 'صالة التصنيع الرقمية',
            tag: 'Shop Floor MES • شاشات لمس صناعية',
            iconName: 'Factory',
          },
          {
            href: '/transfers/finished-goods',
            label: 'استلام وتسليم المنتج التام',
            tag: 'تسليم الصالة • ميزان التكاليف • فحص الجودة • استلام الكنترول',
            iconName: 'Scale',
          },
          {
            href: '/production',
            label: 'أوامر الإنتاج والتشغيل',
            tag: 'أوامر الإطلاق الحرجة • أعطال وتشغيلات • تتبع SLA',
            iconName: 'Flame',
          },
          {
            href: '/mes/bom',
            label: 'هندسة التركيبات (BOM)',
            tag: 'شجرة المواد Multi-Level • نسب الهدر المعياري',
            iconName: 'Layers',
          },
          {
            href: '/emergency-tasks',
            label: 'الأوامر الطارئة والتدخل السريع',
            tag: 'طوارئ SOS • أعطال الماكينات • استجابة فورية',
            iconName: 'Radio',
          },
          {
            href: '/costing',
            label: 'التكاليف الصناعية والتشغيل',
            tag: 'تكلفة الدفعة • انحراف المعايير • تحليلات الربح',
            iconName: 'Calculator',
          },
          {
            href: '/requisitions',
            label: 'طلبات صرف الخامات',
            tag: 'صرف أوتوماتيكي من المستودعات لصالات التصنيع',
            iconName: 'FileText',
          },
        ],
      },
      {
        title: 'الجودة و HACCP',
        iconName: 'ShieldCheck',
        color: 'teal',
        badgeText: 'معتمد',
        showInNavbar: true,
        showInTabs: true,
        orderIndex: 2,
        screens: [
          {
            href: '/quality/inspections',
            label: 'فحوصات الجودة والحجر',
            tag: 'IQC • IPQC • OQC • حظر صحي فوري',
            iconName: 'ShieldCheck',
          },
          {
            href: '/quality/ccp-monitor',
            label: 'المراقبة الميدانية المباشرة (CCP)',
            tag: 'حرارة الأفران • غرف التجميد • أجهزة المعايرة',
            iconName: 'Radio',
          },
          {
            href: '/forms',
            label: 'النماذج الديناميكية واستمارات الجودة',
            tag: 'قوائم التحقق الذكية • فحوصات معتمدة AI',
            iconName: 'Sparkles',
          },
          {
            href: '/ams/tasks',
            label: 'تطبيقات الذكاء والرصد المدمجة (AMS)',
            tag: 'الرصد الذاتي • تنبيهات SLA • إشعارات طارئة',
            iconName: 'BellRing',
          },
        ],
      },
      {
        title: 'المستودعات وسلاسل الإمداد',
        iconName: 'Boxes',
        color: 'blue',
        badgeText: 'مخازن',
        showInNavbar: true,
        showInTabs: true,
        orderIndex: 3,
        screens: [
          {
            href: '/inventory',
            label: 'المستودعات وبطاقات الأصناف',
            tag: 'حجز الأصناف وقوى التوريد • جرد المخازن',
            iconName: 'Warehouse',
          },
          {
            href: '/transfers',
            label: 'المناقلات والتحويلات الداخلية',
            tag: 'تحويل بين المستودعات والصالات والمعارض',
            iconName: 'Truck',
          },
          {
            href: '/crates',
            label: 'الصناديق الدوارة وعهد العملاء',
            tag: 'أرصدة الصناديق الفارغة للعملاء والمعارض',
            iconName: 'Boxes',
          },
          {
            href: '/procurement',
            label: 'سجل الموردين وأوامر الشراء',
            tag: 'مشتريات الخامات • تقييم الموردين • فحص GRN',
            iconName: 'ShoppingBag',
          },
        ],
      },
      {
        title: 'نقاط البيع والمبيعات',
        iconName: 'Store',
        color: 'emerald',
        badgeText: 'POS',
        showInNavbar: true,
        showInTabs: true,
        orderIndex: 4,
        screens: [
          {
            href: '/pos/salesman',
            label: 'بائع المعرض (POS Salesman)',
            tag: 'إصدار أمر البيع وحجز الصواني • طباعة باركود الاستلام',
            iconName: 'Store',
          },
          {
            href: '/pos/cashier',
            label: 'الخزينة والكاشير (POS Cashier)',
            tag: 'تحصيل الإيصالات • فيزا ونقدي وخصومات • إصدار فاتورة ضريبية',
            iconName: 'Receipt',
          },
          {
            href: '/pos/dispatch',
            label: 'صالة التسليم والتحضير (POS Dispatch)',
            tag: 'تجهيز صواني التورت والحلويات • تسليم فوري للعميل',
            iconName: 'PackageCheck',
          },
          {
            href: '/sales',
            label: 'فواتير المبيعات المعتمدة',
            tag: 'الفواتير والعملاء • ربط مع الضرائب والمالية',
            iconName: 'Receipt',
          },
          {
            href: '/customers',
            label: 'دليل العملاء وسجل المديونيات',
            tag: 'بيانات العملاء • حدود الائتمان وسجل الفواتير',
            iconName: 'Users',
          },
        ],
      },
    ];

    for (const d of defaults) {
      await this.prisma.custom_app_icons.create({
        data: {
          company_id: companyId,
          title: d.title,
          icon_name: d.iconName,
          color: d.color,
          badge_text: d.badgeText,
          show_in_navbar: d.showInNavbar,
          show_in_tabs: d.showInTabs,
          order_index: d.orderIndex,
          screens_json: d.screens,
        },
      });
    }
  }
}
