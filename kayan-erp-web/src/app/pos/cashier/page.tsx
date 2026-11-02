'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import {
  CreditCard,
  Barcode,
  Search,
  CheckCircle2,
  Printer,
  Clock,
  ArrowRight,
  User,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Loader2,
  X,
  Store,
  Layers,
  Sparkles,
  Building,
  RefreshCw,
} from 'lucide-react';

interface SlipItem {
  itemId: string;
  itemName: string;
  quantity: number;
  weight: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface Slip {
  id: string;
  slipNumber: string;
  barcode: string;
  orderNumber?: string;
  salesmanCode?: string;
  salesmanName: string;
  branchName?: string;
  customerName: string;
  customerPhone?: string;
  createdAt: string;
  status: 'PENDING_PAYMENT' | 'PAID_PENDING_DELIVERY' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  discountAmount: number;
  taxAmount?: number;
  totalAmount: number;
  notes?: string;
  items: SlipItem[];
  paymentMethod?: string;
  invoiceNumber?: string;
  paidAt?: string;
  cashierName?: string;
}

export default function CashierPosPage() {
  const { socket } = useSocket();

  // Barcode scanner input & ref for auto-focus
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [barcodeQuery, setBarcodeQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selected slip for payment
  const [activeSlip, setActiveSlip] = useState<Slip | null>(null);

  // Pending slips queue from Neon PostgreSQL
  const [pendingSlips, setPendingSlips] = useState<Slip[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'SPLIT'>('CASH');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paidCash, setPaidCash] = useState<number | ''>('');
  const [cashierName, setCashierName] = useState('خالد عبد الرحمن (كاشير 1)');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Paid tax invoice preview modal
  const [paidInvoice, setPaidInvoice] = useState<Slip | null>(null);

  // Auto-focus barcode scanner input on mount & load real pending slips
  useEffect(() => {
    barcodeInputRef.current?.focus();
    loadPendingSlips();
  }, []);

  const loadPendingSlips = async () => {
    setIsLoadingQueue(true);
    try {
      const res = await axios.get('http://localhost:3000/sales/slips/pending');
      if (res.data?.success && Array.isArray(res.data.data)) {
        setPendingSlips(res.data.data);
      }
    } catch (e: any) {
      console.error('Failed to load pending slips from API:', e);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  // Listen for newly created slips via WebSocket
  useEffect(() => {
    if (!socket) return;

    const handleSlipCreated = (newSlip: Slip) => {
      if (newSlip && newSlip.status === 'PENDING_PAYMENT') {
        setPendingSlips((prev) => [newSlip, ...prev.filter((s) => s.barcode !== newSlip.barcode && s.id !== newSlip.id)]);
      }
    };

    const handleSlipPaid = (data: any) => {
      setPendingSlips((prev) => prev.filter((s) => s.barcode !== data.slipBarcode && s.barcode !== data.slip?.barcode));
    };

    socket.on('slip_created', handleSlipCreated);
    socket.on('slip_paid', handleSlipPaid);

    return () => {
      socket.off('slip_created', handleSlipCreated);
      socket.off('slip_paid', handleSlipPaid);
    };
  }, [socket]);

  // Search slip by Barcode in Neon DB
  const handleSearchBarcode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = barcodeQuery.trim();
    if (!cleanCode) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await axios.get(`http://localhost:3000/sales/slips/${cleanCode}`);
      if (res.data?.success && res.data.data) {
        const found = res.data.data;
        if (found.status === 'PAID_PENDING_DELIVERY' || found.status === 'COMPLETED') {
          setSearchError(`البوليصة [${cleanCode}] مسددة مسبقاً (${found.status}) وبانتظار التسليم`);
          setActiveSlip(null);
        } else {
          setActiveSlip(found);
          setPaidCash(found.totalAmount);
          setBarcodeQuery('');
        }
      }
    } catch (err: any) {
      // Fallback check in currently loaded queue
      const localFound = pendingSlips.find(
        (s) => s.barcode === cleanCode || s.slipNumber === cleanCode
      );
      if (localFound) {
        setActiveSlip(localFound);
        setPaidCash(localFound.totalAmount);
        setBarcodeQuery('');
      } else {
        setSearchError(err.response?.data?.message || 'لم يتم العثور على البوليصة في قاعدة البيانات. تأكد من صحة الباركود.');
      }
    } finally {
      setIsSearching(false);
      barcodeInputRef.current?.focus();
    }
  };

  const handleSelectPendingSlip = (slip: Slip) => {
    setActiveSlip(slip);
    setPaidCash(slip.totalAmount);
    setSearchError(null);
    setPaymentError(null);
    barcodeInputRef.current?.focus();
  };

  // Calculations
  const currentTotal = activeSlip
    ? Math.max(0, activeSlip.subtotal - discountAmount)
    : 0;

  const changeAmount =
    paidCash && typeof paidCash === 'number' && paidCash >= currentTotal
      ? paidCash - currentTotal
      : 0;

  // Process Payment & Print Tax Invoice directly to Neon DB
  const handleCompletePayment = async () => {
    if (!activeSlip) return;
    setIsProcessingPayment(true);
    setPaymentError(null);

    const payload = {
      paymentMethod,
      paidAmount: paidCash || currentTotal,
      discountAmount,
      cashierName,
    };

    try {
      const res = await axios.post(`http://localhost:3000/sales/slips/${activeSlip.id}/pay`, payload);
      if (res.data?.success && res.data.data) {
        setPaidInvoice(res.data.data);
        setPendingSlips((prev) => prev.filter((s) => s.barcode !== activeSlip.barcode && s.id !== activeSlip.id));
        setActiveSlip(null);
        setDiscountAmount(0);
        setPaidCash('');
      } else {
        setPaymentError('تعذر تسجيل السداد بالخزينة من الخادم');
      }
    } catch (err: any) {
      console.error('API payment error:', err);
      setPaymentError(err.response?.data?.message || 'فشل الاتصال بقاعدة البيانات لتسجيل السداد.');
    } finally {
      setIsProcessingPayment(false);
      barcodeInputRef.current?.focus();
    }
  };

  return (
    <div dir="rtl" className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. ترويسة شاشة الكاشير والخزينة */}
      <div className="erp-card p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              خزينة المعرض ونقاط البيع
            </span>
            <span className="text-xs erp-muted">الربط المباشر بقاعدة بيانات Neon وشباك التسليم</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-amber-500" />
            <span>محطة الكاشير وتحصيل البوالص (Cashier POS Register)</span>
          </h1>
        </div>

        {/* الكاشير والتنقل لشباك التسليم */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl erp-sub border text-xs font-bold">
            <User className="w-4 h-4 text-emerald-400" />
            <span>{cashierName}</span>
          </div>

          <button
            onClick={loadPendingSlips}
            title="تحديث قائمة الانتظار من قاعدة البيانات"
            className="p-2 rounded-2xl erp-sub border hover:bg-amber-500/10 text-amber-500 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/pos/dispatch"
            className="px-3.5 py-2 rounded-2xl bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>شباك التسليم</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. شريط مسح الباركود التلقائي (Auto-Focus Barcode Input) */}
      <div className="erp-card p-5 rounded-3xl border shadow-sm print:hidden">
        <form onSubmit={handleSearchBarcode} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Barcode className="w-6 h-6 absolute right-4 top-3.5 text-amber-500 animate-pulse" />
            <input
              ref={barcodeInputRef}
              type="text"
              autoFocus
              value={barcodeQuery}
              onChange={(e) => setBarcodeQuery(e.target.value)}
              placeholder="امسح باركود البوليصة بالماسح الضوئي (أو أدخل رقم البوليصة مثل: SLIP-555783 ثم اضغط Enter)..."
              className="w-full pr-14 pl-4 py-3.5 rounded-2xl border erp-sub text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 transition shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm transition flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>استدعاء البوليصة</span>
          </button>
        </form>

        {searchError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{searchError}</span>
          </div>
        )}

        {paymentError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{paymentError}</span>
          </div>
        )}
      </div>

      {/* 3. جسم الشاشة: تفاصيل البوليصة المختارة (يمين) وقائمة بوالص الانتظار (يسار) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        
        {/* العمود الأيمن: شاشة السداد والتحصيل التفصيلية (8 أعمدة) */}
        <div className="lg:col-span-8 space-y-4">
          {activeSlip ? (
            <div className="erp-card p-6 rounded-3xl border shadow-sm space-y-5">
              
              {/* ترويسة البوليصة */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-amber-400">
                      {activeSlip.slipNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      بانتظار السداد
                    </span>
                  </div>
                  <p className="text-xs erp-muted mt-1">
                    العميل: <strong className="text-white">{activeSlip.customerName}</strong>
                    {activeSlip.customerPhone && ` • هاتف: ${activeSlip.customerPhone}`}
                  </p>
                </div>

                <div className="text-left">
                  <span className="text-xs erp-muted block font-mono">
                    بائع: {activeSlip.salesmanName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(activeSlip.createdAt).toLocaleTimeString('ar-EG')}
                  </span>
                </div>
              </div>

              {/* جدول بنود البوليصة والأوزان المحجوزة */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                  <span>الأصناف والوزن المحجوز من الصالة:</span>
                </h3>

                <div className="rounded-2xl border erp-sub overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b erp-card text-slate-300 font-bold">
                        <th className="p-3">#</th>
                        <th className="p-3">الصنف</th>
                        <th className="p-3 text-center">الوزن / الكمية</th>
                        <th className="p-3 text-center">سعر الكيلو</th>
                        <th className="p-3 text-left">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {activeSlip.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{item.itemName}</td>
                          <td className="p-3 text-center font-mono font-bold text-amber-400">
                            {item.weight} كجم
                          </td>
                          <td className="p-3 text-center font-mono text-slate-300">
                            {item.unitPrice} ج
                          </td>
                          <td className="p-3 text-left font-mono font-black text-white">
                            {item.totalPrice.toFixed(2)} ج
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* قسم التحصيل واحتساب المتبقي */}
              <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* طريقة الدفع والخصم */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-300">طريقة السداد بالخزينة:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`py-2.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                        paymentMethod === 'CASH'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                          : 'erp-sub hover:opacity-80 text-white'
                      }`}
                    >
                      نقداً (Cash)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD')}
                      className={`py-2.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                        paymentMethod === 'CARD'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                          : 'erp-sub hover:opacity-80 text-white'
                      }`}
                    >
                      بطاقة / شبكة
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('SPLIT')}
                      className={`py-2.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                        paymentMethod === 'SPLIT'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow'
                          : 'erp-sub hover:opacity-80 text-white'
                      }`}
                    >
                      مختلط
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold erp-muted mb-1">خصم إضافي (ج.م)</label>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount || ''}
                        onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-xl erp-sub border font-mono font-bold focus:outline-none focus:border-amber-500 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold erp-muted mb-1">المبلغ المستلم من العميل</label>
                      <input
                        type="number"
                        min="0"
                        value={paidCash}
                        onChange={(e) => setPaidCash(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={currentTotal.toString()}
                        className="w-full px-3 py-2 rounded-xl erp-sub border font-mono font-black focus:outline-none focus:border-amber-500 text-xs text-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* الحسابات النهائية وزر الدفع */}
                <div className="erp-sub p-4 rounded-2xl border flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>إجمالي البوليصة:</span>
                      <span className="font-mono font-bold">{activeSlip.subtotal.toFixed(2)} ج.م</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-rose-400">
                        <span>الخصم المطبق:</span>
                        <span className="font-mono font-bold">- {discountAmount.toFixed(2)} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm font-black text-white pt-2 border-t">
                      <span>صافي المطلوب:</span>
                      <span className="font-mono text-xl text-amber-400">{currentTotal.toFixed(2)} ج.م</span>
                    </div>
                    {changeAmount > 0 && (
                      <div className="flex justify-between items-center text-xs font-black text-emerald-400 pt-1">
                        <span>المتبقي للعميل (باقي النقدية):</span>
                        <span className="font-mono text-base">{changeAmount.toFixed(2)} ج.م</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleCompletePayment}
                    disabled={isProcessingPayment}
                    className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isProcessingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جاري قيد السداد بالداتابيز وإصدار الفاتورة...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>تحصيل وطباعة الفاتورة الضريبية (F9)</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>
          ) : (
            <div className="erp-card p-16 rounded-3xl border text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
                <Barcode className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-base text-white">في انتظار مسح باركود البوليصة</h3>
                <p className="text-xs erp-muted max-w-sm mx-auto">
                  قم بمسح الباركود المطبوع من بوليصة الصالة أو اختر من قائمة البوالص المعلقة يسار الشاشة لبدء التحصيل.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* العمود الأيسر: قائمة بوالص الانتظار الحية من Neon DB (4 أعمدة) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="erp-card p-4 rounded-3xl border shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-xs text-white">بوالص الصالة بانتظار السداد</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {pendingSlips.length} معلقة
              </span>
            </div>

            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {isLoadingQueue ? (
                <div className="text-center py-10 erp-muted space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" />
                  <p className="text-xs">جاري جلب البوالص من Neon DB...</p>
                </div>
              ) : pendingSlips.length === 0 ? (
                <div className="text-center py-12 erp-muted space-y-2">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/40" />
                  <p className="text-xs font-bold">لا توجد بوالص معلقة حالياً</p>
                  <p className="text-[11px] text-slate-500">كافة طلبات الصالة تم سدادها بنجاح</p>
                </div>
              ) : (
                pendingSlips.map((slip) => (
                  <button
                    key={slip.id}
                    onClick={() => handleSelectPendingSlip(slip)}
                    className={`w-full p-3 rounded-2xl border text-right transition cursor-pointer space-y-1.5 ${
                      activeSlip?.barcode === slip.barcode
                        ? 'bg-amber-500/15 border-amber-500 shadow-md'
                        : 'erp-sub hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-xs text-amber-400">
                        {slip.slipNumber}
                      </span>
                      <span className="font-mono font-black text-xs text-white">
                        {slip.totalAmount} ج.م
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] erp-muted">
                      <span>العميل: {slip.customerName}</span>
                      <span>{slip.items.length} أصناف</span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      بائع: {slip.salesmanName.split(' ')[0]} • منذ {new Date(slip.createdAt).toLocaleTimeString('ar-EG')}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* 4. نافذة معاينة وطباعة الفاتورة الضريبية النهائية 80mm مع QR Code */}
      {paidInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white text-black p-6 rounded-2xl shadow-2xl space-y-4 print:p-0 print:shadow-none print:w-full">
            
            {/* أزرار الإجراءات في الشاشة (تختفي عند الطباعة) */}
            <div className="flex justify-between items-center print:hidden border-b pb-3">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> تم السداد وتوجيه الطلب لشباك التسليم
              </span>
              <button
                onClick={() => setPaidInvoice(null)}
                className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* رأس الفاتورة الرسمية */}
            <div className="text-center space-y-1 font-sans">
              <h2 className="text-lg font-black">مصانع وحلواني أبو عادل</h2>
              <p className="text-xs text-gray-600">فاتورة ضريبية مبسطة - معارض التجزئة</p>
              <p className="text-[10px] text-gray-500">س.ت: 84920 • ب.ض: 200-112-445</p>
              <div className="border-t border-b border-dashed border-gray-400 py-1 my-2">
                <span className="text-sm font-black font-mono block">رقم الفاتورة: {paidInvoice.invoiceNumber}</span>
                <span className="text-xs font-mono text-gray-600 block">رقم البوليصة: {paidInvoice.barcode}</span>
              </div>
            </div>

            {/* بيانات العميل والتوقيت */}
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">العميل:</span>
                <span className="font-bold">{paidInvoice.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">الكاشير:</span>
                <span className="font-bold">{paidInvoice.cashierName || cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">طريقة السداد:</span>
                <span className="font-bold">
                  {paidInvoice.paymentMethod === 'CASH'
                    ? 'نقداً بالخزينة'
                    : paidInvoice.paymentMethod === 'CARD'
                    ? 'شبكة POS'
                    : 'مختلط'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">التاريخ:</span>
                <span className="font-mono">{new Date().toLocaleString('ar-EG')}</span>
              </div>
            </div>

            {/* جدول بنود الفاتورة */}
            <table className="w-full text-right text-xs border-t border-b border-gray-300 my-2">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-1">الصنف</th>
                  <th className="py-1 text-center">الوزن</th>
                  <th className="py-1 text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paidInvoice.items.map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="py-1 font-semibold">{it.itemName}</td>
                    <td className="py-1 text-center font-mono">{it.weight} كجم</td>
                    <td className="py-1 text-left font-mono font-bold">{Number(it.totalPrice).toFixed(2)} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* الإجمالي */}
            <div className="flex justify-between items-center text-sm font-black pt-1">
              <span>المسدد بالكامل:</span>
              <span className="font-mono text-base">{Number(paidInvoice.totalAmount).toFixed(2)} ج.م</span>
            </div>

            {/* رمز الاستجابة السريعة QR والشباك */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
              <div className="font-mono text-xs font-black text-emerald-800">
                [ تم تحصيل الفاتورة ✓ جاهزة للتسليم ]
              </div>
              <p className="text-xs font-bold text-gray-800">
                تفضل بالتوجه إلى <strong>شباك التسليم</strong> برقم الفاتورة أعلاه لاستلام طلبيتك الطازجة.
              </p>
            </div>

            {/* زر الطباعة الفعلية */}
            <div className="print:hidden pt-2 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة الضريبية (80mm)</span>
              </button>
              <button
                onClick={() => setPaidInvoice(null)}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold hover:bg-gray-100 text-gray-700"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
