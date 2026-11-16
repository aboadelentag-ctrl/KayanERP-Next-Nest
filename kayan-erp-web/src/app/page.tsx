'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from './context/SocketContext';
import { useTheme } from './context/ThemeContext';
import { useCustomIcons } from './context/CustomIconsContext';
import { getLucideIcon } from './components/ManageIconModal';
import { APP_MODULES, ModuleItem } from './config/modules';
import {
  Factory,
  Store,
  TrendingUp,
  Warehouse,
  Wallet,
  Activity,
  Clock,
  Building,
  CheckCircle2,
  Flame,
  LayoutGrid,
  Search,
  Plus,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';

function getGradientForColor(color?: string) {
  switch (color) {
    case 'teal': return 'from-teal-600 via-emerald-600 to-teal-700';
    case 'emerald': return 'from-emerald-600 via-teal-600 to-green-700';
    case 'blue': return 'from-blue-600 via-cyan-600 to-indigo-600';
    case 'indigo': return 'from-indigo-600 via-purple-600 to-pink-600';
    case 'purple': return 'from-purple-600 via-pink-600 to-rose-600';
    case 'rose': return 'from-rose-600 via-red-600 to-amber-700';
    case 'cyan': return 'from-cyan-600 via-teal-600 to-blue-700';
    case 'amber':
    default:
      return 'from-amber-500 via-amber-600 to-orange-600';
  }
}

interface EventLog {
  id: string;
  type: 'INVENTORY' | 'SALES' | 'MANUFACTURING' | 'TREASURY' | 'SYSTEM';
  title: string;
  description: string;
  time: string;
  badgeColor: string;
}

export default function OperationalDashboard() {
  const { socket } = useSocket();
  const { icons, activeTabId, setActiveTabId, openModal } = useCustomIcons();
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [appSearch, setAppSearch] = useState<string>('');

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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('custom_tab');
      if (tabParam) {
        setActiveTabId(tabParam);
      }
    }
  }, [setActiveTabId]);

  const allSystemScreens = useMemo(() => {
    let list: any[] = [];
    APP_MODULES.forEach((cat) => {
      cat.items.forEach((item) => {
        if (item.requiredRole && !item.requiredRole.includes(userRole)) {
          return;
        }
        list.push(item);
      });
    });
    return list;
  }, [userRole]);

  const currentCustomIcon = useMemo(() => {
    if (activeTabId === 'ALL') return null;
    return icons.find((ic) => ic.id === activeTabId) || null;
  }, [icons, activeTabId]);

  const filteredAppItems = useMemo(() => {
    // 1. في حال اختيار أيقونة مخصصة محددة (مثل الإنتاج أو الجودة أو غيرها)
    if (currentCustomIcon) {
      let screens: any[] = Array.isArray(currentCustomIcon.screens_json) ? currentCustomIcon.screens_json : [];
      if (appSearch.trim()) {
        const q = appSearch.toLowerCase().trim();
        screens = screens.filter(
          (s) =>
            s.label?.toLowerCase().includes(q) ||
            (s.tag && s.tag.toLowerCase().includes(q)) ||
            s.href?.toLowerCase().includes(q),
        );
      }
      return screens.map((s) => {
        const sysMatch = allSystemScreens.find((it) => it.href === s.href);
        return {
          href: s.href,
          label: s.label,
          tag: s.tag || (s.isCustom ? 'شاشة مخصصة جديدة' : sysMatch?.tag || ''),
          icon: getLucideIcon(s.iconName || sysMatch?.icon?.name),
          gradient: sysMatch?.gradient || getGradientForColor(currentCustomIcon.color),
          isCustom: s.isCustom,
        };
      });
    }

    // 2. في حال اختيار "كافة التطبيقات والشاشات"
    let allItems: any[] = [...allSystemScreens];

    // إضافة أية شاشات جديدة مخصصة أضافها المستخدم داخل أيقوناته
    icons.forEach((ic) => {
      if (Array.isArray(ic.screens_json)) {
        ic.screens_json.forEach((scr) => {
          if (scr.isCustom && !allItems.some((it) => it.href === scr.href)) {
            allItems.push({
              href: scr.href,
              label: scr.label,
              tag: scr.tag || 'شاشة مخصصة جديدة',
              icon: getLucideIcon(scr.iconName),
              gradient: getGradientForColor(ic.color),
              isCustom: true,
            });
          }
        });
      }
    });

    if (!appSearch.trim()) {
      const primaryHrefs = [
        '/mes/shop-floor',
        '/pos/salesman',
        '/procurement',
        '/quality/inspections',
        '/emergency-tasks',
        '/dashboard',
      ];
      const primaryItems = primaryHrefs
        .map((href) => allItems.find((it) => it.href === href))
        .filter(Boolean);
      const restItems = allItems.filter((it) => !primaryHrefs.includes(it.href));
      allItems = [...primaryItems, ...restItems];
    } else {
      const q = appSearch.toLowerCase().trim();
      allItems = allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.href.toLowerCase().includes(q),
      );
    }

    return allItems;
  }, [currentCustomIcon, icons, appSearch, allSystemScreens]);

  return (
    <div dir="rtl" className="erp-container-fluid min-h-screen space-y-4 py-2">
      
      {/* 1. ترويسة القيادة المركزية وبيانات الوردية */}
      <div className="erp-card p-5 md:p-6 rounded-3xl border shadow-sm relative overflow-hidden">
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

            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              لوحة القيادة المركزية ومتابعة العمليات الصناعية
            </h1>
            <p className="text-xs erp-muted mt-1 max-w-2xl leading-relaxed">
              الربط المتزامن اللحظي لخطوط الإنتاج والتصنيع، أرصدة المستودعات التخصصية، نقاط بيع شبكة المعارض، وإدارة الخزائن والحسابات العامة
            </p>
          </div>
        </div>
      </div>

      {/* 2. شريط المؤشرات الحيوية الكبرى (Executive KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* KPI 1: صالات الإنتاج */}
        <div className="erp-card p-4 rounded-2xl border shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex justify-between items-start mb-1.5">
            <span className="text-xs font-bold erp-muted">أوامر الإنتاج والتصنيع</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Factory className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">{metrics.completedBatches + metrics.openOrders} أمر</div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{metrics.completedBatches} وجبة منتهية • {metrics.openOrders} قيد التشغيل</span>
          </div>
        </div>

        {/* KPI 2: مبيعات اليوم */}
        <div className="erp-card p-4 rounded-2xl border shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex justify-between items-start mb-1.5">
            <span className="text-xs font-bold erp-muted">إجمالي المبيعات المسجلة</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-500">{metrics.todaySales.toLocaleString()} ج.م</div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold erp-muted">
            <span>من واقع الفواتير والبوالص بقاعدة البيانات</span>
          </div>
        </div>

        {/* KPI 3: الخزائن والسيولة */}
        <div className="erp-card p-4 rounded-2xl border shadow-sm relative overflow-hidden group hover:border-teal-500/40 transition">
          <div className="flex justify-between items-start mb-1.5">
            <span className="text-xs font-bold erp-muted">صافي الربح التقديري</span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-500">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-teal-500">{metrics.netProfit.toLocaleString()} ج.م</div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold erp-muted">
            <span>محسوب بعد تكلفة التشغيل والخامات</span>
          </div>
        </div>

        {/* KPI 4: أرصدة الخامات والمستودعات */}
        <div className="erp-card p-4 rounded-2xl border shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition">
          <div className="flex justify-between items-start mb-1.5">
            <span className="text-xs font-bold erp-muted">الأصناف بالمستودعات</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono">{metrics.itemsCount} صنف</div>
          <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-amber-500">
            <span>{metrics.activeEmployees} موظف وفني مسجل بالمنظومة</span>
          </div>
        </div>

      </div>

      {/* 3. شبكة التطبيقات والشاشات الموحدة (Enterprise Screen Launchpad) */}
      <div className="erp-card rounded-3xl border shadow-sm p-5 md:p-6 space-y-4">
        {/* Header: Title, Subtitle, Search bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  لوحة التطبيقات والشاشات الموحدة (Screen Launchpad)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                  {filteredAppItems.length} شاشة متاحة
                </span>
              </div>
              <p className="text-xs erp-muted mt-0.5">
                تصفح مباشر لكل شاشة وموديول عبر أيقونة تطبيق مستقلة وسريعة
              </p>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 erp-muted" />
            <input
              type="text"
              placeholder="بحث سريع في الشاشات والتطبيقات..."
              value={appSearch}
              onChange={(e) => setAppSearch(e.target.value)}
              className="w-full erp-input-compact pr-10 pl-8 rounded-2xl border erp-sub text-xs focus:ring-2 focus:ring-amber-500 outline-none"
            />
            {appSearch && (
              <button
                onClick={() => setAppSearch('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs: كافة التطبيقات وبجوارها الأيقونات المخصصة (الإنتاج، الجودة، والمزيد) */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
          {/* تبويب كافة التطبيقات */}
          <button
            onClick={() => setActiveTabId('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTabId === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'erp-sub hover:opacity-80 border'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>كافة التطبيقات والشاشات ({allSystemScreens.length})</span>
          </button>

          {/* الأيقونات المخصصة التي تم تفعيل ظهورها في التبويبات */}
          {icons.filter((ic) => ic.show_in_tabs).map((icon) => {
            const IconComp = getLucideIcon(icon.icon_name);
            const isSelected = activeTabId === icon.id;
            const screensCount = Array.isArray(icon.screens_json) ? icon.screens_json.length : 0;

            return (
              <button
                key={icon.id}
                onClick={() => setActiveTabId(icon.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                    : 'erp-sub hover:opacity-80 border'
                }`}
              >
                <IconComp className="w-3.5 h-3.5 shrink-0" />
                <span>{icon.title}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isSelected ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
                }`}>
                  {screensCount}
                </span>
              </button>
            );
          })}

          {/* زر إضافة أيقونة جديدة بجوار كافة التطبيقات */}
          <button
            onClick={() => openModal(null)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-dashed border-amber-500/60 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 shadow-sm"
            title="إضافة أيقونة جديدة وتحديد شاشاتها"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة أيقونة جديدة</span>
          </button>

          {/* زر تعديل شاشات الأيقونة النشطة الحالية */}
          {currentCustomIcon && (
            <button
              onClick={() => openModal(currentCustomIcon)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm"
              title={`تعديل شاشات أيقونة ${currentCustomIcon.title}`}
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>تعديل شاشات الأيقونة</span>
            </button>
          )}
        </div>

        {/* Grid of App Screen Icons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 pt-2">
          {filteredAppItems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs erp-muted erp-sub rounded-2xl border border-dashed space-y-3">
              <Search className="w-6 h-6 mx-auto mb-1 text-slate-400 opacity-60" />
              <p className="font-bold">
                {currentCustomIcon
                  ? `أيقونة "${currentCustomIcon.title}" لا تحتوي على شاشات بعد أو لم تطابق البحث`
                  : `لا توجد شاشات مطابقة لبحثك "${appSearch}"`}
              </p>
              {currentCustomIcon ? (
                <button
                  onClick={() => openModal(currentCustomIcon)}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>تحديد الشاشات داخل أيقونة {currentCustomIcon.title} الآن</span>
                </button>
              ) : (
                <button
                  onClick={() => { setAppSearch(''); setActiveTabId('ALL'); }}
                  className="mt-2 text-amber-500 hover:underline font-bold text-xs cursor-pointer block mx-auto"
                >
                  إعادة ضبط البحث وعرض كافة الشاشات
                </button>
              )}
            </div>
          ) : (
            filteredAppItems.map((item) => {
              const IconComponent = item.icon || LayoutGrid;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group erp-sub p-4 rounded-3xl border hover:border-amber-500/50 hover:shadow-xl hover:-translate-y-1.5 transition-all duration-200 flex flex-col items-center text-center gap-3 cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle Glow in Background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* شارة التطبيقات التشغيلية الرئيسية أو الشاشات المخصصة */}
                  {item.isCustom ? (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-500/15 text-teal-400 border border-teal-500/30">
                      شاشة مخصصة
                    </span>
                  ) : (
                    ['/mes/shop-floor', '/pos/salesman', '/procurement', '/quality/inspections', '/emergency-tasks', '/dashboard'].includes(item.href) &&
                    activeTabId === 'ALL' &&
                    !appSearch && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/30">
                        رئيسي
                      </span>
                    )
                  )}

                  {/* 3D App Icon Badge */}
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${item.gradient} flex items-center justify-center text-white shadow-lg shadow-black/30 group-hover:scale-110 group-hover:rotate-1 transition-all duration-200 shrink-0`}
                  >
                    <IconComponent className="w-7 h-7 drop-shadow-md" />
                  </div>

                  <div className="w-full relative z-10 space-y-1">
                    <div className="font-black text-xs text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors line-clamp-1">
                      {item.label}
                    </div>
                    <div className="text-[10px] erp-muted line-clamp-1 leading-tight font-medium">
                      {item.tag}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* 4. شريط العمليات والأحداث اللحظية (Live WebSocket Stream) */}
      <div className="erp-card rounded-3xl border shadow-sm p-5 md:p-6 space-y-4">
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
