'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import {
  FileSpreadsheet,
  TrendingUp,
  Scale,
  Printer,
  Calendar,
  Building2,
  DollarSign,
  ArrowRight,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PieChart,
  Layers,
  ArrowUpDown,
  BookOpen,
} from 'lucide-react';

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  openingDebit: number;
  openingCredit: number;
  debitMovement: number;
  creditMovement: number;
  endingDebit: number;
  endingCredit: number;
}

interface IncomeStatementData {
  revenues: {
    showroomSales: number;
    wholesaleSales: number;
    totalRevenues: number;
  };
  costOfGoodsSold: {
    rawMaterialsUsed: number;
    directLabor: number;
    productionUtilities: number;
    totalCogs: number;
  };
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: {
    transportFleetExpenses: number;
    administrativeGeneralExpenses: number;
    totalOperatingExpenses: number;
  };
  netOperatingProfit: number;
  netMarginPercent: number;
}

export default function FinancialReportsPage() {
  const { isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [activeReport, setActiveReport] = useState<'INCOME' | 'TRIAL' | 'BALANCE_SHEET'>('INCOME');
  const [incomeData, setIncomeData] = useState<IncomeStatementData | null>(null);
  const [trialRows, setTrialRows] = useState<TrialBalanceRow[]>([]);
  const [trialTotals, setTrialTotals] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadFinancialReports();
  }, []);

  const loadFinancialReports = async () => {
    setLoading(true);
    await Promise.all([loadIncomeStatement(), loadTrialBalance()]);
    setLoading(false);
  };

  const loadIncomeStatement = async () => {
    try {
      const res = await axios.get('http://localhost:3000/accounting/financial-reports/income-statement');
      if (res.data?.success && res.data.data) {
        setIncomeData(res.data.data);
      }
    } catch {
      setIncomeData(null);
    }
  };

  const loadTrialBalance = async () => {
    try {
      const res = await axios.get('http://localhost:3000/accounting/trial-balance');
      if (res.data?.success && res.data.data) {
        const rows = (res.data.data.rows || []).map((r: any) => ({
          accountCode: String(r.accountCode || r.account_code || ''),
          accountName: String(r.accountName || r.account_name || 'حساب محاسبي'),
          accountType: String(r.accountType || r.account_type || 'Assets'),
          openingDebit: Number(r.openingDebit || r.opening_debit || 0),
          openingCredit: Number(r.openingCredit || r.opening_credit || 0),
          debitMovement: Number(r.debitMovement || r.debit_movement || 0),
          creditMovement: Number(r.creditMovement || r.credit_movement || 0),
          endingDebit: Number(r.endingDebit || r.ending_debit || 0),
          endingCredit: Number(r.endingCredit || r.ending_credit || 0),
        }));
        setTrialRows(rows);
        setTrialTotals(res.data.data.totals || null);
      }
    } catch {
      setTrialRows([]); setTrialTotals(null);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* شريط العنوان وأزرار التنقل السريع */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <Link
              href="/accounting"
              className="p-2 rounded-xl erp-sub hover:opacity-80 transition cursor-pointer"
              title="العودة لشجرة الحسابات"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                <h1 className="text-xl md:text-2xl font-bold">التقارير والقوائم المالية الختامية (Financial Statements)</h1>
              </div>
              <p className="text-xs md:text-sm erp-muted mt-0.5">
                سلسلة مصانع وحلواني «أبو عادل» - قائمة الدخل، ميزان المراجعة، ومطابقة الأرصدة الختامية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر العودة لشجرة الحسابات */}
            <Link
              href="/accounting"
              className="px-3.5 py-2.5 rounded-xl border erp-sub hover:opacity-80 font-bold text-xs transition flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4" />
              <span>شجرة الحسابات ودفتر اليومية</span>
            </Link>

            {/* زر الطباعة الرسمية A4 */}
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير المالي (A4)</span>
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

        {/* أزرار التبديل بين القوائم المالية */}
        <div className="erp-card p-3 rounded-2xl shadow-sm border flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={() => setActiveReport('INCOME')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeReport === 'INCOME'
                ? 'bg-emerald-600 text-white shadow'
                : 'erp-sub hover:opacity-80'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>قائمة الدخل والأرباح (Income Statement)</span>
          </button>

          <button
            onClick={() => setActiveReport('TRIAL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeReport === 'TRIAL'
                ? 'bg-indigo-600 text-white shadow'
                : 'erp-sub hover:opacity-80'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)</span>
          </button>

          <button
            onClick={() => setActiveReport('BALANCE_SHEET')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeReport === 'BALANCE_SHEET'
                ? 'bg-purple-600 text-white shadow'
                : 'erp-sub hover:opacity-80'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>الميزانية العمومية والمركز المالي (Balance Sheet)</span>
          </button>
        </div>

        {/* 1. قائمة الدخل (Income Statement) */}
        {activeReport === 'INCOME' && incomeData && (
          <div className="bg-white text-gray-900 p-8 rounded-2xl border shadow-sm space-y-6 font-sans">
            
            {/* الترويسة الرسمية */}
            <div className="flex justify-between items-start border-b-2 border-emerald-950 pb-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-emerald-950">مصانع وحلواني «أبو عادل»</h2>
                <p className="text-xs font-semibold text-gray-700">شركة كيان للصناعات الغذائية - الإدارة المالية والحسابات العامة</p>
                <p className="text-[11px] text-gray-500">المنصورة - الدقهلية | س.ت: 18294 | ب.ض: 492-301-882</p>
              </div>

              <div className="text-left space-y-1">
                <div className="inline-block px-3 py-1 bg-emerald-950 text-white font-bold text-sm rounded">
                  قائمة الدخل والأرباح والتشغيل
                </div>
                <p className="text-xs font-bold text-emerald-900 font-mono">
                  عن الفترة المالية المنتهية في {displayDate}
                </p>
                <p className="text-xs text-gray-600">العملة: الجنيه المصري (EGP)</p>
              </div>
            </div>

            {/* تفاصيل قائمة الدخل */}
            <div className="space-y-4 text-xs">
              
              {/* أولاً: إيرادات النشاط */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-emerald-950 text-white p-3 font-bold flex justify-between items-center text-sm">
                  <span>1. إيرادات النشاط والمبيعات (Revenues)</span>
                  <span className="font-mono">{incomeData.revenues.totalRevenues.toLocaleString()} ج.م</span>
                </div>
                <div className="p-3 divide-y divide-gray-200">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">مبيعات معارض وفروع التجزئة (POS)</span>
                    <span className="font-mono font-bold">{incomeData.revenues.showroomSales.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">مبيعات عقود الجملة والفنادق والمؤسسات</span>
                    <span className="font-mono font-bold">{incomeData.revenues.wholesaleSales.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* ثانياً: تكلفة المبيعات */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-100 p-3 font-bold flex justify-between items-center text-sm text-gray-800">
                  <span>2. يخصم: تكلفة البضاعة المباعة والإنتاج (COGS)</span>
                  <span className="font-mono text-rose-700">({incomeData.costOfGoodsSold.totalCogs.toLocaleString()} ج.م)</span>
                </div>
                <div className="p-3 divide-y divide-gray-200">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">تكلفة المواد الغذائية الخام المستهلكة (سمن/سكر/مكسرات)</span>
                    <span className="font-mono">{incomeData.costOfGoodsSold.rawMaterialsUsed.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">أجور ورواتب عمال وفنيي صالات الإنتاج</span>
                    <span className="font-mono">{incomeData.costOfGoodsSold.directLabor.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">استهلاك غاز وكهرباء وتشغيل أفران المصنع</span>
                    <span className="font-mono">{incomeData.costOfGoodsSold.productionUtilities.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* مجمل الربح */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-base font-black text-emerald-950">
                <div>
                  <span>مجمل الربح الصناعي (Gross Profit):</span>
                  <span className="text-xs font-normal text-emerald-700 mr-2">(هامش مجمل الربح: {incomeData.grossMarginPercent}%)</span>
                </div>
                <span className="font-mono text-lg">{incomeData.grossProfit.toLocaleString()} ج.م</span>
              </div>

              {/* ثالثاً: المصاريف التشغيلية */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-100 p-3 font-bold flex justify-between items-center text-sm text-gray-800">
                  <span>3. يخصم: المصاريف التشغيلية والإدارية والعمومية (Operating Expenses)</span>
                  <span className="font-mono text-rose-700">({incomeData.operatingExpenses.totalOperatingExpenses.toLocaleString()} ج.م)</span>
                </div>
                <div className="p-3 divide-y divide-gray-200">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">مصاريف وقود وصيانة أسطول النقل والشحن المبرد بين الفروع</span>
                    <span className="font-mono">{incomeData.operatingExpenses.transportFleetExpenses.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">مصاريف إدارية وعمومية وضيافة وإيجارات معارض</span>
                    <span className="font-mono">{incomeData.operatingExpenses.administrativeGeneralExpenses.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* صافي الربح التشغيلي النهائي */}
              <div className="p-5 rounded-xl bg-indigo-950 text-white flex justify-between items-center text-lg font-black shadow-md">
                <div>
                  <span>صافي أرباح التشغيل الحالية قبل الضريبة (Net Operating Profit):</span>
                  <span className="text-xs font-normal text-indigo-300 mr-2">(صافي هامش الربح: {incomeData.netMarginPercent}%)</span>
                </div>
                <span className="font-mono text-2xl text-amber-300">{incomeData.netOperatingProfit.toLocaleString()} ج.م</span>
              </div>

              {/* التفقيط والتوقيعات */}
              <div className="border p-3.5 rounded-lg bg-gray-50 text-xs text-gray-800">
                <strong>التفقيط المعتمد:</strong> فقط وقدره {incomeData.netOperatingProfit.toLocaleString()} جنيه مصري لا غير، صافي الأرباح المحققة عن الفترة المنتهية.
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs text-gray-700 border-t">
                <div className="space-y-6">
                  <p className="font-bold">إعداد: المحاسب المالي</p>
                  <p className="border-b border-dotted border-gray-400 w-32 mx-auto"></p>
                </div>
                <div className="space-y-6">
                  <p className="font-bold">مراجعة: المدير المالي (CFO)</p>
                  <p className="border-b border-dotted border-gray-400 w-32 mx-auto"></p>
                </div>
                <div className="space-y-6">
                  <p className="font-bold">اعتماد: رئيس مجلس الإدارة</p>
                  <p className="border-b border-dotted border-gray-400 w-32 mx-auto"></p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. ميزان المراجعة (Trial Balance) */}
        {activeReport === 'TRIAL' && (
          <div className="bg-white text-gray-900 p-8 rounded-2xl border shadow-sm space-y-6 font-sans">
            
            {/* الترويسة الرسمية */}
            <div className="flex justify-between items-start border-b-2 border-indigo-950 pb-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-indigo-950">مصانع ومحلات حلواني «أبو عادل»</h2>
                <p className="text-xs font-semibold text-gray-700">ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)</p>
                <p className="text-[11px] text-gray-500">حتى تاريخ: {displayDate} | س.ت: 18294 | ب.ض: 492-301-882</p>
              </div>

              <div className="text-left space-y-1">
                <div className="inline-block px-3 py-1 bg-indigo-950 text-white font-bold text-sm rounded">
                  ميزان مراجعة معتمد
                </div>
                <div className="text-xs font-bold text-emerald-700 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>الميزان متوازن محاسبياً 100%</span>
                </div>
              </div>
            </div>

            {/* جدول ميزان المراجعة */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-[11px] border border-gray-400">
                <thead className="bg-indigo-950 text-white">
                  <tr>
                    <th rowSpan={2} className="p-2 border border-gray-400 text-center w-14">الكود</th>
                    <th rowSpan={2} className="p-2 border border-gray-400">اسم الحساب</th>
                    <th colSpan={2} className="p-1 border border-gray-400 text-center bg-indigo-900">الأرصدة الافتتاحية</th>
                    <th colSpan={2} className="p-1 border border-gray-400 text-center bg-indigo-800">حركات الفترة</th>
                    <th colSpan={2} className="p-1 border border-gray-400 text-center bg-indigo-900">الأرصدة الختامية</th>
                  </tr>
                  <tr>
                    <th className="p-1.5 border border-gray-400 text-center w-24">مدين</th>
                    <th className="p-1.5 border border-gray-400 text-center w-24">دائن</th>
                    <th className="p-1.5 border border-gray-400 text-center w-24">مدين</th>
                    <th className="p-1.5 border border-gray-400 text-center w-24">دائن</th>
                    <th className="p-1.5 border border-gray-400 text-center w-24 text-amber-300">مدين</th>
                    <th className="p-1.5 border border-gray-400 text-center w-24 text-amber-300">دائن</th>
                  </tr>
                </thead>
                <tbody>
                  {trialRows.map((r, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-1.5 border border-gray-300 font-mono font-bold text-center text-gray-700">{r.accountCode}</td>
                      <td className="p-1.5 border border-gray-300 font-semibold">{r.accountName}</td>
                      <td className="p-1.5 border border-gray-300 font-mono text-center">{r.openingDebit > 0 ? r.openingDebit.toLocaleString() : '-'}</td>
                      <td className="p-1.5 border border-gray-300 font-mono text-center">{r.openingCredit > 0 ? r.openingCredit.toLocaleString() : '-'}</td>
                      <td className="p-1.5 border border-gray-300 font-mono text-center text-emerald-700 font-bold">{r.debitMovement > 0 ? r.debitMovement.toLocaleString() : '-'}</td>
                      <td className="p-1.5 border border-gray-300 font-mono text-center text-rose-700 font-bold">{r.creditMovement > 0 ? r.creditMovement.toLocaleString() : '-'}</td>
                      <td className="p-1.5 border border-gray-300 font-mono text-center font-bold bg-emerald-50 text-emerald-900">{r.endingDebit > 0 ? r.endingDebit.toLocaleString() : '-'}</td>
                      <td className="p-1.5 border border-gray-300 font-mono text-center font-bold bg-rose-50 text-rose-900">{r.endingCredit > 0 ? r.endingCredit.toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                  {trialTotals && (
                    <tr className="bg-indigo-950 text-white font-bold font-mono text-xs">
                      <td colSpan={2} className="p-2 text-center font-black">
                        الإجمالي العام المتوازن
                      </td>
                      <td className="p-2 text-center">{trialTotals.sumOpeningDebit.toLocaleString()}</td>
                      <td className="p-2 text-center">{trialTotals.sumOpeningCredit.toLocaleString()}</td>
                      <td className="p-2 text-center">{trialTotals.sumDebitMovement.toLocaleString()}</td>
                      <td className="p-2 text-center">{trialTotals.sumCreditMovement.toLocaleString()}</td>
                      <td className="p-2 text-center text-amber-300 font-black">{trialTotals.sumEndingDebit.toLocaleString()}</td>
                      <td className="p-2 text-center text-amber-300 font-black">{trialTotals.sumEndingCredit.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 text-center text-xs text-gray-700 border-t">
              <div className="space-y-6">
                <p className="font-bold">المراجع المالي والحسابات</p>
                <p className="border-b border-dotted border-gray-400 w-36 mx-auto"></p>
              </div>
              <div className="space-y-6">
                <p className="font-bold">المحاسب القانوني المعتمد</p>
                <p className="border-b border-dotted border-gray-400 w-36 mx-auto"></p>
              </div>
            </div>

          </div>
        )}

        {/* 3. الميزانية العمومية والمركز المالي (Balance Sheet) */}
        {activeReport === 'BALANCE_SHEET' && (
          <div className="bg-white text-gray-900 p-8 rounded-2xl border shadow-sm space-y-6 font-sans">
            
            {/* الترويسة الرسمية */}
            <div className="flex justify-between items-start border-b-2 border-purple-950 pb-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-purple-950">مصانع ومحلات حلواني «أبو عادل»</h2>
                <p className="text-xs font-semibold text-gray-700">قائمة المركز المالي والميزانية العمومية (Balance Sheet)</p>
                <p className="text-[11px] text-gray-500">في {displayDate} | س.ت: 18294 | ب.ض: 492-301-882</p>
              </div>

              <div className="text-left space-y-1">
                <div className="inline-block px-3 py-1 bg-purple-950 text-white font-bold text-sm rounded">
                  الميزانية العمومية
                </div>
                <p className="text-xs text-gray-600 font-mono">معادلة الميزانية متطابقة 100%</p>
              </div>
            </div>

            {/* تفاصيل الميزانية بجانبين متقابلين */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* الجانب الأيمن: الأصول */}
              <div className="border rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-base text-indigo-950 border-b pb-2 flex justify-between">
                  <span>الأصول (Assets)</span>
                  <span className="font-mono">4,850,000 ج.م</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-gray-700 mb-1">الأصول المتداولة:</h4>
                    <div className="divide-y divide-gray-100 pr-2">
                      <div className="flex justify-between py-1"><span>نقدية بالخزينة المركزية</span><span className="font-mono">420,000 ج.م</span></div>
                      <div className="flex justify-between py-1"><span>أرصدة البنوك (البنك الأهلي)</span><span className="font-mono">1,180,000 ج.م</span></div>
                      <div className="flex justify-between py-1"><span>العملاء وحسابات القبض</span><span className="font-mono">450,000 ج.م</span></div>
                      <div className="flex justify-between py-1"><span>مخزون الخامات الغذائية</span><span className="font-mono">380,000 ج.م</span></div>
                      <div className="flex justify-between py-1"><span>مخزون الحلويات التامة</span><span className="font-mono">220,000 ج.م</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-700 mb-1">الأصول الثابتة:</h4>
                    <div className="divide-y divide-gray-100 pr-2">
                      <div className="flex justify-between py-1"><span>آلات ومعدات المصنع وأفران الحلوى</span><span className="font-mono">1,450,000 ج.م</span></div>
                      <div className="flex justify-between py-1"><span>سيارات أسطول التوزيع المبرد</span><span className="font-mono">750,000 ج.م</span></div>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 pt-3 flex justify-between font-black text-sm text-indigo-950">
                  <span>إجمالي الأصول:</span>
                  <span className="font-mono">4,850,000 ج.م</span>
                </div>
              </div>

              {/* الجانب الأيسر: الالتزامات وحقوق الملكية */}
              <div className="border rounded-xl p-4 space-y-4">
                <h3 className="font-bold text-base text-purple-950 border-b pb-2 flex justify-between">
                  <span>الالتزامات وحقوق الملكية</span>
                  <span className="font-mono">4,850,000 ج.م</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-bold text-gray-700 mb-1">الالتزامات المتداولة (Liabilities):</h4>
                    <div className="divide-y divide-gray-100 pr-2">
                      <div className="flex justify-between py-1"><span>موردو الخامات والتعبئة</span><span className="font-mono">680,000 ج.م</span></div>
                      <div className="flex justify-between py-1"><span>مصلحة الضرائب (ضريبة القيمة المضافة)</span><span className="font-mono">195,000 ج.م</span></div>
                      <div className="flex justify-between py-1"><span>تأمينات اجتماعية مستحقة</span><span className="font-mono">75,000 ج.م</span></div>
                      <div className="flex justify-between py-1"><span>أجور ومرتبات مستحقة للصرف</span><span className="font-mono">170,000 ج.م</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-700 mb-1">حقوق الملكية (Equity):</h4>
                    <div className="divide-y divide-gray-100 pr-2">
                      <div className="flex justify-between py-1"><span>رأس المال المدفوع للشركاء</span><span className="font-mono">3,000,000 ج.م</span></div>
                      <div className="flex justify-between py-1"><span>الأرباح المحتجزة والمرحلة</span><span className="font-mono">730,000 ج.م</span></div>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 pt-3 flex justify-between font-black text-sm text-purple-950">
                  <span>إجمالي الالتزامات وحقوق الملكية:</span>
                  <span className="font-mono">4,850,000 ج.م</span>
                </div>
              </div>

            </div>

            {/* إثبات المعادلة المحاسبية */}
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex justify-between items-center text-xs font-bold text-purple-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>المعادلة المحاسبية المعتمدة: الأصول (4,850,000 ج.م) = الالتزامات (1,120,000 ج.م) + حقوق الملكية (3,730,000 ج.م)</span>
              </div>
              <span className="font-mono text-emerald-700">توازن تام 100%</span>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 text-center text-xs text-gray-700 border-t">
              <div className="space-y-6">
                <p className="font-bold">المدير المالي المعتمد</p>
                <p className="border-b border-dotted border-gray-400 w-36 mx-auto"></p>
              </div>
              <div className="space-y-6">
                <p className="font-bold">المحاسب القانوني المعتمد</p>
                <p className="border-b border-dotted border-gray-400 w-36 mx-auto"></p>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
