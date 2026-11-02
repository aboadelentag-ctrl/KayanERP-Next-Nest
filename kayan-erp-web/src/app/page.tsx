'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from './context/SocketContext';
import { useTheme } from './context/ThemeContext';
import {
  Factory,
  Store,
  TrendingUp,
  Boxes,
  Truck,
  ShoppingBag,
  Calculator,
  Users,
  DollarSign,
  BookOpen,
  Scale,
  Wrench,
  Flame,
  ShieldCheck,
  Building2,
  FileText,
  Warehouse,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  ChevronLeft,
  Building,
  RefreshCw,
} from 'lucide-react';

interface EventLog {
  id: string;
  type: 'INVENTORY' | 'SALES' | 'MANUFACTURING' | 'TREASURY' | 'SYSTEM';
  title: string;
  description: string;
  time: string;
  badgeColor: string;
}

export default function OperationalDashboard() {
  const { socket, isConnected } = useSocket();
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [metrics, setMetrics] = useState({
    todaySales: 0,
    productionCosts: 0,
    netProfit: 0,
    activeEmployees: 0,
    openOrders: 0,
    completedBatches: 0,
    itemsCount: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [kpiRes, itemsRes] = await Promise.all([
          axios.get('http://localhost:3000/dashboard/kpis'),
          axios.get('http://localhost:3000/inventory/items'),
        ]);
        const k = kpiRes.data?.data;
        const items = itemsRes.data?.data;
        setMetrics({
          todaySales: Number(k?.todaySales || 0),
          productionCosts: Number(k?.productionCosts || 0),
          netProfit: Number(k?.netProfit || 0),
          activeEmployees: Number(k?.activeEmployeesPresent || 0),
          openOrders: Number(k?.openProductionOrders || 0),
          completedBatches: Number(k?.completedBatchesToday || 0),
          itemsCount: Array.isArray(items) ? items.length : 0,
        });
      } catch (err) {
        console.warn('Failed to load dashboard metrics from database:', err);
      }
    };
    fetchMetrics();
  }, []);

  useEffect(() => {
    const syncUser = () => {
      if (typeof window !== 'undefined') {
        try {
          const u = localStorage.getItem('kayan_user');
          if (u) setCurrentUser(JSON.parse(u));
        } catch (e) {
          console.warn(e);
        }
      }
    };
    syncUser();
    window.addEventListener('tenantChanged', syncUser);
    return () => window.removeEventListener('tenantChanged', syncUser);
  }, []);

  const userRole = currentUser?.role || 'SUPER_ADMIN';

  // الاستماع للأحداث الحية عبر WebSockets
  useEffect(() => {
    if (!socket) return;

    socket.on('stock_updated', (data: any) => {
      addLiveLog('INVENTORY', 'حركة مخزنية لحظية', `تحديث رصيد صنف: ${data?.itemId || 'خامات'} بكمية ${data?.quantity || 0}`, 'bg-blue-500/10 text-blue-500 border-blue-500/20');
    });

    socket.on('sales_order_created', (data: any) => {
      addLiveLog('SALES', 'أمر بيع جديد (حجز فوري)', `بوليصة رقم ${data?.orderNumber || 'SO'} بقيمة ${data?.totalAmount || 0} ج.م`, 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20');
    });

    socket.on('production_order_created', (data: any) => {
      addLiveLog('MANUFACTURING', 'أمر تشغيل صالة الإنتاج', `أمر رقم ${data?.orderNumber || 'PO'} موجه لخطوط التشغيل`, 'bg-amber-500/10 text-amber-500 border-amber-500/20');
    });

    socket.on('treasury_voucher_created', (data: any) => {
      addLiveLog('TREASURY', `سند خزينة جديد (${data?.voucherType === 'RECEIPT' ? 'قبض' : 'صرف'})`, `سند رقم ${data?.voucherNumber} بقيمة ${Number(data?.amount || 0).toLocaleString()} ج.م - ${data?.partyName}`, 'bg-teal-500/10 text-teal-500 border-teal-500/20');
    });

    return () => {
      socket.off('stock_updated');
      socket.off('sales_order_created');
      socket.off('production_order_created');
      socket.off('treasury_voucher_created');
    };
  }, [socket]);

  const addLiveLog = (type: any, title: string, description: string, badgeColor: string) => {
    const newEntry: EventLog = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      description,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      badgeColor,
    };
    setLogs((prev) => [newEntry, ...prev.slice(0, 19)]);
  };

  const filteredLogs = useMemo(() => {
    if (filterType === 'ALL') return logs;
    return logs.filter((l) => l.type === filterType);
  }, [logs, filterType]);

  return (
    <div dir="rtl" className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. ترويسة القيادة المركزية وبيانات الوردية */}
      <div className="erp-card p-6 rounded-3xl border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5" />
                <span>مصانع وحلواني أبو عادل • المركز الرئيسي</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>الوردية الصباحية المعتمدة (08:00 - 16:00)</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>الأنظمة السحابية مستقرة 100%</span>
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              لوحة القيادة المركزية ومتابعة العمليات الصناعية
            </h1>
            <p className="text-xs erp-muted mt-1 max-w-2xl leading-relaxed">
              الربط المتزامن اللحظي لخطوط الإنتاج والتصنيع، أرصدة المستودعات التخصصية، نقاط بيع شبكة المعارض، وإدارة الخزائن والحسابات العامة
            </p>
          </div>

          {/* أزرار الوصول والإجراءات السريعة */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/pos"
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>كاشير المعارض POS</span>
            </Link>

            <Link
              href="/treasury-vouchers"
              className="px-4 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black transition flex items-center gap-2 shadow-md shadow-teal-600/20 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>سندات الخزينة</span>
            </Link>

            <Link
              href="/production"
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Factory className="w-4 h-4" />
              <span>صالة الإنتاج</span>
            </Link>

            <Link
              href="/emergency-tasks"
              className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer"
            >
              <Flame className="w-4 h-4" />
              <span>طوارئ SOS</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. شريط المؤشرات الحيوية الكبرى (Executive KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: صالات الإنتاج */}
        <div className="erp-card p-5 rounded-2xl border shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold erp-muted">أوامر الإنتاج والتصنيع</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Factory className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">{metrics.completedBatches + metrics.openOrders} أمر</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{metrics.completedBatches} وجبة منتهية • {metrics.openOrders} قيد التشغيل</span>
          </div>
        </div>

        {/* KPI 2: مبيعات اليوم */}
        <div className="erp-card p-5 rounded-2xl border shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold erp-muted">إجمالي المبيعات المسجلة</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-500">{metrics.todaySales.toLocaleString()} ج.م</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold erp-muted">
            <span>من واقع الفواتير والبوالص بقاعدة البيانات</span>
          </div>
        </div>

        {/* KPI 3: الخزائن والسيولة */}
        <div className="erp-card p-5 rounded-2xl border shadow-sm relative overflow-hidden group hover:border-teal-500/40 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold erp-muted">صافي الربح التقديري</span>
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-teal-500">{metrics.netProfit.toLocaleString()} ج.م</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold erp-muted">
            <span>محسوب بعد تكلفة التشغيل والخامات</span>
          </div>
        </div>

        {/* KPI 4: أرصدة الخامات والمستودعات */}
        <div className="erp-card p-5 rounded-2xl border shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold erp-muted">الأصناف بالمستودعات</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Warehouse className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">{metrics.itemsCount} صنف</div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-amber-500">
            <span>{metrics.activeEmployees} موظف وفني مسجل بالمنظومة</span>
          </div>
        </div>

      </div>

      {/* 3. قطاعات النظام الستة الكبرى (Enterprise Hubs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* القطاع 1: التصنيع والتكاليف الصناعية */}
        <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Factory className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm">صالة الإنتاج والتصنيع</h3>
                <span className="text-[11px] erp-muted">إدارة التشغيل والمراحل وهوامش الربح</span>
              </div>
            </div>
          </div>

          <p className="text-xs erp-muted leading-relaxed">
            متابعة أوامر التشغيل، توجيه العجين والخبز والتزيين، احتساب التكلفة المعيارية والفعلية للوصفات، وإدارة صرف الخامات بنظام FEFO.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs font-bold">
            <Link
              href="/production"
              className="p-2.5 rounded-xl erp-sub hover:bg-amber-500/10 hover:text-amber-500 transition flex items-center justify-between"
            >
              <span>أوامر الإنتاج</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/costing"
              className="p-2.5 rounded-xl erp-sub hover:bg-amber-500/10 hover:text-amber-500 transition flex items-center justify-between"
            >
              <span>التكاليف والتسعير</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/requisitions"
              className="p-2.5 rounded-xl erp-sub hover:bg-amber-500/10 hover:text-amber-500 transition flex items-center justify-between"
            >
              <span>صرف الخامات FEFO</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/assets"
              className="p-2.5 rounded-xl erp-sub hover:bg-amber-500/10 hover:text-amber-500 transition flex items-center justify-between"
            >
              <span>الماكينات والأصول</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* القطاع 2: المستودعات واللوجستيات والمشتريات */}
        <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Warehouse className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm">المخازن وسلاسل الإمداد</h3>
                <span className="text-[11px] erp-muted">المستودعات التخصصية والمشتريات</span>
              </div>
            </div>
          </div>

          <p className="text-xs erp-muted leading-relaxed">
            إدارة أرصدة مستودعات الخامات والتام، فحص جودة المشتريات QC/GRN، أذونات تحويل المعارض مع أرقام اللوت، وتتبع حركة الصناديق الفارغة.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs font-bold">
            <Link
              href="/inventory"
              className="p-2.5 rounded-xl erp-sub hover:bg-blue-500/10 hover:text-blue-500 transition flex items-center justify-between"
            >
              <span>أرصدة المستودعات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/transfers"
              className="p-2.5 rounded-xl erp-sub hover:bg-blue-500/10 hover:text-blue-500 transition flex items-center justify-between"
            >
              <span>تحويلات المعارض</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/procurement"
              className="p-2.5 rounded-xl erp-sub hover:bg-blue-500/10 hover:text-blue-500 transition flex items-center justify-between"
            >
              <span>المشتريات وفحص QC</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/crates"
              className="p-2.5 rounded-xl erp-sub hover:bg-blue-500/10 hover:text-blue-500 transition flex items-center justify-between"
            >
              <span>تتبع الصناديق</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* القطاع 3: نقاط البيع وشبكة المعارض */}
        <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm">المبيعات وشبكة المعارض</h3>
                <span className="text-[11px] erp-muted">كاشير التجزئة وبوابة الفروع الـ 7</span>
              </div>
            </div>
          </div>

          <p className="text-xs erp-muted leading-relaxed">
            واجهة الكاشير اللمسية فائقة السرعة مع دعم طباعة إيصالات 80mm الحرارية، عقود الجملة، حسابات العملاء، ومراقبة مبيعات الفروع المباشرة.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs font-bold">
            <Link
              href="/pos"
              className="p-2.5 rounded-xl erp-sub hover:bg-emerald-500/10 hover:text-emerald-500 transition flex items-center justify-between"
            >
              <span>كاشير المعارض POS</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/sales"
              className="p-2.5 rounded-xl erp-sub hover:bg-emerald-500/10 hover:text-emerald-500 transition flex items-center justify-between"
            >
              <span>فواتير وعقود المبيعات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/branches"
              className="p-2.5 rounded-xl erp-sub hover:bg-emerald-500/10 hover:text-emerald-500 transition flex items-center justify-between"
            >
              <span>بوابة الفروع الـ 7</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl erp-sub hover:bg-emerald-500/10 hover:text-emerald-500 transition flex items-center justify-between"
            >
              <span>تحليلات BI المتقدمة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* القطاع 4: الحسابات العامة وإدارة الخزائن */}
        <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-500 border border-teal-500/20">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm">المالية والخزائن العامة</h3>
                <span className="text-[11px] erp-muted">القبض والصرف ودفتر الأستاذ</span>
              </div>
            </div>
          </div>

          <p className="text-xs erp-muted leading-relaxed">
            إصدار سندات القبض والصرف، ضبط أرصدة الخزائن والصناديق، شجرة الحسابات الموحدة متعددة المستويات، والقوائم المالية وميزان المراجعة.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs font-bold">
            <Link
              href="/treasury-vouchers"
              className="p-2.5 rounded-xl erp-sub hover:bg-teal-500/10 hover:text-teal-500 transition flex items-center justify-between"
            >
              <span>سندات القبض والصرف</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/accounting"
              className="p-2.5 rounded-xl erp-sub hover:bg-teal-500/10 hover:text-teal-500 transition flex items-center justify-between"
            >
              <span>شجرة الحسابات والقيود</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/accounting/reports"
              className="p-2.5 rounded-xl erp-sub hover:bg-teal-500/10 hover:text-teal-500 transition flex items-center justify-between"
            >
              <span>القوائم المالية والميزان</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/dashboard"
              className="p-2.5 rounded-xl erp-sub hover:bg-teal-500/10 hover:text-teal-500 transition flex items-center justify-between"
            >
              <span>مؤشرات الربحية والسيولة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* القطاع 5: شؤون العاملين والمرتبات */}
        <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm">الموارد البشرية والمرتبات</h3>
                <span className="text-[11px] erp-muted">شؤون العاملين وسجلات البصمة</span>
              </div>
            </div>
          </div>

          <p className="text-xs erp-muted leading-relaxed">
            إدارة بيانات الموظفين، تكامل ماكينات البصمة ZKTeco، احتساب التأخيرات والغياب والإضافي، وإعداد مسير الرواتب الشهرية والبدلات والسلف.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs font-bold">
            <Link
              href="/hr"
              className="p-2.5 rounded-xl erp-sub hover:bg-rose-500/10 hover:text-rose-500 transition flex items-center justify-between"
            >
              <span>ملفات الموظفين والبصمة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/payroll"
              className="p-2.5 rounded-xl erp-sub hover:bg-rose-500/10 hover:text-rose-500 transition flex items-center justify-between"
            >
              <span>مسير المرتبات والأجور</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/users"
              className="p-2.5 rounded-xl erp-sub hover:bg-rose-500/10 hover:text-rose-500 transition flex items-center justify-between"
            >
              <span>المستخدمين والصلاحيات</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/emergency-tasks"
              className="p-2.5 rounded-xl erp-sub hover:bg-rose-500/10 hover:text-rose-500 transition flex items-center justify-between"
            >
              <span>تكليفات طوارئ الصيانة</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* القطاع 6: الحوكمة والمستأجرين والذكاء الاصطناعي */}
        <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-4 hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-sm">الحوكمة والمنشآت السحابية</h3>
                <span className="text-[11px] erp-muted">إدارة الشركات والمستأجرين والنماذج</span>
              </div>
            </div>
          </div>

          <p className="text-xs erp-muted leading-relaxed">
            التحكم في المنشآت المستأجرة (Multi-Tenant Architecture)، تخصيص النماذج الديناميكية بمحرك Gemini، وإدارة مصفوفة الصلاحيات والحماية.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs font-bold">
            {userRole === 'PLATFORM_SUPER_ADMIN' && (
              <Link
                href="/companies"
                className="p-2.5 rounded-xl erp-sub hover:bg-amber-500/10 hover:text-amber-500 text-amber-500/90 transition flex items-center justify-between border border-amber-500/20"
              >
                <span>بوابة مالك المنصة المركزية</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Link>
            )}
            <Link
              href="/forms"
              className="p-2.5 rounded-xl erp-sub hover:bg-indigo-500/10 hover:text-indigo-500 transition flex items-center justify-between"
            >
              <span>النماذج الذكية بـ AI</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/login"
              className="p-2.5 rounded-xl erp-sub hover:bg-indigo-500/10 hover:text-indigo-500 transition flex items-center justify-between"
            >
              <span>بوابة الدخول الموحد</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/users"
              className="p-2.5 rounded-xl erp-sub hover:bg-indigo-500/10 hover:text-indigo-500 transition flex items-center justify-between"
            >
              <span>صلاحيات الموديولات RBAC</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

      {/* 4. شريط العمليات والأحداث اللحظية (Live WebSocket Stream) */}
      <div className="erp-card rounded-3xl border shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-sm">شريط العمليات والأحداث الصناعية المباشرة</h3>
              <span className="text-[10px] erp-muted">بث حي لعمليات المصنع، المعارض، والخزائن عبر WebSockets</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              الكل ({logs.length})
            </button>
            <button
              onClick={() => setFilterType('MANUFACTURING')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'MANUFACTURING'
                  ? 'bg-amber-600 text-white font-black'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              تصنيع
            </button>
            <button
              onClick={() => setFilterType('SALES')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'SALES'
                  ? 'bg-emerald-600 text-white font-black'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              مبيعات
            </button>
            <button
              onClick={() => setFilterType('TREASURY')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'TREASURY'
                  ? 'bg-teal-600 text-white font-black'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              خزائن
            </button>
            <button
              onClick={() => setFilterType('INVENTORY')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'INVENTORY'
                  ? 'bg-blue-600 text-white font-black'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              مستودعات
            </button>
          </div>
        </div>

        {/* Timeline list */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-10 erp-sub rounded-2xl border border-dashed erp-muted">
              <Activity className="w-7 h-7 mx-auto mb-2 text-indigo-400 opacity-60 animate-pulse" />
              <p className="text-xs font-bold">في انتظار بث أي حركة جديدة من خادم النظام اللحظي...</p>
              <p className="text-[10px] mt-1 opacity-70">يتم إدراج عمليات التصنيع، بوالص المبيعات، وحركات الخزينة فور تسجيلها عبر WebSockets</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl erp-sub border flex items-start justify-between gap-4 hover:border-amber-500/30 transition"
              >
                <div className="flex items-start gap-3">
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${log.badgeColor} shrink-0 mt-0.5`}>
                    {log.type === 'MANUFACTURING'
                      ? 'تصنيع'
                      : log.type === 'SALES'
                      ? 'مبيعات'
                      : log.type === 'TREASURY'
                      ? 'خزينة'
                      : log.type === 'INVENTORY'
                      ? 'مخزون'
                      : 'نظام'}
                  </span>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white">{log.title}</h4>
                    <p className="text-[11px] erp-muted mt-0.5">{log.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-mono erp-muted shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{log.time}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
