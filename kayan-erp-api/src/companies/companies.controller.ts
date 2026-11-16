import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import { CompaniesService, CreateCompanyDto, UpdateCompanyDto } from './companies.service.js';
import { verifyJwt } from '../common/jwt.util.js';
import { getCurrentTenant } from '../common/tenant.context.js';

@Controller(['companies', 'tenants'])
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  private checkSuperAdmin(role?: string, authHeader?: string): boolean {
    if (authHeader) {
      const payload = verifyJwt(authHeader);
      if (payload && (payload.role === 'PLATFORM_SUPER_ADMIN' || payload.role === 'SUPER_ADMIN')) {
        return true;
      }
    }
    const currentTenant = getCurrentTenant();
    if (
      currentTenant?.isPlatformAdmin ||
      currentTenant?.role === 'PLATFORM_SUPER_ADMIN' ||
      currentTenant?.role === 'SUPER_ADMIN'
    ) {
      return true;
    }
    return role === 'SUPER_ADMIN' || role === 'PLATFORM_SUPER_ADMIN';
  }

  // 1. جلب الشركات: مقصور حصراً على سوبر أدمن المنصة لحماية خصوصية المستأجرين
  @Get()
  async findAll(
    @Headers('x-user-role') role?: string,
    @Headers('x-company-id') companyId?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const isSuperAdmin = this.checkSuperAdmin(role, authHeader);
    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'عفواً، استعراض وإدارة سجلات المنشآت المستأجرة مقصور حصرياً على رتبة «سوبر أدمن المنصة» (Multi-Tenant Protection - 403 Forbidden).',
      );
    }

    const tenant = getCurrentTenant();
    const effectiveCompanyId = companyId || tenant?.tenantId;
    return this.companiesService.findAll('SUPER_ADMIN', effectiveCompanyId);
  }

  // 2. جلب شركة محددة مع منع الوصول لشركات الغير
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('x-user-role') role?: string,
    @Headers('x-company-id') companyId?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const isSuperAdmin = this.checkSuperAdmin(role, authHeader);
    const tenant = getCurrentTenant();
    const effectiveCompanyId = companyId || tenant?.tenantId;

    if (!isSuperAdmin && effectiveCompanyId && String(effectiveCompanyId) !== String(id)) {
      throw new ForbiddenException(
        'عفواً، لا تملك صلاحية الاطلاع على بيانات منشأة مستأجرة أخرى (Multi-Tenant Isolation Violation - 403 Forbidden).',
      );
    }

    return this.companiesService.findOne(id);
  }

  // 3. إنشاء شركة مستأجرة جديدة: مقصور حصراً على SUPER_ADMIN
  @Post()
  async create(
    @Body() dto: CreateCompanyDto,
    @Headers('x-user-role') role?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const isSuperAdmin = this.checkSuperAdmin(role, authHeader);

    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'عفواً، تسجيل شركات ومنشآت مستأجرة جديدة مقصور حصرياً على رتبة «سوبر أدمن المنصة» (403 Forbidden).',
      );
    }

    return this.companiesService.create(dto);
  }

  // 4. تعديل شركة مستأجرة: مقصور حصراً على SUPER_ADMIN
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @Headers('x-user-role') role?: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const isSuperAdmin = this.checkSuperAdmin(role, authHeader);

    if (!isSuperAdmin) {
      throw new ForbiddenException(
        'عفواً، تعديل بيانات الشركات المستأجرة مقصور حصرياً على رتبة «سوبر أدمن المنصة» (403 Forbidden).',
      );
    }

    return this.companiesService.update(id, dto);
  }
}
