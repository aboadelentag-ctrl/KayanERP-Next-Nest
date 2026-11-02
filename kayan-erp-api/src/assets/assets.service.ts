import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { getCurrentTenant } from '../common/tenant.context.js';

export class CreateFixedAssetDto {
  assetCode?: string;
  name: string;
  department: string;
  category?: string;
  brandModel?: string;
  serialNumber?: string;
  custodianCode?: string;
  custodianName?: string;
  installationDate?: string;
  status?: string;
}

export class UpdateFixedAssetDto {
  name?: string;
  department?: string;
  category?: string;
  brandModel?: string;
  serialNumber?: string;
  custodianCode?: string;
  custodianName?: string;
  status?: string;
}

export { CreateFixedAssetDto as CreateAssetDto, UpdateFixedAssetDto as UpdateAssetDto };

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. استعراض كافة الأصول الرأسمالية والماكينات مباشرة من قاعدة بيانات Neon
  async getAll(search?: string, department?: string, status?: string) {
    const where: any = {};
    if (department && department !== 'ALL' && department !== 'الكل') {
      where.department = department;
    }
    if (status && status !== 'ALL' && status !== 'الكل') {
      where.status = status;
    }
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { asset_code: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const dbAssets = await this.prisma.fixed_assets.findMany({
      where,
      include: {
        asset_history_logs: {
          orderBy: { id: 'desc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    const serialized = dbAssets.map((a: any) => ({
      id: String(a.id),
      assetCode: a.asset_code,
      name: a.name,
      department: a.department,
      category: a.category || 'عام',
      brandModel: a.brand_model || '',
      serialNumber: a.serial_number || '',
      custodianCode: a.custodian_code || '',
      custodianName: a.custodian_name || '',
      installationDate: a.installation_date ? new Date(a.installation_date).toISOString().slice(0, 10) : '',
      status: a.status,
      activeSosTaskNumber: a.active_sos_task_number || null,
      historyLogs: (a.asset_history_logs || []).map((h: any) => ({
        id: String(h.id),
        date: h.date ? new Date(h.date).toISOString().slice(0, 10) : '',
        eventType: h.event_type,
        description: h.description,
        performedByName: h.performed_by_name || 'قسم الصيانة',
        costImpact: h.cost_impact || '',
      })),
    }));

    return {
      success: true,
      data: serialized,
    };
  }

  async findAll(department?: string, category?: string, status?: string) {
    return this.getAll(undefined, department, status);
  }

  // 2. سجل تاريخ الأصل والعمليات السابقة
  async getHistory(id: string) {
    const parsedId = !isNaN(Number(id)) ? BigInt(id) : -1n;
    const asset = await this.prisma.fixed_assets.findFirst({
      where: {
        OR: [{ id: parsedId }, { asset_code: id }],
      },
      include: {
        asset_history_logs: {
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`الأصل أو الماكينة بالمعرف [${id}] غير موجود`);
    }

    const logs = (asset.asset_history_logs || []).map((h: any) => ({
      id: String(h.id),
      date: h.date ? new Date(h.date).toISOString().slice(0, 10) : '',
      eventType: h.event_type,
      description: h.description,
      performedByName: h.performed_by_name,
      costImpact: h.cost_impact,
    }));

    return {
      success: true,
      data: logs,
    };
  }

  // 3. بطاقة أصل تفصيلية
  async findOne(id: string) {
    const parsedId = !isNaN(Number(id)) ? BigInt(id) : -1n;
    const asset = await this.prisma.fixed_assets.findFirst({
      where: {
        OR: [{ id: parsedId }, { asset_code: id }],
      },
      include: {
        asset_history_logs: {
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(`الأصل أو الماكينة بالمعرف [${id}] غير موجود بقاعدة البيانات`);
    }

    return {
      success: true,
      data: {
        id: String(asset.id),
        assetCode: asset.asset_code,
        name: asset.name,
        department: asset.department,
        category: asset.category,
        brandModel: asset.brand_model,
        serialNumber: asset.serial_number,
        custodianCode: asset.custodian_code,
        custodianName: asset.custodian_name,
        installationDate: asset.installation_date ? new Date(asset.installation_date).toISOString().slice(0, 10) : '',
        status: asset.status,
        activeSosTaskNumber: asset.active_sos_task_number,
        historyLogs: (asset.asset_history_logs || []).map((h: any) => ({
          id: String(h.id),
          date: h.date ? new Date(h.date).toISOString().slice(0, 10) : '',
          eventType: h.event_type,
          description: h.description,
          performedByName: h.performed_by_name,
          costImpact: h.cost_impact,
        })),
      },
    };
  }

  // 4. تسجيل أصل رأسمالي جديد في Neon DB
  async create(dto: CreateFixedAssetDto) {
    if (!dto.name || !dto.department) {
      throw new BadRequestException('اسم الأصل والقسم حقول إجبارية');
    }

    const code = dto.assetCode?.trim() || `AST-${Date.now().toString().slice(-5)}`;
    const tenant = getCurrentTenant();
    const companyId = tenant?.companyId || 1n;

    const created = await this.prisma.fixed_assets.create({
      data: {
        asset_code: code,
        name: dto.name.trim(),
        department: dto.department.trim(),
        category: dto.category || 'ماكينات عامة',
        brand_model: dto.brandModel || '',
        serial_number: dto.serialNumber || '',
        custodian_code: dto.custodianCode || '',
        custodian_name: dto.custodianName || '',
        installation_date: dto.installationDate ? new Date(dto.installationDate) : new Date(),
        status: dto.status || 'OPERATIONAL',
        asset_history_logs: {
          create: {
            date: new Date(),
            event_type: 'شراء وتثبيت أصل',
            description: `تسجيل الأصل [${dto.name}] رسمياً على قسم [${dto.department}]`,
            performed_by_name: dto.custodianName || 'مدير الأصول',
            cost_impact: 'استثماري',
          },
        },
      },
      include: {
        asset_history_logs: true,
      },
    });

    this.realtime.emitTenantUpdate(companyId, 'asset_created', {
      id: String(created.id),
      assetCode: code,
      name: dto.name,
      department: dto.department,
    });

    return {
      success: true,
      message: `تم تسجيل الأصل [${dto.name}] بنجاح وحفظه في قاعدة البيانات`,
      data: {
        id: String(created.id),
        assetCode: code,
      },
    };
  }

  // 5. تعديل بيانات الأصل
  async update(id: string, dto: UpdateFixedAssetDto) {
    const parsedId = !isNaN(Number(id)) ? BigInt(id) : -1n;
    const existing = await this.prisma.fixed_assets.findFirst({
      where: {
        OR: [{ id: parsedId }, { asset_code: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`الأصل بالمعرف [${id}] غير موجود`);
    }

    const updated = await this.prisma.fixed_assets.update({
      where: { id: existing.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.department ? { department: dto.department.trim() } : {}),
        ...(dto.category ? { category: dto.category.trim() } : {}),
        ...(dto.brandModel ? { brand_model: dto.brandModel.trim() } : {}),
        ...(dto.serialNumber ? { serial_number: dto.serialNumber.trim() } : {}),
        ...(dto.custodianCode ? { custodian_code: dto.custodianCode.trim() } : {}),
        ...(dto.custodianName ? { custodian_name: dto.custodianName.trim() } : {}),
        ...(dto.status ? { status: dto.status.trim() } : {}),
      },
    });

    return {
      success: true,
      message: 'تم تحديث بيانات الأصل بنجاح في قاعدة البيانات',
      data: {
        id: String(updated.id),
        assetCode: updated.asset_code,
        status: updated.status,
      },
    };
  }

  // 6. حذف الأصل
  async delete(id: string) {
    const parsedId = !isNaN(Number(id)) ? BigInt(id) : -1n;
    const existing = await this.prisma.fixed_assets.findFirst({
      where: {
        OR: [{ id: parsedId }, { asset_code: id }],
      },
    });

    if (!existing) {
      throw new NotFoundException(`الأصل بالمعرف [${id}] غير موجود`);
    }

    await this.prisma.fixed_assets.delete({
      where: { id: existing.id },
    });

    return {
      success: true,
      message: `تم حذف الأصل [${existing.name}] نهائياً من قاعدة البيانات`,
    };
  }
}
