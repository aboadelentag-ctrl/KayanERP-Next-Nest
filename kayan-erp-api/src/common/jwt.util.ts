import * as crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'kayan_erp_ultra_secure_tenant_isolation_secret_2026';

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
  companyId: string;
  tenantCode?: string;
  branchId?: string;
  iat?: number;
  exp?: number;
}

/**
 * توقيع رمز JWT مشفر بمعيار HMAC-SHA256 لضمان استحالة تزوير هوية المستأجر
 */
export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresInSeconds = 86400 * 7): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * التحقق الصارم من توقيع الـ JWT واستخراج هوية المستأجر المعتمدة
 */
export function verifyJwt(token: string): JwtPayload | null {
  try {
    if (!token || typeof token !== 'string') return null;

    // دعم البادئة Bearer
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    const parts = cleanToken.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (expectedSig !== signature) {
      return null;
    }

    const payload: JwtPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      return null; // الرمز منتهي الصلاحية
    }

    return payload;
  } catch (err) {
    return null;
  }
}
