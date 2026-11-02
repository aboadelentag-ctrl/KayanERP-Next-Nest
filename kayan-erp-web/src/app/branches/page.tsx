'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Store,
  Search,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Warehouse,
  RotateCw,
  Printer,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  X,
  Loader2,
  Building2,
  Boxes,
} from 'lucide-react';

interface BranchSummary {
  id: string;
  code: string;
  nameAr: string;
  city: string;
  address: string;
  managerName: string;
  phone: string;
  branchType: 'Factory' | 'Retail';
  activeWarehousesCount: number;
  todaySalesVolume: number;
  cratesCustodyCount: number;
  isActive: boolean;
}

export default function BranchesPortalPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('المنصورة');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newManager, setNewManager] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newType, setNewType] = useState<'Retail' | 'Factory'>('Retail');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadBranches();

    if (socket) {
      socket.on('branch_updated', () => loadBranches());

      return () => {
        socket.off('branch_updated');
      };
    }
  }, [socket]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/branches/operations-summary');
      if (res.data?.success && res.data.data) {
        setBranches(res.data.data);
      } else {
        setBranches([]);
      }
    } catch (err) {
      console.warn('Failed to fetch branches from database:', err);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  // الإحصائيات
  const kpis = useMemo(() => {
    const showrooms = branches.filter((b) => b.branchType === 'Retail');
    const totalDailySales = showrooms.reduce((sum, b) => sum + (b.todaySalesVolume || 0), 0);
    const totalCrates = branches.reduce((sum, b) => sum + (b.cratesCustodyCount || 0), 0);
    return {
      showroomsCount: showrooms.length,
      totalDailySales,
      totalCrates,
    };
  }, [branches]);

  // التصفية
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      const s = searchTerm.toLowerCase().trim();
      return (
        s === '' ||
        b.code.toLowerCase().includes(s) ||
        b.nameAr.toLowerCase().includes(s) ||
        b.city.toLowerCase().includes(s) ||
        b.managerName.toLowerCase().includes(s)
      );
    });
  }, [branches, searchTerm]);

  // إضافة فرع
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:3000/branches', {
        branchCode: newCode.trim(),
        branchName: newName.trim(),
        city: newCity.trim(),
        address: newAddress.trim(),
        managerName: newManager.trim(),
        phone: newPhone.trim(),
        branchType: newType,
      });

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setShowAddModal(false);
        setNewCode('');
        setNewName('');
        setNewAddress('');
        setNewManager('');
        setNewPhone('');
        loadBranches();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إضافة الفرع', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-200" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* الترويسة */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-200 print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer">
              <ArrowRight className="w-5 h-5 text-indigo-600" />
            </Link>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">بوابة ومعارض الفروع المركزية (Branches Portal)</h1>
              <p className="text-xs erp-muted">
                مصانع وحلواني أبو عادل | متابعة أداء المعارض الـ 7، حجم المبيعات اللحظي، وعهدة الصناديق والمستودعات
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة معرض / فرع جديد</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف المعارض A4</span>
            </button>

            <button
              onClick={loadBranches}
              disabled={loading}
              className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <div className="flex items-center gap-2 erp-sub px-3 py-1.5 rounded-xl border text-xs">
              <span>الربط:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-bold text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" /> غير متصل
                </span>
              )}
            </div>
          </div>
        </header>

        {/* رسائل التنبيه والنجاح */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-bold transition-all ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {/* بطاقات الإحصائيات (KPI Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-emerald-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">معارض التجزئة النشطة</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-emerald-600">{kpis.showroomsCount}</span>
              <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">معرض مباشر</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-blue-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">إجمالي مبيعات المعارض اليومية</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-blue-600">
                {kpis.totalDailySales.toLocaleString()} ج.م
              </span>
              <span className="text-[11px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">لحظي (POS)</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-purple-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">إجمالي عهدة الصناديق المتداولة</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-purple-600">
                {kpis.totalCrates.toLocaleString()}
              </span>
              <span className="text-[11px] font-bold text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-md">صندوق وصينية</span>
            </div>
          </div>
        </div>

        {/* شريط البحث */}
        <div className="erp-card p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-3 text-xs print:hidden">
          <span className="font-bold">قائمة المنافذ والمواقع التشغيلية المعتمدة ({filteredBranches.length})</span>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
            <input
              type="text"
              placeholder="بحث بالاسم، الكود، المدينة، أو المدير..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border erp-sub outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs"
            />
          </div>
        </div>

        {/* ترويسة الطباعة الرسمية A4 */}
        <div className="hidden print:block border-b-2 border-black pb-3 mb-4 text-center">
          <h2 className="text-xl font-black">مصانع وحلواني أبو عادل</h2>
          <p className="text-xs text-gray-700">دليل وبيانات الفروع ومعارض التجزئة المعتمدة</p>
          <div className="flex justify-between items-center text-xs mt-2 px-4 font-bold">
            <span>إدارة المبيعات والتوزيع المركزي</span>
            <span>تاريخ الطباعة: {displayDate}</span>
          </div>
        </div>

        {/* بطاقات المعارض والفروع */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="col-span-2 erp-card p-8 text-center erp-muted text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <span>جاري تحميل بيانات الفروع...</span>
            </div>
          ) : filteredBranches.map((branch) => (
            <div key={branch.id} className="erp-card p-5 rounded-2xl shadow-sm border space-y-4">
              <div className="flex items-center justify-between border-b erp-card pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2.5 rounded-xl ${
                      branch.branchType === 'Factory'
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {branch.branchType === 'Factory' ? <Building2 className="w-5 h-5" /> : <Store className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-bold text-gray-500">{branch.code}</span>
                    <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">{branch.nameAr}</h3>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    branch.branchType === 'Factory'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  {branch.branchType === 'Factory' ? 'مجمع مصانع' : 'معرض تجزئة'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{branch.address} ({branch.city})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-mono">{branch.phone} - المدير: {branch.managerName}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t erp-card text-xs text-center">
                <div className="p-2 erp-sub rounded-xl">
                  <span className="text-[10px] text-gray-500 block">المبيعات اليومية</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {branch.todaySalesVolume > 0 ? `${branch.todaySalesVolume.toLocaleString()} ج.م` : 'مركزي'}
                  </span>
                </div>

                <div className="p-2 erp-sub rounded-xl">
                  <span className="text-[10px] text-gray-500 block">عهدة الصناديق</span>
                  <span className="font-mono font-bold text-blue-600">
                    {branch.cratesCustodyCount} صينية
                  </span>
                </div>

                <div className="p-2 erp-sub rounded-xl">
                  <span className="text-[10px] text-gray-500 block">المستودعات التابعة</span>
                  <span className="font-mono font-bold text-purple-600">
                    {branch.activeWarehousesCount} مستودع
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* مودال: إضافة فرع جديد */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">إضافة معرض / فرع جديد</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">كود الفرع *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: BR-08"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">اسم المعرض / الفرع *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: معرض ميت غمر"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">المدينة / المركز *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ميت غمر"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">نوع المنفذ *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  >
                    <option value="Retail">معرض تجزئة مباشر</option>
                    <option value="Factory">مصنع / مركز تصنيع</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">العنوان التفصيلي</label>
                <input
                  type="text"
                  placeholder="الشارع، المعلم الرئيسي..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">مدير المعرض المسؤول</label>
                  <input
                    type="text"
                    placeholder="اسم مدير الفرع"
                    value={newManager}
                    onChange={(e) => setNewManager(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">رقم الهاتف والتواصل</label>
                  <input
                    type="text"
                    placeholder="010xxxxxxxx"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  <span>حفظ وإضافة الفرع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
