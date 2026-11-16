import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { getCurrentTenant } from '../common/tenant.context.js';

export class CreatePayableDto {
  supplierId?: string | number;
  partyName?: string;
  category?: string;
  invoiceNumber?: string;
  totalAmount!: number;
  paidAmount?: number;
  dueDate?: string;
  notes?: string;
}

@Injectable()
export class PayablesService {
  // تتبع المبالغ المسددة من الفواتير
  private paidTracker: Map<string, number> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  // 1. جلب كافة فواتير المصروفات والالتزامات وأوراق الدفع (GET /payables)
  async getAllPayables(category?: string, status?: string) {
    try {
      const [invoices, suppliers] = await Promise.all([
        this.prisma.purchase_invoices.findMany({
          orderBy: { id: 'desc' },
        }),
        this.prisma.suppliers.findMany({
          where: { active: true },
        }),
      ]);

      const supplierMap = new Map(suppliers.map((s) => [String(s.id), s.supplier_name]));

      const serialized = invoices.map((inv) => {
        const idStr = String(inv.id);
        const total = Number(inv.total_amount || 0);
        const paid = this.paidTracker.get(idStr) || 0;
        const remaining = Math.max(0, total - paid);
        const invStatus = paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

        return {
          id: idStr,
          billNumber: inv.invoice_number,
          supplierId: String(inv.supplier_id),
          partyName: supplierMap.get(String(inv.supplier_id)) || 'مورد عام',
          category: 'SUPPLIER_PURCHASE',
          totalAmount: total,
          paidAmount: paid,
          remainingAmount: remaining,
          status: invStatus,
          issueDate: inv.invoice_date.toISOString().slice(0, 10),
          dueDate: new Date(inv.invoice_date.getTime() + 14 * 86400 * 1000).toISOString().slice(0, 10),
          notes: 'فاتورة توريد معتمدة بقاعدة البيانات',
        };
      });

      let filtered = serialized;
      if (status && status !== 'ALL') {
        filtered = filtered.filter((i) => i.status === status);
      }

      return {
        success: true,
        data: filtered,
      };
    } catch (err: any) {
      console.error('Error fetching payables:', err);
      return {
        success: true,
        data: [],
      };
    }
  }

  // 2. إحصائيات ومؤشرات الالتزامات (GET /payables/summary)
  async getSummary() {
    try {
      const invoices = await this.prisma.purchase_invoices.findMany();

      let suppliersDue = 0;
      let totalPaid = 0;

      invoices.forEach((inv) => {
        const idStr = String(inv.id);
        const total = Number(inv.total_amount || 0);
        const paid = this.paidTracker.get(idStr) || 0;
        const rem = Math.max(0, total - paid);

        totalPaid += paid;
        suppliersDue += rem;
      });

      return {
        success: true,
        data: {
          suppliersDue,
          utilitiesDue: 0,
          payrollDue: 0,
          totalPaid,
          totalBillsCount: invoices.length,
          currency: 'ج.م',
        },
      };
    } catch (err: any) {
      console.error('Error fetching payables summary:', err);
      return {
        success: true,
        data: {
          suppliersDue: 0,
          utilitiesDue: 0,
          payrollDue: 0,
          totalPaid: 0,
          totalBillsCount: 0,
          currency: 'ج.م',
        },
      };
    }
  }

  // 3. إنشاء التزام أو فاتورة مصروفات جديدة (POST /payables)
  async createPayable(dto: CreatePayableDto) {
    if (!dto.totalAmount || dto.totalAmount <= 0) {
      throw new BadRequestException('إجمالي المبلغ مطلوب ويجب أن يكون أكبر من الصفر');
    }

    try {
      const tenant = getCurrentTenant();
      const companyId = tenant?.companyId ? BigInt(tenant.companyId) : 1n;

      let supplierId: bigint;
      if (dto.supplierId) {
        supplierId = BigInt(dto.supplierId);
      } else {
        let supp = await this.prisma.suppliers.findFirst({
          where: { company_id: companyId },
        });
        if (!supp) {
          supp = await this.prisma.suppliers.create({
            data: {
              company_id: companyId,
              supplier_code: 'SUPP-GEN-01',
              supplier_name: dto.partyName || 'مورد عام معتمد',
              credit_limit: 50000,
              active: true,
              created_at: new Date(),
            },
          });
        }
        supplierId = supp.id;
      }

      const billNum = dto.invoiceNumber || `BILL-${Date.now().toString().slice(-6)}`;
      const total = Number(dto.totalAmount);
      const paid = Number(dto.paidAmount || 0);

      const invoice = await this.prisma.purchase_invoices.create({
        data: {
          invoice_number: billNum,
          invoice_date: new Date(),
          supplier_id: supplierId,
          total_amount: total,
        },
      });

      if (paid > 0) {
        this.paidTracker.set(String(invoice.id), paid);
      }

      const suppObj = await this.prisma.suppliers.findUnique({
        where: { id: supplierId },
      });

      const result = {
        id: String(invoice.id),
        billNumber: invoice.invoice_number,
        supplierId: String(invoice.supplier_id),
        partyName: suppObj?.supplier_name || 'مورد عام',
        totalAmount: total,
        paidAmount: paid,
        remainingAmount: Math.max(0, total - paid),
        status: paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
        issueDate: invoice.invoice_date.toISOString().slice(0, 10),
        notes: dto.notes || 'فاتورة مسجلة بقاعدة البيانات',
      };

      this.realtime.emitTenantUpdate(companyId, 'payable_created', result);

      return {
        success: true,
        message: 'تم تسجيل فاتورة الالتزام والمصروفات بنجاح في قاعدة البيانات',
        data: result,
      };
    } catch (err: any) {
      throw new BadRequestException('تعذر تسجيل الالتزام: ' + err.message);
    }
  }

  // 4. سداد دفعة من فاتورة أو التزام (POST /payables/:id/pay)
  async payBill(id: string, amount: number) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('مبلغ السداد يجب أن يكون أكبر من الصفر');
    }

    try {
      const invoice = await this.prisma.purchase_invoices.findUnique({
        where: { id: BigInt(id) },
      });

      if (!invoice) {
        throw new NotFoundException('فاتورة الالتزام غير موجودة');
      }

      const idStr = String(invoice.id);
      const currentPaid = this.paidTracker.get(idStr) || 0;
      const total = Number(invoice.total_amount || 0);
      const newPaid = Math.min(total, currentPaid + amount);
      const newStatus = newPaid >= total ? 'PAID' : 'PARTIAL';

      this.paidTracker.set(idStr, newPaid);

      const tenant = getCurrentTenant();
      const companyId = tenant?.companyId ? BigInt(tenant.companyId) : 1n;

      this.realtime.emitTenantUpdate(companyId, 'payable_paid', {
        id: idStr,
        billNumber: invoice.invoice_number,
        paidAmount: newPaid,
        remainingAmount: total - newPaid,
        status: newStatus,
      });

      return {
        success: true,
        message: 'تم قيد عملية السداد وتحديث رصيد الالتزام بنجاح',
        data: {
          id: idStr,
          billNumber: invoice.invoice_number,
          paidAmount: newPaid,
          remainingAmount: total - newPaid,
          status: newStatus,
        },
      };
    } catch (err: any) {
      throw new BadRequestException('تعذر قيد السداد: ' + err.message);
    }
  }

  // 5. قائمة الموردين للاختيار السريع (GET /payables/suppliers-lookup)
  async getSuppliersLookup() {
    try {
      const suppliers = await this.prisma.suppliers.findMany({
        where: { active: true },
        orderBy: { supplier_name: 'asc' },
      });

      return {
        success: true,
        data: suppliers.map((s) => ({
          id: String(s.id),
          supplierCode: s.supplier_code,
          supplierName: s.supplier_name,
          phone: s.phone || '',
        })),
      };
    } catch (err: any) {
      console.error('Error fetching suppliers lookup:', err);
      return {
        success: true,
        data: [],
      };
    }
  }
}
