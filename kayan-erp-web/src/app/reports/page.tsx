'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  FileSpreadsheet,
  Printer,
  Search,
  RotateCcw,
  Calendar,
  Building2,
  Filter,
  ArrowRight,
  Boxes,
  Layers,
  Package,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Warehouse,
  ShoppingBag,
  SlidersHorizontal,
  Factory,
} from 'lucide-react';

interface ReportRow {
  id: string;
  itemCode: string;
  itemName: string;
  departmentName: string;
  categoryName: string;
  orderTypeNormal: number;
  orderTypeSpecial: number;
  orderTypeDisplay: string;
  variantsSummary: string;
  unit: string;
  totalQuantity: number;
  variantsCount: number;
  variants?: Array<{ id: string; name: string; price: number; barcode: string }>;
  units?: Array<{ id: string; name: string; factor: number; price: number; barcode: string }>;
}

export default function ReportsManagementPage() {
  const { isConnected } = useSocket();
  const { theme } = useTheme();

  // التبويب النشط
  const [activeReportTab, setActiveReportTab] = useState<'PROD_DETAILED' | 'WAREHOUSE_SUMMARY' | 'SALES_INVOICES'>(
    'WAREHOUSE_SUMMARY',
  );

  // فلاتر البحث العلوية (مطابقة تماماً للصورة 2)
  const [dateFrom, setDateFrom] = useState<string>('2026-11-12');
  const [dateTo, setDateTo] = useState<string>('2026-11-12');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [itemCodeSearch, setItemCodeSearch] = useState<string>('');
  const [notesSearch, setNotesSearch] = useState<string>('');
  const [universalSearch, setUniversalSearch] = useState<string>('');

  // إظهار وإخفاء الأعمدة
  const [colVisibility, setColVisibility] = useState({
    code: true,
    description: true,
    orderType: true,
    variants: true,
    unit: true,
    quantity: true,
    totalCount: true,
    printBtn: true,
  });

  const [showAllDetails, setShowAllDetails] = useState<boolean>(true);

  // البيانات
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [printDate, setPrintDate] = useState<string>('2026-11-12');

  useEffect(() => {
    setPrintDate(new Date().toLocaleDateString('ar-EG'));
    loadFilterOptions();
    fetchReportData();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [deptRes, branchRes] = await Promise.all([
        axios.get('http://localhost:3000/inventory/departments'),
        axios.get('http://localhost:3000/inventory/branches'),
      ]);
      if (deptRes.data?.data) setDepartments(deptRes.data.data);
      if (branchRes.data?.data) setBranches(branchRes.data.data);
    } catch (err) {
      console.warn('Failed to load filter options', err);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;
      if (selectedBranch !== 'ALL') params.branchId = selectedBranch;
      if (orderTypeFilter !== 'ALL') params.orderType = orderTypeFilter;
      if (selectedDepartment !== 'ALL') params.departmentId = selectedDepartment;
      if (itemCodeSearch.trim()) params.itemCode = itemCodeSearch.trim();
      if (universalSearch.trim()) params.search = universalSearch.trim();

      const res = await axios.get('http://localhost:3000/inventory/reports/warehouse-summary', { params });
      if (res.data?.success && res.data.data) {
        setRows(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load report data', err);
    } finally {
      setLoading(false);
    }
  };

  // تفريغ الفلاتر
  const handleResetFilters = () => {
    setDateFrom('2026-11-12');
    setDateTo('2026-11-12');
    setSelectedBranch('ALL');
    setCustomerSearch('');
    setOrderTypeFilter('ALL');
    setSelectedDepartment('ALL');
    setStatusFilter('ALL');
    setItemCodeSearch('');
    setNotesSearch('');
    setUniversalSearch('');
    fetchReportData();
  };

  // تصفية محلية فورية بناء على الملاحظات والعميل إذا أدخلت
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (customerSearch.trim()) {
        const cs = customerSearch.toLowerCase().trim();
        if (!r.variantsSummary.toLowerCase().includes(cs)) return false;
      }
      if (notesSearch.trim()) {
        const ns = notesSearch.toLowerCase().trim();
        if (!r.variantsSummary.toLowerCase().includes(ns)) return false;
      }
      return true;
    });
  }, [rows, customerSearch, notesSearch]);

  // تصدير الإكسل
  const handleExportExcel = () => {
    const exportData = filteredRows.map((r, idx) => ({
      '#': idx + 1,
      'كود الصنف': r.itemCode,
      'الوصف': r.itemName,
      'القسم': r.departmentName,
      'نوع الأوردر': r.orderTypeDisplay,
      'التفريعات / تفاصيل كميات العملاء': r.variantsSummary,
      'الوحدة': r.unit,
      'الكمية': r.totalQuantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'التقرير الموجز للمخازن');
    XLSX.writeFile(workbook, `تقرير_المخازن_الموجز_${dateFrom}.xlsx`);
  };

  return (
    <div className="min-h-screen p-2 md:p-3 transition-colors duration-200" dir="rtl">
      <div className="w-full space-y-2.5">

        {/* ترويسة الشاشة العلوية */}
        <header className="erp-card p-3 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-2 print:hidden">
          <div className="flex items-center gap-2.5">
            <Link href="/inventory" className="p-1.5 rounded-lg border erp-sub hover:opacity-80 transition cursor-pointer" title="العودة للمستودعات">
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </Link>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black">التقارير وسلاسل التوزيع</h1>
              <p className="text-[11px] erp-muted">
                مصانع وحلواني أبو عادل | تقارير تشغيل الأقسام، ملخص كميات المستودعات، وتفريعات طلبات العملاء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/inventory"
              className="erp-btn-compact erp-sub border hover:opacity-80 font-bold text-xs shadow transition cursor-pointer"
            >
              <Boxes className="w-3.5 h-3.5 text-blue-500" />
              <span>دليل المستودعات والأصناف</span>
            </Link>
            <div className="flex items-center gap-1.5 erp-sub px-2.5 py-1 rounded-lg border text-xs">
              <span className="erp-muted text-[10px]">الربط:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-bold text-emerald-500 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-rose-500 text-[11px]">
                  <AlertCircle className="w-3 h-3" /> غير متصل
                </span>
              )}
            </div>
          </div>
        </header>

        {/* شريط الفلاتر عالي الكثافة (مطابق بالكامل للصورة 2) */}
        <div className="erp-card p-3 rounded-xl shadow-sm border space-y-2.5 print:hidden">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-xs">
            {/* 1. من تاريخ تسليم */}
            <div>
              <label className="block text-[11px] font-bold erp-muted mb-1">من تاريخ تسليم</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full erp-input-compact border erp-sub outline-none text-xs font-mono font-bold"
              />
            </div>

            {/* 2. إلى تاريخ تسليم */}
            <div>
              <label className="block text-[11px] font-bold erp-muted mb-1">إلى تاريخ تسليم</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full erp-input-compact border erp-sub outline-none text-xs font-mono font-bold"
              />
            </div>

            {/* 3. الفرع */}
            <div>
              <label className="block text-[11px] font-bold erp-muted mb-1">الفرع</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full erp-input-compact border erp-sub outline-none text-xs font-bold"
              >
                <option value="ALL">الكل</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.branchName}</option>
                ))}
              </select>
            </div>

            {/* 4. العميل */}
            <div>
              <label className="block text-[11px] font-bold erp-muted mb-1">العميل</label>
              <input
                type="text"
                placeholder="بحث عن عميل..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full erp-input-compact border erp-sub outline-none text-xs"
              />
            </div>

            {/* 5. نوع الأوردر */}
            <div>
              <label className="block text-[11px] font-bold erp-muted mb-1">نوع الأوردر</label>
              <select
                value={orderTypeFilter}
                onChange={(e) => setOrderTypeFilter(e.target.value)}
                className="w-full erp-input-compact border erp-sub outline-none text-xs font-bold"
              >
                <option value="ALL">الكل</option>
                <option value="عادي">عادي</option>
                <option value="خاص">خاص</option>
              </select>
            </div>

            {/* 6. القسم */}
            <div>
              <label className="block text-[11px] font-bold erp-muted mb-1">القسم</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full erp-input-compact border erp-sub outline-none text-xs font-bold text-blue-600 bg-blue-500/5"
              >
                <option value="ALL">اختر الأقسام...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.departmentName}</option>
                ))}
              </select>
            </div>

            {/* 7. الحالة */}
            <div>
              <label className="block text-[11px] font-bold erp-muted mb-1">الحالة</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full erp-input-compact border erp-sub outline-none text-xs font-bold"
              >
                <option value="ALL">الكل</option>
                <option value="جديد">جديد</option>
                <option value="قيد التجهيز">قيد التجهيز</option>
                <option value="مكتمل">مكتمل</option>
              </select>
            </div>

            {/* 8. كود الصنف */}
            <div>
              <label className="block text-[11px] font-bold erp-muted mb-1">كود الصنف</label>
              <input
                type="text"
                placeholder="بحث بالكود..."
                value={itemCodeSearch}
                onChange={(e) => setItemCodeSearch(e.target.value)}
                className="w-full erp-input-compact border erp-sub outline-none text-xs font-mono"
              />
            </div>
          </div>

          {/* الصف الثاني من الفلاتر مع أزرار الإجراءات */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 pt-2 border-t erp-card">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="بحث بالملاحظات..."
                value={notesSearch}
                onChange={(e) => setNotesSearch(e.target.value)}
                className="erp-input-compact border erp-sub outline-none text-xs w-40 sm:w-48"
              />
              <input
                type="text"
                placeholder="بحث شامل..."
                value={universalSearch}
                onChange={(e) => setUniversalSearch(e.target.value)}
                className="erp-input-compact border erp-sub outline-none text-xs w-48 sm:w-64"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                onClick={fetchReportData}
                disabled={loading}
                className="erp-btn-compact bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>بحث</span>
              </button>

              <button
                onClick={handleResetFilters}
                className="erp-btn-compact erp-sub border hover:opacity-80 font-bold text-xs shadow transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تنظيف الفلاتر</span>
              </button>

              <button
                onClick={() => window.print()}
                className="erp-btn-compact bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>معاينة قبل الطباعة</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="erp-btn-compact bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* أزرار التبويبات الفنية الثلاثة (مطابقة للصورة 2) */}
        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => setActiveReportTab('PROD_DETAILED')}
            className={`erp-btn-compact px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeReportTab === 'PROD_DETAILED'
                ? 'bg-blue-600 text-white shadow-md'
                : 'erp-sub border hover:opacity-80'
            }`}
          >
            <Factory className="w-4 h-4" />
            <span>التقرير التفصيلي (إنتاج)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">196</span>
          </button>

          <button
            onClick={() => setActiveReportTab('WAREHOUSE_SUMMARY')}
            className={`erp-btn-compact px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeReportTab === 'WAREHOUSE_SUMMARY'
                ? 'bg-blue-600 text-white shadow-md'
                : 'erp-sub border hover:opacity-80'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>التقرير الموجز (مخازن)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">{filteredRows.length || 80}</span>
          </button>

          <button
            onClick={() => setActiveReportTab('SALES_INVOICES')}
            className={`erp-btn-compact px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeReportTab === 'SALES_INVOICES'
                ? 'bg-blue-600 text-white shadow-md'
                : 'erp-sub border hover:opacity-80'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>فواتير العملاء (مبيعات)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">191</span>
          </button>
        </div>

        {/* شريط خيارات الأعمدة والعرض (إظهار/إخفاء الأعمدة) */}
        <div className="erp-card p-2.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black flex items-center gap-1 text-blue-600">
              <FileText className="w-4 h-4" />
              <span>التقرير الموجز (خاص بالمخازن)</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 font-bold font-mono">
              إجمالي الأصناف: {filteredRows.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="erp-muted text-[11px] font-bold">إظهار/إخفاء الأعمدة:</span>
            {[
              { id: 'code', label: 'الكود' },
              { id: 'description', label: 'الوصف' },
              { id: 'orderType', label: 'نوع الأورد...' },
              { id: 'variants', label: 'التفريعات' },
              { id: 'unit', label: 'الوحدة' },
              { id: 'quantity', label: 'الكمية Based' },
              { id: 'totalCount', label: 'العدد (Total)' },
              { id: 'printBtn', label: 'زر الطباعة' },
            ].map((col) => (
              <label key={col.id} className="flex items-center gap-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={(colVisibility as any)[col.id]}
                  onChange={(e) => setColVisibility({ ...colVisibility, [col.id]: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <span className="text-[11px]">{col.label}</span>
              </label>
            ))}

            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1" />

            <label className="flex items-center gap-1 font-bold cursor-pointer select-none text-blue-600">
              <input
                type="checkbox"
                checked={showAllDetails}
                onChange={(e) => setShowAllDetails(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0"
              />
              <span className="text-[11px]">إظهار كل التفاصيل</span>
            </label>
          </div>
        </div>

        {/* ترويسة الطباعة الرسمية A4 */}
        <div className="hidden print:block border-b-2 border-black pb-3 mb-4 text-center">
          <h2 className="text-xl font-black">مصانع وحلواني أبو عادل</h2>
          <p className="text-xs text-gray-700">التقرير الموجز لإجمالي الأوامر والتفريعات وتفاصيل كميات العملاء (خاص بالمخازن)</p>
          <div className="flex justify-between items-center text-xs mt-2 px-4 font-bold">
            <span>تاريخ التسليم: {dateFrom} إلى {dateTo}</span>
            <span>طبع بتاريخ: {printDate}</span>
          </div>
        </div>

        {/* جدول التقرير الموجز الرئيسي (مطابق تماماً للصورة 2) */}
        <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="erp-sub border-b text-[11px]">
                <tr className="divide-x divide-x-reverse divide-gray-200 dark:divide-gray-800">
                  {colVisibility.code && <th className="p-3 font-bold w-24">الكود</th>}
                  {colVisibility.description && <th className="p-3 font-bold w-40">الوصف</th>}
                  {colVisibility.orderType && <th className="p-3 font-bold w-32">نوع الأوردر</th>}
                  {colVisibility.variants && <th className="p-3 font-bold">التفريعات / تفاصيل كميات العملاء</th>}
                  {colVisibility.unit && <th className="p-3 font-bold w-24 text-center">الوحدة</th>}
                  {colVisibility.quantity && <th className="p-3 font-bold w-24 font-mono text-center">الكمية</th>}
                  {colVisibility.printBtn && <th className="p-3 font-bold w-16 text-center print:hidden">إجراء</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center erp-muted">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span>جاري تحميل وحساب تقرير المخازن وتفريعات العملاء...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center erp-muted">
                      لا توجد بيانات مطابقة لمعايير البحث في التقرير.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, idx) => (
                    <tr
                      key={row.id || idx}
                      className={`hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition divide-x divide-x-reverse divide-gray-100 dark:divide-gray-800/60 ${
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/30 dark:bg-gray-900/20'
                      }`}
                    >
                      {/* الكود */}
                      {colVisibility.code && (
                        <td className="p-3 font-mono font-bold text-gray-800 dark:text-gray-200">
                          {row.itemCode}
                        </td>
                      )}

                      {/* الوصف */}
                      {colVisibility.description && (
                        <td className="p-3 font-bold text-gray-900 dark:text-gray-100">
                          {row.itemName}
                        </td>
                      )}

                      {/* نوع الأوردر */}
                      {colVisibility.orderType && (
                        <td className="p-3 text-[11px]">
                          <div className="space-y-0.5">
                            <span className="block font-bold text-gray-700 dark:text-gray-300">
                              عادي: <strong className="font-mono">{row.orderTypeNormal}</strong>
                            </span>
                            <span className="block font-bold text-rose-600">
                              خاص: <strong className="font-mono">{row.orderTypeSpecial}</strong>
                            </span>
                          </div>
                        </td>
                      )}

                      {/* التفريعات / تفاصيل كميات العملاء */}
                      {colVisibility.variants && (
                        <td className="p-3">
                          <div className="text-[11px] leading-relaxed font-medium text-gray-800 dark:text-gray-200">
                            {row.variantsSummary}
                          </div>
                        </td>
                      )}

                      {/* الوحدة */}
                      {colVisibility.unit && (
                        <td className="p-3 text-center font-bold text-gray-700 dark:text-gray-300">
                          {row.unit}
                        </td>
                      )}

                      {/* الكمية */}
                      {colVisibility.quantity && (
                        <td className="p-3 font-mono font-black text-sm text-center text-blue-600">
                          {Number(row.totalQuantity).toFixed(2)}
                        </td>
                      )}

                      {/* زر الطباعة */}
                      {colVisibility.printBtn && (
                        <td className="p-3 text-center print:hidden">
                          <button
                            onClick={() => window.print()}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 transition cursor-pointer"
                            title="طباعة بند الصنف"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* توقيعات تقرير المخازن الرسمي A4 */}
        <div className="hidden print:grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-gray-300 text-xs text-center font-bold">
          <div>
            <p>مسؤول استلام المخازن</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>مشرف صالة التجهيز والتعبئة</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>مدير التشغيل والمستودعات</p>
            <div className="mt-8">......................................</div>
          </div>
        </div>

      </div>
    </div>
  );
}
