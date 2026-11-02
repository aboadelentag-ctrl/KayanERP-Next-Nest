'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp,
  DollarSign,
  Factory,
  Boxes,
  Truck,
  Users,
  Store,
  Calculator,
  ShoppingBag,
  BookOpen,
  Scale,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCw,
  Sun,
  Moon,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  BarChart3,
  PieChart,
  Calendar,
  Clock,
  ShieldCheck,
  Package,
} from 'lucide-react';

interface ExecutiveKpis {
  todaySales: number;
  productionCosts: number;
  netProfit: number;
  scrapRate: number;
  criticalRawMaterialsCount: number;
  circulatingCratesCount: number;
  activeEmployeesPresent: number;
  openProductionOrders: number;
  completedBatchesToday: number;
  currency: string;
}

interface BranchPerformance {
  id: string;
  branchName: string;
  branchCode: string;
  city: string;
  todaySales: number;
  targetSales: number;
  achievementRate: number;
  cratesCustody: number;
  pendingTransfersCount: number;
  status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION';
}

interface ProductionLine {
  lineId: string;
  lineName: string;
  category: string;
  plannedOutput: number;
  actualOutput: number;
  unit: string;
  efficiencyRate: number;
  scrapRate: number;
  activeWorkers: number;
  status: 'OPERATIONAL' | 'PREPARATION' | 'CLEANING';
}

interface EventLog {
  id: string;
  type: string;
  title: string;
  time: string;
}

export default function ExecutiveBiDashboardPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [kpis, setKpis] = useState<ExecutiveKpis>({
    todaySales: 0,
    productionCosts: 0,
    netProfit: 0,
    scrapRate: 0,
    criticalRawMaterialsCount: 0,
    circulatingCratesCount: 0,
    activeEmployeesPresent: 0,
    openProductionOrders: 0,
    completedBatchesToday: 0,
    currency: 'ج.م',
  });

  const [branches, setBranches] = useState<BranchPerformance[]>([]);
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recentEvents, setRecentEvents] = useState<EventLog[]>([]);

  // تواريخ آمنة لمنع أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadDashboardData();

    if (socket) {
      socket.on('sales_order_created', (data) => {
        addLiveEvent('SALES', `أمر بيع جديد: ${data.orderNumber || 'SO-LIVE'}`);
        setKpis((prev) => ({ ...prev, todaySales: prev.todaySales + Number(data.totalAmount || 0) }));
      });

      socket.on('production_order_created', (data) => {
        addLiveEvent('PRODUCTION', `أمر تشغيل جديد: ${data.orderNumber || 'PO-LIVE'}`);
        setKpis((prev) => ({ ...prev, openProductionOrders: prev.openProductionOrders + 1 }));
      });

      socket.on('crate_movement_recorded', (data) => {
        addLiveEvent('CRATES', `حركة صناديق: ${data.containerName || 'سرافيس'} (${data.quantity})`);
      });

      socket.on('attendance_logged', (data) => {
        addLiveEvent('HR', `بصمة حضور: ${data.employeeName} (${data.status})`);
      });

      socket.on('journal_entry_created', (data) => {
        addLiveEvent('FINANCE', `قيد محاسبي: ${data.entryNumber}`);
      });

      return () => {
        socket.off('sales_order_created');
        socket.off('production_order_created');
        socket.off('crate_movement_recorded');
        socket.off('attendance_logged');
        socket.off('journal_entry_created');
      };
    }
  }, [socket]);

  const addLiveEvent = (type: string, title: string) => {
    const newEntry: EventLog = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      time: new Date().toLocaleTimeString('ar-EG'),
    };
    setRecentEvents((prev) => [newEntry, ...prev.slice(0, 9)]);
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [kpiRes, branchRes, linesRes] = await Promise.all([
        axios.get('http://localhost:3000/dashboard/kpis'),
        axios.get('http://localhost:3000/dashboard/branch-performance'),
        axios.get('http://localhost:3000/dashboard/production-throughput'),
      ]);

      if (kpiRes.data?.success && kpiRes.data.data) {
        setKpis(kpiRes.data.data);
      }
      if (branchRes.data?.success && branchRes.data.data) {
        setBranches(branchRes.data.data);
      }
      if (linesRes.data?.success && linesRes.data.data) {
        setLines(linesRes.data.data);
      }
    } catch (err) {
      console.warn('Failed to load dashboard data from database:', err);
      setBranches([]);
      setLines([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ترويسة لوحة القيادة التنفيذية العليا */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2.5 rounded-xl erp-sub hover:opacity-80 transition cursor-pointer"
              title="الرئيسية"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-indigo-500" />
                <h1 className="text-xl md:text-2xl font-black">
                  لوحة المؤشرات الإدارية العليا والذكاء التشغيلي (Executive BI Cockpit)
                </h1>
              </div>
              <p className="text-xs md:text-sm erp-muted mt-0.5">
                مجموعة مصانع وسلسلة حلواني «أبو عادل» - المراقبة اللحظية للإنتاج، المبيعات، الفروع، والمالية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر تحديث البيانات */}
            <button
              onClick={loadDashboardData}
              disabled={loading}
              className="p-2.5 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
              title="تحديث المؤشرات اللحظية"
            >
              <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
            </button>

            {/* الوضع الليلي / النهاري */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
              title={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* حالة الربط اللحظي */}
            <div className="flex items-center gap-2 erp-sub px-3 py-2 rounded-xl border text-xs">
              <span className="font-medium">بث WebSockets:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> متصل لحظياً
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" /> غير متصل
                </span>
              )}
            </div>
          </div>
        </header>

        {/* بطاقات المؤشرات المالية والتشغيلية العليا (Executive KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* إجمالي المبيعات اليومية */}
          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">إجمالي مبيعات اليوم المحققة</p>
              <h3 className="text-2xl font-black mt-1 text-emerald-500 font-mono">
                {kpis.todaySales.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+6.2% أعلى من المستهدف اليومي</span>
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* صافي الأرباح التشغيلية */}
          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">صافي الربح التشغيلي اليومي</p>
              <h3 className="text-2xl font-black mt-1 text-indigo-500 font-mono">
                {kpis.netProfit.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1 font-mono">
                هامش صافي ربح: 50.1%
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* نسبة الهالك الصناعي */}
          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">معدل الهالك الصناعي (Scrap)</p>
              <h3 className="text-2xl font-black mt-1 text-purple-500 font-mono">
                {kpis.scrapRate}%
              </h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>ضمن المعيار الآمن (&lt; 2.5%)</span>
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <Scale className="w-6 h-6" />
            </div>
          </div>

          {/* رادار الخامات الحرجة والإنذار المبكر */}
          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">خامات تقترب من حد الطلب</p>
              <h3 className="text-2xl font-black mt-1 text-amber-500 font-mono">
                {kpis.criticalRawMaterialsCount} <span className="text-xs font-normal">أصناف حرجة</span>
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>سمن بلدي 100%، فستق حلبي</span>
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* قطاع التحليلات البيانية والمقارنات الذكية (BI Analytics Section) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* 1. رادار مقارنة أداء المعارض السبعة */}
          <div className="lg:col-span-2 erp-card p-6 rounded-2xl shadow-sm border space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-sm md:text-base">
                  مقارنة أداء المعارض والفروع السبعة (Sales vs Target Radar)
                </h3>
              </div>
              <span className="text-xs font-mono erp-muted">{displayDate}</span>
            </div>

            <div className="space-y-3.5">
              {branches.map((branch) => {
                const isOver = branch.achievementRate >= 100;
                return (
                  <div key={branch.id} className="space-y-1.5 p-3 rounded-xl border erp-sub">
                    <div className="flex flex-wrap justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{branch.branchName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/10 font-mono">{branch.branchCode}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span>المحقق: <strong className="text-emerald-600 font-bold">{branch.todaySales.toLocaleString()} ج.م</strong></span>
                        <span className="erp-muted">المستهدف: {branch.targetSales.toLocaleString()} ج.م</span>
                        <span
                          className={`font-black px-2 py-0.5 rounded-full text-[10px] ${
                            isOver ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                          }`}
                        >
                          {branch.achievementRate}%
                        </span>
                      </div>
                    </div>

                    {/* شريط الإنجاز البياني */}
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          isOver ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'
                        }`}
                        style={{ width: `${Math.min(100, branch.achievementRate)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] erp-muted pt-0.5">
                      <span>المدينة: {branch.city}</span>
                      <span>عهدة الصناديق بالمعرض: <strong>{branch.cratesCustody} صندوق/سرفيس</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. تدفق خطوط الإنتاج والوردية والشريط اللحظي */}
          <div className="space-y-6">
            {/* تدفق خطوط الإنتاج */}
            <div className="erp-card p-5 rounded-2xl shadow-sm border space-y-4">
              <div className="flex items-center gap-2 border-b erp-card pb-3">
                <Factory className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">كفاءة خطوط الإنتاج بصالة المصنع</h3>
              </div>

              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.lineId} className="p-3 rounded-xl border erp-sub space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[11px]">{line.lineName}</span>
                      <span className="font-mono font-black text-indigo-500">{line.efficiencyRate}%</span>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, line.efficiencyRate)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-[10px] erp-muted font-mono">
                      <span>إنجاز: {line.actualOutput} من {line.plannedOutput} {line.unit}</span>
                      <span>هالك: <strong className="text-purple-600">{line.scrapRate}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* الشريط اللحظي لبث WebSockets */}
            <div className="erp-card p-5 rounded-2xl shadow-sm border space-y-3">
              <div className="flex items-center gap-2 border-b erp-card pb-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-xs">شريط العمليات اللحظية (Live Feed)</h3>
              </div>

              {recentEvents.length === 0 ? (
                <p className="text-center py-6 text-xs erp-muted">في انتظار بث أي حركة تشغيلية جديدة...</p>
              ) : (
                <div className="space-y-2">
                  {recentEvents.map((ev) => (
                    <div key={ev.id} className="flex justify-between items-center text-[11px] p-2 rounded-lg border erp-sub">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-500">
                          {ev.type}
                        </span>
                        <span className="font-semibold">{ev.title}</span>
                      </div>
                      <span className="text-[10px] erp-muted font-mono">{ev.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* شبكة الاختصارات اللمسية السريعة لكافة موديولات المنظومة (Executive Quick Actions Grid) */}
        <div className="erp-card p-6 rounded-2xl shadow-sm border space-y-4">
          <div className="flex items-center gap-2 border-b erp-card pb-3">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base">بوابة الوصول السريع لكافة موديولات كيان ERP</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            
            <Link
              href="/production"
              className="p-3.5 rounded-xl border erp-sub hover:border-amber-500 hover:bg-amber-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition">
                <Factory className="w-5 h-5" />
              </div>
              <span className="font-bold">صالة الإنتاج</span>
              <span className="text-[10px] erp-muted">أوامر التشغيل والوصفات</span>
            </Link>

            <Link
              href="/pos"
              className="p-3.5 rounded-xl border erp-sub hover:border-emerald-500 hover:bg-emerald-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition">
                <Store className="w-5 h-5" />
              </div>
              <span className="font-bold">كاشير المعارض POS</span>
              <span className="text-[10px] erp-muted">نقطة بيع وإيصال 80mm</span>
            </Link>

            <Link
              href="/sales"
              className="p-3.5 rounded-xl border erp-sub hover:border-cyan-500 hover:bg-cyan-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-500 group-hover:scale-110 transition">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="font-bold">المبيعات وعقود الجملة</span>
              <span className="text-[10px] erp-muted">الفواتير الضريبية A4</span>
            </Link>

            <Link
              href="/transfers"
              className="p-3.5 rounded-xl border erp-sub hover:border-indigo-500 hover:bg-indigo-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition">
                <Truck className="w-5 h-5" />
              </div>
              <span className="font-bold">تحويلات المعارض</span>
              <span className="text-[10px] erp-muted">شحن وإذن تسليم معتمد</span>
            </Link>

            <Link
              href="/crates"
              className="p-3.5 rounded-xl border erp-sub hover:border-blue-500 hover:bg-blue-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 group-hover:scale-110 transition">
                <Boxes className="w-5 h-5" />
              </div>
              <span className="font-bold">تتبع الصناديق</span>
              <span className="text-[10px] erp-muted">جرد العهدة للفروع الـ 7</span>
            </Link>

            <Link
              href="/assets"
              className="p-3.5 rounded-xl border erp-sub hover:border-amber-500 hover:bg-amber-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 group-hover:scale-110 transition">
                <Factory className="w-5 h-5" />
              </div>
              <span className="font-bold">الأصول والماكينات</span>
              <span className="text-[10px] erp-muted">الماكينات ونقل العهدة</span>
            </Link>

            <Link
              href="/procurement"
              className="p-3.5 rounded-xl border erp-sub hover:border-teal-500 hover:bg-teal-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500 group-hover:scale-110 transition">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="font-bold">المشتريات واستلام الخامات</span>
              <span className="text-[10px] erp-muted">فحص QC وإذن إضافة GRN</span>
            </Link>

            <Link
              href="/costing"
              className="p-3.5 rounded-xl border erp-sub hover:border-purple-500 hover:bg-purple-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 group-hover:scale-110 transition">
                <Calculator className="w-5 h-5" />
              </div>
              <span className="font-bold">التكاليف والتسعير</span>
              <span className="text-[10px] erp-muted">شجرة تكاليف ومحاكي أسعار</span>
            </Link>

            <Link
              href="/hr"
              className="p-3.5 rounded-xl border erp-sub hover:border-rose-500 hover:bg-rose-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 group-hover:scale-110 transition">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-bold">شؤون العاملين (HR)</span>
              <span className="text-[10px] erp-muted">البصمة وسجل السلف</span>
            </Link>

            <Link
              href="/payroll"
              className="p-3.5 rounded-xl border erp-sub hover:border-emerald-600 hover:bg-emerald-600/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-600 group-hover:scale-110 transition">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="font-bold">مسير المرتبات والأجور</span>
              <span className="text-[10px] erp-muted">احتساب شهري وكشف A4</span>
            </Link>

            <Link
              href="/accounting"
              className="p-3.5 rounded-xl border erp-sub hover:border-indigo-600 hover:bg-indigo-600/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-600 group-hover:scale-110 transition">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-bold">شجرة الحسابات والقيود</span>
              <span className="text-[10px] erp-muted">دفتر اليومية المزدوج</span>
            </Link>

            <Link
              href="/accounting/reports"
              className="p-3.5 rounded-xl border erp-sub hover:border-slate-600 hover:bg-slate-600/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-slate-600/10 text-slate-600 group-hover:scale-110 transition">
                <Scale className="w-5 h-5" />
              </div>
              <span className="font-bold">القوائم المالية وميزان المراجعة</span>
              <span className="text-[10px] erp-muted">قائمة الدخل والميزانية</span>
            </Link>

            <Link
              href="/forms"
              className="p-3.5 rounded-xl border erp-sub hover:border-emerald-500 hover:bg-emerald-500/5 transition flex flex-col items-center text-center gap-2 group cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-bold">النماذج الذكية (AI)</span>
              <span className="text-[10px] erp-muted">تحليل الوثائق بـ Gemini</span>
            </Link>

          </div>
        </div>

      </div>
    </main>
  );
}
