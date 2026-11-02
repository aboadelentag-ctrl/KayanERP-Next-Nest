import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { getCurrentTenant } from '../common/tenant.context.js';

export class CreateAccountDto {
  accountCode: string;
  accountName: string;
  accountType: 'Assets' | 'Liabilities' | 'Equity' | 'Revenues' | 'Expenses';
  parentAccountId?: string | number;
}

export class JournalEntryLineDto {
  accountId: string | number;
  debit?: number;
  credit?: number;
  description?: string;
}

export class CreateJournalEntryDto {
  date?: string;
  description: string;
  referenceType?: string;
  referenceNumber?: string;
  lines: JournalEntryLineDto[];
}

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. استعراض شجرة الحسابات الحقيقية من Neon DB (GET /accounting/chart-of-accounts)
  async getChartOfAccounts() {
    const dbAccounts = await this.prisma.accounts.findMany({
      orderBy: { account_code: 'asc' },
    });

    const serialized = dbAccounts.map((a: any) => {
      const code = a.account_code || '';
      return {
        id: String(a.id),
        accountCode: code,
        account_code: code,
        accountName: a.account_name,
        account_name: a.account_name,
        accountType: a.account_type,
        account_type: a.account_type,
        parentAccountId: a.parent_account_id ? String(a.parent_account_id) : null,
        parent_account_id: a.parent_account_id ? String(a.parent_account_id) : null,
        active: a.active !== false,
        isParent: code.length <= 2,
        is_parent: code.length <= 2,
        balance: 0,
      };
    });

    return {
      success: true,
      data: serialized,
    };
  }

  // 2. إنشاء حساب فرعي جديد مباشرة في قاعدة بيانات Neon (POST /accounting/chart-of-accounts)
  async createAccount(dto: CreateAccountDto) {
    if (!dto.accountCode || !dto.accountName || !dto.accountType) {
      throw new BadRequestException('كود الحساب واسمه ونوعه حقول مطلوبة');
    }

    const tenant = getCurrentTenant();
    const companyId = tenant?.companyId || 1n;

    const newAcc = await this.prisma.accounts.create({
      data: {
        company_id: companyId,
        account_code: dto.accountCode.trim(),
        account_name: dto.accountName.trim(),
        account_type: dto.accountType,
        parent_account_id: dto.parentAccountId ? BigInt(dto.parentAccountId) : null,
        active: true,
        created_at: new Date(),
      },
    });

    const item = {
      id: String(newAcc.id),
      accountCode: dto.accountCode.trim(),
      accountName: dto.accountName.trim(),
      accountType: dto.accountType,
      parentAccountId: dto.parentAccountId ? String(dto.parentAccountId) : null,
      active: true,
      isParent: dto.accountCode.length <= 2,
      balance: 0,
    };

    this.realtime.emitTenantUpdate(companyId, 'account_created', item);

    return {
      success: true,
      message: `تم إضافة الحساب المحاسبي [${dto.accountCode}] ${dto.accountName} بنجاح إلى قاعدة البيانات`,
      data: item,
    };
  }

  // 3. استعراض قيود اليومية الحقيقية من قاعدة البيانات (GET /accounting/journal-entries)
  async getJournalEntries() {
    const dbEntries = await this.prisma.journal_entries.findMany({
      include: {
        journal_entry_lines: {
          include: {
            accounts: true,
          },
        },
      },
      orderBy: { id: 'desc' },
      take: 100,
    });

    const serialized = dbEntries.map((e: any) => {
      let totalDebit = 0;
      let totalCredit = 0;
      const lines = e.journal_entry_lines.map((l: any) => {
        const deb = Number(l.debit || 0);
        const cred = Number(l.credit || 0);
        totalDebit += deb;
        totalCredit += cred;
        return {
          id: String(l.id),
          accountId: String(l.account_id),
          accountCode: l.accounts?.account_code || '',
          accountName: l.accounts?.account_name || 'حساب محاسبي',
          debit: deb,
          credit: cred,
          description: l.notes || l.description || '',
        };
      });

      return {
        id: String(e.id),
        entryNumber: e.entry_number,
        entryDate: e.entry_date ? new Date(e.entry_date).toISOString().slice(0, 10) : '',
        description: e.notes || 'قيد يومية',
        referenceType: e.reference_type,
        referenceNumber: e.reference_number,
        status: e.status,
        totalDebit,
        totalCredit,
        lines,
      };
    });

    return {
      success: true,
      data: serialized,
    };
  }

  // 4. تسجيل قيد يومية مزدوج حقيقي في Neon DB (POST /accounting/journal-entries)
  async createJournalEntry(dto: CreateJournalEntryDto) {
    if (!dto.description || !dto.lines || dto.lines.length < 2) {
      throw new BadRequestException('يجب أن يحتوي القيد على سطرين على الأقل (طرف مدين وطرف دائن)');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of dto.lines) {
      const d = Number(line.debit || 0);
      const c = Number(line.credit || 0);
      if (d < 0 || c < 0) {
        throw new BadRequestException('لا يجوز إدخال مبالغ سالبة في طرفي القيد');
      }
      totalDebit += d;
      totalCredit += c;
    }

    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.01) {
      throw new BadRequestException(
        `القيد غير متوازن محاسبياً! إجمالي المدين (${totalDebit} ج.م) لا يتساوى مع إجمالي الدائن (${totalCredit} ج.م) بفارق ${diff} ج.م`,
      );
    }

    const tenant = getCurrentTenant();
    const companyId = tenant?.companyId || 1n;
    const entryNum = `JV-${Date.now().toString().slice(-6)}`;

    const createdEntry = await this.prisma.journal_entries.create({
      data: {
        company_id: companyId,
        entry_number: entryNum,
        reference_type: dto.referenceType || 'MANUAL_VOUCHER',
        reference_number: dto.referenceNumber || entryNum,
        entry_date: dto.date ? new Date(dto.date) : new Date(),
        status: 'POSTED',
        notes: dto.description.trim(),
        created_at: new Date(),
        journal_entry_lines: {
          create: dto.lines.map((line) => ({
            account_id: BigInt(line.accountId),
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            description: line.description || dto.description,
            notes: line.description || dto.description,
            created_at: new Date(),
          })),
        },
      },
      include: {
        journal_entry_lines: {
          include: { accounts: true },
        },
      },
    });

    this.realtime.emitTenantUpdate(companyId, 'journal_entry_created', {
      id: String(createdEntry.id),
      entryNumber: entryNum,
      totalAmount: totalDebit,
    });

    return {
      success: true,
      message: `تم ترحيل القيد اليومي رقم [${entryNum}] بنجاح وحفظه في السجلات الرسمية`,
      data: {
        id: String(createdEntry.id),
        entryNumber: entryNum,
        totalDebit,
        totalCredit,
      },
    };
  }

  // 5. استخراج ميزان المراجعة الحي من قاعدة بيانات Neon (GET /accounting/trial-balance)
  async getTrialBalance() {
    const accounts = await this.prisma.accounts.findMany({
      include: {
        journal_entry_lines: true,
      },
      orderBy: { account_code: 'asc' },
    });

    const rows = accounts.map((a: any) => {
      let debitMovement = 0;
      let creditMovement = 0;

      if (a.journal_entry_lines && Array.isArray(a.journal_entry_lines)) {
        for (const line of a.journal_entry_lines) {
          debitMovement += Number(line.debit || 0);
          creditMovement += Number(line.credit || 0);
        }
      }

      const isDebitNature = a.account_type === 'Assets' || a.account_type === 'Expenses';
      let endingDebit = 0;
      let endingCredit = 0;

      if (isDebitNature) {
        endingDebit = Math.max(0, debitMovement - creditMovement);
      } else {
        endingCredit = Math.max(0, creditMovement - debitMovement);
      }

      return {
        accountCode: a.account_code,
        accountName: a.account_name,
        accountType: a.account_type,
        openingDebit: 0,
        openingCredit: 0,
        debitMovement,
        creditMovement,
        endingDebit,
        endingCredit,
      };
    });

    const sumOpeningDebit = rows.reduce((acc, r) => acc + r.openingDebit, 0);
    const sumOpeningCredit = rows.reduce((acc, r) => acc + r.openingCredit, 0);
    const sumDebitMovement = rows.reduce((acc, r) => acc + r.debitMovement, 0);
    const sumCreditMovement = rows.reduce((acc, r) => acc + r.creditMovement, 0);
    const sumEndingDebit = rows.reduce((acc, r) => acc + r.endingDebit, 0);
    const sumEndingCredit = rows.reduce((acc, r) => acc + r.endingCredit, 0);

    return {
      success: true,
      data: {
        rows,
        totals: {
          sumOpeningDebit,
          sumOpeningCredit,
          sumDebitMovement,
          sumCreditMovement,
          sumEndingDebit,
          sumEndingCredit,
          isBalanced: Math.abs(sumEndingDebit - sumEndingCredit) < 1,
        },
      },
    };
  }

  // 6. توليد قائمة الدخل الحقيقية المحسوبة من المبيعات والمصروفات المسجلة فعلياً
  async getIncomeStatement() {
    // 1. الإيرادات الفعلية من أوامر البيع المعتمدة في Neon DB
    const salesAgg = await this.prisma.sales_orders.aggregate({
      _sum: { total_amount: true },
      where: {
        status: { in: ['PAID', 'DELIVERED', 'COMPLETED'] },
      },
    });

    const totalRevenues = Number(salesAgg._sum.total_amount || 0);
    const showroomSales = totalRevenues;
    const wholesaleSales = 0;

    // 2. تكلفة الخامات والمصروفات الفعلية المسجلة في قيود اليومية
    const expenseLines = await this.prisma.journal_entry_lines.findMany({
      include: { accounts: true },
      where: {
        accounts: { account_type: 'Expenses' },
      },
    });

    let totalCogs = 0;
    let totalOperatingExpenses = 0;

    for (const line of expenseLines) {
      const amount = Number(line.debit || 0) - Number(line.credit || 0);
      const code = line.accounts?.account_code || '';
      if (code.startsWith('51')) {
        totalCogs += amount;
      } else {
        totalOperatingExpenses += amount;
      }
    }

    const grossProfit = totalRevenues - totalCogs;
    const grossMarginPercent = totalRevenues > 0 ? Math.round((grossProfit / totalRevenues) * 100) : 0;
    const netOperatingProfit = grossProfit - totalOperatingExpenses;
    const netMarginPercent = totalRevenues > 0 ? Math.round((netOperatingProfit / totalRevenues) * 100) : 0;

    return {
      success: true,
      period: 'الفترة المالية الحالية (بيانات حقيقية من Neon DB)',
      currency: 'EGP',
      data: {
        revenues: {
          showroomSales,
          wholesaleSales,
          totalRevenues,
        },
        costOfGoodsSold: {
          rawMaterialsUsed: totalCogs,
          directLabor: 0,
          productionUtilities: 0,
          totalCogs,
        },
        grossProfit,
        grossMarginPercent,
        operatingExpenses: {
          transportFleetExpenses: 0,
          administrativeGeneralExpenses: totalOperatingExpenses,
          totalOperatingExpenses,
        },
        netOperatingProfit,
        netMarginPercent,
      },
    };
  }
}
