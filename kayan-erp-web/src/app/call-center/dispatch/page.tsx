'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Truck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Phone,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Send,
  Building,
  Package,
} from 'lucide-react';
import Link from 'next/link';

interface DispatchOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  createdAt: string;
  orderSource: string;
  deliveryStatus: string;
  totalAmount: number;
  deliveryFee: number;
  driverId?: string;
  driverName?: string;
  branchId?: string;
  branchName?: string;
  notes?: string;
  customer: {
    id: string | null;
    name: string;
    phone: string;
    address: string;
  };
  itemsCount: number;
  items: {
    name: string;
    quantity: number;
    batchNumber?: string;
  }[];
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  vehicleType: string;
  plateNumber?: string;
  status: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CallCenterDispatchPage() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assign Driver Modal
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  // Status Update Loading
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDispatchData();
  }, []);

  const fetchDispatchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, driversRes] = await Promise.all([
        axios.get(`${API_BASE}/call-center/dispatch/orders`),
        axios.get(`${API_BASE}/call-center/dispatch/drivers`),
      ]);

      if (ordersRes.data?.success) {
        setOrders(ordersRes.data.data);
      }
      if (driversRes.data?.success) {
        setDrivers(driversRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load dispatch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update Status
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED',
    driverId?: string,
    driverName?: string
  ) => {
    setUpdatingId(orderId);
    try {
      const res = await axios.patch(`${API_BASE}/call-center/dispatch/orders/${orderId}/status`, {
        deliveryStatus: newStatus,
        driverId,
        driverName,
      });

      if (res.data?.success) {
        // Refresh local orders
        setOrders((prev) =>
          prev.map((ord) =>
            ord.id === orderId
              ? {
                  ...ord,
                  deliveryStatus: newStatus,
                  ...(driverName ? { driverName, driverId } : {}),
                }
              : ord
          )
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('تعذر تحديث حالة التوصيل');
    } finally {
      setUpdatingId(null);
    }
  };

  // Confirm Driver Assignment
  const handleConfirmAssignment = async () => {
    if (!selectedOrder || !selectedDriverId) return;

    const driver = drivers.find((d) => d.id === selectedDriverId);
    if (!driver) return;

    setAssigning(true);
    try {
      await handleUpdateStatus(selectedOrder.id, 'OUT_FOR_DELIVERY', driver.id, driver.name);
      setSelectedOrder(null);
      setSelectedDriverId('');
    } finally {
      setAssigning(false);
    }
  };

  // Metrics
  const totalOrders = orders.length;
  const preparingCount = orders.filter((o) => o.deliveryStatus === 'PREPARING' || o.deliveryStatus === 'PENDING_BRANCH').length;
  const outCount = orders.filter((o) => o.deliveryStatus === 'OUT_FOR_DELIVERY').length;
  const deliveredCount = orders.filter((o) => o.deliveryStatus === 'DELIVERED').length;
  const courierCashTotal = orders
    .filter((o) => o.deliveryStatus === 'OUT_FOR_DELIVERY' || o.deliveryStatus === 'DELIVERED')
    .reduce((acc, o) => acc + o.totalAmount, 0);

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PREPARING' && (o.deliveryStatus === 'PREPARING' || o.deliveryStatus === 'PENDING_BRANCH')) ||
      o.deliveryStatus === statusFilter;

    const matchesSearch =
      !searchQuery ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer.phone.includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12" dir="rtl">
      {/* 1. Header Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl shadow-sm">
            <Truck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              لوحة متابعة الدليفري والطيارين وتصفية العهد
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Live Dispatch
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              إدارة حركة التوصيل الميدانية، تعيين المناديب، ورصد العهد المحصلة لحظياً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/call-center/workspace"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-2"
          >
            ← شباك الكول سنتر الموحد
          </Link>
          <button
            onClick={fetchDispatchData}
            disabled={loading}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 2. Top Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">إجمالي أوردرات اليوم</span>
              <span className="text-lg font-black text-white font-mono">{totalOrders}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-indigo-900/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">قيد التجهيز بالفرع</span>
              <span className="text-lg font-black text-indigo-400 font-mono">{preparingCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-900/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">مع الطيار (في الطريق)</span>
              <span className="text-lg font-black text-amber-400 font-mono">{outCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-900/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">تم التسليم بنجاح</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{deliveredCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">إجمالي العهد الجارية</span>
              <span className="text-lg font-black text-teal-400 font-mono">{courierCashTotal.toFixed(0)} ج.م</span>
            </div>
          </div>
        </div>

        {/* 3. Filters & Search */}
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">تصفية الحالات:</span>
            <div className="flex items-center gap-1.5 text-xs">
              {[
                { key: 'ALL', label: 'الكل' },
                { key: 'PREPARING', label: 'قيد التجهيز بالفرع' },
                { key: 'OUT_FOR_DELIVERY', label: 'مع الطيار' },
                { key: 'DELIVERED', label: 'تم التسليم' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    statusFilter === tab.key
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-72">
            <input
              type="text"
              placeholder="بحث برقم الأوردر، اسم العميل، الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
          </div>
        </div>

        {/* 4. Orders High-Density Dispatch Grid */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">جاري تحميل مسارات التوصيل...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
              لا توجد طلبات توصيل تطابق شروط التصفية
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isPreparing = ord.deliveryStatus === 'PREPARING' || ord.deliveryStatus === 'PENDING_BRANCH';
              const isOut = ord.deliveryStatus === 'OUT_FOR_DELIVERY';
              const isDelivered = ord.deliveryStatus === 'DELIVERED';

              return (
                <div
                  key={ord.id}
                  className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-2xl p-4 transition shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-amber-400 font-bold text-sm">{ord.orderNumber}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(ord.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Status Badge */}
                      {isPreparing && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          قيد التجهيز بالفرع
                        </span>
                      )}
                      {isOut && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                          <Truck className="w-3 h-3 animate-pulse" />
                          مع الطيار (خرج للتوصيل)
                        </span>
                      )}
                      {isDelivered && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          تم التسليم
                        </span>
                      )}
                    </div>

                    {/* Customer & Address */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <span className="flex items-center gap-1 font-semibold text-white">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        {ord.customer.name}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 font-mono" dir="ltr">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {ord.customer.phone}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400 truncate max-w-xs">
                        <MapPin className="w-3.5 h-3.5 text-amber-500" />
                        {ord.customer.address}
                      </span>
                    </div>

                    {/* Items Summary */}
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="text-slate-500 font-medium">الأصناف ({ord.itemsCount}):</span>
                      <span className="truncate">
                        {ord.items.map((i) => `${i.name} (${i.quantity})`).join(' • ')}
                      </span>
                    </div>
                  </div>

                  {/* Center: Driver & Branch */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs min-w-[200px] space-y-1 shrink-0">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>فرع الانطلاق:</span>
                      <span className="text-slate-200 font-medium">{ord.branchName || 'الفرع الرئيسي'}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>الطيار المسؤول:</span>
                      <span className={`font-semibold ${ord.driverName ? 'text-amber-400' : 'text-slate-500'}`}>
                        {ord.driverName || 'لم يتم التعيين'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 pt-1 border-t border-slate-900">
                      <span>إجمالي المبلغ:</span>
                      <span className="font-bold text-white font-mono">{ord.totalAmount} ج.م</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isPreparing && (
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                      >
                        <Truck className="w-4 h-4" />
                        تعيين طيار وإرسال
                      </button>
                    )}

                    {isOut && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'DELIVERED')}
                        disabled={updatingId === ord.id}
                        className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {updatingId === ord.id ? 'جاري التأكيد...' : 'تأكيد التسليم وتصفية العهدة'}
                      </button>
                    )}

                    {isDelivered && (
                      <span className="text-xs text-emerald-400 font-semibold px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        تمت التصفية والتسليم
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: Assign Driver */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                تعيين طيار للطلب ({selectedOrder.orderNumber})
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-500 hover:text-white text-xs"
              >
                إلغاء
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 space-y-1">
                <div>العميل: <strong className="text-white">{selectedOrder.customer.name}</strong></div>
                <div>العنوان: <strong className="text-slate-400">{selectedOrder.customer.address}</strong></div>
                <div>المبلغ المستحق تحصيله: <strong className="text-amber-400 font-mono font-bold">{selectedOrder.totalAmount} ج.م</strong></div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-2">اختر الطيار المتاح من الأسطول:</label>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {drivers.map((drv) => (
                    <div
                      key={drv.id}
                      onClick={() => setSelectedDriverId(drv.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between ${
                        selectedDriverId === drv.id
                          ? 'bg-amber-600/20 border-amber-500 text-white shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-800 rounded-lg text-amber-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold block text-white">{drv.name}</span>
                          <span className="text-[10px] text-slate-400">{drv.vehicleType} {drv.phone ? `• ${drv.phone}` : ''}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        جاهز
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={!selectedDriverId || assigning}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {assigning ? 'جاري الإسناد...' : 'إسناد وخروج للتوصيل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
