import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService, TenantVerifyRequest, UserTenantLoginRequest } from './auth.service.js';

export class VerifyTenantBodyDto {
  tenantCode?: string;
  TenantCode?: string;
  tenantKey?: string;
  TenantKey?: string;
}

export class LoginUserBodyDto {
  companyId?: string | number;
  CompanyId?: string | number;
  username?: string;
  Username?: string;
  password?: string;
  Password?: string;
  branchId?: string | number;
  BranchId?: string | number;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('verify-tenant')
  @HttpCode(HttpStatus.OK)
  async verifyTenant(@Body() body: VerifyTenantBodyDto) {
    const tenantCode = body.tenantCode || body.TenantCode || '';
    const tenantKey = body.tenantKey || body.TenantKey || '';
    return this.authService.verifyTenant({ tenantCode, tenantKey });
  }

  @Post('login-user')
  @HttpCode(HttpStatus.OK)
  async loginUser(@Body() body: LoginUserBodyDto) {
    const companyId = body.companyId ?? body.CompanyId ?? 1;
    const username = body.username || body.Username || '';
    const password = body.password || body.Password || '';
    const branchId = body.branchId ?? body.BranchId ?? 1;

    return this.authService.loginUser({
      companyId,
      username,
      password,
      branchId,
    });
  }

  @Get('companies')
  async getCompanies() {
    return this.authService.getCompanies();
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    return {
      success: true,
      message: 'تم تسجيل الخروج بنجاح من منصة كيان',
    };
  }

  @Get('me')
  async getProfile() {
    return {
      success: true,
      user: {
        id: '1',
        username: 'admin',
        fullName: 'م. أحمد عادل (المدير التنفيذي)',
        role: 'SUPER_ADMIN',
        companyId: '1',
        companyName: 'مصانع وحلواني أبو عادل (المركز الرئيسي)',
        branchId: '1',
        branchName: 'المصنع المركزي (سندوب)',
      },
    };
  }
}
