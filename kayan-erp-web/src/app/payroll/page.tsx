'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  Sun,
  Moon,
  Printer,
  Calendar,
  Lock,
  RefreshCw,
  FileSpreadsheet,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Building2,
  FileText,
} from 'lucide-react';

interface PayrollSlip {
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

interface PayrollSummary {
  totalEmployees: number;
  totalBasic: number;
  totalAllowances: number;
  totalOvertime: number;
  totalGross: number;
  totalInsurance: number;
  totalAdvances: number;
  totalPenalties: number;
  totalDeductions: number;
  totalNet: number;
}

export default function PayrollManagementPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [month, setMonth] = useState<number>(10);
  const [year, setYear] = useState<number>(2026);
  const [slips, setSlips] = useState<PayrollSlip[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadPayrollCalculation();

    if (socket) {
      socket.on('payroll_generated', (data) => {
        setFeedback({ msg: `تم اعتماد وقفل مسير الرواتب رقم ${data.batchNumber} بنجاح!`, success: true });
        setIsLocked(true);
      });

      return () => {
        socket.off('payroll_generated');
      };
    }
  }, [socket, month, year]);

  const loadPayrollCalculation = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:3000/payroll/calculate?month=${month}&year=${year}`);
      if (res.data?.success) {
        setSlips(res.data.slips || []);
        setSummary(res.data.summary || null);
      }
    } catch (err) {
      console.warn('Failed to calculate payroll from database API:', err);
      setSlips([]); setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const calculateLocalSummary = (items: PayrollSlip[]) => {
    const s: PayrollSummary = {
      totalEmployees: items.length,
      totalBasic: items.reduce((acc, x) => acc + x.basicSalary, 0),
      totalAllowances: items.reduce((acc, x) => acc + x.allowances, 0),
      totalOvertime: items.reduce((acc, x) => acc + x.overtimeAmount, 0),
      totalGross: items.reduce((acc, x) => acc + x.grossSalary, 0),
      totalInsurance: items.reduce((acc, x) => acc + x.socialInsurance, 0),
      totalAdvances: items.reduce((acc, x) => acc + x.advancesDeduction, 0),
      totalPenalties: items.reduce((acc, x) => acc + x.penaltiesDeduction, 0),
      totalDeductions: items.reduce((acc, x) => acc + x.totalDeductions, 0),
      totalNet: items.reduce((acc, x) => acc + x.netSalary, 0),
    };
    setSummary(s);
  };

  // اعتماد وقفل مسير المرتبات
  const handleApprovePayroll = async () => {
    setIsApproving(true);
    setFeedback(null);
    try {
      const payload = {
        month,
        year,
        approvedBy: 'المدير المالي المعتمد',
        notes: `تم اعتماد مسير شهر ${month}/${year} للصرف البنكي والنقدي`,
      };

      const res = await axios.post('http://localhost:3000/payroll/generate', payload);
      if (res.data?.success) {
        setFeedback({ msg: res.data.message || 'تم اعتماد المسير بنجاح وتثبيت المبالغ', success: true });
        setIsLocked(true);
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر اعتماد المسير', success: false });
    } finally {
      setIsApproving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen p-4 md:p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* شريط العنوان وأزرار التنقل السريع */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl erp-sub hover:opacity-80 transition cursor-pointer"
              title="العودة للوحة القيادة"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-emerald-500" />
                <h1 className="text-xl md:text-2xl font-bold">مسير احتساب الرواتب والأجور (Payroll Engine)</h1>
              </div>
              <p className="text-xs md:text-sm erp-muted mt-0.5">
                سلسلة مصانع وحلواني «أبو عادل» - احتساب الاستحقاقات، التأمينات، السلف، وإصدار الكشوف الرسمية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر العودة لشؤون العاملين */}
            <Link
              href="/hr"
              className="px-3.5 py-2.5 rounded-xl border erp-sub hover:opacity-80 font-bold text-xs transition flex items-center gap-1.5"
            >
              <Users className="w-4 h-4" />
              <span>شؤون العاملين</span>
            </Link>

            {/* محدد الشهر والسنة */}
            <div className="flex items-center gap-1 border erp-sub px-3 py-1.5 rounded-xl text-xs">
              <Calendar className="w-4 h-4 erp-muted" />
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-transparent font-bold outline-none cursor-pointer"
              >
                {[
                  { m: 1, name: 'يناير' },
                  { m: 2, name: 'فبراير' },
                  { m: 3, name: 'مارس' },
                  { m: 4, name: 'أبريل' },
                  { m: 5, name: 'مايو' },
                  { m: 6, name: 'يونيو' },
                  { m: 7, name: 'يوليو' },
                  { m: 8, name: 'أغسطس' },
                  { m: 9, name: 'سبتمبر' },
                  { m: 10, name: 'أكتوبر' },
                  { m: 11, name: 'نوفمبر' },
                  { m: 12, name: 'ديسمبر' },
                ].map((item) => (
                  <option key={item.m} value={item.m}>
                    {item.name}
                  </option>
                ))}
              </select>
              <span className="font-mono font-bold">2026</span>
            </div>

            {/* إعادة احتساب */}
            <button
              onClick={loadPayrollCalculation}
              disabled={loading}
              className="p-2.5 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
              title="إعادة احتساب المسير اللحظي"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* طباعة كشف الرواتب A4 */}
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>كشف المسير الرسمي A4</span>
            </button>

            {/* اعتماد وقفل المسير */}
            <button
              onClick={handleApprovePayroll}
              disabled={isApproving || isLocked}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer ${
                isLocked
                  ? 'bg-emerald-600 text-white opacity-90'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLocked ? (
                <Lock className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{isLocked ? 'المسير معتمد ومقفل' : 'اعتماد وصرف المسير'}</span>
            </button>

            {/* الوضع الليلي / النهاري */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
              title={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </header>

        {/* رسائل التنبيه والنجاح */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between transition-all ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* بطاقات الإحصائيات العلوية للمسير (KPI Cards) */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
              <div>
                <p className="text-xs erp-muted">صافي المستحق للصرف (Net)</p>
                <h3 className="text-2xl font-black mt-1 text-emerald-500 font-mono">
                  {summary.totalNet.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                </h3>
                <p className="text-[11px] erp-muted mt-1">لعدد {summary.totalEmployees} عاملاً وموظفاً</p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
              <div>
                <p className="text-xs erp-muted">إجمالي الرواتب الأساسية</p>
                <h3 className="text-2xl font-black mt-1 text-indigo-500 font-mono">
                  {summary.totalBasic.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                </h3>
                <p className="text-[11px] erp-muted mt-1">الأساسي المعتمد بالعقود</p>
              </div>
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
            </div>

            <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
              <div>
                <p className="text-xs erp-muted">الحوافز وبدلات الإنتاج والإضافي</p>
                <h3 className="text-2xl font-black mt-1 text-purple-500 font-mono">
                  {(summary.totalAllowances + summary.totalOvertime).toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                </h3>
                <p className="text-[11px] erp-muted mt-1">إضافي: {summary.totalOvertime.toLocaleString()} ج.م</p>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
              <div>
                <p className="text-xs erp-muted">إجمالي الاستقطاعات والتأمينات والسلف</p>
                <h3 className="text-2xl font-black mt-1 text-rose-500 font-mono">
                  {summary.totalDeductions.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
                </h3>
                <p className="text-[11px] erp-muted mt-1">سلف: {summary.totalAdvances.toLocaleString()} ج.م | تأمينات: {summary.totalInsurance.toLocaleString()} ج.م</p>
              </div>
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* جدول مسير الرواتب التفصيلي */}
        <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b erp-sub flex justify-between items-center">
            <h3 className="font-bold text-sm">
              تفاصيل مسير أجور شهر {month} / {year} - مصانع ومعارض حلواني «أبو عادل»
            </h3>
            <span className="text-xs font-mono erp-muted">
              حالة المسير: <strong className={isLocked ? 'text-emerald-500' : 'text-amber-500'}>{isLocked ? 'معتمد رسمياً' : 'قيد الاحتساب اللحظي'}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="erp-sub border-b">
                <tr>
                  <th className="p-3 font-bold text-center">#</th>
                  <th className="p-3 font-bold">كود الموظف</th>
                  <th className="p-3 font-bold">اسم العامل</th>
                  <th className="p-3 font-bold">القسم والوظيفة</th>
                  <th className="p-3 font-bold font-mono">الأساسي</th>
                  <th className="p-3 font-bold font-mono">البدلات</th>
                  <th className="p-3 font-bold font-mono">الإضافي</th>
                  <th className="p-3 font-bold font-mono">إجمالي المستحق</th>
                  <th className="p-3 font-bold font-mono text-rose-500">تأمينات (11%)</th>
                  <th className="p-3 font-bold font-mono text-rose-500">سلف مستقطعة</th>
                  <th className="p-3 font-bold font-mono text-rose-500">جزاءات</th>
                  <th className="p-3 font-bold font-mono text-rose-600">إجمالي الخصم</th>
                  <th className="p-3 font-bold font-mono text-emerald-600 text-sm">الصافي المستحق</th>
                  <th className="p-3 font-bold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center erp-muted">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري احتساب مسير الرواتب والاستقطاعات والسلف...</span>
                      </div>
                    </td>
                  </tr>
                ) : slips.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center erp-muted">
                      لا توجد بيانات مرتبات للشهر المحدد.
                    </td>
                  </tr>
                ) : (
                  slips.map((slip, idx) => (
                    <tr key={slip.employeeId} className="hover:bg-gray-500/5 transition">
                      <td className="p-3 text-center font-mono erp-muted">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-indigo-500">{slip.employeeCode}</td>
                      <td className="p-3 font-bold">{slip.employeeName}</td>
                      <td className="p-3">
                        <div className="font-medium">{slip.jobTitle}</div>
                        <div className="text-[10px] erp-muted">{slip.departmentName}</div>
                      </td>
                      <td className="p-3 font-mono font-medium">{slip.basicSalary.toLocaleString()}</td>
                      <td className="p-3 font-mono text-gray-500">{slip.allowances.toLocaleString()}</td>
                      <td className="p-3 font-mono text-indigo-500">
                        {slip.overtimeAmount > 0 ? `${slip.overtimeAmount.toLocaleString()} (${slip.overtimeHours}س)` : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-purple-600 dark:text-purple-400">
                        {slip.grossSalary.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono text-rose-500">-{slip.socialInsurance.toLocaleString()}</td>
                      <td className="p-3 font-mono text-amber-500 font-bold">
                        {slip.advancesDeduction > 0 ? `-${slip.advancesDeduction.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 font-mono text-rose-400">
                        {slip.penaltiesDeduction > 0 ? `-${slip.penaltiesDeduction.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-600">
                        -{slip.totalDeductions.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        {slip.netSalary.toLocaleString()} ج.م
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isLocked
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                          }`}
                        >
                          {isLocked ? 'معتمد' : 'محسوب'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {summary && (
                <tfoot className="erp-sub border-t-2 font-bold font-mono">
                  <tr className="bg-gray-500/10">
                    <td colSpan={4} className="p-3 text-center text-sm font-black">
                      الإجمالي العام لمسير شهر {month} / {year}
                    </td>
                    <td className="p-3">{summary.totalBasic.toLocaleString()}</td>
                    <td className="p-3">{summary.totalAllowances.toLocaleString()}</td>
                    <td className="p-3 text-indigo-500">{summary.totalOvertime.toLocaleString()}</td>
                    <td className="p-3 text-purple-600">{summary.totalGross.toLocaleString()}</td>
                    <td className="p-3 text-rose-500">-{summary.totalInsurance.toLocaleString()}</td>
                    <td className="p-3 text-amber-500">-{summary.totalAdvances.toLocaleString()}</td>
                    <td className="p-3 text-rose-400">-{summary.totalPenalties.toLocaleString()}</td>
                    <td className="p-3 text-rose-600">-{summary.totalDeductions.toLocaleString()}</td>
                    <td className="p-3 text-emerald-600 text-base font-black">
                      {summary.totalNet.toLocaleString()} ج.م
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>

      {/* مودال طباعة مسير الرواتب الرسمي بنسق A4 */}
      {showPrintModal && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-5xl w-full max-h-[95vh] overflow-y-auto p-6 md:p-8 space-y-6">

            {/* أزرار التحكم العلوية (تختفي في الطباعة) */}
            <div className="flex items-center justify-between border-b erp-card pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-500" />
                <h3 className="font-bold text-lg">معاينة كشف مسير المرتبات والأجور الرسمي (A4 Sheet)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الكشف الرسمي (A4)</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* وثيقة كشف المسير A4 الرسمية */}
            <div id="printable-payroll-sheet" className="bg-white text-gray-900 p-8 rounded-xl border shadow-sm space-y-6 font-sans">
              
              {/* الترويسة الرسمية */}
              <div className="flex justify-between items-start border-b-2 border-indigo-950 pb-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-indigo-950">مصانع ومحلات حلواني «أبو عادل»</h2>
                  <p className="text-xs font-semibold text-gray-700">شركة كيان للصناعات الغذائية - الإدارة المالية وشؤون العاملين</p>
                  <p className="text-[11px] text-gray-500">المنصورة - مجمع المصانع المركزي | س.ت: 18294 | ب.ض: 492-301-882</p>
                </div>

                <div className="text-left space-y-1">
                  <div className="inline-block px-3 py-1 bg-indigo-950 text-white font-bold text-sm rounded">
                    كشف مسير رواتب وأجور العاملين
                  </div>
                  <p className="text-xs font-bold text-indigo-900 font-mono">
                    فترة الاستحقاق: شهر {month} / {year}
                  </p>
                  <p className="text-xs text-gray-600">
                    تاريخ الإصدار: {displayDate}
                  </p>
                </div>
              </div>

              {/* ملخص الأرقام الرئيسي */}
              <div className="grid grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border text-xs">
                <div>
                  <span className="text-gray-500 block">إجمالي القوى العاملة:</span>
                  <span className="font-bold text-sm">{summary.totalEmployees} عاملاً وموظفاً</span>
                </div>
                <div>
                  <span className="text-gray-500 block">إجمالي المستحق (Gross):</span>
                  <span className="font-bold text-sm font-mono">{summary.totalGross.toLocaleString()} ج.م</span>
                </div>
                <div>
                  <span className="text-gray-500 block">إجمالي الاستقطاعات:</span>
                  <span className="font-bold text-sm font-mono text-rose-600">-{summary.totalDeductions.toLocaleString()} ج.م</span>
                </div>
                <div>
                  <span className="text-gray-500 block font-bold text-indigo-950">صافي المسير للصرف:</span>
                  <span className="font-black text-base font-mono text-emerald-700">{summary.totalNet.toLocaleString()} ج.م</span>
                </div>
              </div>

              {/* جدول المسير التفصيلي */}
              <table className="w-full text-right text-[11px] border border-gray-400">
                <thead className="bg-indigo-950 text-white">
                  <tr>
                    <th className="p-2 border border-gray-400 text-center w-8">#</th>
                    <th className="p-2 border border-gray-400">الكود</th>
                    <th className="p-2 border border-gray-400">اسم العامل</th>
                    <th className="p-2 border border-gray-400">القسم / الوظيفة</th>
                    <th className="p-2 border border-gray-400 text-center">الأساسي</th>
                    <th className="p-2 border border-gray-400 text-center">البدلات</th>
                    <th className="p-2 border border-gray-400 text-center">الإضافي</th>
                    <th className="p-2 border border-gray-400 text-center font-bold">إجمالي المستحق</th>
                    <th className="p-2 border border-gray-400 text-center text-rose-300">تأمينات</th>
                    <th className="p-2 border border-gray-400 text-center text-rose-300">سلف</th>
                    <th className="p-2 border border-gray-400 text-center text-rose-300">جزاءات</th>
                    <th className="p-2 border border-gray-400 text-center font-bold text-rose-200">الاستقطاع</th>
                    <th className="p-2 border border-gray-400 text-center font-black">الصافي</th>
                    <th className="p-2 border border-gray-400 text-center w-24">توقيع المستلم</th>
                  </tr>
                </thead>
                <tbody>
                  {slips.map((slip, idx) => (
                    <tr key={slip.employeeId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-1.5 border border-gray-300 text-center font-mono">{idx + 1}</td>
                      <td className="p-1.5 border border-gray-300 font-mono text-gray-700">{slip.employeeCode}</td>
                      <td className="p-1.5 border border-gray-300 font-bold">{slip.employeeName}</td>
                      <td className="p-1.5 border border-gray-300 text-[10px]">{slip.jobTitle}</td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono">{slip.basicSalary.toLocaleString()}</td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono">{slip.allowances.toLocaleString()}</td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono">{slip.overtimeAmount.toLocaleString()}</td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono font-bold bg-gray-100">{slip.grossSalary.toLocaleString()}</td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono text-rose-600">-{slip.socialInsurance.toLocaleString()}</td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono text-rose-600">
                        {slip.advancesDeduction > 0 ? `-${slip.advancesDeduction.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono text-rose-600">
                        {slip.penaltiesDeduction > 0 ? `-${slip.penaltiesDeduction.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono font-bold text-rose-700 bg-rose-50">
                        -{slip.totalDeductions.toLocaleString()}
                      </td>
                      <td className="p-1.5 border border-gray-300 text-center font-mono font-black text-emerald-800 bg-emerald-50">
                        {slip.netSalary.toLocaleString()}
                      </td>
                      <td className="p-1.5 border border-gray-300 text-center"></td>
                    </tr>
                  ))}
                  <tr className="bg-indigo-950 text-white font-bold font-mono">
                    <td colSpan={4} className="p-2 text-center font-black">
                      الإجمالي العام
                    </td>
                    <td className="p-2 text-center">{summary.totalBasic.toLocaleString()}</td>
                    <td className="p-2 text-center">{summary.totalAllowances.toLocaleString()}</td>
                    <td className="p-2 text-center">{summary.totalOvertime.toLocaleString()}</td>
                    <td className="p-2 text-center font-black">{summary.totalGross.toLocaleString()}</td>
                    <td className="p-2 text-center">-{summary.totalInsurance.toLocaleString()}</td>
                    <td className="p-2 text-center">-{summary.totalAdvances.toLocaleString()}</td>
                    <td className="p-2 text-center">-{summary.totalPenalties.toLocaleString()}</td>
                    <td className="p-2 text-center font-black">-{summary.totalDeductions.toLocaleString()}</td>
                    <td className="p-2 text-center font-black text-amber-300 text-xs">{summary.totalNet.toLocaleString()} ج.م</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>

              {/* التفقيط المالي */}
              <div className="border p-3 rounded-lg bg-gray-50 text-xs">
                <strong>التفقيط المالي المعتمد:</strong> فقط وقدره {summary.totalNet.toLocaleString()} جنيه مصري لا غير، مستحقة للصرف عن شهر {month} / {year}.
              </div>

              {/* التوقيعات المعتمدة */}
              <div className="grid grid-cols-4 gap-4 pt-6 text-center text-xs text-gray-700 border-t">
                <div className="space-y-6">
                  <p className="font-bold">مسؤول شؤون العاملين</p>
                  <p className="border-b border-dotted border-gray-400 w-28 mx-auto"></p>
                </div>
                <div className="space-y-6">
                  <p className="font-bold">المراجع المالي</p>
                  <p className="border-b border-dotted border-gray-400 w-28 mx-auto"></p>
                </div>
                <div className="space-y-6">
                  <p className="font-bold">اعتماد المدير العام</p>
                  <p className="border-b border-dotted border-gray-400 w-28 mx-auto"></p>
                </div>
                <div className="space-y-6">
                  <p className="font-bold">أمين الخزينة للصرف</p>
                  <p className="border-b border-dotted border-gray-400 w-28 mx-auto"></p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}
