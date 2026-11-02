'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Activity,
  Factory,
  Store,
  TrendingUp,
  Truck,
  Boxes,
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
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  ChevronDown,
  Sparkles,
  LogOut,
  Wallet,
  Building,
  User,
  Barcode,
  PackageCheck,
} from 'lucide-react';

export default function GlobalNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // بيانات المستخدم والمستأجر الموثقة حصراً من جلسة الدخول (JWT Token Data)
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTenant, setCurrentTenant] = useState<any>(null);

  useEffect(() => {
    const syncState = () => {
      if (typeof window !== 'undefined') {
        try {
          const u = localStorage.getItem('kayan_user');
          if (u) setCurrentUser(JSON.parse(u));
          const t = localStorage.getItem('kayan_tenant');
          if (t) setCurrentTenant(JSON.parse(t));
        } catch (e) {
          console.warn(e);
        }
      }
    };

    syncState();
  }, [pathname]);

  const userRole = currentUser?.role || 'SUPER_ADMIN';

  // Logout Handler
  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kayan_user');
      localStorage.removeItem('kayan_token');
      localStorage.removeItem('kayan_tenant');
    }
    router.push('/login');
  };

  const rawModules = [
    {
      category: 'القيادة والتحليلات المركزية',
      items: [
        { href: '/dashboard', label: 'لوحة المؤشرات التنفيذية (BI)', icon: Activity, color: 'text-indigo-500' },
        { href: '/', label: 'لوحة القيادة والعمليات اللحظية', icon: Activity, color: 'text-blue-500' },
        { href: '/branches', label: 'بوابة ومعارض الفروع الـ 7', icon: Building2, color: 'text-emerald-500' },
      ],
    },
    {
      category: 'التصنيع والتكاليف والماكينات',
      items: [
        { href: '/production', label: 'صالة الإنتاج وخطوط التشغيل', icon: Factory, color: 'text-amber-500' },
        { href: '/costing', label: 'التكاليف الصناعية وهوامش الربح', icon: Calculator, color: 'text-purple-500' },
        { href: '/requisitions', label: 'طلبات وأذونات صرف الخامات (FEFO)', icon: FileText, color: 'text-purple-600' },
        { href: '/assets', label: 'حوكمة الأصول والماكينات الرأسمالية', icon: Wrench, color: 'text-amber-600' },
      ],
    },
    {
      category: 'المخازن والتوريد وسلاسل الإمداد',
      items: [
        { href: '/inventory', label: 'المستودعات التخصصية وبطاقة الصنف', icon: Warehouse, color: 'text-blue-600' },
        { href: '/transfers', label: 'تحويلات المعارض وأذونات الشحن', icon: Truck, color: 'text-indigo-600' },
        { href: '/crates', label: 'تتبع عهدة الصناديق المتداولة', icon: Boxes, color: 'text-cyan-600' },
        { href: '/procurement', label: 'المشتريات وفحص الجودة (QC/GRN)', icon: ShoppingBag, color: 'text-teal-600' },
      ],
    },
    {
      category: 'المبيعات ونقاط البيع والصيانة',
      items: [
        { href: '/pos/salesman', label: 'صالة البيع (إصدار بوليصة البائع)', icon: Store, color: 'text-amber-500' },
        { href: '/pos/cashier', label: 'الخزينة والكاشير (تحصيل البوليصة)', icon: Barcode, color: 'text-emerald-500' },
        { href: '/pos/dispatch', label: 'شباك تسليم البضاعة للعملاء', icon: PackageCheck, color: 'text-cyan-500' },
        { href: '/pos', label: 'كاشير المعارض اللمسي الموحد (80mm)', icon: Store, color: 'text-emerald-600' },
        { href: '/sales', label: 'المبيعات وعقود الجملة والفواتير', icon: TrendingUp, color: 'text-cyan-600' },
        { href: '/emergency-tasks', label: 'غرفة بلاغات الأعطال والطوارئ (SOS)', icon: Flame, color: 'text-rose-600' },
      ],
    },
    {
      category: 'المالية والخزائن وشؤون العاملين',
      items: [
        { href: '/treasury-vouchers', label: 'إدارة الخزائن وسندات القبض والصرف', icon: Wallet, color: 'text-emerald-500' },
        { href: '/accounting', label: 'شجرة الحسابات والقيود المزدوجة', icon: BookOpen, color: 'text-indigo-700' },
        { href: '/accounting/reports', label: 'التقارير المالية وميزان المراجعة', icon: Scale, color: 'text-slate-700' },
        { href: '/hr', label: 'شؤون الموظفين والبصمة والورديات', icon: Users, color: 'text-rose-600' },
        { href: '/payroll', label: 'مسير المرتبات والأجور الرسمية', icon: DollarSign, color: 'text-emerald-700' },
      ],
    },
    {
      category: 'الحوكمة والنظام الموحد',
      items: [
        { href: '/users', label: 'إدارة المستخدمين والصلاحيات (RBAC)', icon: ShieldCheck, color: 'text-indigo-600' },
        { href: '/forms', label: 'النماذج الذكية بـ Gemini 3.8 Flash', icon: Sparkles, color: 'text-emerald-600' },
        { href: '/login', label: 'بوابة تسجيل الدخول الموحد', icon: User, color: 'text-purple-500' },
        { href: '/companies', label: 'بوابة مالك المنصة المركزية', icon: Building, color: 'text-amber-500' },
      ],
    },
  ];

  // تطبيق العزل المطلق: حجب إدارة الشركات تماماً عن كافة المستخدمين التشغيليين
  const modules = useMemo(() => {
    return rawModules.map((cat) => {
      if (cat.category === 'الحوكمة والنظام الموحد') {
        return {
          ...cat,
          items: cat.items.filter((item) => {
            if (item.href === '/companies') {
              return userRole === 'PLATFORM_SUPER_ADMIN';
            }
            return true;
          }),
        };
      }
      return cat;
    });
  }, [userRole]);

  // Do not render navbar on standalone login page
  if (pathname === '/login') {
    return null;
  }

  const tenantName = currentTenant?.companyName || currentUser?.companyName || 'مصانع وحلواني أبو عادل';
  const userName = currentUser?.fullName || 'م. أحمد عادل';

  return (
    <nav className="erp-card border-b sticky top-0 z-40 transition-colors duration-200 print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">

          {/* الشعار واسم النظام والشركة المستأجرة المعتمدة */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                كـ
              </div>
              <div>
                <span className="font-black text-sm tracking-wide block leading-tight">كيان ERP</span>
                <span className="text-[10px] text-amber-400 font-bold block truncate max-w-[150px]">
                  {tenantName}
                </span>
              </div>
            </Link>

            {/* بادج المنشأة المستأجرة الثابت غير القابل للتبديل (Tenant Identity Badge - Read Only) */}
            <div
              className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/10 dark:bg-slate-800/50 text-amber-500 border border-amber-500/30 text-[11px] font-black select-none"
              title="المنشأة المستأجرة النشطة التابع لها هذا الحساب"
            >
              <Building className="w-3.5 h-3.5 text-amber-500" />
              <span className="max-w-[160px] truncate">{tenantName}</span>
            </div>

            {/* زر فتح القائمة الشاملة للموديولات */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border erp-sub hover:opacity-80 transition text-xs font-bold mr-1 cursor-pointer"
            >
              <Menu className="w-4 h-4 text-indigo-500" />
              <span>دليل الموديولات</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* روابط سريعة مباشرة في الترويسة */}
          <div className="hidden lg:flex items-center gap-1 text-xs font-bold">
            <Link
              href="/dashboard"
              className={`px-2.5 py-1.5 rounded-xl transition ${
                pathname === '/dashboard' ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20' : 'erp-sub hover:opacity-80'
              }`}
            >
              المؤشرات التنفيذية
            </Link>
            <Link
              href="/production"
              className={`px-2.5 py-1.5 rounded-xl transition ${
                pathname === '/production' ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20' : 'erp-sub hover:opacity-80'
              }`}
            >
              الإنتاج
            </Link>
            <Link
              href="/inventory"
              className={`px-2.5 py-1.5 rounded-xl transition ${
                pathname === '/inventory' ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20' : 'erp-sub hover:opacity-80'
              }`}
            >
              المستودعات
            </Link>
            <Link
              href="/pos"
              className={`px-2.5 py-1.5 rounded-xl transition ${
                pathname === '/pos' ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20' : 'erp-sub hover:opacity-80'
              }`}
            >
              كاشير POS
            </Link>
            <Link
              href="/treasury-vouchers"
              className={`px-2.5 py-1.5 rounded-xl transition ${
                pathname === '/treasury-vouchers' ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20' : 'erp-sub hover:opacity-80'
              }`}
            >
              الخزائن
            </Link>
            <Link
              href="/accounting"
              className={`px-2.5 py-1.5 rounded-xl transition ${
                pathname === '/accounting' ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20' : 'erp-sub hover:opacity-80'
              }`}
            >
              الحسابات
            </Link>
            <Link
              href="/emergency-tasks"
              className={`px-2.5 py-1.5 rounded-xl transition ${
                pathname === '/emergency-tasks' ? 'bg-rose-600 text-white font-black shadow' : 'erp-sub hover:opacity-80 text-rose-400'
              }`}
            >
              طوارئ SOS
            </Link>
          </div>

          {/* أدوات التحكم (المستخدم، تسجيل الخروج، الوضع الليلي، الاتصال) */}
          <div className="flex items-center gap-2">
            
            {/* بطاقة المستخدم النشط */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/5 dark:bg-slate-800/40 border text-xs">
              <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">
                {userName.slice(0, 1)}
              </div>
              <div className="leading-tight text-right">
                <span className="font-bold block text-[11px] truncate max-w-[110px]">{userName}</span>
                <span className="text-[9px] erp-muted block font-mono">{userRole}</span>
              </div>
            </div>

            {/* زر تسجيل الخروج الصريح (Logout) */}
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="تسجيل الخروج وإنهاء الجلسة المعزولة"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>

            {/* تبديل الوضع الليلي/النهاري */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
              title={theme === 'dark' ? 'تحويل للوضع النهاري' : 'تحويل للوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* حالة الاتصال بالخادم */}
            <div className="hidden md:flex items-center gap-1.5 erp-sub px-2.5 py-1 rounded-xl border text-[11px] font-bold">
              {isConnected ? (
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> مباشر
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" /> غير متصل
                </span>
              )}
            </div>

            {/* زر القائمة للشاشات الصغيرة */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-xl border erp-sub"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* قائمة الميجا-منيو (Mega-Menu Drawer) لكافة موديولات النظام */}
      {isMenuOpen && (
        <div className="border-t erp-sub p-6 shadow-2xl transition-all duration-200">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            {modules.map((category, idx) => (
              <div key={idx} className="space-y-2.5">
                <h4 className="font-black text-gray-500 dark:text-gray-400 text-[11px] border-b pb-1">
                  {category.category}
                </h4>
                <div className="space-y-1">
                  {category.items.map((item, iIdx) => {
                    const IconComponent = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={iIdx}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl transition ${
                          isActive
                            ? 'bg-indigo-600 text-white font-bold shadow'
                            : 'hover:bg-gray-500/10 font-medium'
                        }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
