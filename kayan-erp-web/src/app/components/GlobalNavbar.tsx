'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useCustomIcons, CustomAppIcon } from '../context/CustomIconsContext';
import { getLucideIcon } from './ManageIconModal';
import {
  LogOut,
  Building,
  Sun,
  Moon,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Plus,
  ChevronDown,
  Settings,
} from 'lucide-react';

const COLOR_STYLES: Record<string, { bg: string; text: string; border: string; hover: string }> = {
  amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', hover: 'hover:bg-amber-500/25' },
  teal: { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30', hover: 'hover:bg-teal-500/25' },
  emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', hover: 'hover:bg-emerald-500/25' },
  blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', hover: 'hover:bg-blue-500/25' },
  indigo: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', hover: 'hover:bg-indigo-500/25' },
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', hover: 'hover:bg-purple-500/25' },
  rose: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', hover: 'hover:bg-rose-500/25' },
  cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', hover: 'hover:bg-cyan-500/25' },
};

export default function GlobalNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const { icons, openModal, setActiveTabId } = useCustomIcons();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTenant, setCurrentTenant] = useState<any>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

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

  const userRole = currentUser?.role || 'GUEST';

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('kayan_user');
      localStorage.removeItem('kayan_token');
      localStorage.removeItem('kayan_tenant');
    }
    router.push('/login');
  };

  if (pathname === '/login') {
    return null;
  }

  const tenantName = currentTenant?.companyName || currentUser?.companyName || 'مصانع وحلواني أبو عادل';
  const userName = currentUser?.fullName || 'م. أحمد عادل';

  // الأيقونات المخصصة المحددة للظهور في الشريط العلوي
  const navbarIcons = icons.filter((ic) => ic.show_in_navbar);

  const handleNavigateToIconTab = (iconId: string) => {
    setActiveTabId(iconId);
    setActiveDropdownId(null);
    if (pathname !== '/') {
      router.push(`/?custom_tab=${iconId}`);
    }
  };

  return (
    <nav className="erp-card border-b sticky top-0 z-40 transition-colors duration-200 print:hidden">
      <div className="w-full px-3 sm:px-6">
        <div className="flex items-center justify-between h-14 gap-2">
          {/* الشعار واسم النظام والشركة وزر كافة التطبيقات والأيقونات المخصصة بجوارها */}
          <div className="flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                كـ
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-sm tracking-wide block leading-tight">كيان ERP</span>
                <span className="text-[10px] text-amber-400 font-bold block truncate max-w-[140px]">
                  {tenantName}
                </span>
              </div>
            </Link>

            {/* بادج المنشأة */}
            <div
              className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/10 dark:bg-slate-800/50 text-amber-500 border border-amber-500/30 text-[11px] font-black select-none shrink-0"
              title="المنشأة المستأجرة النشطة التابع لها هذا الحساب"
            >
              <Building className="w-3.5 h-3.5 text-amber-500" />
              <span className="max-w-[140px] truncate">{tenantName}</span>
            </div>

            {/* زر كافة التطبيقات الموحد والشامل */}
            <Link
              href="/"
              onClick={() => setActiveTabId('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition text-xs font-black cursor-pointer shrink-0 ${
                pathname === '/'
                  ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow-md shadow-amber-500/20'
                  : 'erp-sub hover:border-amber-500/50 text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-amber-400" />
              <span>كافة التطبيقات</span>
            </Link>

            {/* الأيقونات المخصصة بجوار كافة التطبيقات (الإنتاج، الجودة، وأي أيقونة يضيفها المستخدم) */}
            <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-[48vw] scrollbar-none py-1">
              {navbarIcons.map((icon) => {
                const IconComp = getLucideIcon(icon.icon_name);
                const colorStyle = COLOR_STYLES[icon.color] || COLOR_STYLES.amber;
                const isDropdownOpen = activeDropdownId === icon.id;
                const screens = Array.isArray(icon.screens_json) ? icon.screens_json : [];

                return (
                  <div key={icon.id} className="relative shrink-0">
                    <button
                      onClick={() => handleNavigateToIconTab(icon.id)}
                      onMouseEnter={() => setActiveDropdownId(icon.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border} ${colorStyle.hover}`}
                      title={`أيقونة ${icon.title} (${screens.length} شاشة)`}
                    >
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span className="whitespace-nowrap">{icon.title}</span>
                      {icon.badge_text && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-white/20 text-white">
                          {icon.badge_text}
                        </span>
                      )}
                      <ChevronDown className="w-3 h-3 opacity-60" />
                    </button>

                    {/* القائمة المنسدلة للشاشات التابعة للأيقونة */}
                    {isDropdownOpen && (
                      <div
                        onMouseLeave={() => setActiveDropdownId(null)}
                        className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 divide-y divide-slate-800 text-xs"
                      >
                        <div className="flex items-center justify-between px-2 py-1.5 text-slate-300 font-bold">
                          <span className="flex items-center gap-1.5">
                            <IconComp className="w-3.5 h-3.5 text-amber-400" />
                            {icon.title} ({screens.length})
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(null);
                              openModal(icon);
                            }}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition"
                            title="تعديل شاشات هذه الأيقونة"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="py-1 max-h-56 overflow-y-auto space-y-0.5">
                          {screens.length === 0 ? (
                            <div className="p-2 text-center text-slate-500 text-[11px]">
                              لا توجد شاشات محددة داخل هذه الأيقونة
                            </div>
                          ) : (
                            screens.map((scr) => {
                              const SIcon = getLucideIcon(scr.iconName);
                              return (
                                <Link
                                  key={scr.href}
                                  href={scr.href}
                                  onClick={() => setActiveDropdownId(null)}
                                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800/80 text-slate-200 transition"
                                >
                                  <SIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                  <div className="overflow-hidden flex-1 text-right">
                                    <span className="font-bold text-[11px] block truncate">{scr.label}</span>
                                    {scr.tag && (
                                      <span className="text-[9px] text-slate-400 block truncate">{scr.tag}</span>
                                    )}
                                  </div>
                                </Link>
                              );
                            })
                          )}
                        </div>

                        <div className="pt-1.5">
                          <button
                            onClick={() => handleNavigateToIconTab(icon.id)}
                            className="w-full py-1.5 px-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-amber-400 font-bold text-center block text-[11px] transition"
                          >
                            عرض الكل في لوحة التحكم
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* زر إضافة أيقونة جديدة بجوار الأيقونات */}
              <button
                onClick={() => openModal(null)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl border border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-amber-300 text-xs font-bold transition cursor-pointer shrink-0"
                title="إضافة أيقونة جديدة وتحديد شاشاتها"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">إضافة أيقونة</span>
              </button>
            </div>
          </div>

          {/* أدوات التحكم (المستخدم، خروج، الوضع الليلي، الاتصال) */}
          <div className="flex items-center gap-2 shrink-0">
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

            {/* زر تسجيل الخروج */}
            <button
              onClick={handleLogout}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="تسجيل الخروج"
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

            {/* حالة الاتصال */}
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
          </div>
        </div>
      </div>
    </nav>
  );
}
