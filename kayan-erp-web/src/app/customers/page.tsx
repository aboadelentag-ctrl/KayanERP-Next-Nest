'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  X,
  Loader2,
  Store,
  Building2,
  Truck,
  TrendingUp,
  Receipt,
  FileText,
} from 'lucide-react';

interface Customer {
  id: string;
  customer_name: string;
  customer_code: string;
  customer_type: 'RETAIL' | 'WHOLESALE' | 'DIST_DAILY' | 'CORPORATE' | string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  payment_terms?: string;
  credit_limit?: number;
  active: boolean;
  notes?: string;
  company_id?: string;
}

export default function CustomersPage() {
  const { isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [activeOnlyFilter, setActiveOnlyFilter] = useState<boolean>(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formType, setFormType] = useState<string>('WHOLESALE');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formTaxNumber, setFormTaxNumber] = useState<string>('');
  const [formPaymentTerms, setFormPaymentTerms] = useState<string>('آجل 15 يوم');
  const [formCreditLimit, setFormCreditLimit] = useState<number>(50000);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formActive, setFormActive] = useState<boolean>(true);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // Daily Order Pad Modal State
  const [isOrderPadOpen, setIsOrderPadOpen] = useState<boolean>(false);
  const [padCustomer, setPadCustomer] = useState<Customer | null>(null);
  const [padItemName, setPadItemName] = useState<string>('بسبوسة سمن بلدي فاخرة');
  const [padQuantity, setPadQuantity] = useState<number>(20);
  const [padNotes, setPadNotes] = useState<string>('تسليم وردية الصباح 7:00 ص');
  const [padSubmitted, setPadSubmitted] = useState<boolean>(false);

  useEffect(() => {
    fetchCustomers();
  }, [activeOnlyFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/sales/customers', {
        params: {
          activeOnly: activeOnlyFilter,
        },
      });
      if (res.data?.success) {
        setCustomers(res.data.data || []);
      } else if (Array.isArray(res.data)) {
        setCustomers(res.data);
      }
    } catch (err: any) {
      console.warn('Error fetching customers from Neon DB:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCustomers();
    setIsRefreshing(false);
  };

  // KPIs
  const totalCount = customers.length;
  const dailyTradersCount = customers.filter((c) => c.customer_type === 'DIST_DAILY').length;
  const wholesaleCount = customers.filter((c) => c.customer_type === 'WHOLESALE').length;
  const totalCreditLimit = customers.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);

  // Filtered
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (selectedTypeFilter !== 'ALL' && c.customer_type !== selectedTypeFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const matchesName = c.customer_name?.toLowerCase().includes(s);
        const matchesCode = c.customer_code?.toLowerCase().includes(s);
        const matchesPhone = c.phone?.toLowerCase().includes(s);
        const matchesAddress = c.address?.toLowerCase().includes(s);
        if (!matchesName && !matchesCode && !matchesPhone && !matchesAddress) {
          return false;
        }
      }
      return true;
    });
  }, [customers, selectedTypeFilter, searchTerm]);

  // Open Create
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormName('');
    setFormCode(`CUST-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormType('WHOLESALE');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormTaxNumber('');
    setFormPaymentTerms('آجل 15 يوم');
    setFormCreditLimit(50000);
    setFormNotes('');
    setFormActive(true);
    setIsModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (c: Customer) => {
    setIsEditMode(true);
    setEditingId(c.id);
    setFormName(c.customer_name);
    setFormCode(c.customer_code);
    setFormType(c.customer_type || 'WHOLESALE');
    setFormPhone(c.phone || '');
    setFormEmail(c.email || '');
    setFormAddress(c.address || '');
    setFormTaxNumber(c.tax_number || '');
    setFormPaymentTerms(c.payment_terms || 'نقدي');
    setFormCreditLimit(Number(c.credit_limit || 0));
    setFormNotes(c.notes || '');
    setFormActive(c.active !== false);
    setIsModalOpen(true);
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedback({ msg: 'يرجى كتابة اسم العميل أو التاجر', success: false });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const payload = {
      customer_name: formName.trim(),
      customer_code: formCode.trim(),
      customer_type: formType,
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      address: formAddress.trim(),
      tax_number: formTaxNumber.trim() || undefined,
      payment_terms: formPaymentTerms.trim(),
      credit_limit: Number(formCreditLimit || 0),
      notes: formNotes.trim(),
      active: formActive,
    };

    try {
      if (isEditMode && editingId) {
        await axios.put(`http://localhost:3000/sales/customers/${editingId}`, payload);
        setFeedback({ msg: `تم تحديث بيانات العميل [${payload.customer_name}] بنجاح ✓`, success: true });
      } else {
        await axios.post('http://localhost:3000/sales/customers', payload);
        setFeedback({ msg: `تم إضافة العميل [${payload.customer_name}] بنجاح إلى Neon DB ✓`, success: true });
      }

      setIsModalOpen(false);
      await fetchCustomers();
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر حفظ بيانات العميل، تحقق من المدخلات', success: false });
    } finally {
      setSubmitting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!customers.length) return;
    const headers = ['الكود', 'الاسم', 'النوع', 'الهاتف', 'العنوان', 'الحد الائتماني', 'شروط السداد', 'الحالة'];
    const rows = filteredCustomers.map((c) => [
      c.customer_code,
      c.customer_name,
      c.customer_type,
      c.phone || '',
      c.address || '',
      c.credit_limit || 0,
      c.payment_terms || '',
      c.active ? 'نشط' : 'موقوف',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customers_directory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'DIST_DAILY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">سحب يومي</span>;
      case 'WHOLESALE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">توزيع جملة</span>;
      case 'CORPORATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">فنادق ومناسبات</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">تجزئة مباشر</span>;
    }
  };

  return (
    <div dir="rtl" className="w-full px-3 sm:px-5 py-3 space-y-4 min-h-screen">
      {/* الشريط العلوي */}
      <div className="erp-card rounded-xl p-3 sm:p-4 border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white shadow-md">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              دليل العملاء وشجرة التجار ومنافذ التوزيع
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                Neon DB Live
              </span>
            </h1>
            <p className="text-xs text-gray-400">
              إدارة حسابات التجار، الفروع التابعة، الحدود الائتمانية، وحصر طلبيات اليوم المرنة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={handleExportCSV}
            className="erp-btn-compact border border-gray-600 hover:border-gray-400 text-gray-300 bg-slate-900/40"
            title="تصدير السجل إلى Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>تصدير (CSV)</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="erp-btn-compact border border-gray-600 text-gray-300 hover:border-gray-400 bg-slate-900/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="btn-gold erp-btn-compact px-4 text-slate-950 font-black rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة عميل / تاجر جديد</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-bold border flex items-center justify-between ${
            feedback.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.msg}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* بطاقات المؤشرات اللحظية المضغوطة (Enterprise Compact KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="erp-card rounded-xl p-3 border shadow-sm">
          <div className="text-[11px] font-bold text-gray-400 flex items-center justify-between">
            <span>إجمالي العملاء المسجلين</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-1 text-lg font-black text-sky-400 font-mono">
            {totalCount} <span className="text-[10px] text-gray-400 font-normal">عميل</span>
          </div>
        </div>

        <div className="erp-card rounded-xl p-3 border shadow-sm">
          <div className="text-[11px] font-bold text-gray-400 flex items-center justify-between">
            <span>تجار السحب اليومي</span>
            <Truck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 text-lg font-black text-amber-400 font-mono">
            {dailyTradersCount} <span className="text-[10px] text-gray-400 font-normal">تاجر</span>
          </div>
        </div>

        <div className="erp-card rounded-xl p-3 border shadow-sm">
          <div className="text-[11px] font-bold text-gray-400 flex items-center justify-between">
            <span>عملاء الجملة والتوزيع</span>
            <Store className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-1 text-lg font-black text-blue-400 font-mono">
            {wholesaleCount} <span className="text-[10px] text-gray-400 font-normal">منفذ</span>
          </div>
        </div>

        <div className="erp-card rounded-xl p-3 border shadow-sm">
          <div className="text-[11px] font-bold text-gray-400 flex items-center justify-between">
            <span>إجمالي الحدود الائتمانية</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 text-lg font-black text-emerald-400 font-mono">
            {totalCreditLimit.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">ج.م</span>
          </div>
        </div>
      </div>

      {/* شريط البحث والتصفية */}
      <div className="erp-card rounded-xl p-3 border shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم العميل، الكود، الهاتف، أو العنوان..."
            className="w-full erp-input-compact pr-9 bg-slate-900/50 border border-gray-700 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'كافة التصنيفات' },
            { id: 'WHOLESALE', label: 'توزيع جملة' },
            { id: 'DIST_DAILY', label: 'سحب يومي' },
            { id: 'RETAIL', label: 'تجزئة مباشر' },
            { id: 'CORPORATE', label: 'فنادق وشركات' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTypeFilter(tab.id)}
              className={`erp-btn-compact px-3 text-[11px] ${
                selectedTypeFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-900/40 text-gray-300 border border-gray-700 hover:border-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer mr-2 select-none">
            <input
              type="checkbox"
              checked={activeOnlyFilter}
              onChange={(e) => setActiveOnlyFilter(e.target.checked)}
              className="rounded accent-amber-500"
            />
            <span>النشطين فقط</span>
          </label>
        </div>
      </div>

      {/* جدول البيانات العريض عالي الكثافة (Compact Fluid Enterprise Table) */}
      <div className="erp-card rounded-xl border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="erp-table-compact w-full text-right">
            <thead>
              <tr className="border-b bg-slate-900/60 text-gray-400 font-black">
                <th>كود العميل</th>
                <th>اسم العميل / التاجر</th>
                <th>نوع الحساب</th>
                <th>رقم الهاتف</th>
                <th>العنوان / خط السير</th>
                <th>الحد الائتماني</th>
                <th>شروط السداد</th>
                <th>الحالة</th>
                <th className="text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>جاري استعلام بيانات العملاء من Neon DB...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 font-bold">
                    لا توجد حسابات عملاء مطابقة لمعايير البحث
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="font-mono text-xs font-bold text-amber-400">{c.customer_code}</td>
                    <td className="font-bold text-gray-200">
                      <div>{c.customer_name}</div>
                      {c.tax_number && <div className="text-[10px] text-gray-500 font-mono">ض.ق.م: {c.tax_number}</div>}
                    </td>
                    <td>{getTypeBadge(c.customer_type)}</td>
                    <td className="font-mono text-xs text-gray-300">
                      {c.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-500" />
                          {c.phone}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-300 max-w-xs truncate" title={c.address || ''}>
                      {c.address ? (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                          {c.address}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="font-mono font-bold text-xs text-emerald-400">
                      {Number(c.credit_limit || 0).toLocaleString()} ج.م
                    </td>
                    <td className="text-xs text-gray-300">{c.payment_terms || 'نقدي'}</td>
                    <td>
                      {c.active ? (
                        <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          نشط
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                          موقوف
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setPadCustomer(c);
                            setPadSubmitted(false);
                            setIsOrderPadOpen(true);
                          }}
                          className="px-2 py-1 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-bold flex items-center gap-1"
                          title="مسودة طلبية سريعة"
                        >
                          <FileText className="w-3 h-3" />
                          <span>طلبية</span>
                        </button>

                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1 rounded hover:bg-slate-700/60 text-gray-300 hover:text-amber-400 transition-colors"
                          title="تعديل بيانات العميل"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة إضافة / تعديل عميل */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="erp-card border rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black text-gray-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                <span>{isEditMode ? 'تعديل بيانات العميل / التاجر' : 'تسجيل عميل أو تاجر جديد'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-300 block mb-1">اسم العميل أو التاجر *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="مثال: حلواني السلام - المنصورة"
                    className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-300 block mb-1">كود العميل</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-300 block mb-1">نوع العميل</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100"
                  >
                    <option value="WHOLESALE">توزيع جملة (Wholesale)</option>
                    <option value="DIST_DAILY">تاجر سحب يومي (Daily Dist)</option>
                    <option value="RETAIL">عميل تجزئة مباشر (Retail)</option>
                    <option value="CORPORATE">فنادق وقاعات مناسبات (Corporate)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-300 block mb-1">رقم الهاتف والتواصل</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="010xxxxxxxx"
                    className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-300 block mb-1">الحد الائتماني (ج.م)</label>
                  <input
                    type="number"
                    value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(Number(e.target.value))}
                    className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100 font-mono text-emerald-400"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-300 block mb-1">شروط السداد</label>
                  <input
                    type="text"
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    placeholder="مثال: آجل 15 يوم / نقدي فوري"
                    className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-300 block mb-1">العنوان ومنطقة التوزيع</label>
                  <input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="المدينة والشارع وموقع التسليم"
                    className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-300 block mb-1">الرقم الضريبي (إن وجد)</label>
                  <input
                    type="text"
                    value={formTaxNumber}
                    onChange={(e) => setFormTaxNumber(e.target.value)}
                    placeholder="000-000-000"
                    className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-300 block mb-1">ملاحظات ومواصفات التعامل</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="ملاحظات التسليم، مواعيد السحب، الخصومات المعتمدة..."
                  className="w-full p-2 bg-slate-900/60 border border-gray-700 rounded-lg text-gray-100 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="accent-amber-500 rounded"
                />
                <label htmlFor="activeToggle" className="font-bold text-gray-300 cursor-pointer">
                  حساب نشط ومصرح له بالسحب
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="erp-btn-compact px-4 border border-gray-600 text-gray-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-gold erp-btn-compact px-5 text-slate-950 font-black rounded-lg"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>حفظ وتثبيت الحساب</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة مسودة طلبيات اليوم المرنة (Quick Order Pad Modal) */}
      {isOrderPadOpen && padCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="erp-card border rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>مسودة طلبية اليوم المرنة - {padCustomer.customer_name}</span>
                </h3>
                <span className="text-[10px] text-gray-400">كود: {padCustomer.customer_code}</span>
              </div>
              <button onClick={() => setIsOrderPadOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {padSubmitted ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-gray-100">تم ترحيل مسودة طلبية اليوم بنجاح</h4>
                <p className="text-xs text-gray-400">
                  تم إدراج البنود تلقائياً في خطة التوزيع والشحن لصالة الإنتاج
                </p>
                <button
                  onClick={() => setIsOrderPadOpen(false)}
                  className="erp-btn-compact px-4 bg-slate-800 text-gray-200"
                >
                  إغلاق
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-300 block mb-1">الصنف المطلوب</label>
                  <input
                    type="text"
                    value={padItemName}
                    onChange={(e) => setPadItemName(e.target.value)}
                    className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-300 block mb-1">الكمية المقدرة (كجم/سرفيس)</label>
                    <input
                      type="number"
                      value={padQuantity}
                      onChange={(e) => setPadQuantity(Number(e.target.value))}
                      className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100 font-mono text-amber-400"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-300 block mb-1">ميعاد التسليم</label>
                    <input
                      type="text"
                      value={padNotes}
                      onChange={(e) => setPadNotes(e.target.value)}
                      className="w-full erp-input-compact bg-slate-900/60 border border-gray-700 text-gray-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsOrderPadOpen(false)}
                    className="erp-btn-compact px-4 border border-gray-600 text-gray-300"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => setPadSubmitted(true)}
                    className="btn-gold erp-btn-compact px-5 text-slate-950 font-black rounded-lg"
                  >
                    <span>تأكيد مسودة الطلبية</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
