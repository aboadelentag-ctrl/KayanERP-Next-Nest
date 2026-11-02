'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Search,
  Plus,
  Printer,
  Calendar,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter,
  X,
  CreditCard,
  Building,
} from 'lucide-react';

interface Voucher {
  id: string;
  voucherNumber: string;
  voucherType: 'RECEIPT' | 'PAYMENT';
  voucherDate: string;
  amount: number;
  treasuryName: string;
  partyName: string;
  branchName: string;
  paymentMethod: string;
  notes: string;
  status: string;
  accountCode: string;
  accountName: string;
}

export default function TreasuryVouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'RECEIPT' | 'PAYMENT'>('RECEIPT');
  const [amount, setAmount] = useState<number | ''>('');
  const [partyName, setPartyName] = useState('');
  const [treasuryName, setTreasuryName] = useState('الخزينة المركزية - مصنع أبو عادل');
  const [branchName, setBranchName] = useState('المصنع المركزي (سندوب)');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // Print voucher preview
  const [printVoucher, setPrintVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    loadVouchers();
  }, []);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/treasury/vouchers');
      if (res.data?.success && res.data.data) {
        setVouchers(res.data.data);
      }
    } catch (err) {
      console.warn('API error, using demo vouchers:', err);
      setVouchers([
        {
          id: '1',
          voucherNumber: 'RV-2026-00101',
          voucherType: 'RECEIPT',
          voucherDate: new Date(Date.now() - 3600000 * 2).toISOString(),
          amount: 45000,
          treasuryName: 'خزينة المبيعات - المصنع المركزي',
          partyName: 'معرض حلواني الصباح - المعادي',
          branchName: 'المصنع المركزي (سندوب)',
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
          paymentMethod: 'CHEQUE',
          notes: 'سداد شيك مستحق عن توريدات مخبوزات وتورت الأسبوع الماضي',
          status: 'POSTED',
          accountCode: '110201',
          accountName: 'أوراق القبض والشيكات',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // KPIs
  const stats = useMemo(() => {
    let receipts = 0;
    let payments = 0;
    vouchers.forEach((v) => {
      const amt = Number(v.amount) || 0;
      if (v.voucherType === 'RECEIPT') receipts += amt;
      if (v.voucherType === 'PAYMENT') payments += amt;
    });
    return {
      receipts,
      payments,
      net: receipts - payments,
    };
  }, [vouchers]);

  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      const matchesType =
        selectedTypeFilter === 'ALL' || v.voucherType === selectedTypeFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        v.voucherNumber.toLowerCase().includes(q) ||
        v.partyName.toLowerCase().includes(q) ||
        v.notes.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [vouchers, selectedTypeFilter, searchTerm]);

  const handleOpenModal = (type: 'RECEIPT' | 'PAYMENT') => {
    setModalType(type);
    setAmount('');
    setPartyName('');
    setNotes('');
    setPaymentMethod('CASH');
    setModalOpen(true);
    setFeedback(null);
  };

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !partyName.trim()) {
      setFeedback({ msg: 'يرجى إدخال مبلغ صحيح والطرف المعني', success: false });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const payload = {
      voucherType: modalType,
      amount: Number(amount),
      partyName: partyName.trim(),
      treasuryName,
      branchName,
      paymentMethod,
      notes: notes.trim() || (modalType === 'RECEIPT' ? 'تحصيل نقدية معتمد' : 'صرف نقدية معتمد'),
    };

    try {
      const res = await axios.post('http://localhost:3000/treasury/vouchers', payload);
      if (res.data?.success && res.data.data) {
        setVouchers((prev) => [res.data.data, ...prev]);
        setFeedback({ msg: res.data.message || 'تم إصدار السند بنجاح في قاعدة البيانات ✓', success: true });
        setModalOpen(false);
      } else {
        setFeedback({ msg: res.data?.message || 'تعذر حفظ السند في قاعدة البيانات', success: false });
      }
    } catch (err: any) {
      console.error('Failed to post voucher to database:', err);
      setFeedback({ msg: err.response?.data?.message || 'فشل حفظ السند في خادم النظام وقاعدة البيانات', success: false });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 erp-card p-6 rounded-2xl shadow-sm border print:hidden">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black">إدارة الخزائن وسندات القبض والصرف</h1>
              <p className="text-xs erp-muted">
                إثبات تحصيلات المعارض والتجار، سداد المصروفات، والربط التلقائي بشجرة الحسابات العامة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenModal('RECEIPT')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>📥 إصدار سند قبض (تحصيل)</span>
          </button>

          <button
            onClick={() => handleOpenModal('PAYMENT')}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>📤 إصدار سند صرف (مدفوعات)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        {/* Total Receipts */}
        <div className="erp-card p-5 rounded-2xl border-r-4 border-r-emerald-500 border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold erp-muted">إجمالي المقبوضات والتحصيلات</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-500">
            {stats.receipts.toLocaleString()} ج.م
          </div>
          <span className="text-[10px] erp-muted mt-1 block">تحصيلات المعارض والعملاء والشيكات</span>
        </div>

        {/* Total Payments */}
        <div className="erp-card p-5 rounded-2xl border-r-4 border-r-rose-500 border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold erp-muted">إجمالي المصروفات والمدفوعات</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-rose-500">
            {stats.payments.toLocaleString()} ج.م
          </div>
          <span className="text-[10px] erp-muted mt-1 block">سداد فواتير خامات ومصروفات تشغيلية</span>
        </div>

        {/* Net Liquidity */}
        <div className="erp-card p-5 rounded-2xl border-r-4 border-r-indigo-500 border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold erp-muted">صافي السيولة النقدية بالخزائن</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-indigo-500">
            {stats.net.toLocaleString()} ج.م
          </div>
          <span className="text-[10px] erp-muted mt-1 block">الرصيد النقدي الفعلي المتاح بالصناديق</span>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 print:hidden ${
            feedback.success
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}
        >
          {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="erp-card p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
          <input
            type="text"
            placeholder="ابحث برقم السند، اسم الطرف، أو البيان..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 rounded-xl border erp-sub text-xs outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/5 dark:bg-slate-800/40 border">
            <button
              onClick={() => setSelectedTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedTypeFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'erp-muted hover:text-white'
              }`}
            >
              الكل ({vouchers.length})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('RECEIPT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedTypeFilter === 'RECEIPT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'erp-muted hover:text-white'
              }`}
            >
              سندات القبض
            </button>
            <button
              onClick={() => setSelectedTypeFilter('PAYMENT')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedTypeFilter === 'PAYMENT'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'erp-muted hover:text-white'
              }`}
            >
              سندات الصرف
            </button>
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="erp-card rounded-2xl border shadow-sm overflow-hidden print:hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="erp-sub border-b">
              <tr>
                <th className="p-3.5 font-bold">رقم السند</th>
                <th className="p-3.5 font-bold text-center">النوع</th>
                <th className="p-3.5 font-bold">التاريخ</th>
                <th className="p-3.5 font-bold font-mono">المبلغ (ج.م)</th>
                <th className="p-3.5 font-bold">الخزينة المودع / المنصرف منها</th>
                <th className="p-3.5 font-bold">الطرف المعني</th>
                <th className="p-3.5 font-bold">الفرع</th>
                <th className="p-3.5 font-bold">طريقة السداد</th>
                <th className="p-3.5 font-bold">البيان والشرح</th>
                <th className="p-3.5 font-bold text-center">طباعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center erp-muted">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري تحميل السندات وحركات الخزينة...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center erp-muted">
                    لا توجد سندات نقدية مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((v) => {
                  const isReceipt = v.voucherType === 'RECEIPT';
                  return (
                    <tr key={v.id} className="hover:bg-gray-500/5 transition">
                      <td className="p-3.5 font-mono font-bold text-indigo-500">{v.voucherNumber}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isReceipt
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}
                        >
                          {isReceipt ? '📥 قبض' : '📤 صرف'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">
                        {new Date(v.voucherDate).toLocaleDateString('ar-EG')}
                      </td>
                      <td className={`p-3.5 font-mono font-black text-sm ${isReceipt ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {Number(v.amount).toLocaleString()}
                      </td>
                      <td className="p-3.5 font-bold">{v.treasuryName}</td>
                      <td className="p-3.5 font-bold text-slate-200">{v.partyName}</td>
                      <td className="p-3.5 text-slate-400">{v.branchName}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono font-semibold">
                          {v.paymentMethod === 'CASH'
                            ? 'نقداً'
                            : v.paymentMethod === 'BANK_TRANSFER'
                            ? 'تحويل بنكي'
                            : v.paymentMethod === 'CHEQUE'
                            ? 'شيك'
                            : 'فيزا POS'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 max-w-xs truncate">{v.notes}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setPrintVoucher(v)}
                          className="p-1.5 rounded-lg border erp-sub hover:opacity-80 transition text-slate-400 hover:text-amber-400 cursor-pointer"
                          title="معاينة وطباعة السند A4"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Issue Voucher */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm print:hidden">
          <div className="w-full max-w-lg erp-card p-6 rounded-3xl border shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    modalType === 'RECEIPT'
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : 'bg-rose-500/10 text-rose-500'
                  }`}
                >
                  {modalType === 'RECEIPT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-black text-sm">
                    {modalType === 'RECEIPT' ? 'إصدار سند قبض نقدية (تحصيل)' : 'إصدار سند صرف نقدية (مدفوعات)'}
                  </h3>
                  <span className="text-[10px] erp-muted">ترحيل أوتوماتيكي للقيود وشجرة الحسابات</span>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl border erp-sub hover:opacity-80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitVoucher} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold erp-muted mb-1">
                  المبلغ (ج.م) <span className="text-amber-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl border erp-sub text-base font-black font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold erp-muted mb-1">
                  {modalType === 'RECEIPT' ? 'الطرف المستلم منه (العميل / التاجر)' : 'الطرف المصروف له (المورد / بند المصروف)'}{' '}
                  <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder={modalType === 'RECEIPT' ? 'اسم العميل أو التاجر' : 'اسم المورد أو بند الصرف'}
                  className="w-full px-3 py-2 rounded-xl border erp-sub text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold erp-muted mb-1">الخزينة المسؤولة</label>
                  <select
                    value={treasuryName}
                    onChange={(e) => setTreasuryName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border erp-sub text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="الخزينة المركزية - مصنع أبو عادل">الخزينة المركزية - مصنع أبو عادل</option>
                    <option value="خزينة مبيعات الصالة والمعارض">خزينة مبيعات الصالة والمعارض</option>
                    <option value="خزينة معرض المنصورة الرئيسي">خزينة معرض المنصورة الرئيسي</option>
                    <option value="خزينة معرض دكرنس">خزينة معرض دكرنس</option>
                    <option value="خزينة المصروفات النثرية والعهد">خزينة المصروفات النثرية والعهد</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold erp-muted mb-1">طريقة السداد</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border erp-sub text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="CASH">نقداً (Cash)</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                    <option value="CHEQUE">شيك بنكي</option>
                    <option value="POS_VISA">شبكة / فيزا POS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold erp-muted mb-1">البيان والشرح التفصيلي</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="بيان سبب القبض أو الصرف..."
                  className="w-full px-3 py-2 rounded-xl border erp-sub text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 py-2.5 rounded-xl text-white font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                    modalType === 'RECEIPT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>اعتماد وإصدار السند فوراً</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border erp-sub text-xs font-bold hover:opacity-80 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT MODAL: A4 Official Voucher Receipt */}
      {printVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white text-black p-8 rounded-2xl shadow-2xl space-y-6 relative print:p-0 print:shadow-none print:w-full print:max-w-none">
            {/* Close & Print Action Buttons */}
            <div className="flex justify-between items-center print:hidden border-b pb-4">
              <span className="text-xs font-bold text-gray-500">معاينة سند الطباعة الرسمي القياسي A4</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة الآن</span>
                </button>
                <button
                  onClick={() => setPrintVoucher(null)}
                  className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Official Header */}
            <div className="flex justify-between items-center border-b-2 border-black pb-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">مصانع وحلواني أبو عادل</h2>
                <p className="text-xs text-gray-600">قطاع التصنيع والحلويات الشرقية والغربية</p>
                <p className="text-[10px] text-gray-500">المركز الرئيسي: سندوب - المنطقة الصناعية - المنصورة</p>
              </div>

              <div className="text-center">
                <div className="inline-block px-4 py-1.5 border-2 border-black font-black text-base rounded-lg mb-1">
                  {printVoucher.voucherType === 'RECEIPT' ? 'سَنَد قَبْض نَقْدِيَّة' : 'سَنَد صَرْف نَقْدِيَّة'}
                </div>
                <div className="font-mono text-xs font-bold text-gray-700">
                  رقم: {printVoucher.voucherNumber}
                </div>
              </div>
            </div>

            {/* Voucher Details */}
            <div className="grid grid-cols-2 gap-4 text-xs font-bold">
              <div>
                <span className="text-gray-500">التاريخ: </span>
                <span className="font-mono">{new Date(printVoucher.voucherDate).toLocaleDateString('ar-EG')}</span>
              </div>
              <div className="text-left">
                <span className="text-gray-500">الفرع / الخزينة: </span>
                <span>{printVoucher.treasuryName}</span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-300 rounded-xl space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold">
                  {printVoucher.voucherType === 'RECEIPT' ? 'استلمنا من السيد / السادة:' : 'صرفنا إلى السيد / السادة:'}
                </span>
                <span className="font-black text-sm text-gray-900">{printVoucher.partyName}</span>
              </div>

              <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                <span className="font-bold">مبلغ وقدره:</span>
                <span className="font-mono font-black text-base text-gray-900">
                  {Number(printVoucher.amount).toLocaleString()} جنيه مصري فقط لا غير
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-gray-200 pt-2">
                <span className="font-bold">طريقة السداد:</span>
                <span className="font-bold text-gray-700">
                  {printVoucher.paymentMethod === 'CASH'
                    ? 'نقداً بالخزينة'
                    : printVoucher.paymentMethod === 'BANK_TRANSFER'
                    ? 'تحويل بنكي'
                    : printVoucher.paymentMethod === 'CHEQUE'
                    ? 'شيك'
                    : 'فيزا POS'}
                </span>
              </div>

              <div className="border-t border-gray-200 pt-2">
                <span className="font-bold block mb-1">وذلك عن:</span>
                <p className="text-gray-700 font-normal leading-relaxed">{printVoucher.notes}</p>
              </div>
            </div>

            {/* Official Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-6 text-center text-xs font-bold border-t border-gray-300">
              <div>
                <span className="text-gray-500 block mb-8">المستلم</span>
                <div className="border-b border-dashed border-gray-400 w-3/4 mx-auto"></div>
              </div>
              <div>
                <span className="text-gray-500 block mb-8">أمين الخزينة</span>
                <div className="border-b border-dashed border-gray-400 w-3/4 mx-auto"></div>
              </div>
              <div>
                <span className="text-gray-500 block mb-8">المدير المالي / الاعتماد</span>
                <div className="border-b border-dashed border-gray-400 w-3/4 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
