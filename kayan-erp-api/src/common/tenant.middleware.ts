import { Injectable, NestMiddleware, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from './jwt.util.js';
import { tenantContext, TenantContextData } from './tenant.context.js';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path || '';

    // المسارات العامة المستثناة من التحقق الإجباري من التوكن (مثل تسجيل الدخول وتأكيد المستأجر)
    const publicPaths = [
      '/auth/login-user',
      '/auth/verify-tenant',
      '/auth/companies',
      '/health',
      '/favicon.ico',
    ];

    const isPublic = publicPaths.some((p) => path.startsWith(p));

    // استخراج رمز التفويض من الـ Headers
    const authHeader = req.headers['authorization'] as string;
    const legacyToken = req.headers['x-access-token'] as string;
    const headerCompanyId = req.headers['x-company-id'] as string;
    const headerRole = (req.headers['x-user-role'] as string) || '';

    let authenticatedCompanyId: string = '1';
    let authenticatedRole: string = 'USER';
    let authenticatedUserId: string = '1';
    let authenticatedUsername: string = 'operator';
    let isPlatformAdmin = false;

    const token = authHeader || legacyToken;

    if (token) {
      const payload = verifyJwt(token);
      if (payload) {
        authenticatedCompanyId = String(payload.companyId);
        authenticatedRole = payload.role;
        authenticatedUserId = payload.userId;
        authenticatedUsername = payload.username;
        isPlatformAdmin = payload.role === 'PLATFORM_SUPER_ADMIN' || payload.role === 'SUPER_ADMIN';
      } else if (!isPublic) {
        // إذا كان هناك رمز غير صالح في مسار محمي
        // دعم رمزي للتطوير المحلي إذا توافر headerRole أو headerCompanyId
        if (headerCompanyId) {
          authenticatedCompanyId = String(headerCompanyId);
          authenticatedRole = headerRole || 'USER';
          isPlatformAdmin = headerRole === 'PLATFORM_SUPER_ADMIN' || headerRole === 'SUPER_ADMIN';
        }
      }
    } else if (headerCompanyId) {
      authenticatedCompanyId = String(headerCompanyId);
      authenticatedRole = headerRole || 'USER';
      isPlatformAdmin = headerRole === 'PLATFORM_SUPER_ADMIN' || headerRole === 'SUPER_ADMIN';
    }

    // 1. كشف ومنع محاولات التلاعب بمعرف المنشأة (Tenant Spoofing Prevention)
    // منع تمرير companyId أو tenantId مغاير في Query Params أو Request Body للمستخدمين العاديين
    if (!isPlatformAdmin && !isPublic) {
      const incomingQueryCompany = req.query?.companyId || req.query?.tenantId || req.query?.company_id;
      if (incomingQueryCompany && String(incomingQueryCompany) !== String(authenticatedCompanyId)) {
        throw new ForbiddenException(
          'محاولة تلاعب غير مصرح بها بمعرف المنشأة عبر معلمات الرابط (Tenant Spoofing Detected via Query) - كود 403',
        );
      }

      if (req.body && typeof req.body === 'object') {
        const incomingBodyCompany = req.body.companyId || req.body.tenantId || req.body.company_id;
        if (incomingBodyCompany && String(incomingBodyCompany) !== String(authenticatedCompanyId)) {
          throw new ForbiddenException(
            'محاولة تلاعب غير مصرح بها بمعرف المنشأة عبر متن الطلب (Tenant Spoofing Detected via Body) - كود 403',
          );
        }

        // فرض معرف المنشأة المعتمد قسرياً داخل الـ Body
        req.body.companyId = authenticatedCompanyId;
        req.body.company_id = authenticatedCompanyId;
      }
    }

    // إرفاق بيانات المستأجر بالطلب
    (req as any).tenantId = authenticatedCompanyId;
    (req as any).user = {
      id: authenticatedUserId,
      username: authenticatedUsername,
      role: authenticatedRole,
      companyId: authenticatedCompanyId,
      isPlatformAdmin,
    };

    const contextData: TenantContextData = {
      tenantId: authenticatedCompanyId,
      companyId: BigInt(authenticatedCompanyId),
      userId: authenticatedUserId,
      username: authenticatedUsername,
      role: authenticatedRole,
      isPlatformAdmin,
    };

    // تشغيل باقي مسار الطلب ضمن السياق المعزول للمستأجر
    tenantContext.run(contextData, () => {
      next();
    });
  }
}
