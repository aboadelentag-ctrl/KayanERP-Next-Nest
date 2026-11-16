import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { RealtimeModule } from './realtime.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { SalesModule } from './sales/sales.module.js';
import { ManufacturingModule } from './manufacturing/manufacturing.module.js';
import { DynamicFormsModule } from './dynamic-forms/dynamic-forms.module.js';
import { CratesModule } from './crates/crates.module.js';
import { TransfersModule } from './transfers/transfers.module.js';
import { CostingModule } from './costing/costing.module.js';
import { ProcurementModule } from './procurement/procurement.module.js';
import { HrModule } from './hr/hr.module.js';
import { PayrollModule } from './payroll/payroll.module.js';
import { AccountingModule } from './accounting/accounting.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { AssetsModule } from './assets/assets.module.js';
import { RequisitionsModule } from './requisitions/requisitions.module.js';
import { EmergencyTasksModule } from './emergency-tasks/emergency-tasks.module.js';
import { UsersModule } from './users/users.module.js';
import { BranchesModule } from './branches/branches.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { TreasuryModule } from './treasury/treasury.module.js';
import { PayablesModule } from './payables/payables.module.js';
import { MesModule } from './mes/mes.module.js';
import { QualityModule } from './quality/quality.module.js';
import { AmsModule } from './ams/ams.module.js';
import { CallCenterModule } from './call-center/call-center.module.js';
import { EngineeringModule } from './engineering/engineering.module.js';
import { HousekeepingModule } from './housekeeping/housekeeping.module.js';
import { NavigationModule } from './navigation/navigation.module.js';
import { FinishedGoodsModule } from './finished-goods/finished-goods.module.js';
import { TenantMiddleware } from './common/tenant.middleware.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'kayan-erp-api',
    }),
    PrismaModule,
    RealtimeModule,
    AccountsModule,
    InventoryModule,
    SalesModule,
    ManufacturingModule,
    DynamicFormsModule,
    CratesModule,
    TransfersModule,
    CostingModule,
    ProcurementModule,
    HrModule,
    PayrollModule,
    AccountingModule,
    DashboardModule,
    AssetsModule,
    RequisitionsModule,
    EmergencyTasksModule,
    UsersModule,
    BranchesModule,
    AuthModule,
    CompaniesModule,
    TreasuryModule,
    PayablesModule,
    MesModule,
    QualityModule,
    AmsModule,
    CallCenterModule,
    EngineeringModule,
    HousekeepingModule,
    NavigationModule,
    FinishedGoodsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
