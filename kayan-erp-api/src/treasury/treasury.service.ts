import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';

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
  private vouchers: any[] = [
    {
      id: '1',
      voucherNumber: 'RV-2026-00101',
      voucherType: 'RECEIPT',
      voucherDate: new Date(Date.now() - 3600000 * 2).toISOString(),
      amount: 45000,
      treasuryName: 'خزينة المبيعات - المصنع المركزي',
      partyName: 'معرض حلواني الصباح - المعادي',
      branchName: 'المصنع المركزي (سندوب)',
      branchId: '1',
      paymentMethod: 'CASH',
      notes: 'تحصيل دفعة توريدات تورت وحلويات شرقية عن شهر أكتوبر',
      status: 'POSTED',
      accountCode: '110101',
      accountName: 'الصندوق والخزينة المركزية',
    },
    {
      id: '2',
      voucherNumber: 'PV-2026-00085',
      voucherType: 'PAYMENT',
      voucherDate: new Date(Date.now() - 3600000 * 5).toISOString(),
      amount: 18500,
      treasuryName: 'الخزينة الرئيسية - الإدارة المالية',
      partyName: 'شركة الدلتا لتجارة وتكرير السكر',
      branchName: 'المصنع المركزي (سندوب)',
      branchId: '1',
      paymentMethod: 'BANK_TRANSFER',
      notes: 'سداد دفعة نقدية عاجلة لفاتورة سكر أبيض مكرر توريد اليوم',
      status: 'POSTED',
      accountCode: '210101',
      accountName: 'موردو الخامات والسلع',
    },
    {
      id: '3',
      voucherNumber: 'RV-2026-00102',
      voucherType: 'RECEIPT',
      voucherDate: new Date(Date.now() - 3600000 * 8).toISOString(),
      amount: 32000,
      treasuryName: 'خزينة معرض المنصورة الرئيسي',
      partyName: 'عملاء المعرض - إيراد الوردية الأولى',
      branchName: 'معرض المنصورة الرئيسي',
      branchId: '4',
      paymentMethod: 'POS_VISA',
      notes: 'توريد إيراد مبيعات التجزئة الصباحية لنقاط البيع',
      status: 'POSTED',
      accountCode: '110102',
      accountName: 'خزينة معرض المنصورة',
    },
    {
      id: '4',
      voucherNumber: 'PV-2026-00086',
      voucherType: 'PAYMENT',
      voucherDate: new Date(Date.now() - 3600000 * 12).toISOString(),
      amount: 4200,
      treasuryName: 'خزينة العهد والمصروفات النثرية',
      partyName: 'إدارة الحركة والنقل - سولار سيارات التوزيع',
      branchName: 'أسطول التوزيع المركزي',
      branchId: '1',
      paymentMethod: 'CASH',
      notes: 'تموين 4 سيارات توزيع مبرد بالسولار لتوزيع خط المحلة والمنصورة',
      status: 'POSTED',
      accountCode: '510204',
      accountName: 'مصاريف وقود ومحروقات التوزيع',
    },
    {
      id: '5',
      voucherNumber: 'RV-2026-00103',
      voucherType: 'RECEIPT',
      voucherDate: new Date(Date.now() - 3600000 * 20).toISOString(),
      amount: 68000,
      treasuryName: 'خزينة المبيعات - المصنع المركزي',
      partyName: 'سوبر ماركت الفرجاني - فرع الجامعة',
      branchName: 'المصنع المركزي (سندوب)',
      branchId: '1',
      paymentMethod: 'CHEQUE',
      notes: 'سداد شيك مستحق عن توريدات مخبوزات وتورت الأسبوع الماضي',
      status: 'POSTED',
      accountCode: '110201',
      accountName: 'أوراق القبض والشيكات',
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async findAll(voucherType?: string, branchId?: string) {
    let list = [...this.vouchers];
    if (voucherType) {
      list = list.filter((v) => v.voucherType === voucherType.toUpperCase());
    }
    if (branchId) {
      list = list.filter((v) => v.branchId === String(branchId));
    }
    return {
      success: true,
      data: list.sort((a, b) => new Date(b.voucherDate).getTime() - new Date(a.voucherDate).getTime()),
    };
  }

  async getStats() {
    let totalReceipts = 0;
    let totalPayments = 0;

    this.vouchers.forEach((v) => {
      const amt = Number(v.amount) || 0;
      if (v.voucherType === 'RECEIPT') totalReceipts += amt;
      if (v.voucherType === 'PAYMENT') totalPayments += amt;
    });

    const netLiquidity = totalReceipts - totalPayments;

    return {
      success: true,
      data: {
        totalReceipts,
        totalPayments,
        netLiquidity,
        voucherCount: this.vouchers.length,
        receiptsCount: this.vouchers.filter((v) => v.voucherType === 'RECEIPT').length,
        paymentsCount: this.vouchers.filter((v) => v.voucherType === 'PAYMENT').length,
      },
    };
  }

  async create(dto: CreateTreasuryVoucherDto) {
    if (!dto.voucherType || !dto.amount || !dto.partyName) {
      throw new BadRequestException('النوع والمبلغ والطرف المعني بيانات إلزامية لإصدار السند');
    }

    const prefix = dto.voucherType === 'RECEIPT' ? 'RV' : 'PV';
    const count = this.vouchers.filter((v) => v.voucherType === dto.voucherType).length + 1;
    const voucherNumber = `${prefix}-${new Date().getFullYear()}-${String(count + 100).padStart(5, '0')}`;

    const newVoucher = {
      id: String(this.vouchers.length + 1),
      voucherNumber,
      voucherType: dto.voucherType,
      voucherDate: new Date().toISOString(),
      amount: Number(dto.amount),
      treasuryName: dto.treasuryName || 'الخزينة المركزية - مصنع أبو عادل',
      partyName: dto.partyName.trim(),
      branchName: dto.branchName || 'المصنع المركزي (سندوب)',
      branchId: String(dto.branchId || '1'),
      paymentMethod: dto.paymentMethod || 'CASH',
      notes: dto.notes || 'سند معتمد آلياً وفق الحسابات العامة',
      status: 'POSTED',
      accountCode: dto.accountCode || (dto.voucherType === 'RECEIPT' ? '110101' : '210101'),
      accountName: dto.accountName || (dto.voucherType === 'RECEIPT' ? 'الصندوق والخزينة المركزية' : 'الموردين والجهات الدائنة'),
    };

    this.vouchers.unshift(newVoucher);

    // البث المباشر عبر WebSocket
    try {
      this.realtime.server?.emit('treasury_voucher_created', {
        voucherNumber: newVoucher.voucherNumber,
        voucherType: newVoucher.voucherType,
        amount: newVoucher.amount,
        partyName: newVoucher.partyName,
        time: newVoucher.voucherDate,
      });
    } catch (e) {
      console.warn('Realtime emit failed:', e);
    }

    return {
      success: true,
      data: newVoucher,
      message: `تم إصدار ${dto.voucherType === 'RECEIPT' ? 'سند القبض' : 'سند الصرف'} رقم [${voucherNumber}] بنجاح`,
    };
  }
}
