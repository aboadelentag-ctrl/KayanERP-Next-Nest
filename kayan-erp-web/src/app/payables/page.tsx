'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Receipt,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  ArrowRight,
  Filter,
  CreditCard,
  Building2,
  FileText,
  Printer,
  ChevronLeft,
  Calendar,
  X,
  AlertTriangle,
} from 'lucide-react';

interface PayableBill {
  id: string;
  billNumber: string;
  supplierId?: string;
  partyName: string;
  category: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  issueDate: string;
  dueDate: string;
  notes?: string;
}

interface SummaryData {
  suppliersDue: number;
  utilitiesDue: number;
  payrollDue: number;
  totalPaid: number;
  totalBillsCount: number;
  currency: string;
}

export default function ExpensesPayablesPage() {
  const { socket, isConnected } = useSocket();
  const { theme } = useTheme();

  const [bills, setBills] = useState<PayableBill[]>([]);
  const [summary, setSummary] = useState<SummaryData>({
    suppliersDue: 0,
    utilitiesDue: 0,
    payrollDue: 0,
    totalPaid: 0,
    totalBillsCount: 0,
    currency: 'ج.م',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [suppliersLookup, setSuppliersLookup] = useState<any[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [selectedBill, setSelectedBill] = useState<PayableBill | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // Form State
  const [partyName, setPartyName] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [billCategory, setBillCategory] = useState<string>('SUPPLIER_PURCHASE');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    loadData();
    loadSuppliers();

    if (socket) {
      socket.on('payable_created', (data) => {
        setBills((prev) => [data, ...prev]);
        loadSummary();
      });

      socket.on('payable_paid', (data) => {
        setBills((prev) =>
          prev.map((b) =>
            b.id === data.id
              ? { ...b, paidAmount: data.paidAmount, remainingAmount: data.remainingAmount, status: data.status }
              : b
          )
        );
        loadSummary();
      });

      return () => {
        socket.off('payable_created');
        socket.off('payable_paid');
      };
    }
  }, [socket]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadBills(), loadSummary()]);
    setLoading(false);
  };

  const loadBills = async () => {
    try {
      const res = await axios.get('http://localhost:3000/payables');
      if (res.data?.success && res.data.data) {
        setBills(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load payables:', err);
      setBills([]);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await axios.get('http://localhost:3000/payables/summary');
      if (res.data?.success && res.data.data) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load summary:', err);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/payables/suppliers-lookup');
      if (res.data?.success && res.data.data) {
        setSuppliersLookup(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load suppliers:', err);
    }
  };

  // Add bill
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalAmount || Number(totalAmount) <= 0) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await axios.post('http://localhost:3000/payables', {
        supplierId: selectedSupplierId || undefined,
        partyName: partyName.trim() || undefined,
        category: billCategory,
        totalAmount: Number(totalAmount),
        paidAmount: Number(paidAmount) || 0,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.data?.success) {
        setFeedback({ msg: 'تم قيد فاتورة الالتزام والمصروفات بنجاح في قاعدة البيانات ✓', success: true });
        setIsAddModalOpen(false);
        resetForm();
        loadData();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر حفظ الفاتورة', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pay bill
  const handlePayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill || payAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await axios.post(`http://localhost:3000/payables/${selectedBill.id}/pay`, {
        amount: Number(payAmount),
      });

      if (res.data?.success) {
        setFeedback({ msg: `تم تسجيل سداد مبلغ ${payAmount} ج.م بنجاح ✓`, success: true });
        setIsPayModalOpen(false);
        setSelectedBill(null);
        setPayAmount(0);
        loadData();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تسجيل السداد', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setPartyName('');
    setSelectedSupplierId('');
    setBillCategory('SUPPLIER_PURCHASE');
    setTotalAmount('');
    setPaidAmount('0');
    setDueDate('');
    setNotes('');
  };

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchSearch =
        !searchTerm.trim() ||
        b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.notes && b.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = categoryFilter === 'ALL' || b.category === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;

      return matchSearch && matchCat && matchStatus;
    });
  }, [bills, searchTerm, categoryFilter, statusFilter]);

  return (
    <div dir="rtl" className="erp-container-fluid space-y-3 transition-colors duration-200">
      
      {/* 1. الترويسة المدمجة (Compact Executive Bar) */}
      <div className="erp-card p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2.5">
          <Link
            href="/accounting"
            className="p-1.5 rounded-lg erp-sub hover:opacity-80 transition"
            title="العودة للحسابات العامة"
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-amber-500" />
              <h1 className="text-base font-black">المصروفات التشغيلية والالتزامات وأوراق الدفع (AP)</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                إدارة الذمم الدائنة
              </span>
            </div>
            <p className="text-[11px] erp-muted">
              حوكمة استحقاقات الموردين، فواتير الطاقة والغاز للمصانع، ومتابعة جدول السداد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="erp-btn-compact erp-sub hover:opacity-80 border"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="erp-btn-compact btn-gold"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مطالبة / فاتورة مصروفات</span>
          </button>
        </div>
      </div>

      {/* تنبيه الحالة */}
      {feedback && (
        <div
          className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
            feedback.success
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-70">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. شريط المؤشرات الحيوية عالي الكثافة (Compact OPEX KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        
        {/* KPI 1: مستحقات الموردين */}
        <div className="erp-card p-3 rounded-xl border border-r-4 border-r-rose-500 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold erp-muted block">مستحقات الموردين (AP)</span>
            <div className="text-lg font-black font-mono text-rose-500 mt-0.5">
              {summary.suppliersDue.toLocaleString()} ج.م
            </div>
          </div>
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 2: فواتير الطاقة والمرافق */}
        <div className="erp-card p-3 rounded-xl border border-r-4 border-r-amber-500 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold erp-muted block">فواتير الغاز والكهرباء والمرافق</span>
            <div className="text-lg font-black font-mono text-amber-500 mt-0.5">
              {summary.utilitiesDue.toLocaleString()} ج.م
            </div>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 3: إجمالي المسدد */}
        <div className="erp-card p-3 rounded-xl border border-r-4 border-r-emerald-500 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold erp-muted block">إجمالي المسدد الفعلي</span>
            <div className="text-lg font-black font-mono text-emerald-500 mt-0.5">
              {summary.totalPaid.toLocaleString()} ج.م
            </div>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* KPI 4: إجمالي الفواتير */}
        <div className="erp-card p-3 rounded-xl border border-r-4 border-r-indigo-500 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold erp-muted block">عدد المطالبات المسجلة</span>
            <div className="text-lg font-black font-mono mt-0.5">
              {bills.length} فاتورة
            </div>
          </div>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
            <FileText className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* 3. شريط الفلاتر والبحث المدمج (Compact Search & Filter Strip) */}
      <div className="erp-card p-2.5 rounded-xl border flex flex-col md:flex-row items-center gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 erp-muted" />
          <input
            type="text"
            placeholder="بحث برقم المطالبة، اسم المورد أو الجهة، أو الملاحظات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full erp-input-compact pr-8 border erp-sub focus:border-amber-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="erp-input-compact border erp-sub outline-none text-xs"
          >
            <option value="ALL">كافة التصنيفات</option>
            <option value="SUPPLIER_PURCHASE">موردو الخامات والتعبئة</option>
            <option value="UTILITY_GAS">غاز طبيعي ومصانع</option>
            <option value="UTILITY_ELEC">كهرباء وطاقة</option>
            <option value="RENT">إيجارات معارض</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="erp-input-compact border erp-sub outline-none text-xs"
          >
            <option value="ALL">كافة الحالات</option>
            <option value="UNPAID">غير مسددة</option>
            <option value="PARTIAL">مسددة جزئياً</option>
            <option value="PAID">مسددة بالكامل</option>
          </select>
        </div>
      </div>

      {/* 4. جدول المطالبات عالي الكثافة (Compact High-Density Enterprise Table) */}
      <div className="erp-card rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="erp-table-compact">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900/60 border-b erp-muted">
                <th>رقم المطالبة</th>
                <th>الجهة / المورد المستحق</th>
                <th>التصنيف</th>
                <th className="text-left">إجمالي الفاتورة</th>
                <th className="text-left">المسدد</th>
                <th className="text-left">المتبقي</th>
                <th>تاريخ الاستحقاق</th>
                <th>الحالة</th>
                <th className="text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 erp-muted">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-amber-500" />
                    <span>جارٍ تحميل سجلات المصروفات والالتزامات...</span>
                  </td>
                </tr>
              ) : filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 erp-muted">
                    <Receipt className="w-7 h-7 mx-auto mb-2 opacity-40 text-amber-500" />
                    <p className="font-bold text-xs">لا توجد مطالبات أو فواتير مصروفات مسجلة حالياً</p>
                    <p className="text-[11px] mt-0.5 opacity-70">أضف أول مطالبة أو سجل توريد للربط المالي التلقائي</p>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-500/5 transition"
                  >
                    <td className="font-mono font-bold text-amber-500">{bill.billNumber}</td>
                    <td className="font-bold text-slate-900 dark:text-white">{bill.partyName}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
                        {bill.category === 'SUPPLIER_PURCHASE'
                          ? 'توريد خامات'
                          : bill.category === 'UTILITY_GAS'
                          ? 'غاز طبيعي'
                          : bill.category === 'UTILITY_ELEC'
                          ? 'كهرباء'
                          : 'تشغيلي'}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-left">{bill.totalAmount.toLocaleString()} ج.م</td>
                    <td className="font-mono font-bold text-emerald-500 text-left">{bill.paidAmount.toLocaleString()} ج.م</td>
                    <td className="font-mono font-bold text-rose-500 text-left">{bill.remainingAmount.toLocaleString()} ج.م</td>
                    <td className="font-mono text-[11px]">{bill.dueDate}</td>
                    <td>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                          bill.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : bill.status === 'PARTIAL'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        }`}
                      >
                        {bill.status === 'PAID' ? 'مسددة بالكامل ✓' : bill.status === 'PARTIAL' ? 'سداد جزئي' : 'مستحقة'}
                      </span>
                    </td>
                    <td className="text-center">
                      {bill.remainingAmount > 0 && (
                        <button
                          onClick={() => {
                            setSelectedBill(bill);
                            setPayAmount(bill.remainingAmount);
                            setIsPayModalOpen(true);
                          }}
                          className="erp-btn-compact px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition shadow-sm"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>سداد دفعة</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال قيد مطالبة جديدة */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="erp-card w-full max-w-lg p-5 rounded-2xl border shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                <span>إضافة مطالبة / فاتورة مصروفات والتزامات</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold erp-muted block mb-1">تصنيف الالتزام</label>
                <select
                  value={billCategory}
                  onChange={(e) => setBillCategory(e.target.value)}
                  className="w-full erp-input-compact border erp-sub outline-none"
                >
                  <option value="SUPPLIER_PURCHASE">موردو الخامات والتعبئة (AP)</option>
                  <option value="UTILITY_GAS">فاتورة غاز طبيعي للمصنع</option>
                  <option value="UTILITY_ELEC">فاتورة كهرباء صناعية</option>
                  <option value="RENT">إيجار معارض أو مقرات</option>
                  <option value="MAINTENANCE">صيانة وقطع غيار</option>
                </select>
              </div>

              {billCategory === 'SUPPLIER_PURCHASE' ? (
                <div>
                  <label className="text-[11px] font-bold erp-muted block mb-1">المورد المعتمد</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full erp-input-compact border erp-sub outline-none"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliersLookup.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.supplierCode}] {s.supplierName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-[11px] font-bold erp-muted block mb-1">اسم الجهة أو المستفيد</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شركة غاز مصر، شركة الكهرباء..."
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full erp-input-compact border erp-sub outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold erp-muted block mb-1">إجمالي المبلغ (ج.م)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full erp-input-compact border erp-sub outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold erp-muted block mb-1">المسدد مقدماً (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full erp-input-compact border erp-sub outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold erp-muted block mb-1">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full erp-input-compact border erp-sub outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold erp-muted block mb-1">ملاحظات الفاتورة</label>
                <input
                  type="text"
                  placeholder="ملاحظات أو رقم المطالبة الورقية..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full erp-input-compact border erp-sub outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="erp-btn-compact erp-sub border"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="erp-btn-compact btn-gold"
                >
                  {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ الفاتورة ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال سداد دفعة */}
      {isPayModalOpen && selectedBill && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="erp-card w-full max-w-md p-5 rounded-2xl border shadow-2xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <h3 className="font-black text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-500" />
                <span>سداد دفعة من المطالبة [{selectedBill.billNumber}]</span>
              </h3>
              <button onClick={() => setIsPayModalOpen(false)} className="p-1 rounded-lg hover:opacity-70">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayBill} className="space-y-3">
              <div className="p-3 rounded-xl erp-sub border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="erp-muted">المستفيد:</span>
                  <span className="font-bold">{selectedBill.partyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="erp-muted">إجمالي الفاتورة:</span>
                  <span className="font-mono font-bold">{selectedBill.totalAmount.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-rose-500">
                  <span>المتبقي غير المسدد:</span>
                  <span className="font-mono font-bold">{selectedBill.remainingAmount.toLocaleString()} ج.م</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold erp-muted block mb-1">مبلغ السداد الحالي (ج.م)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedBill.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full erp-input-compact border erp-sub outline-none font-mono font-bold text-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="erp-btn-compact erp-sub border"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || payAmount <= 0}
                  className="erp-btn-compact bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmitting ? 'جارٍ السداد...' : 'تأكيد السداد في الخزينة ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
