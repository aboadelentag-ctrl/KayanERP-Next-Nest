import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContextData {
  tenantId: string;
  companyId: bigint;
  userId?: string;
  username?: string;
  role?: string;
  isPlatformAdmin: boolean;
}

/**
 * مخزن السياق غير المتزامن (AsyncLocalStorage) لحفظ وتمرير هوية المستأجر طوال دورة حياة الطلب
 */
export const tenantContext = new AsyncLocalStorage<TenantContextData>();

/**
 * استرجاع سياق المستأجر الحالي
 */
export function getCurrentTenant(): TenantContextData | undefined {
  return tenantContext.getStore();
}
