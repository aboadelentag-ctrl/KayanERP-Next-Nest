'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import {
  CheckCircle2,
  PackageCheck,
  Clock,
  Barcode,
  Search,
  User,
  ShoppingBag,
  ArrowRight,
  Loader2,
  Check,
  Sparkles,
  Layers,
  Store,
  CreditCard,
  Building,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface OrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  weight: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

interface DispatchOrder {
  id: string;
  slipNumber: string;
  barcode: string;
  invoiceNumber?: string;
  customerName: string;
  customerPhone?: string;
  salesmanName?: string;
  cashierName?: string;
  branchName?: string;
  status: 'PENDING_PAYMENT' | 'PAID_PENDING_DELIVERY' | 'PAID' | 'COMPLETED' | 'CANCELLED';
  paidAt?: string;
  deliveredAt?: string;
  totalAmount: number;
  notes?: string;
  items: OrderItem[];
}

export default function DispatchPosPage() {
  const { socket } = useSocket();

  // Barcode input for instant delivery scan
  const barcodeScanInputRef = useRef<HTMLInputElement>(null);
  const [scanQuery, setScanQuery] = useState('');
  const [isDelivering, setIsDelivering] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Active orders ready for pickup from Neon PostgreSQL
  const [readyOrders, setReadyOrders] = useState<DispatchOrder[]>([]);

  // Delivered history today from Neon PostgreSQL
  const [deliveredHistory, setDeliveredHistory] = useState<DispatchOrder[]>([]);

  // Flash notification banner
  const [notification, setNotification] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Focus scan input and load real orders on mount
  useEffect(() => {
    barcodeScanInputRef.current?.focus();
    loadDispatchOrders();
  }, []);

  const loadDispatchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/sales/dispatch');
      if (res.data?.success && res.data.data) {
        setReadyOrders(Array.isArray(res.data.data.readyToDeliver) ? res.data.data.readyToDeliver : []);
        setDeliveredHistory(Array.isArray(res.data.data.recentlyDelivered) ? res.data.data.recentlyDelivered : []);
      }
    } catch (e: any) {
      console.error('Dispatch API error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Real-time WebSocket listener
  useEffect(() => {
    if (!socket) return;

    const handleSlipPaid = (data: any) => {
      const newPaidOrder: DispatchOrder = data.slip || {
        id: String(Date.now()),
        slipNumber: data.slipBarcode,
        barcode: data.slipBarcode,
        invoiceNumber: data.invoiceNumber,
        customerName: data.customerName,
        status: 'PAID_PENDING_DELIVERY',
        paidAt: data.paidAt,
        totalAmount: data.totalAmount,
        items: [],
      };

      setReadyOrders((prev) => [newPaidOrder, ...prev.filter((o) => o.barcode !== newPaidOrder.barcode)]);
      setNotification(`وصل طلب مدفوع جديد برقم [${data.invoiceNumber || data.slipBarcode}] من الكاشير للتسليم!`);
      setTimeout(() => setNotification(null), 5000);
    };

    const handleOrderDelivered = (data: any) => {
      const barcode = data.slipBarcode || data.order?.barcode;
      setReadyOrders((prev) => prev.filter((o) => o.barcode !== barcode));
      if (data.order || data.slip) {
        const delivered = data.order || data.slip;
        setDeliveredHistory((prev) => [delivered, ...prev.filter((o) => o.barcode !== barcode)]);
      }
    };

    socket.on('slip_paid', handleSlipPaid);
    socket.on('order_delivered', handleOrderDelivered);

    return () => {
      socket.off('slip_paid', handleSlipPaid);
      socket.off('order_delivered', handleOrderDelivered);
    };
  }, [socket]);

  // Confirm Handover in PostgreSQL
  const handleConfirmDelivery = async (order: DispatchOrder) => {
    setIsDelivering(order.barcode);
    setScanError(null);

    try {
      const res = await axios.patch(`http://localhost:3000/sales/orders/${order.barcode}/deliver`);
      const deliveredOrder: DispatchOrder = res.data?.data || {
        ...order,
        status: 'COMPLETED',
        deliveredAt: new Date().toISOString(),
      };

      setReadyOrders((prev) => prev.filter((o) => o.barcode !== order.barcode));
      setDeliveredHistory((prev) => [deliveredOrder, ...prev.filter((o) => o.barcode !== order.barcode)]);
      setNotification(`تم تأكيد تسليم الطلب [${order.invoiceNumber || order.barcode}] للعميل بنجاح ✓`);
      setTimeout(() => setNotification(null), 4000);
    } catch (e: any) {
      console.error('Deliver API error:', e);
      setScanError(e.response?.data?.message || 'تعذر إثبات تسليم الطلب بقاعدة البيانات.');
    } finally {
      setIsDelivering(null);
      barcodeScanInputRef.current?.focus();
    }
  };

  // Barcode Scan Deliver
  const handleScanDeliver = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = scanQuery.trim();
    if (!clean) return;

    const matched = readyOrders.find(
      (o) =>
        o.barcode === clean ||
        o.slipNumber === clean ||
        o.invoiceNumber === clean
    );

    if (matched) {
      handleConfirmDelivery(matched);
      setScanQuery('');
      setScanError(null);
    } else {
      setScanError(`الطلب برقم [${clean}] غير موجود في قائمة الطلبات الجاهزة للتسليم.`);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. ترويسة شباك التسليم الفعلي */}
      <div className="erp-card p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              محطة تسليم البضاعة للعملاء
            </span>
            <span className="text-xs erp-muted">الربط اللحظي بقاعدة بيانات Neon بعد سداد الخزينة</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-emerald-500" />
            <span>شباك الاستلام والتسليم (Showroom Dispatch & Handover)</span>
          </h1>
        </div>

        {/* روابط التنقل السريع */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadDispatchOrders}
            title="تحديث القوائم من قاعدة البيانات"
            className="p-2 rounded-2xl erp-sub border hover:bg-emerald-500/10 text-emerald-500 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/pos/salesman"
            className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5" />
            <span>صالة البائع</span>
          </Link>
          <Link
            href="/pos/cashier"
            className="px-3.5 py-2 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>الخزينة والكاشير</span>
          </Link>
        </div>
      </div>

      {/* 2. شريط إشعار وصول طلب جديد فوري عبر WebSocket */}
      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-between shadow-lg shadow-emerald-500/10 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs underline cursor-pointer"
          >
            إخفاء
          </button>
        </div>
      )}

      {scanError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{scanError}</span>
        </div>
      )}

      {/* 3. شريط مسح الفاتورة لتأكيد التسليم الفوري (Auto-Focus Barcode Input) */}
      <div className="erp-card p-5 rounded-3xl border shadow-sm">
        <form onSubmit={handleScanDeliver} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Barcode className="w-6 h-6 absolute right-4 top-3.5 text-emerald-500 animate-pulse" />
            <input
              ref={barcodeScanInputRef}
              type="text"
              autoFocus
              value={scanQuery}
              onChange={(e) => setScanQuery(e.target.value)}
              placeholder="امسح باركود الفاتورة الضريبية لتأكيد التسليم الفوري للعميل..."
              className="w-full pr-14 pl-4 py-3.5 rounded-2xl border erp-sub text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-inner"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm transition flex items-center gap-2 shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تأكيد التسليم السريع</span>
          </button>
        </form>
      </div>

      {/* 4. كروت الطلبات الجاهزة للتسليم (Reactive Cards Grid) */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-base font-black text-white">الطلبات المسددة الجاهزة للتسليم حالياً</h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {readyOrders.length} طلبات جاهزة
          </span>
        </div>

        {isLoading ? (
          <div className="erp-card p-12 rounded-3xl border text-center space-y-3">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <p className="text-xs font-bold erp-muted">جاري فحص الطلبات المسددة من Neon DB...</p>
          </div>
        ) : readyOrders.length === 0 ? (
          <div className="erp-card p-16 rounded-3xl border text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <Check className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-base text-white">شباك التسليم خالي تماماً</h3>
              <p className="text-xs erp-muted max-w-sm mx-auto">
                كافة الطلبات المسددة تم تسليمها للعملاء بنجاح. أي بوليصة تُسدد في الخزينة ستظهر هنا تلقائياً ولحظياً.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="erp-card p-5 rounded-3xl border border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/60 transition shadow-lg shadow-emerald-950/20 flex flex-col justify-between space-y-4 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />

                {/* ترويسة الكارت */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-400 block">
                        {order.invoiceNumber || order.slipNumber}
                      </span>
                      <h3 className="font-black text-base text-white mt-0.5">
                        {order.customerName}
                      </h3>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                      جاهز للتسليم
                    </span>
                  </div>

                  <div className="flex justify-between text-xs erp-muted font-mono pt-1 border-t border-slate-800">
                    <span>كاشير: {order.cashierName || 'الخزينة'}</span>
                    <span>{order.paidAt ? new Date(order.paidAt).toLocaleTimeString('ar-EG') : 'الآن'}</span>
                  </div>
                </div>

                {/* تفاصيل البنود والأوزان المحجوزة */}
                <div className="erp-sub p-3 rounded-2xl border space-y-1.5 text-xs">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between pb-1 border-b border-slate-800">
                    <span>محتويات الطلبية ({order.items.length} أصناف):</span>
                    <span className="font-mono font-bold text-amber-400">{order.totalAmount} ج.م</span>
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span className="text-white font-medium truncate">{item.itemName}</span>
                        <span className="font-mono font-bold text-amber-400 shrink-0">
                          {item.weight} كجم
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <p className="text-[10px] text-amber-400 font-bold pt-1 border-t border-slate-800/80">
                      ملاحظة: {order.notes}
                    </p>
                  )}
                </div>

                {/* زر تأكيد التسليم للعميل */}
                <button
                  onClick={() => handleConfirmDelivery(order)}
                  disabled={isDelivering === order.barcode}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isDelivering === order.barcode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري تحديث الداتابيز وخصم المخزون...</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-4 h-4" />
                      <span>تأكيد تسليم البضاعة للعميل (Handover)</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. سجل الطلبات المسلمة اليوم (Delivered Today History) */}
      <div className="erp-card p-5 rounded-3xl border shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-3 border-b">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-black text-sm text-white">سجل الطلبات المسلمة اليوم بنجاح</h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400">
            {deliveredHistory.length} طلبات مكتملة
          </span>
        </div>

        {deliveredHistory.length === 0 ? (
          <p className="text-xs erp-muted text-center py-6">لم يتم تسليم أي طلبات حتى الآن اليوم</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b erp-sub text-slate-300 font-bold">
                  <th className="p-3">رقم الفاتورة / الباركود</th>
                  <th className="p-3">العميل</th>
                  <th className="p-3 text-center">عدد الأصناف</th>
                  <th className="p-3 text-center">القيمة المسددة</th>
                  <th className="p-3 text-center">وقت السداد</th>
                  <th className="p-3 text-center">وقت التسليم</th>
                  <th className="p-3 text-left">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {deliveredHistory.slice(0, 15).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-white">{order.invoiceNumber || order.barcode}</td>
                    <td className="p-3 font-sans font-bold text-slate-200">{order.customerName}</td>
                    <td className="p-3 text-center text-slate-400">{order.items?.length || 1}</td>
                    <td className="p-3 text-center font-bold text-amber-400">{order.totalAmount} ج.م</td>
                    <td className="p-3 text-center text-slate-400">
                      {order.paidAt ? new Date(order.paidAt).toLocaleTimeString('ar-EG') : '-'}
                    </td>
                    <td className="p-3 text-center text-emerald-400 font-bold">
                      {order.deliveredAt ? new Date(order.deliveredAt).toLocaleTimeString('ar-EG') : 'مكتمل'}
                    </td>
                    <td className="p-3 text-left">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-sans font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        تم الاستلام ✓
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
