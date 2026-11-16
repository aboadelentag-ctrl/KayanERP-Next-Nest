'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import {
  Store,
  CreditCard,
  PackageCheck,
  User,
  Barcode,
  ArrowRight,
  ArrowLeft,
  Clock,
  TrendingUp,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Building,
  FileText,
} from 'lucide-react';

export default function PosShowroomHubPage() {
  const { socket, isConnected } = useSocket();

  const [pendingCount, setPendingCount] = useState<number>(2);
  const [readyCount, setReadyCount] = useState<number>(2);
  const [deliveredCount, setDeliveredCount] = useState<number>(34);
  const [todaySales, setTodaySales] = useState<number>(142500);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const [pendingRes, dispatchRes] = await Promise.all([
        axios.get('http://localhost:3000/sales/slips/pending').catch(() => null),
        axios.get('http://localhost:3000/sales/dispatch').catch(() => null),
      ]);

      if (pendingRes?.data?.success && Array.isArray(pendingRes.data.data)) {
        setPendingCount(pendingRes.data.data.length);
      }
      if (dispatchRes?.data?.success && dispatchRes.data.data?.readyToDeliver) {
        setReadyCount(dispatchRes.data.data.readyToDeliver.length);
        if (dispatchRes.data.data.counts?.deliveredToday) {
          setDeliveredCount(dispatchRes.data.data.counts.deliveredToday);
        }
      }
    } catch (e) {
      console.warn('Counts load error:', e);
    }
  };

  // Real-time WebSocket updates
  useEffect(() => {
    if (!socket) return;

    socket.on('slip_created', () => {
      setPendingCount((prev) => prev + 1);
    });

    socket.on('slip_paid', () => {
      setPendingCount((prev) => Math.max(0, prev - 1));
      setReadyCount((prev) => prev + 1);
    });

    socket.on('order_delivered', () => {
      setReadyCount((prev) => Math.max(0, prev - 1));
      setDeliveredCount((prev) => prev + 1);
    });

    return () => {
      socket.off('slip_created');
      socket.off('slip_paid');
      socket.off('order_delivered');
    };
  }, [socket]);

  return (
    <div dir="rtl" className="erp-container-fluid min-h-screen space-y-4">
      
      {/* 1. الترويسة التنفيذية لمركز عمليات نقاط البيع */}
      <div className="erp-card p-6 rounded-3xl border shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5" />
                <span>معارض وحلواني أبو عادل • المركز الرئيسي (شارع الجمهورية)</span>
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>دورة نقاط البيع اللحظية (Reactive Queue Flow)</span>
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              بوابة محطات نقاط البيع والتجزئة (Showroom POS Hub)
            </h1>
            <p className="text-xs erp-muted mt-1 max-w-2xl leading-relaxed">
              منظومة المبيعات الموحدة القائمة على الفصل المؤسسي الصارم: بوليصة البائع ⭢ تحصيل الخزينة ⭢ شباك تسليم البضاعة وخصم المخزون اللحظي
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/sales"
              className="px-4 py-2.5 rounded-2xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>مبيعات الجملة والشركات</span>
            </Link>

            <button
              onClick={loadCounts}
              className="p-2.5 rounded-2xl border erp-sub hover:opacity-80 transition text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="تحديث البيانات اللحظية"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. مؤشرات حية لتدفق الطوابير اللحظية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* بوالص الصالة بانتظار السداد */}
        <div className="erp-card p-5 rounded-2xl border shadow-sm border-r-4 border-r-amber-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold erp-muted">بوالص بانتظار سداد الكاشير</span>
            <div className="text-2xl font-black font-mono text-amber-500 mt-1">
              {pendingCount} بوالص
            </div>
            <span className="text-[11px] text-amber-400 font-bold block mt-1">محطة 1 ⭢ محطة 2</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <Barcode className="w-6 h-6" />
          </div>
        </div>

        {/* طلبات جاهزة للتسليم بشباك الاستلام */}
        <div className="erp-card p-5 rounded-2xl border shadow-sm border-r-4 border-r-emerald-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold erp-muted">طلبات مدفوعة بانتظار التسليم</span>
            <div className="text-2xl font-black font-mono text-emerald-500 mt-1 flex items-center gap-2">
              <span>{readyCount} طلبات</span>
              {readyCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>}
            </div>
            <span className="text-[11px] text-emerald-400 font-bold block mt-1">محطة 2 ⭢ محطة 3</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <PackageCheck className="w-6 h-6" />
          </div>
        </div>

        {/* المسلم اليوم بالمعرض */}
        <div className="erp-card p-5 rounded-2xl border shadow-sm border-r-4 border-r-indigo-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold erp-muted">إجمالي الطلبات المسلمة اليوم</span>
            <div className="text-2xl font-black font-mono text-indigo-400 mt-1">
              {deliveredCount} طلب
            </div>
            <span className="text-[11px] text-indigo-300 font-bold block mt-1">حالة COMPLETED ✓</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* إيراد التجزئة الإجمالي */}
        <div className="erp-card p-5 rounded-2xl border shadow-sm border-r-4 border-r-teal-500 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold erp-muted">إجمالي تحصيلات المعرض اليوم</span>
            <div className="text-2xl font-black font-mono text-teal-400 mt-1">
              {todaySales.toLocaleString()} ج.م
            </div>
            <span className="text-[11px] text-teal-300 font-bold block mt-1">مطابق للخزينة والصندوق</span>
          </div>
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-500">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 3. بطاقات المحطات التشغيلية الثلاث المتخصصة (Screen Consolidation) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* المحطة 1: صالة البيع (البائع) */}
        <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-5 hover:border-amber-500/50 hover:shadow-lg transition flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/30">
                <User className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm">
                المحطة 1
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                صالة البيع وتجهيز الطلبات
              </h3>
              <p className="text-xs font-bold text-amber-500 mt-0.5 font-mono">
                /pos/salesman
              </p>
              <p className="text-xs erp-muted mt-2 leading-relaxed">
                شاشة لمس سريعة مخصصة لبائعي صالة المعرض لاختيار الأصناف ووزنها بالأزرار السريعة، وتحديد العميل وإصدار بوليصة حجز مبدئية مع باركود حراري 80mm.
              </p>
            </div>

            <div className="p-3 rounded-2xl erp-sub border space-y-1.5 text-xs font-bold">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>الحالة المسجلة: <code className="text-amber-400 font-mono">PENDING_PAYMENT</code></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>توليد باركود فريد فوري للطلب</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>بث تلقائي عبر حدث <code className="text-cyan-400 font-mono">slip_created</code></span>
              </div>
            </div>
          </div>

          <Link
            href="/pos/salesman"
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <span>دخول محطة صالة البيع (البائع)</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* المحطة 2: الخزينة والكاشير */}
        <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-5 hover:border-emerald-500/50 hover:shadow-lg transition flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                <CreditCard className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-sm">
                المحطة 2
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                الخزينة وتحصيل النقدية
              </h3>
              <p className="text-xs font-bold text-emerald-400 mt-0.5 font-mono">
                /pos/cashier
              </p>
              <p className="text-xs erp-muted mt-2 leading-relaxed">
                محطة الكاشير المزودة بماسح ضوئي ذكي للقراءة التلقائية للبوليصة فور مسحها، تحديد وسيلة الدفع (نقداً / شبكة POS)، حساب الفكة، وإصدار الفاتورة الضريبية النهائية.
              </p>
            </div>

            <div className="p-3 rounded-2xl erp-sub border space-y-1.5 text-xs font-bold">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>تحديث الحالة إلى: <code className="text-emerald-400 font-mono">PAID_PENDING_DELIVERY</code></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>طباعة الفاتورة الضريبية الرسمية بـ QR</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>بث فوري عبر حدث <code className="text-cyan-400 font-mono">slip_paid</code> لشباك التسليم</span>
              </div>
            </div>
          </div>

          <Link
            href="/pos/cashier"
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <span>دخول محطة الخزينة والكاشير</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* المحطة 3: شباك تسليم البضاعة */}
        <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-5 hover:border-indigo-500/50 hover:shadow-lg transition flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                <PackageCheck className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-600 text-white shadow-sm">
                المحطة 3
              </span>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                شباك تسليم البضاعة للعملاء
              </h3>
              <p className="text-xs font-bold text-indigo-400 mt-0.5 font-mono">
                /pos/dispatch
              </p>
              <p className="text-xs erp-muted mt-2 leading-relaxed">
                شاشة حية تظهر الطلبات المدفوعة باللون الأخضر فور تحصيلها من الخزينة. يؤكد مسؤول التسليم تسليم العلب والحلويات للعميل بمسح الباركود وخصم المخزون فورياً.
              </p>
            </div>

            <div className="p-3 rounded-2xl erp-sub border space-y-1.5 text-xs font-bold">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>تحديث الحالة إلى: <code className="text-indigo-400 font-mono">COMPLETED</code></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>خصم الرصيد المخزني الفعلي من المعرض</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>بث تلقائي عبر حدث <code className="text-cyan-400 font-mono">order_delivered</code></span>
              </div>
            </div>
          </div>

          <Link
            href="/pos/dispatch"
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <span>دخول شباك تسليم البضاعة</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

      </div>

      {/* 4. إشعار وتوجيه لمبيعات الجملة والشركات */}
      <div className="erp-card p-5 rounded-3xl border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 bg-gradient-to-r from-indigo-950/30 to-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white">هل تبحث عن مبيعات الجملة وعقود التوريد؟</h4>
            <p className="text-[11px] erp-muted">
              عقود الفنادق، توريدات الكافيهات، والتحصيلات الآجلة تُدار بالكامل عبر بوابة المبيعات العامة المستقلة.
            </p>
          </div>
        </div>

        <Link
          href="/sales"
          className="px-5 py-2.5 rounded-xl border erp-sub hover:border-indigo-500/50 text-xs font-bold text-indigo-300 transition flex items-center gap-1.5 shrink-0"
        >
          <span>الانتقال لبوابة مبيعات الجملة</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

    </div>
  );
}
