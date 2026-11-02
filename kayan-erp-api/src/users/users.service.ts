import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { getCurrentTenant } from '../common/tenant.context.js';

export class CreateUserDto {
  username: string;
  fullName: string;
  role: string;
  departmentName?: string;
  employeeCode?: string;
  isActive?: boolean;
  allowedBranchIds?: string[];
  password?: string;
}

export class UpdateUserDto {
  fullName?: string;
  role?: string;
  departmentName?: string;
  isActive?: boolean;
  allowedBranchIds?: string[];
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. استعراض المستخدمين الحقيقيين من Neon DB
  async getUsers() {
    const dbUsers = await this.prisma.users.findMany({
      include: { roles: true },
      orderBy: { id: 'asc' },
    });

    const serialized = dbUsers.map((u: any) => ({
      id: String(u.id),
      username: u.username,
      fullName: u.full_name || u.username,
      role: u.role || u.roles?.role_code || 'USER',
      departmentName: u.department_name || 'إدارة عامة',
      employeeCode: u.employee_code || `EMP-${u.id}`,
      isActive: u.is_active ?? true,
      allowedBranches: ['كافة الفروع'],
      lastLogin: 'نشط',
    }));

    return { success: true, data: serialized };
  }

  // 2. استعراض قوالب الأدوار الحقيقية من Neon DB
  async getRoles() {
    const dbRoles = await this.prisma.roles.findMany({
      orderBy: { id: 'asc' },
    });

    const serialized = dbRoles.map((r: any) => ({
      id: String(r.id),
      roleName: r.role_code || r.role_name,
      displayName: r.display_name || r.role_name,
      description: r.description || '',
    }));

    return {
      success: true,
      data: serialized,
    };
  }

  // 3. شجرة الصلاحيات الكاملة
  async getPermissionsDictionary() {
    return {
      success: true,
      data: [
        { module: 'الإنتاج والتشغيل', permissions: ['VIEW_RECIPES', 'CREATE_PRODUCTION_ORDER', 'APPROVE_BATCH', 'PRINT_JOB_TICKET'] },
        { module: 'المخازن والخامات', permissions: ['VIEW_STOCK', 'ISSUE_MATERIAL', 'APPROVE_REQUISITION', 'RESOLVE_DISCREPANCY'] },
        { module: 'المبيعات ونقاط البيع', permissions: ['POS_CHECKOUT', 'APPLY_DISCOUNT', 'PRINT_THERMAL_SLIP', 'WHOLESALE_INVOICE'] },
        { module: 'الصناديق والتحويلات', permissions: ['DISPATCH_TRANSFER', 'RECEIVE_TRANSFER', 'RECORD_CRATE_MOVEMENT'] },
        { module: 'الحسابات والمالية', permissions: ['CREATE_JOURNAL_ENTRY', 'POST_ENTRY', 'VIEW_TRIAL_BALANCE', 'VIEW_FINANCIAL_STATEMENTS'] },
        { module: 'الأصول والماكينات', permissions: ['REGISTER_ASSET', 'TRANSFER_CUSTODY', 'EMERGENCY_SOS_ALERT', 'CLOSE_MAINTENANCE_TASK'] },
        { module: 'شؤون العاملين', permissions: ['VIEW_EMPLOYEES', 'LOG_ATTENDANCE', 'CALCULATE_PAYROLL', 'APPROVE_ADVANCE'] },
        { module: 'إدارة النظام والـ RBAC', permissions: ['MANAGE_USERS', 'ASSIGN_ROLES', 'CONFIGURE_BRANCHES', 'EXPORT_AUDIT_LOGS'] },
      ],
    };
  }

  // 4. إنشاء مستخدم جديد في Neon DB
  async createUser(dto: CreateUserDto) {
    if (!dto.username || !dto.fullName || !dto.role) {
      throw new BadRequestException('اسم المستخدم، الاسم الكامل، والرتبة/الدور حقول مطلوبة');
    }

    const tenant = getCurrentTenant();
    const companyId = tenant?.companyId || 1n;

    const created = await this.prisma.users.create({
      data: {
        username: dto.username.trim(),
        full_name: dto.fullName.trim(),
        password_hash: dto.password || 'argon2_hashed_secret',
        role: dto.role,
        department_name: dto.departmentName || 'إدارة التشغيل',
        employee_code: dto.employeeCode || `EMP-${Date.now().toString().slice(-4)}`,
        is_active: dto.isActive !== false,
        company_id: companyId,
      },
    });

    const result = {
      id: String(created.id),
      username: created.username,
      fullName: created.full_name,
      role: created.role,
      departmentName: created.department_name,
      employeeCode: created.employee_code,
      isActive: created.is_active,
      allowedBranches: ['المصنع المركزي'],
    };

    this.realtime.emitTenantUpdate(companyId, 'user_created', result);

    return {
      success: true,
      message: `تم إنشاء حساب المستخدم [${result.username}] بنجاح وحفظه في قاعدة البيانات`,
      data: result,
    };
  }

  // 5. تحديث بيانات وصلاحيات المستخدم
  async updateUser(id: string, dto: UpdateUserDto) {
    const parsedId = BigInt(id);
    const user = await this.prisma.users.findFirst({
      where: { id: parsedId },
    });

    if (!user) throw new NotFoundException('المستخدم غير موجود بقاعدة البيانات');

    const updated = await this.prisma.users.update({
      where: { id: user.id },
      data: {
        ...(dto.fullName ? { full_name: dto.fullName.trim() } : {}),
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.departmentName ? { department_name: dto.departmentName } : {}),
        ...(dto.isActive !== undefined ? { is_active: dto.isActive } : {}),
      },
    });

    const tenant = getCurrentTenant();
    this.realtime.emitTenantUpdate(tenant?.companyId || 1n, 'user_updated', {
      id: String(updated.id),
      username: updated.username,
      fullName: updated.full_name,
    });

    return {
      success: true,
      message: `تم تحديث بيانات المستخدم [${updated.username}] بنجاح في قاعدة البيانات`,
    };
  }
}
