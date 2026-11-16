import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { HrService } from '../hr/hr.service.js';

export interface GeneratePayrollDto {
  month: number;
  year: number;
  approvedBy?: string;
  notes?: string;
}

export interface EmployeePayrollSlip {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  jobTitle: string;
  basicSalary: number;
  allowances: number;
  overtimeHours: number;
  overtimeAmount: number;
  grossSalary: number;
  socialInsurance: number;
  advancesDeduction: number;
  penaltiesDeduction: number;
  totalDeductions: number;
  netSalary: number;
  status: 'CALCULATED' | 'APPROVED' | 'PAID';
}

@Injectable()
export class PayrollService {
  private payrollBatches: any[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
    private readonly hrService: HrService,
  ) {}

  // 1. محرك احتساب المرتبات الشهري (GET /payroll/calculate)
  async calculatePayroll(month?: number, year?: number) {
    const currentMonth = month ? Number(month) : new Date().getMonth() + 1;
    const currentYear = year ? Number(year) : new Date().getFullYear();
    const periodKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    // جلب الموظفين النشطين من موديول الموارد البشرية
    const empRes = await this.hrService.getEmployees({ active: true });
    const employees = empRes.data || [];

    // جلب السلف المعتمدة لهذا الشهر
    const advRes = await this.hrService.getAdvances();
    const advances = advRes.data || [];

    // جلب سجلات البصمة لاحتساب التأخيرات وساعات الإضافي
    const attRes = await this.hrService.getAttendanceLogs();
    const attendanceLogs = attRes.data || [];

    const slips: EmployeePayrollSlip[] = employees.map((emp: any) => {
      const basic = Number(emp.basicSalary || 6500);
      const allowances = Number(emp.allowances || 800);
      const hourlyRate = Number(emp.hourlyRate || 35);

      // استخراج ساعات الإضافي من سجلات البصمة
      const empLogs = attendanceLogs.filter((l: any) => l.employeeId === String(emp.id) || l.employeeCode === emp.employeeCode);
      const overtimeHours = empLogs.reduce((acc: number, l: any) => acc + (Number(l.overtimeHours) || 0), 0) + 4; // 4 ساعات إضافي قياسية للشهر
      const overtimeAmount = Math.round(overtimeHours * hourlyRate * 1.5);

      // احتساب التأخيرات والجزاءات
      const delayMinutes = empLogs.reduce((acc: number, l: any) => acc + (Number(l.delayMinutes) || 0), 0);
      const penaltiesDeduction = delayMinutes > 15 ? Math.round((delayMinutes / 60) * hourlyRate) : 0;

      // سلف العامل المعتمدة للاستقطاع في هذا الشهر
      const empAdvances = advances.filter(
        (a: any) =>
          (a.employeeId === String(emp.id) || a.employeeCode === emp.employeeCode) &&
          a.status === 'APPROVED' &&
          (!a.deductMonth || a.deductMonth === periodKey)
      );
      const advancesDeduction = empAdvances.reduce((acc: number, a: any) => acc + Number(a.amount || 0), 0);

      // التأمينات الاجتماعية (11% حصة العامل من الأساسي)
      const socialInsurance = Math.round(basic * 0.11);

      // إجمالي المستحقات
      const grossSalary = basic + allowances + overtimeAmount;

      // إجمالي الاستقطاعات
      const totalDeductions = socialInsurance + advancesDeduction + penaltiesDeduction;

      // صافي الراتب المستحق
      const netSalary = Math.max(0, grossSalary - totalDeductions);

      return {
        employeeId: String(emp.id),
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        departmentName: emp.departmentName,
        jobTitle: emp.jobTitle,
        basicSalary: basic,
        allowances,
        overtimeHours,
        overtimeAmount,
        grossSalary,
        socialInsurance,
        advancesDeduction,
        penaltiesDeduction,
        totalDeductions,
        netSalary,
        status: 'CALCULATED',
      };
    });

    // ملخص مسير الرواتب الإجمالي
    const totalBasic = slips.reduce((acc, s) => acc + s.basicSalary, 0);
    const totalAllowances = slips.reduce((acc, s) => acc + s.allowances, 0);
    const totalOvertime = slips.reduce((acc, s) => acc + s.overtimeAmount, 0);
    const totalGross = slips.reduce((acc, s) => acc + s.grossSalary, 0);
    const totalInsurance = slips.reduce((acc, s) => acc + s.socialInsurance, 0);
    const totalAdvances = slips.reduce((acc, s) => acc + s.advancesDeduction, 0);
    const totalPenalties = slips.reduce((acc, s) => acc + s.penaltiesDeduction, 0);
    const totalDeductions = slips.reduce((acc, s) => acc + s.totalDeductions, 0);
    const totalNet = slips.reduce((acc, s) => acc + s.netSalary, 0);

    return {
      success: true,
      period: {
        month: currentMonth,
        year: currentYear,
        periodName: `مسير رواتب ${currentMonth} / ${currentYear}`,
        periodKey,
      },
      summary: {
        totalEmployees: slips.length,
        totalBasic,
        totalAllowances,
        totalOvertime,
        totalGross,
        totalInsurance,
        totalAdvances,
        totalPenalties,
        totalDeductions,
        totalNet,
      },
      slips,
    };
  }

  // 2. إصدار كشف المرتبات الرسمي واعتماده مالياً (POST /payroll/generate)
  async generatePayroll(dto: GeneratePayrollDto) {
    const calcResult = await this.calculatePayroll(dto.month, dto.year);
    const batchNumber = `PAYROLL-${dto.year}-${String(dto.month).padStart(2, '0')}`;

    // التحقق إن كان قد تم اعتماده مسبقاً
    const existingIndex = this.payrollBatches.findIndex((b) => b.batchNumber === batchNumber);

    const finalizedBatch = {
      batchNumber,
      month: dto.month,
      year: dto.year,
      periodName: calcResult.period.periodName,
      ...calcResult.summary,
      status: 'APPROVED',
      approvedBy: dto.approvedBy || 'المدير المالي المعتمد',
      approvedAt: new Date().toISOString(),
      notes: dto.notes || 'تم اعتماد مسير المرتبات وتوجيهه للصرف البنكي والنقدي',
      slips: calcResult.slips.map((s) => ({ ...s, status: 'APPROVED' })),
    };

    if (existingIndex >= 0) {
      this.payrollBatches[existingIndex] = finalizedBatch;
    } else {
      this.payrollBatches.unshift(finalizedBatch);
    }

    // بث إشعار لحظي عبر Socket.IO
    this.realtime.server?.emit('payroll_generated', {
      batchNumber,
      periodName: finalizedBatch.periodName,
      totalNet: finalizedBatch.totalNet,
      totalEmployees: finalizedBatch.totalEmployees,
      approvedAt: finalizedBatch.approvedAt,
    });

    return {
      success: true,
      message: `تم اعتماد وإصدار مسير الرواتب الرسمي رقم ${batchNumber} بنجاح`,
      data: finalizedBatch,
    };
  }

  // 3. جلب فترات ومسيرات الرواتب السابقة (GET /payroll/periods)
  async getPayrollPeriods() {
    return {
      success: true,
      data: this.payrollBatches,
    };
  }
}
