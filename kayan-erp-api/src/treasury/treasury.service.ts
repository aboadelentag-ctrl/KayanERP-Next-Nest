import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { getCurrentTenant } from '../common/tenant.context.js';

export class CreateTreasuryVoucherDto {
  voucherType: 'RECEIPT' | 'PAYMENT';
  amount: number;
  treasuryName?: string;
  partyName: string;
  branchName?: string;
  branchId?: string | number;
  paymentMethod?: string;
  notes?: string;
  accountCode?: string;
  accountName?: string;
  referenceInvoice?: string;
}

@Injectable()
export class TreasuryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. جلب كافة سندات القبض والصرف الرسمية مباشرة من Neon DB
  async findAll(voucherType?: string, branchId?: string) {
    const tenant = getCurrentTenant();
    const where: any = {
      reference_type: { in: ['RECEIPT_VOUCHER', 'PAYMENT_VOUCHER', 'RECEIPT', 'PAYMENT'] },
    };

    if (voucherType) {
      const normalized = voucherType.toUpperCase();
      if (normalized === 'RECEIPT') {
        where.reference_type = { in: ['RECEIPT_VOUCHER', 'RECEIPT'] };
      } else if (normalized === 'PAYMENT') {
        where.reference_type = { in: ['PAYMENT_VOUCHER', 'PAYMENT'] };
      }
    }

    const entries = await this.prisma.journal_entries.findMany({
      where,
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

    const serialized = entries.map((e) => {
      const isPayment = e.reference_type?.includes('PAYMENT');
      const lines = e.journal_entry_lines || [];
      const amount = lines.reduce((max, l) => Math.max(max, Number(l.debit || 0), Number(l.credit || 0)), 0);

      const mainLine = lines.find((l) => (isPayment ? Number(l.credit || 0) > 0 : Number(l.debit || 0) > 0)) || lines[0];
      const offsetLine = lines.find((l) => l !== mainLine) || lines[1] || mainLine;

      return {
        id: String(e.id),
        voucherNumber: e.entry_number,
        voucherType: isPayment ? 'PAYMENT' : 'RECEIPT',
        voucherDate: e.entry_date ? new Date(e.entry_date).toISOString() : new Date().toISOString(),
        amount,
        treasuryName: mainLine?.accounts?.account_name || 'الخزينة المركزية - مصنع أبو عادل',
        partyName: e.notes?.split(' - ')[0] || offsetLine?.accounts?.account_name || 'طرف عام',
        branchName: 'المصنع المركزي (سندوب)',
        branchId: '1',
        paymentMethod: 'CASH',
        notes: e.notes || 'سند معتمد آلياً وفق الحسابات العامة',
        status: e.status || 'POSTED',
        accountCode: offsetLine?.accounts?.account_code || (isPayment ? '210101' : '110101'),
        accountName: offsetLine?.accounts?.account_name || (isPayment ? 'الموردين والجهات الدائنة' : 'الصندوق والخزينة المركزية'),
      };
    });

    return {
      success: true,
      data: serialized,
    };
  }

  // 2. إحصائيات السيولة النقدية وسندات الخزينة المعتمدة من Neon DB
  async getStats() {
    const entries = await this.prisma.journal_entries.findMany({
      where: {
        reference_type: { in: ['RECEIPT_VOUCHER', 'PAYMENT_VOUCHER', 'RECEIPT', 'PAYMENT'] },
      },
      include: {
        journal_entry_lines: true,
      },
    });

    let totalReceipts = 0;
    let totalPayments = 0;
    let receiptsCount = 0;
    let paymentsCount = 0;

    entries.forEach((e) => {
      const isPayment = e.reference_type?.includes('PAYMENT');
      const amt = (e.journal_entry_lines || []).reduce(
        (max, l) => Math.max(max, Number(l.debit || 0), Number(l.credit || 0)),
        0,
      );

      if (isPayment) {
        totalPayments += amt;
        paymentsCount += 1;
      } else {
        totalReceipts += amt;
        receiptsCount += 1;
      }
    });

    const netLiquidity = totalReceipts - totalPayments;

    return {
      success: true,
      data: {
        totalReceipts,
        totalPayments,
        netLiquidity,
        voucherCount: entries.length,
        receiptsCount,
        paymentsCount,
      },
    };
  }

  // 3. إصدار سند قبض أو صرف جديد وحفظه مباشرة في Neon DB كقيد يومية معتمد
  async create(dto: CreateTreasuryVoucherDto) {
    if (!dto.voucherType || !dto.amount || !dto.partyName) {
      throw new BadRequestException('النوع والمبلغ والطرف المعني بيانات إلزامية لإصدار السند');
    }

    const tenant = getCurrentTenant();
    const companyId = tenant?.companyId || 1n;

    const prefix = dto.voucherType === 'RECEIPT' ? 'RV' : 'PV';
    const timestamp = Date.now().toString().slice(-6);
    const voucherNumber = `${prefix}-${new Date().getFullYear()}-${timestamp}`;

    // البحث عن حساب الخزينة والحساب المقابل في شجرة الحسابات
    let treasuryAccount = await this.prisma.accounts.findFirst({
      where: {
        OR: [
          { account_code: { startsWith: '11' } },
          { account_name: { contains: 'خزينة' } },
          { account_name: { contains: 'صندوق' } },
        ],
      },
    });

    if (!treasuryAccount) {
      treasuryAccount = await this.prisma.accounts.findFirst();
    }

    let offsetAccount = await this.prisma.accounts.findFirst({
      where: {
        account_code: dto.accountCode || (dto.voucherType === 'RECEIPT' ? '4101' : '5101'),
      },
    });

    if (!offsetAccount) {
      offsetAccount = treasuryAccount;
    }

    const amountNum = Number(dto.amount);
    const isPayment = dto.voucherType === 'PAYMENT';

    const journalEntry = await this.prisma.journal_entries.create({
      data: {
        company_id: companyId,
        entry_number: voucherNumber,
        reference_type: isPayment ? 'PAYMENT_VOUCHER' : 'RECEIPT_VOUCHER',
        reference_number: voucherNumber,
        entry_date: new Date(),
        status: 'POSTED',
        notes: `${dto.partyName.trim()} - ${dto.notes || 'سند خزينة'}`,
        created_at: new Date(),
        journal_entry_lines: {
          create: [
            {
              account_id: treasuryAccount!.id,
              debit: isPayment ? 0 : amountNum,
              credit: isPayment ? amountNum : 0,
              description: `سند ${isPayment ? 'صرف' : 'قبض'} رقم ${voucherNumber} - ${dto.partyName}`,
              notes: dto.notes || '',
              created_at: new Date(),
            },
            {
              account_id: offsetAccount!.id,
              debit: isPayment ? amountNum : 0,
              credit: isPayment ? 0 : amountNum,
              description: `الطرف المقابل: ${dto.partyName}`,
              notes: dto.notes || '',
              created_at: new Date(),
            },
          ],
        },
      },
      include: {
        journal_entry_lines: {
          include: { accounts: true },
        },
      },
    });

    const createdVoucher = {
      id: String(journalEntry.id),
      voucherNumber,
      voucherType: dto.voucherType,
      voucherDate: journalEntry.entry_date.toISOString(),
      amount: amountNum,
      treasuryName: treasuryAccount?.account_name || 'الخزينة المركزية',
      partyName: dto.partyName.trim(),
      branchName: dto.branchName || 'المصنع المركزي (سندوب)',
      branchId: String(dto.branchId || '1'),
      paymentMethod: dto.paymentMethod || 'CASH',
      notes: dto.notes || '',
      status: 'POSTED',
      accountCode: offsetAccount?.account_code || '',
      accountName: offsetAccount?.account_name || '',
    };

    // البث المباشر عبر WebSocket
    try {
      this.realtime.emitTenantUpdate(companyId, 'treasury_voucher_created', createdVoucher);
      this.realtime.server?.emit('treasury_voucher_created', createdVoucher);
    } catch (e) {
      console.warn('Realtime emit failed:', e);
    }

    return {
      success: true,
      data: createdVoucher,
      message: `تم إصدار ${dto.voucherType === 'RECEIPT' ? 'سند القبض' : 'سند الصرف'} رقم [${voucherNumber}] بنجاح وحفظه في Neon DB`,
    };
  }
}
