import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';

export class CreateCompanyDto {
  companyCode?: string;
  CompanyCode?: string;
  tenantCode?: string;
  TenantCode?: string;
  companyName?: string;
  CompanyName?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
}

export class UpdateCompanyDto {
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  active?: boolean;
}

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. جلب الشركات مع تطبيق العزل الصارم للمستأجرين من Neon DB
  async findAll(role?: string, companyId?: string | number) {
    const where: any = {};
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_SUPER_ADMIN' && companyId) {
      where.id = BigInt(companyId);
    }

    const dbCompanies = await this.prisma.companies.findMany({
      where,
      include: {
        branches: true,
        users_users_company_idTocompanies: true,
      },
      orderBy: { id: 'asc' },
    });

    const serialized = dbCompanies.map((c: any) => ({
      id: String(c.id),
      companyCode: c.company_code,
      companyName: c.company_name,
      tenantCode: c.tenant_code || c.company_code,
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      active: c.active !== false,
      branchesCount: c.branches?.length || 0,
      usersCount: c.users_users_company_idTocompanies?.length || 0,
    }));

    return serialized;
  }

  // 2. جلب شركة محددة بالمعرف
  async findOne(id: string) {
    const parsedId = BigInt(id);
    const company = await this.prisma.companies.findFirst({
      where: { id: parsedId },
      include: {
        branches: true,
        users_users_company_idTocompanies: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`الشركة أو المنشأة بالمعرف [${id}] غير موجودة بقاعدة البيانات`);
    }

    return {
      id: String(company.id),
      companyCode: company.company_code,
      companyName: company.company_name,
      tenantCode: company.tenant_code || company.company_code,
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || '',
      active: company.active !== false,
      branchesCount: company.branches?.length || 0,
      usersCount: company.users_users_company_idTocompanies?.length || 0,
    };
  }

  // 3. إنشاء شركة مستأجرة جديدة في Neon DB
  async create(dto: CreateCompanyDto) {
    const name = (dto.companyName || dto.CompanyName || dto.name || '').trim();
    if (!name) {
      throw new BadRequestException('اسم الشركة أو المنشأة حقل إجباري');
    }

    const code = (dto.companyCode || dto.CompanyCode || `COMP-${Date.now().toString().slice(-4)}`).trim();
    const tCode = (dto.tenantCode || dto.TenantCode || code).trim();

    const created = await this.prisma.companies.create({
      data: {
        company_code: code,
        company_name: name,
        tenant_code: tCode,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        address: dto.address?.trim() || null,
        active: dto.active !== undefined ? dto.active : true,
      },
    });

    const result = {
      id: String(created.id),
      companyCode: created.company_code,
      companyName: created.company_name,
      tenantCode: created.tenant_code,
      phone: created.phone || '',
      email: created.email || '',
      address: created.address || '',
      active: created.active,
      branchesCount: 0,
      usersCount: 0,
    };

    this.realtime.emitTenantUpdate(created.id, 'company_created', result);

    return {
      success: true,
      message: `تم إنشاء المنشأة المستأجرة [${result.companyName}] بنجاح في قاعدة البيانات`,
      data: result,
    };
  }

  // 4. تعديل بيانات الشركة
  async update(id: string, dto: UpdateCompanyDto) {
    const parsedId = BigInt(id);
    const existing = await this.prisma.companies.findFirst({
      where: { id: parsedId },
    });

    if (!existing) {
      throw new NotFoundException(`المنشأة بالمعرف [${id}] غير موجودة`);
    }

    const updated = await this.prisma.companies.update({
      where: { id: existing.id },
      data: {
        ...(dto.companyName ? { company_name: dto.companyName.trim() } : {}),
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
        ...(dto.email ? { email: dto.email.trim() } : {}),
        ...(dto.address ? { address: dto.address.trim() } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });

    return {
      success: true,
      message: `تم تحديث بيانات المنشأة [${updated.company_name}] بنجاح في قاعدة البيانات`,
      data: {
        id: String(updated.id),
        companyName: updated.company_name,
      },
    };
  }
}
