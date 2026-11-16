import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getCurrentTenant } from '../common/tenant.context.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    this.setupTenantIsolation();
    await this.$connect();
  }

  /**
   * تطبيق العزل الصارم التلقائي لقاعدة البيانات (Prisma Multi-Tenant Global Isolation)
   * يضمن حقن شرط company_id تلقائياً في جميع استعلامات القراءة والكتابة والتعديل والحذف
   */
  private setupTenantIsolation() {
    const modelsWithCompanyId = new Set([
      'accounts',
      'asset_balances',
      'asset_movements',
      'audit_logs',
      'branch_transfers',
      'branches',
      'crate_client_transactions',
      'crate_clients',
      'customers',
      'departments',
      'employees',
      'item_categories',
      'item_uom_conversions',
      'items',
      'job_titles',
      'journal_entries',
      'maintenance_assets',
      'maintenance_orders',
      'price_lists',
      'production_orders',
      'purchase_orders',
      'quality_inspections',
      'recipes',
      'roles',
      'sales_invoices',
      'sales_orders',
      'shifts',
      'stock_balances',
      'stock_movements',
      'stock_transfers',
      'suppliers',
      'units',
      'users',
      'warehouses',
      'waste_records',
    ]);

    this.$use(async (params, next) => {
      const tenant = getCurrentTenant();

      // إذا كان المستخدم سوبر أدمن المنصة (Platform Super Admin) يتم السماح بالوصول الشامل
      if (!tenant || tenant.isPlatformAdmin) {
        return next(params);
      }

      const modelName = params.model;

      // عزل جدول المنشآت والشركات (Companies/Tenants) للمستخدمين غير السوبر أدمن
      if (modelName === 'companies') {
        const companyId = tenant.companyId;
        if (['findFirst', 'findMany', 'count', 'aggregate'].includes(params.action)) {
          params.args = params.args || {};
          params.args.where = {
            ...(params.args.where || {}),
            id: companyId,
          };
        }
        if (params.action === 'findUnique') {
          const result = await next(params);
          if (result && BigInt(result.id) !== companyId) {
            return null;
          }
          return result;
        }
        if (['create', 'createMany', 'update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
          throw new Error('محاولة تعديل غير مصرح بها على جدول المنشآت المستأجرة (Multi-Tenant Violation)');
        }
      }

      if (modelName && modelsWithCompanyId.has(modelName)) {
        const companyId = tenant.companyId;

        // 1. عمليات القراءة الجماعية والفردية (findFirst, findMany, count, aggregate)
        if (['findFirst', 'findMany', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
          params.args = params.args || {};
          params.args.where = {
            ...(params.args.where || {}),
            company_id: companyId,
          };
        }

        // 2. التحقق الصارم في استعلامات findUnique لمنع استرجاع أي سجل يتبع مستأجر آخر
        if (params.action === 'findUnique') {
          const result = await next(params);
          if (result && result.company_id && BigInt(result.company_id) !== companyId) {
            return null; // حظر وعزل تام: السجل يتبع مستأجراً آخر
          }
          return result;
        }

        // 3. عمليات الإنشاء الفردية (create)
        if (params.action === 'create') {
          params.args = params.args || {};
          params.args.data = {
            ...(params.args.data || {}),
            company_id: companyId,
          };
        }

        // 4. عمليات الإنشاء الجماعية (createMany)
        if (params.action === 'createMany') {
          params.args = params.args || {};
          if (Array.isArray(params.args.data)) {
            params.args.data = params.args.data.map((item: any) => ({
              ...item,
              company_id: companyId,
            }));
          }
        }

        // 5. عمليات التعديل والحذف (update, updateMany, delete, deleteMany)
        if (['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
          params.args = params.args || {};
          params.args.where = {
            ...(params.args.where || {}),
            company_id: companyId,
          };
        }
      }

      return next(params);
    });
  }
}
