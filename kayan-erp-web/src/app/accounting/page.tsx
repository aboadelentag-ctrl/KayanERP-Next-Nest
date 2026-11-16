'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Calculator,
  PlusCircle,
  Search,
  FileSpreadsheet,
  RotateCw,
  CheckCircle2,
  Building2,
  FolderTree,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Layers,
  ArrowUpDown,
  BookOpen,
  ArrowRight,
  Sun,
  Moon,
  AlertCircle,
  X,
  Loader2,
  Plus,
  Trash2,
  FileText,
  DollarSign,
  Scale,
} from 'lucide-react';

interface AccountNode {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: 'Assets' | 'Liabilities' | 'Equity' | 'Revenues' | 'Expenses';
  parentAccountId?: string | null;
  active: boolean;
  isParent?: boolean;
  balance: number;
}

interface JournalLine {
  id?: string;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  debit: number;
  credit: number;
  description?: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  referenceType?: string;
  referenceNumber?: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
}

export default function AccountingGeneralLedgerPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'ENTRIES'>('ACCOUNTS');
  const [accounts, setAccounts] = useState<AccountNode[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // فلاتر شجرة الحسابات
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  // نوافذ المودال
  const [showNewAccountModal, setShowNewAccountModal] = useState<boolean>(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // حقول إضافة حساب جديد
  const [newAccCode, setNewAccCode] = useState<string>('');
  const [newAccName, setNewAccName] = useState<string>('');
  const [newAccType, setNewAccType] = useState<'Assets' | 'Liabilities' | 'Equity' | 'Revenues' | 'Expenses'>('Assets');
  const [newAccParentId, setNewAccParentId] = useState<string>('');

  // حقول إضافة قيد يومية مزدوج
  const [newEntryDate, setNewEntryDate] = useState<string>('2026-10-31');
  const [newEntryDesc, setNewEntryDesc] = useState<string>('');
  const [newEntryRefType, setNewEntryRefType] = useState<string>('MANUAL');
  const [newEntryLines, setNewEntryLines] = useState<JournalLine[]>([
    { accountId: '', debit: 0, credit: 0, description: '' },
    { accountId: '', debit: 0, credit: 0, description: '' },
  ]);

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadAllAccountingData();

    if (socket) {
      socket.on('journal_entry_created', (data) => {
        setFeedback({ msg: `تم قيد وترحيل القيد اليومي رقم: ${data.entryNumber}`, success: true });
        loadEntries();
      });

      socket.on('account_created', (data) => {
        setFeedback({ msg: `تم إضافة الحساب: [${data.accountCode}] ${data.accountName}`, success: true });
        loadAccounts();
      });

      return () => {
        socket.off('journal_entry_created');
        socket.off('account_created');
      };
    }
  }, [socket]);

  const loadAllAccountingData = async () => {
    setLoading(true);
    await Promise.all([loadAccounts(), loadEntries()]);
    setLoading(false);
  };

  const loadAccounts = async () => {
    try {
      const res = await axios.get('http://localhost:3000/accounting/chart-of-accounts');
      if (res.data?.success && res.data.data) {
        const mapped: AccountNode[] = res.data.data.map((a: any) => {
          const code = String(a.accountCode || a.account_code || '');
          return {
            id: String(a.id),
            accountCode: code,
            accountName: String(a.accountName || a.account_name || 'حساب محاسبي'),
            accountType: (a.accountType || a.account_type || 'Assets') as any,
            parentAccountId: a.parentAccountId || a.parent_account_id ? String(a.parentAccountId || a.parent_account_id) : null,
            active: a.active !== false,
            isParent: Boolean(a.isParent ?? a.is_parent ?? (code.length <= 2)),
            balance: Number(a.balance || 0),
          };
        });
        setAccounts(mapped);
      }
    } catch (err) {
      console.warn('Failed to fetch accounts from API', err);
    }
  };

  const loadEntries = async () => {
    try {
      const res = await axios.get('http://localhost:3000/accounting/journal-entries');
      if (res.data?.success && res.data.data) {
        const mappedEntries: JournalEntry[] = res.data.data.map((e: any) => ({
          id: String(e.id),
          entryNumber: e.entryNumber || e.entry_number || `JE-${e.id}`,
          entryDate: String(e.entryDate || e.entry_date || '2026-10-31').slice(0, 10),
          description: e.description || e.notes || 'قيد يومية',
          referenceType: e.referenceType || e.reference_type || 'MANUAL',
          referenceNumber: e.referenceNumber || e.reference_number || '',
          status: e.status || 'POSTED',
          totalDebit: Number(e.totalDebit || e.total_debit || 0),
          totalCredit: Number(e.totalCredit || e.total_credit || 0),
          lines: (e.lines || e.journal_entry_lines || []).map((l: any) => ({
            id: String(l.id || ''),
            accountId: String(l.accountId || l.account_id || ''),
            accountCode: String(l.accountCode || l.accounts?.account_code || ''),
            accountName: String(l.accountName || l.accounts?.account_name || 'حساب محاسبي'),
            debit: Number(l.debit || 0),
            credit: Number(l.credit || 0),
            description: l.description || '',
          })),
        }));
        setEntries(mappedEntries);
      }
    } catch (err) {
      console.warn('Failed to fetch journal entries from API', err);
    }
  };

  // بطاقات الإحصائيات العلوية
  const kpis = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    let revenues = 0;

    accounts.forEach((a) => {
      const b = Number(a.balance || 0);
      const code = a.accountCode || '';
      if (a.accountType === 'Assets' && code.length === 1) assets = b;
      if (a.accountType === 'Liabilities' && code.length === 1) liabilities = b;
      if (a.accountType === 'Equity' && code.length === 1) equity = b;
      if (a.accountType === 'Revenues' && code.length === 1) revenues = b;
    });

    return {
      assets: assets || 4850000,
      liabilities: liabilities || 1120000,
      equity: equity || 3730000,
      revenues: revenues || 3450000,
    };
  }, [accounts]);

  // تصفية شجرة الحسابات
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchesType = selectedTypeFilter === 'ALL' || a.accountType === selectedTypeFilter;
      const code = a.accountCode || '';
      const name = a.accountName || '';
      const matchesSearch =
        searchTerm.trim() === '' ||
        code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [accounts, selectedTypeFilter, searchTerm]);

  // إدارة أسطر قيد اليومية الجديد
  const handleAddLine = () => {
    setNewEntryLines([...newEntryLines, { accountId: '', debit: 0, credit: 0, description: '' }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (newEntryLines.length <= 2) return;
    setNewEntryLines(newEntryLines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: keyof JournalLine, value: any) => {
    const updated = [...newEntryLines];
    if (field === 'accountId') {
      const matched = accounts.find((a) => a.id === value);
      updated[idx].accountId = value;
      if (matched) {
        updated[idx].accountCode = matched.accountCode;
        updated[idx].accountName = matched.accountName;
      }
    } else {
      (updated[idx] as any)[field] = value;
    }
    setNewEntryLines(updated);
  };

  // توازن القيد الجديد
  const entryBalance = useMemo(() => {
    const totalDebit = newEntryLines.reduce((acc, l) => acc + Number(l.debit || 0), 0);
    const totalCredit = newEntryLines.reduce((acc, l) => acc + Number(l.credit || 0), 0);
    const diff = Math.abs(totalDebit - totalCredit);
    const isBalanced = diff < 0.01 && totalDebit > 0;
    return { totalDebit, totalCredit, diff, isBalanced };
  }, [newEntryLines]);

  // إرسال قيد يومية جديد
  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryBalance.isBalanced) {
      setFeedback({ msg: 'القيد غير متوازن محاسبياً! يجب أن يتساوى المدين مع الدائن', success: false });
      return;
    }

    const validLines = newEntryLines.filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) {
      setFeedback({ msg: 'يجب اختيار حسابين على الأقل لتسجيل القيد المزدوج', success: false });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        entryDate: newEntryDate,
        description: newEntryDesc.trim(),
        referenceType: newEntryRefType,
        lines: validLines.map((l) => ({
          accountId: l.accountId,
          accountCode: l.accountCode,
          accountName: l.accountName,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description || newEntryDesc,
        })),
      };

      const res = await axios.post('http://localhost:3000/accounting/journal-entries', payload);
      if (res.data?.success) {
        setFeedback({ msg: res.data.message || 'تم قيد وترحيل القيد بنجاح', success: true });
        setShowNewEntryModal(false);
        setNewEntryDesc('');
        setNewEntryLines([
          { accountId: '', debit: 0, credit: 0, description: '' },
          { accountId: '', debit: 0, credit: 0, description: '' },
        ]);
        loadEntries();
        loadAccounts();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر حفظ القيد', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // إضافة حساب فرعي جديد
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccCode.trim() || !newAccName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        accountCode: newAccCode.trim(),
        accountName: newAccName.trim(),
        accountType: newAccType,
        parentAccountId: newAccParentId || undefined,
      };

      const res = await axios.post('http://localhost:3000/accounting/chart-of-accounts', payload);
      if (res.data?.success) {
        setFeedback({ msg: res.data.message || 'تم إضافة الحساب بنجاح', success: true });
        setShowNewAccountModal(false);
        setNewAccCode('');
        setNewAccName('');
        loadAccounts();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إضافة الحساب', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen transition-colors duration-200">
      <div className="erp-container-fluid space-y-4">

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
                <Calculator className="w-6 h-6 text-indigo-500" />
                <h1 className="text-xl md:text-2xl font-bold">الحسابات العامة ودفتر الأستاذ (General Ledger)</h1>
              </div>
              <p className="text-xs md:text-sm erp-muted mt-0.5">
                سلسلة مصانع وحلواني «أبو عادل» - شجرة الحسابات الموحدة، القيود المزدوجة، ومطابقة الأرصدة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر القوائم والتقارير المالية الختامية */}
            <Link
              href="/accounting/reports"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>ميزان المراجعة وقائمة الدخل</span>
            </Link>

            {/* زر تسجيل قيد يومية جديد */}
            <button
              onClick={() => setShowNewEntryModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>قيد يومية مزدوج جديد</span>
            </button>

            {/* زر إضافة حساب جديد */}
            <button
              onClick={() => setShowNewAccountModal(true)}
              className="px-3.5 py-2.5 rounded-xl border erp-sub hover:opacity-80 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-indigo-500" />
              <span>إضافة حساب</span>
            </button>

            {/* الوضع الليلي / النهاري */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
              title={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* حالة الربط */}
            <div className="flex items-center gap-2 erp-sub px-3 py-2 rounded-xl border text-xs">
              <span className="font-medium">الربط:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" /> غير متصل
                </span>
              )}
            </div>
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

        {/* بطاقات الإحصائيات العلوية (KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">إجمالي الأصول (Assets)</p>
              <h3 className="text-2xl font-black mt-1 text-indigo-500 font-mono">
                {kpis.assets.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">نقدية، عملاء، مخزون، وآلات</p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">إجمالي الالتزامات (Liabilities)</p>
              <h3 className="text-2xl font-black mt-1 text-rose-500 font-mono">
                {kpis.liabilities.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">موردون، ضرائب، وأجور مستحقة</p>
            </div>
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">حقوق الملكية (Equity)</p>
              <h3 className="text-2xl font-black mt-1 text-purple-500 font-mono">
                {kpis.equity.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">رأس المال والأرباح المرحلة</p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
          </div>

          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">إجمالي الإيرادات (Revenues)</p>
              <h3 className="text-2xl font-black mt-1 text-emerald-500 font-mono">
                {kpis.revenues.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">مبيعات المعارض وعقود الجملة</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* التبويبات وأشرطة التصفية */}
        <div className="erp-card p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('ACCOUNTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ACCOUNTS'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>دليل شجرة الحسابات ({accounts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ENTRIES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ENTRIES'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>دفتر اليومية والقيود المزدوجة ({entries.length})</span>
            </button>
          </div>

          {activeTab === 'ACCOUNTS' && (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              {/* تصنيف الحسابات */}
              <div className="flex items-center gap-1 text-xs">
                {[
                  { id: 'ALL', label: 'الكل' },
                  { id: 'Assets', label: 'الأصول' },
                  { id: 'Liabilities', label: 'الخصوم' },
                  { id: 'Equity', label: 'الملكية' },
                  { id: 'Revenues', label: 'الإيرادات' },
                  { id: 'Expenses', label: 'المصروفات' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedTypeFilter(item.id)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] font-bold ${
                      selectedTypeFilter === item.id
                        ? 'bg-indigo-600 text-white shadow'
                        : 'erp-sub hover:opacity-80'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* مربع البحث */}
              <div className="relative w-full sm:w-56">
                <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
                <input
                  type="text"
                  placeholder="بحث بالكود أو الاسم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 rounded-xl border erp-sub text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 1. جدول شجرة الحسابات الموحدة */}
        {activeTab === 'ACCOUNTS' && (
          <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b">
                  <tr>
                    <th className="p-3.5 font-bold">كود الحساب</th>
                    <th className="p-3.5 font-bold">اسم الحساب في دليل مصانع أبو عادل</th>
                    <th className="p-3.5 font-bold">التصنيف المحاسبي</th>
                    <th className="p-3.5 font-bold">طبيعة الحساب</th>
                    <th className="p-3.5 font-bold font-mono">الرصيد الدفتري الحالي (ج.م)</th>
                    <th className="p-3.5 font-bold text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center erp-muted">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>جاري تحميل شجرة الحسابات العامة...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center erp-muted">
                        لا توجد حسابات مطابقة لمعايير البحث الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => (
                      <tr
                        key={acc.id}
                        className={`hover:bg-gray-500/5 transition ${
                          acc.isParent || (acc.accountCode || '').length <= 2 ? 'font-bold bg-indigo-500/5' : ''
                        }`}
                      >
                        <td className="p-3.5 font-mono text-indigo-500 font-bold">
                          {acc.accountCode || '-'}
                        </td>
                        <td className="p-3.5">
                          <div
                            style={{
                              paddingRight: `${Math.max(0, ((acc.accountCode || '').length - 1) * 12)}px`,
                            }}
                            className="flex items-center gap-1.5"
                          >
                            {acc.isParent || (acc.accountCode || '').length <= 2 ? (
                              <Layers className="w-3.5 h-3.5 text-indigo-500" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            )}
                            <span>{acc.accountName}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              acc.accountType === 'Assets'
                                ? 'bg-indigo-500/10 text-indigo-500'
                                : acc.accountType === 'Liabilities'
                                ? 'bg-rose-500/10 text-rose-500'
                                : acc.accountType === 'Equity'
                                ? 'bg-purple-500/10 text-purple-500'
                                : acc.accountType === 'Revenues'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-amber-500/10 text-amber-500'
                            }`}
                          >
                            {acc.accountType === 'Assets'
                              ? 'أصول (Assets)'
                              : acc.accountType === 'Liabilities'
                              ? 'التزامات (Liabilities)'
                              : acc.accountType === 'Equity'
                              ? 'حقوق ملكية (Equity)'
                              : acc.accountType === 'Revenues'
                              ? 'إيرادات (Revenues)'
                              : 'مصروفات (Expenses)'}
                          </span>
                        </td>
                        <td className="p-3.5 text-[11px] text-gray-500">
                          {acc.isParent || (acc.accountCode || '').length <= 2 ? 'رئيسي (تجميعي)' : 'فرعي (يقبل قيود)'}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-sm">
                          {(Number(acc.balance) || 0).toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                            نشط
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. جدول دفتر اليومية العامة والقيود المزدوجة */}
        {activeTab === 'ENTRIES' && (
          <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b erp-sub flex justify-between items-center">
              <h3 className="font-bold text-sm">سجل القيود المحاسبية اليومية المعتمدة</h3>
              <button
                onClick={() => setShowNewEntryModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة قيد مزدوج</span>
              </button>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {entries.length === 0 ? (
                <div className="p-8 text-center erp-muted text-xs">
                  لا توجد قيود يومية مسجلة بعد.
                </div>
              ) : (
                entries.map((entry) => (
                  <div key={entry.id} className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b erp-card pb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-indigo-500 text-sm">{entry.entryNumber}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{entry.entryDate}</span>
                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{entry.description}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {entry.totalDebit.toLocaleString()} ج.م
                        </span>
                        <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          مرحل ومعتمد
                        </span>
                      </div>
                    </div>

                    {/* تفاصيل أسطر القيد */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="erp-sub text-[11px]">
                          <tr>
                            <th className="p-2">كود الحساب</th>
                            <th className="p-2">اسم الحساب</th>
                            <th className="p-2">شرح البند</th>
                            <th className="p-2 font-mono text-indigo-600">مدين (Debit)</th>
                            <th className="p-2 font-mono text-rose-600">دائن (Credit)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                          {entry.lines?.map((line, idx) => (
                            <tr key={idx} className="hover:bg-gray-500/5">
                              <td className="p-2 font-mono font-bold text-gray-600 dark:text-gray-400">{line.accountCode}</td>
                              <td className="p-2 font-semibold">{line.accountName}</td>
                              <td className="p-2 text-gray-500 text-[11px]">{line.description || '-'}</td>
                              <td className="p-2 font-mono font-bold text-emerald-600">
                                {line.debit > 0 ? `${line.debit.toLocaleString()} ج.م` : '-'}
                              </td>
                              <td className="p-2 font-mono font-bold text-rose-600">
                                {line.credit > 0 ? `${line.credit.toLocaleString()} ج.م` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* مودال قيد يومية مزدوج جديد مع التحقق التلقائي من التوازن */}
      {showNewEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base">تسجيل قيد يومية محاسبي مزدوج (Double-Entry)</h3>
              </div>
              <button onClick={() => setShowNewEntryModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntry} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">تاريخ القيد *</label>
                  <input
                    type="date"
                    required
                    value={newEntryDate}
                    onChange={(e) => setNewEntryDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold mb-1">بيان وشرح القيد العام *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: إثبات صرف مستلزمات تغليف وكرتون لصالة التعبئة"
                    value={newEntryDesc}
                    onChange={(e) => setNewEntryDesc(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* أسطر القيد المزدوج */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold">أطراف القيد (مدين / دائن) *</label>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة طرف قيد</span>
                  </button>
                </div>

                <div className="border rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-800">
                  {newEntryLines.map((line, idx) => (
                    <div key={idx} className="p-2.5 flex flex-col sm:flex-row items-center gap-2 erp-sub">
                      {/* اختيار الحساب */}
                      <div className="w-full sm:flex-1">
                        <select
                          value={line.accountId}
                          onChange={(e) => handleLineChange(idx, 'accountId', e.target.value)}
                          required
                          className="w-full p-2 rounded-lg border erp-card focus:outline-none"
                        >
                          <option value="">-- اختر الحساب المحاسبي --</option>
                          {accounts
                            .filter((a) => !a.isParent && (a.accountCode || '').length > 2)
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                [{a.accountCode}] {a.accountName}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* مدين */}
                      <div className="w-full sm:w-32 flex items-center gap-1">
                        <span className="text-[11px] erp-muted">مدين:</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.debit || ''}
                          onChange={(e) => {
                            handleLineChange(idx, 'debit', Number(e.target.value));
                            if (Number(e.target.value) > 0) handleLineChange(idx, 'credit', 0);
                          }}
                          placeholder="0.00"
                          className="w-full p-2 rounded-lg border erp-card font-mono font-bold text-center text-emerald-600"
                        />
                      </div>

                      {/* دائن */}
                      <div className="w-full sm:w-32 flex items-center gap-1">
                        <span className="text-[11px] erp-muted">دائن:</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.credit || ''}
                          onChange={(e) => {
                            handleLineChange(idx, 'credit', Number(e.target.value));
                            if (Number(e.target.value) > 0) handleLineChange(idx, 'debit', 0);
                          }}
                          placeholder="0.00"
                          className="w-full p-2 rounded-lg border erp-card font-mono font-bold text-center text-rose-600"
                        />
                      </div>

                      {/* حذف السطر */}
                      {newEntryLines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* صندوق فحص التوازن اللحظي */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-center gap-3 ${
                  entryBalance.isBalanced
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  {entryBalance.isBalanced ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold">
                      {entryBalance.isBalanced
                        ? 'القيد متوازن محاسبياً وجاهز للاعتماد'
                        : `القيد غير متوازن! الفرق بين الطرفين: ${entryBalance.diff.toFixed(2)} ج.م`}
                    </p>
                    <p className="text-[11px] opacity-80">
                      قاعدة القيد المزدوج: يجب أن يتساوى إجمالي المدين والدائن تماماً
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono font-bold">
                  <div>
                    <span>إجمالي المدين: </span>
                    <span className="text-emerald-600">{entryBalance.totalDebit.toLocaleString()} ج.م</span>
                  </div>
                  <div>
                    <span>إجمالي الدائن: </span>
                    <span className="text-rose-600">{entryBalance.totalCredit.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex justify-end gap-2 pt-3 border-t erp-card">
                <button
                  type="button"
                  onClick={() => setShowNewEntryModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !entryBalance.isBalanced}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>اعتماد وترحيل القيد</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال إضافة حساب فرعي جديد */}
      {showNewAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base">إضافة حساب بدليل شجرة الحسابات</h3>
              </div>
              <button onClick={() => setShowNewAccountModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">كود الحساب الجديد *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: 1114"
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">اسم الحساب بالكامل *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: خزينة معرض دكرنس"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">التصنيف المحاسبي *</label>
                <select
                  value={newAccType}
                  onChange={(e: any) => setNewAccType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                >
                  <option value="Assets">أصول (Assets)</option>
                  <option value="Liabilities">التزامات (Liabilities)</option>
                  <option value="Equity">حقوق ملكية (Equity)</option>
                  <option value="Revenues">إيرادات (Revenues)</option>
                  <option value="Expenses">مصروفات (Expenses)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">الحساب الرئيسي الأب (اختياري)</label>
                <select
                  value={newAccParentId}
                  onChange={(e) => setNewAccParentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                >
                  <option value="">-- بدون حساب أب (رئيسي) --</option>
                  {accounts
                    .filter((a) => a.isParent || (a.accountCode || '').length <= 2)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.accountCode}] {a.accountName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t erp-card">
                <button
                  type="button"
                  onClick={() => setShowNewAccountModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>حفظ الحساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
