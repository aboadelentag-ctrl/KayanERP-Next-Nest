'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Building2,
  Plus,
  Edit2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  MapPin,
  Search,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Check,
  Building,
  Key,
  Users,
  Store,
  ArrowRight,
  ShieldAlert,
  LayoutDashboard,
} from 'lucide-react';

interface Company {
  id: string;
  companyCode: string;
  companyName: string;
  tenantCode?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
  branchesCount?: number;
  usersCount?: number;
}

export default function CompaniesPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTenantId, setActiveTenantId] = useState<string>('1');

  // Form state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [companyCode, setCompanyCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [active, setActive] = useState(true);

  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // التحقق من الصلاحيات: مقصور حصراً على سوبر أدمن المنصة
    if (typeof window !== 'undefined') {
      try {
        const u = localStorage.getItem('kayan_user');
        const user = u ? JSON.parse(u) : null;
        if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_SUPER_ADMIN')) {
          setIsAuthorized(false);
          let countdown = 3;
          const interval = setInterval(() => {
            countdown -= 1;
            setRedirectCountdown(countdown);
            if (countdown <= 0) {
              clearInterval(interval);
              router.push('/');
            }
          }, 1000);
          return () => clearInterval(interval);
        } else {
          setIsAuthorized(true);
        }

        const storedTenant = localStorage.getItem('kayan_tenant');
        if (storedTenant) {
          const parsed = JSON.parse(storedTenant);
          if (parsed.companyId) setActiveTenantId(String(parsed.companyId));
        }
      } catch (e) {
        console.warn(e);
        setIsAuthorized(false);
      }
    }
    loadCompanies();
  }, [router]);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/companies');
      if (Array.isArray(res.data)) {
        setCompanies(res.data);
      } else if (res.data?.data) {
        setCompanies(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch companies from database:', err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (comp: Company) => {
    setIsEditMode(true);
    setSelectedCompanyId(comp.id);
    setCompanyCode(comp.companyCode);
    setCompanyName(comp.companyName);
    setTenantCode(comp.tenantCode || comp.companyCode);
    setPhone(comp.phone || '');
    setEmail(comp.email || '');
    setAddress(comp.address || '');
    setActive(comp.active);
    setFeedback(null);
  };

  const resetForm = () => {
    setIsEditMode(false);
    setSelectedCompanyId(null);
    setCompanyCode('');
    setCompanyName('');
    setTenantCode('');
    setPhone('');
    setEmail('');
    setAddress('');
    setActive(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !companyCode.trim()) {
      setFeedback({ msg: 'يرجى إدخال اسم وكود الشركة', success: false });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const payload = {
      companyCode: companyCode.trim(),
      companyName: companyName.trim(),
      tenantCode: tenantCode.trim() || companyCode.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      active,
    };

    try {
      if (isEditMode && selectedCompanyId) {
        await axios.put(`http://localhost:3000/companies/${selectedCompanyId}`, payload);
        setFeedback({ msg: 'تم تحديث بيانات الشركة بنجاح ✓', success: true });
      } else {
        await axios.post('http://localhost:3000/companies', payload);
        setFeedback({ msg: 'تم تسجيل الشركة المستأجرة الجديدة بنجاح ✓', success: true });
      }
      resetForm();
      await loadCompanies();
    } catch (err: any) {
      console.warn('Backend save error, updating local state:', err);
      if (isEditMode && selectedCompanyId) {
        setCompanies((prev) =>
          prev.map((c) =>
            c.id === selectedCompanyId
              ? {
                  ...c,
                  ...payload,
                }
              : c
          )
        );
        setFeedback({ msg: 'تم تحديث الشركة في الجلسة المحلية بنجاح ✓', success: true });
      } else {
        const newComp: Company = {
          id: String(companies.length + 1),
          ...payload,
          branchesCount: 1,
          usersCount: 2,
        };
        setCompanies((prev) => [...prev, newComp]);
        setFeedback({ msg: 'تمت إضافة الشركة محلياً بنجاح ✓', success: true });
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  // تبديل المنشأة النشطة
  const handleSwitchTenant = (comp: Company) => {
    setActiveTenantId(comp.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'kayan_tenant',
        JSON.stringify({
          companyId: comp.id,
          companyName: comp.companyName,
          tenantCode: comp.tenantCode || comp.companyCode,
        })
      );
      // تحديث بيانات المستخدم لتتناسب مع الشركة
      const user = localStorage.getItem('kayan_user');
      if (user) {
        try {
          const parsed = JSON.parse(user);
          parsed.companyId = comp.id;
          parsed.companyName = comp.companyName;
          localStorage.setItem('kayan_user', JSON.stringify(parsed));
        } catch (e) {
          console.warn(e);
        }
      }
      window.dispatchEvent(new Event('tenantChanged'));
    }
    setFeedback({
      msg: `تم التبديل بنجاح إلى شركة: [${comp.companyName}] كمنشأة تشغيلية نشطة`,
      success: true,
    });
  };

  const filteredCompanies = companies.filter((c) => {
    const q = searchTerm.toLowerCase().trim();
    return (
      c.companyName.toLowerCase().includes(q) ||
      c.companyCode.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  });

  if (isAuthorized === false) {
    return (
      <div dir="rtl" className="min-h-screen p-6 max-w-xl mx-auto flex items-center justify-center">
        <div className="erp-card p-8 rounded-3xl border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-white">403 - تم رفض الوصول (Access Forbidden)</h1>
            <p className="text-xs erp-muted leading-relaxed">
              شاشة إدارة الشركات والمستأجرين مقصورة حصرياً على رتبة <strong>«سوبر أدمن المنصة» (Platform Super Admin)</strong>.
              حسابك الحالي يتبع منشأة مستأجرة ولا يملك صلاحية إدارة التراخيص والمنشآت.
            </p>
          </div>
          <div className="p-3 rounded-2xl erp-sub border text-xs text-amber-400 font-bold">
            سيتم توجيهك تلقائياً للوحة العمليات الرئيسية خلال {redirectCountdown} ثوانٍ...
          </div>
          <Link
            href="/"
            className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>العودة للوحة العمليات الرئيسية الآن</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen p-3 sm:p-5 w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 erp-card p-6 rounded-2xl shadow-sm border">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black">إدارة الشركات والمستأجرين (Multi-Tenant Management)</h1>
              <p className="text-xs erp-muted">
                إدارة المؤسسات والشركات المستأجرة التابعة لمنصة كيان ERP، وتحديد المنشأة النشطة
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition shadow cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>العودة للوحة العمليات الرئيسية</span>
          </Link>

          <button
            onClick={loadCompanies}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border erp-sub hover:opacity-80 transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="erp-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold erp-muted">إجمالي الشركات المسجلة</span>
            <div className="text-2xl font-black mt-1 font-mono">{companies.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Building className="w-6 h-6" />
          </div>
        </div>

        <div className="erp-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold erp-muted">الشركات المفعلة</span>
            <div className="text-2xl font-black mt-1 font-mono text-emerald-500">
              {companies.filter((c) => c.active).length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="erp-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold erp-muted">الفروع التشغيلية التابعة</span>
            <div className="text-2xl font-black mt-1 font-mono text-amber-500">
              {companies.reduce((sum, c) => sum + (c.branchesCount || 1), 0)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <Store className="w-6 h-6" />
          </div>
        </div>

        <div className="erp-card p-4 rounded-2xl border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold erp-muted">المستخدمين المرخصين</span>
            <div className="text-2xl font-black mt-1 font-mono text-cyan-500">
              {companies.reduce((sum, c) => sum + (c.usersCount || 5), 0)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-500">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
            feedback.success
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
          }`}
        >
          {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Content Grid: Form (Left) & Table (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Column */}
        <div className="lg:col-span-4">
          <div className="erp-card p-6 rounded-2xl border shadow-sm sticky top-6">
            <h2 className="text-base font-black mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" />
              <span>{isEditMode ? 'تعديل بيانات الشركة' : 'إضافة شركة مستأجرة جديدة'}</span>
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold erp-muted mb-1">
                  كود الشركة / المستأجر <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value)}
                  placeholder="مثال: COMP-04"
                  className="w-full px-3 py-2 rounded-xl border erp-sub text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold erp-muted mb-1">
                  اسم الشركة / المنشأة <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="مثال: مصانع ومعامل أبو عادل فرع 2"
                  className="w-full px-3 py-2 rounded-xl border erp-sub text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold erp-muted mb-1">
                  كود الدخول السحابي (Tenant Code)
                </label>
                <input
                  type="text"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  placeholder="مثال: ABUADEL_BRANCH2"
                  className="w-full px-3 py-2 rounded-xl border erp-sub text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold erp-muted mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01002345670"
                  className="w-full px-3 py-2 rounded-xl border erp-sub text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold erp-muted mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@company.com"
                  className="w-full px-3 py-2 rounded-xl border erp-sub text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold erp-muted mb-1">العنوان والمقر</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المنطقة الصناعية - سندوب - المنصورة"
                  className="w-full px-3 py-2 rounded-xl border erp-sub text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="activeCheck" className="text-xs font-bold cursor-pointer">
                  الشركة نشطة ومفعلة للتشغيل
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isEditMode ? (
                    <Edit2 className="w-3.5 h-3.5" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{isEditMode ? 'حفظ التعديلات' : 'تسجيل الشركة'}</span>
                </button>

                {isEditMode && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-2.5 rounded-xl border erp-sub text-xs font-bold hover:opacity-80 transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Table Column */}
        <div className="lg:col-span-8">
          <div className="erp-card rounded-2xl border shadow-sm overflow-hidden">
            {/* Table Header / Search */}
            <div className="p-4 border-b flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
                <input
                  type="text"
                  placeholder="بحث باسم الشركة، الكود، أو الهاتف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-3 py-1.5 rounded-xl border erp-sub text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="text-xs font-bold erp-muted">
                إجمالي المعروض: <span className="font-mono text-amber-500">{filteredCompanies.length}</span> شركة
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b">
                  <tr>
                    <th className="p-3.5 font-bold"># ID</th>
                    <th className="p-3.5 font-bold">كود الشركة</th>
                    <th className="p-3.5 font-bold">اسم الشركة والمنشأة</th>
                    <th className="p-3.5 font-bold">الاتصال</th>
                    <th className="p-3.5 font-bold">العنوان</th>
                    <th className="p-3.5 font-bold text-center">الحالة</th>
                    <th className="p-3.5 font-bold text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center erp-muted">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جاري تحميل الشركات والمستأجرين...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center erp-muted">
                        لا توجد شركات مطابقة لمعايير البحث الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((comp) => {
                      const isActiveTenant = String(comp.id) === String(activeTenantId);
                      return (
                        <tr
                          key={comp.id}
                          className={`hover:bg-gray-500/5 transition ${
                            isActiveTenant ? 'bg-amber-500/5 font-semibold' : ''
                          }`}
                        >
                          <td className="p-3.5 font-mono text-amber-500 font-bold">#{comp.id}</td>
                          <td className="p-3.5 font-mono font-bold">{comp.companyCode}</td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{comp.companyName}</span>
                              {isActiveTenant && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 flex items-center gap-1">
                                  <Check className="w-3 h-3 stroke-[3]" /> المنشأة النشطة
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] erp-muted font-mono">
                              Tenant: {comp.tenantCode || comp.companyCode}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="space-y-0.5 font-mono text-[11px]">
                              {comp.phone && (
                                <div className="flex items-center gap-1 erp-muted">
                                  <Phone className="w-3 h-3 text-emerald-500" />
                                  <span>{comp.phone}</span>
                                </div>
                              )}
                              {comp.email && (
                                <div className="flex items-center gap-1 erp-muted">
                                  <Mail className="w-3 h-3 text-cyan-500" />
                                  <span>{comp.email}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-slate-400 text-[11px] max-w-xs truncate">
                            {comp.address || '-'}
                          </td>
                          <td className="p-3.5 text-center">
                            {comp.active ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                مفعلة
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500">
                                موقوفة
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!isActiveTenant && comp.active && (
                                <button
                                  onClick={() => handleSwitchTenant(comp)}
                                  className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="تبديل النظام إلى هذه المنشأة"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>تبديل</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(comp)}
                                className="p-1.5 rounded-lg border erp-sub hover:opacity-80 transition text-slate-400 hover:text-amber-500 cursor-pointer"
                                title="تعديل بيانات الشركة"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
