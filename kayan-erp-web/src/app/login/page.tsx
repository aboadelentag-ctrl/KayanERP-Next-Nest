'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Building2,
  KeyRound,
  User,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Store,
  Layers,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Tenant
  const [tenantCode, setTenantCode] = useState('ABUADEL');
  const [tenantKey, setTenantKey] = useState('123456');
  const [verifiedCompanyId, setVerifiedCompanyId] = useState<string>('1');
  const [verifiedCompanyName, setVerifiedCompanyName] = useState<string>('مصانع وحلواني أبو عادل');

  // Step 2: User
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [selectedBranch, setSelectedBranch] = useState('1');

  // Available branches for selection
  const branches = [
    { id: '1', name: 'المصنع المركزي ومجمع الإنتاج (سندوب)' },
    { id: '4', name: 'معرض المنصورة الرئيسي (شارع الجمهورية)' },
    { id: '5', name: 'معرض دكرنس (ميدان المحطة)' },
    { id: '2', name: 'مستودع الخامات المركزي (سندوب)' },
    { id: '3', name: 'مستودع المنتج التام والتعبئة' },
  ];

  // التحقق من هوية المنشأة المستأجرة
  const handleVerifyTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await axios.post('http://localhost:3000/auth/verify-tenant', {
        tenantCode: tenantCode.trim(),
        tenantKey: tenantKey.trim(),
      });

      if (res.data && res.data.success) {
        setVerifiedCompanyId(String(res.data.companyId || '1'));
        setVerifiedCompanyName(res.data.companyName || 'مصانع وحلواني أبو عادل');
        // حفظ بيانات المستأجر
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'kayan_tenant',
            JSON.stringify({
              companyId: res.data.companyId,
              companyName: res.data.companyName,
              tenantCode: res.data.tenantCode,
            })
          );
        }
        setCurrentStep(2);
      } else {
        setErrorMessage(res.data?.message || 'بيانات اعتماد المنشأة غير صحيحة');
      }
    } catch (err: any) {
      console.warn('Tenant verification error:', err);
      setErrorMessage(err.response?.data?.message || 'تعذر التحقق من المنشأة، تأكد من كود المنشأة ومفتاح الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  // تسجيل دخول المستخدم
  const handleLoginUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await axios.post('http://localhost:3000/auth/login-user', {
        companyId: verifiedCompanyId,
        username: username.trim(),
        password: password.trim(),
        branchId: selectedBranch,
      });

      if (res.data && res.data.success) {
        const branchObj = branches.find((b) => b.id === selectedBranch);
        const sessionUser = {
          ...res.data.user,
          companyName: verifiedCompanyName,
          branchName: branchObj?.name || 'المصنع المركزي (سندوب)',
          token: res.data.token,
          loginTime: new Date().toISOString(),
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem('kayan_user', JSON.stringify(sessionUser));
          localStorage.setItem('kayan_token', res.data.token);
        }

        router.push('/');
      } else {
        setErrorMessage(res.data?.message || 'بيانات الدخول غير صحيحة');
      }
    } catch (err: any) {
      console.warn('Login error:', err);
      setErrorMessage(err.response?.data?.message || 'بيانات الدخول غير صحيحة، يرجى التحقق من اسم المستخدم وكلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetToStep1 = () => {
    setCurrentStep(1);
    setErrorMessage(null);
    setPassword('');
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-hidden font-sans"
    >
      {/* Background radial effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-400 font-extrabold text-2xl">
              ك
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">منصة كيان السحابية</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            KAYAN ENTERPRISE • مصانع وحلواني أبو عادل
          </p>
        </div>

        {/* Two-step Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 px-4">
          <div className={`flex items-center gap-1.5 text-xs font-bold ${currentStep === 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 1
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-emerald-500 text-slate-950 font-black'
              }`}
            >
              1
            </span>
            <span>اعتماد المنشأة</span>
          </div>

          <div className={`flex-1 h-0.5 max-w-[50px] ${currentStep === 2 ? 'bg-emerald-500' : 'bg-slate-700'}`} />

          <div className={`flex items-center gap-1.5 text-xs font-bold ${currentStep === 2 ? 'text-amber-400' : 'text-slate-500'}`}>
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                currentStep === 2
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              2
            </span>
            <span>دخول المستخدم</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Verify Tenant */}
        {currentStep === 1 && (
          <form onSubmit={handleVerifyTenant} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                كود / اسم المنشأة المستأجرة <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  placeholder="مثال: ABUADEL أو COMP-01"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm font-bold placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                كود المستأجر المعين لمؤسستك في عقد الترخيص السحابي
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                مفتاح الدخول السري للمنشأة (Tenant Key) <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute right-3.5 top-3.5 text-amber-400" />
                <input
                  type="password"
                  required
                  value={tenantKey}
                  onChange={(e) => setTenantKey(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق من ترخيص المنشأة...</span>
                </>
              ) : (
                <>
                  <span>التالي: التحقق واعتماد المنشأة</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: User Login */}
        {currentStep === 2 && (
          <form onSubmit={handleLoginUser} className="space-y-4">
            {/* Verified Tenant Banner */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">المنشأة المعتمدة:</span>
                <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {verifiedCompanyName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetToStep1}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-200 underline cursor-pointer"
              >
                تغيير المنشأة
              </button>
            </div>

            {/* Username */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم المستخدم الشخصي <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm font-bold placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                كلمة المرور الشخصية <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-sm font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
              </div>
            </div>

            {/* Branch Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                فرع / صالة العمل المراد التسجيل بها <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <Store className="w-4 h-4 absolute right-3.5 top-3.5 text-amber-400" />
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-700 text-white text-xs font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} className="bg-slate-900 text-white font-sans">
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل الدخول وتفعيل الصلاحيات...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>دخول منظومة كيان ERP المعتمدة</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 text-center text-[10px] text-slate-500 font-medium">
          نظام الرقابة الصناعية والحوكمة السحابية الصارم © 2026 • إصدار Antigravity 2.0
        </div>
      </div>
    </div>
  );
}
