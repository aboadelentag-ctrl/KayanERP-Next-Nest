import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { getCurrentTenant } from '../common/tenant.context.js';

export class CreateBranchDto {
  branchCode: string;
  branchName: string;
  city: string;
  address?: string;
  managerName?: string;
  phone?: string;
  branchType?: string;
}

export class UpdateBranchDto {
  branchName?: string;
  city?: string;
  address?: string;
  managerName?: string;
  phone?: string;
  active?: boolean;
}

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. ملخص تشغيل الفروع من قاعدة بيانات Neon الحقيقية
  async getOperationsSummary() {
    return this.getAllBranches();
  }

  // 2. قائمة الفروع الكاملة الحقيقية
  async getAllBranches() {
    const dbBranches = await this.prisma.branches.findMany({
      include: {
        warehouses: true,
        employees: true,
      },
      orderBy: { id: 'asc' },
    });

    const serialized = dbBranches.map((b: any) => ({
      id: String(b.id),
      code: b.branch_code,
      nameAr: b.branch_name,
      city: 'الدقهلية',
      address: b.address || '',
      managerName: b.employees?.[0]?.employee_name || 'مدير المعرض',
      phone: b.phone || '',
      branchType: 'Retail',
      activeWarehousesCount: b.warehouses?.length || 1,
      todaySalesVolume: 0,
      cratesCustodyCount: 0,
      isActive: b.active !== false,
    }));

    return {
      success: true,
      data: serialized,
    };
  }

  // 3. إضافة فرع جديد في Neon DB
  async createBranch(dto: CreateBranchDto) {
    if (!dto.branchCode || !dto.branchName) {
      throw new BadRequestException('كود الفرع واسم الفرع حقول إجبارية');
    }

    const tenant = getCurrentTenant();
    const companyId = tenant?.companyId || 1n;

    const created = await this.prisma.branches.create({
      data: {
        company_id: companyId,
        branch_code: dto.branchCode.trim(),
        branch_name: dto.branchName.trim(),
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    const result = {
      id: String(created.id),
      code: created.branch_code,
      nameAr: created.branch_name,
      city: dto.city || 'الدقهلية',
      address: created.address || '',
      managerName: dto.managerName || 'مدير المعرض',
      phone: created.phone || '',
      branchType: dto.branchType || 'Retail',
      activeWarehousesCount: 1,
      todaySalesVolume: 0,
      cratesCustodyCount: 0,
      isActive: true,
    };

    this.realtime.emitTenantUpdate(companyId, 'branch_updated', result);

    return {
      success: true,
      message: `تم إضافة المعرض/الفرع [${created.branch_name}] بنجاح وحفظه في قاعدة البيانات`,
      data: result,
    };
  }

  // 4. تحديث بيانات الفرع
  async updateBranch(id: string, dto: UpdateBranchDto) {
    const parsedId = !isNaN(Number(id)) ? BigInt(id) : -1n;
    const branch = await this.prisma.branches.findFirst({
      where: {
        OR: [{ id: parsedId }, { branch_code: id }],
      },
    });

    if (!branch) {
      throw new NotFoundException('الفرع غير موجود بقاعدة البيانات');
    }

    const updated = await this.prisma.branches.update({
      where: { id: branch.id },
      data: {
        ...(dto.branchName ? { branch_name: dto.branchName.trim() } : {}),
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
        ...(dto.address ? { address: dto.address.trim() } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        updated_at: new Date(),
      },
    });

    const tenant = getCurrentTenant();
    this.realtime.emitTenantUpdate(tenant?.companyId || 1n, 'branch_updated', {
      id: String(updated.id),
      code: updated.branch_code,
      nameAr: updated.branch_name,
    });

    return {
      success: true,
      message: `تم تحديث بيانات الفرع [${updated.branch_name}] بنجاح في قاعدة البيانات`,
    };
  }
}
