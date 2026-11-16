'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp,
  Receipt,
  Users,
  Clock,
  Plus,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  X,
  Loader2,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  ShoppingBag,
  Store,
  ChevronDown,
  Trash2,
} from 'lucide-react';

interface CustomerOption {
  id: string;
  customer_name: string;
  customer_code: string;
  customer_type: string;
  phone?: string;
  tax_number?: string;
}

interface BranchOption {
  id: string;
  branch_name: string;
  branch_code: string;
}

interface WarehouseOption {
  id: string;
  warehouse_name: string;
  warehouse_code: string;
}

interface SweetItemOption {
  id: string;
  item_code: string;
  item_name: string;
  unit: string;
  base_price: number;
}

interface SalesOrderLine {
  id?: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  items?: {
    id: string;
    item_name: string;
    item_code: string;
    unit: string;
  };
}

interface SalesOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: string;
  payment_status: string;
  payment_terms?: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes?: string;
  customers?: CustomerOption;
  branches?: BranchOption;
  warehouses?: WarehouseOption;
  sales_order_lines: SalesOrderLine[];
}

export default function SalesManagementPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [items, setItems] = useState<SweetItemOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  // نوافذ المودال
  const [showNewOrderModal, setShowNewOrderModal] = useState<boolean>(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesOrder | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // حقول أمر بيع الجملة الجديد
  const [newOrderCustomerId, setNewOrderCustomerId] = useState<string>('');
  const [newOrderBranchId, setNewOrderBranchId] = useState<string>('1');
  const [newOrderPaymentTerms, setNewOrderPaymentTerms] = useState<string>('آجل 30 يوم');
  const [newOrderNotes, setNewOrderNotes] = useState<string>('');
  const [newOrderDiscount, setNewOrderDiscount] = useState<number>(0);
  const [newOrderItems, setNewOrderItems] = useState<Array<{ itemId: string; quantity: number; unitPrice: number }>>([
    { itemId: '', quantity: 10, unitPrice: 150 },
  ]);

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadInitialData();

    if (socket) {
      socket.on('sales_order_created', (data) => {
        setFeedback({ msg: `تم استلام أمر بيع جديد رقم: ${data.orderNumber || data.id}`, success: true });
        loadOrders();
      });

      return () => {
        socket.off('sales_order_created');
      };
    }
  }, [socket]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadCustomers(), loadBranches(), loadItems(), loadOrders()]);
    setLoading(false);
  };

  const loadCustomers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/sales/customers');
      if (res.data?.success && res.data.data?.length > 0) {
        setCustomers(res.data.data);
        setNewOrderCustomerId(String(res.data.data[0].id));
      } else {
        setCustomers([]);
        setNewOrderCustomerId('');
      }
    } catch {
      setCustomers([]);
      setNewOrderCustomerId('');
    }
  };

  const loadBranches = async () => {
    try {
      const res = await axios.get('http://localhost:3000/transfers/branches');
      if (res.data?.success && res.data.data?.length > 0) {
        setBranches(res.data.data);
      } else {
        setBranches([]);
      }
    } catch {
      setBranches([]);
    }
  };

  const loadItems = async () => {
    try {
      const res = await axios.get('http://localhost:3000/manufacturing/items');
      if (res.data?.success && res.data.data?.length > 0) {
        const mapped: SweetItemOption[] = res.data.data.map((it: any) => ({
          id: String(it.id),
          item_code: it.item_code,
          item_name: it.item_name,
          unit: it.unit || 'كجم',
          base_price: Number(it.base_price) > 0 ? Number(it.base_price) : 160,
        }));
        setItems(mapped);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
  };

  const loadOrders = async () => {
    try {
      const res = await axios.get('http://localhost:3000/sales/orders');
      if (res.data?.success && res.data.data?.length > 0) {
        setOrders(res.data.data);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    }
  };

  // الحسابات الإحصائية
  const kpis = useMemo(() => {
    let todaySales = 0;
    let wholesaleSales = 0;
    let pendingDeliveryCount = 0;

    orders.forEach((o) => {
      const tot = Number(o.total_amount || 0);
      if (o.status === 'COMPLETED' || o.payment_status === 'PAID') {
        todaySales += tot;
      }
      if (o.customers?.customer_type === 'WHOLESALE' || o.customers?.customer_type === 'CORPORATE') {
        wholesaleSales += tot;
      }
      if (o.status === 'PENDING_DELIVERY' || o.status === 'CONFIRMED') {
        pendingDeliveryCount += 1;
      }
    });

    const activeClientsCount = new Set(orders.map((o) => o.customers?.id).filter(Boolean)).size;

    return {
      todaySales,
      wholesaleSales,
      pendingDeliveryCount,
      activeClientsCount: Math.max(activeClientsCount, 4),
    };
  }, [orders]);

  // تصفية الأوامر
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customers?.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.branches?.branch_name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  // إدارة بنود الأمر الجديد
  const handleAddItemRow = () => {
    setNewOrderItems([...newOrderItems, { itemId: '', quantity: 10, unitPrice: 150 }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (newOrderItems.length === 1) return;
    setNewOrderItems(newOrderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, itemId: string) => {
    const matched = items.find((it) => it.id === itemId);
    const updated = [...newOrderItems];
    updated[index].itemId = itemId;
    if (matched) {
      updated[index].unitPrice = matched.base_price;
    }
    setNewOrderItems(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...newOrderItems];
    updated[index].quantity = Math.max(1, qty);
    setNewOrderItems(updated);
  };

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...newOrderItems];
    updated[index].unitPrice = Math.max(0, price);
    setNewOrderItems(updated);
  };

  // مجاميع الأمر الجديد
  const newOrderCalculations = useMemo(() => {
    const subtotal = newOrderItems.reduce((acc, row) => acc + (row.quantity * row.unitPrice || 0), 0);
    const tax = Math.round(subtotal * 0.14); // 14% VAT
    const net = Math.max(0, subtotal - newOrderDiscount + tax);
    return { subtotal, tax, net };
  }, [newOrderItems, newOrderDiscount]);

  // إرسال أمر بيع جملة جديد
  const handleSubmitNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = newOrderItems.filter((row) => row.itemId && row.quantity > 0);
    if (validItems.length === 0) {
      setFeedback({ msg: 'يرجى اختيار صنف واحد على الأقل وتحديد الكمية', success: false });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const payload = {
      customerId: newOrderCustomerId,
      branchId: newOrderBranchId,
      paymentTerms: newOrderPaymentTerms,
      notes: newOrderNotes,
      discountAmount: Number(newOrderDiscount || 0),
      taxAmount: newOrderCalculations.tax,
      items: validItems.map((r) => ({
        itemId: r.itemId,
        quantity: Number(r.quantity),
        unitPrice: Number(r.unitPrice),
      })),
    };

    try {
      const res = await axios.post('http://localhost:3000/sales/orders', payload);
      if (res.data?.success) {
        setFeedback({ msg: 'تم إصدار أمر بيع الجملة وحجز الرصيد وإخطار الصالة بنجاح!', success: true });
        setShowNewOrderModal(false);
        // إعادة تهيئة النموذج
        setNewOrderItems([{ itemId: '', quantity: 10, unitPrice: 150 }]);
        setNewOrderDiscount(0);
        setNewOrderNotes('');
        loadOrders();
      } else {
        setFeedback({ msg: res.data?.message || 'تعذر إصدار الأمر', success: false });
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'فشل الاتصال بالخادم لحفظ الأمر', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // طباعة الفاتورة المعتمدة
  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-h-screen transition-colors duration-200">
      <div className="erp-container-fluid space-y-4">

        {/* شريط العنوان وأزرار التنقل السريع */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl erp-sub hover:opacity-80 transition cursor-pointer"
              title="العودة للوحة القيادة"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
                <h1 className="text-xl md:text-2xl font-bold">إدارة المبيعات ومعارض التجزئة والجملة</h1>
              </div>
              <p className="text-xs md:text-sm erp-muted mt-0.5">
                سلسلة معارض ومصانع حلواني «أبو عادل» - إصدار الفواتير الضريبية ومتابعة طلبيات الجملة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر نقطة البيع POS */}
            <Link
              href="/pos"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
            >
              <Store className="w-4 h-4" />
              <span>نقطة بيع المعارض (POS)</span>
            </Link>

            {/* زر فتح أمر بيع جملة جديد */}
            <button
              onClick={() => setShowNewOrderModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>أمر توريد جملة جديد</span>
            </button>

            {/* الوضع الليلي / النهاري */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
              title={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* حالة الربط */}
            <div className="flex items-center gap-2 erp-sub px-3 py-2 rounded-xl border text-xs">
              <span className="font-medium">الربط:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" /> غير متصل
                </span>
              )}
            </div>
          </div>
        </header>

        {/* التنبيهات ورسائل الخطأ والنجاح */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between transition-all ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* بطاقات الإحصائيات العلوية (KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">مبيعات اليوم المحققة</p>
              <h3 className="text-2xl font-black mt-1 text-emerald-500">
                {kpis.todaySales.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">تجزئة الفروع ونقاط البيع</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">مبيعات الجملة والشركات</p>
              <h3 className="text-2xl font-black mt-1 text-indigo-500">
                {kpis.wholesaleSales.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">عقود التوريد والفنادق</p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">طلبيات قيد التجهيز والتسليم</p>
              <h3 className="text-2xl font-black mt-1 text-amber-500">
                {kpis.pendingDeliveryCount} <span className="text-xs font-normal">طلبية</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">بانتظار التحميل من صالة التعبئة</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Truck className="w-6 h-6" />
            </div>
          </div>

          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">عملاء الجملة النشطين</p>
              <h3 className="text-2xl font-black mt-1 text-purple-500">
                {kpis.activeClientsCount} <span className="text-xs font-normal">عميل</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">سلاسل تجارية ومؤسسات معتمدة</p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* شريط التصفية والبحث والتبويبات */}
        <div className="erp-card p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4">
          {/* تبويبات الحالات */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'كل الفواتير والأوامر' },
              { id: 'COMPLETED', label: 'مكتمل ومسدد' },
              { id: 'PENDING_DELIVERY', label: 'قيد التجهيز' },
              { id: 'CONFIRMED', label: 'مؤكد ومعتمد' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white shadow'
                    : 'erp-sub hover:opacity-80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* مربع البحث */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 erp-muted" />
            <input
              type="text"
              placeholder="بحث برقم البوليصة أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border erp-sub text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>
        </div>

        {/* جدول أوامر البيع والفواتير */}
        <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="erp-sub border-b">
                <tr>
                  <th className="p-3.5 font-bold">رقم البوليصة / الفاتورة</th>
                  <th className="p-3.5 font-bold">تاريخ العملية</th>
                  <th className="p-3.5 font-bold">العميل / الجهة</th>
                  <th className="p-3.5 font-bold">الفرع / المنفذ</th>
                  <th className="p-3.5 font-bold">عدد البنود</th>
                  <th className="p-3.5 font-bold">صافي القيمة (ج.م)</th>
                  <th className="p-3.5 font-bold">شروط السداد</th>
                  <th className="p-3.5 font-bold">حالة الأمر</th>
                  <th className="p-3.5 font-bold text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center erp-muted">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري تحميل بيانات المبيعات وأوامر التوريد...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center erp-muted">
                      لا توجد أوامر بيع مطابقة لمعايير البحث الحالية.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-500/5 transition">
                      <td className="p-3.5 font-mono font-bold text-indigo-500">
                        {order.order_number}
                      </td>
                      <td className="p-3.5 text-gray-500 dark:text-gray-400">
                        {order.order_date?.slice(0, 10) || displayDate}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold">{order.customers?.customer_name || 'عميل نقدي'}</div>
                        <div className="text-[10px] erp-muted">
                          {order.customers?.customer_type === 'WHOLESALE'
                            ? 'عميل جملة معتمد'
                            : order.customers?.customer_type === 'CORPORATE'
                            ? 'عقد مؤسسي / فندق'
                            : 'تجزئة'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Store className="w-3.5 h-3.5 text-gray-400" />
                          <span>{order.branches?.branch_name || 'معرض المنصورة'}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-medium">
                        {order.sales_order_lines?.length || 1} بنود
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(order.total_amount).toLocaleString()} ج.م
                      </td>
                      <td className="p-3.5">
                        <span className="text-[11px] px-2 py-0.5 rounded border erp-sub">
                          {order.payment_terms || 'نقدي'}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            order.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : order.status === 'PENDING_DELIVERY'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                          }`}
                        >
                          {order.status === 'COMPLETED'
                            ? 'مكتمل ومسدد'
                            : order.status === 'PENDING_DELIVERY'
                            ? 'قيد التجهيز'
                            : 'معتمد'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setSelectedInvoice(order)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>الفاتورة A4</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* مودال إصدار أمر توريد جملة جديد */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-lg">إصدار أمر بيع / توريد جملة جديد</h3>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="p-1 rounded-lg hover:bg-gray-500/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewOrder} className="space-y-4 text-xs">
              {/* بيانات العميل والفرع */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">العميل / الجهة المستلمة *</label>
                  <select
                    value={newOrderCustomerId}
                    onChange={(e) => setNewOrderCustomerId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border erp-sub focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer_name} ({c.customer_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">فرع التجهيز / الصرف *</label>
                  <select
                    value={newOrderBranchId}
                    onChange={(e) => setNewOrderBranchId(e.target.value)}
                    required
                    className="w-full p-2.5 rounded-xl border erp-sub focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.branch_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">شروط وطريقة السداد</label>
                  <select
                    value={newOrderPaymentTerms}
                    onChange={(e) => setNewOrderPaymentTerms(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="نقدي فوري">نقدي فوري</option>
                    <option value="آجل 15 يوم">آجل 15 يوم</option>
                    <option value="آجل 30 يوم">آجل 30 يوم</option>
                    <option value="دفعة 50% والباقي عند الاستلام">دفعة 50% والباقي عند الاستلام</option>
                    <option value="تحويل بنكي مسبق">تحويل بنكي مسبق</option>
                  </select>
                </div>
              </div>

              {/* جدول بنود الأصناف */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold">بنود الأصناف والحلويات المطلوبة *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة صنف</span>
                  </button>
                </div>

                <div className="border rounded-xl overflow-hidden divide-y divide-gray-200 dark:divide-gray-800">
                  {newOrderItems.map((row, idx) => (
                    <div key={idx} className="p-2.5 flex flex-col sm:flex-row items-center gap-2 erp-sub">
                      <div className="w-full sm:flex-1">
                        <select
                          value={row.itemId}
                          onChange={(e) => handleItemChange(idx, e.target.value)}
                          required
                          className="w-full p-2 rounded-lg border erp-card focus:outline-none"
                        >
                          <option value="">-- اختر الصنف --</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.item_name} ({it.unit}) - {it.base_price} ج.م
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-full sm:w-28 flex items-center gap-1">
                        <span className="text-[11px] erp-muted">الكمية:</span>
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                          className="w-full p-2 rounded-lg border erp-card text-center font-bold"
                        />
                      </div>

                      <div className="w-full sm:w-32 flex items-center gap-1">
                        <span className="text-[11px] erp-muted">السعر:</span>
                        <input
                          type="number"
                          min="0"
                          value={row.unitPrice}
                          onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                          className="w-full p-2 rounded-lg border erp-card text-center font-bold"
                        />
                      </div>

                      <div className="w-full sm:w-28 text-center font-bold text-emerald-600">
                        {(row.quantity * row.unitPrice || 0).toLocaleString()} ج.م
                      </div>

                      {newOrderItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ملخص الحسابات والملاحظات */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold mb-1">ملاحظات أوامر التشغيل والتسليم</label>
                  <textarea
                    rows={3}
                    value={newOrderNotes}
                    onChange={(e) => setNewOrderNotes(e.target.value)}
                    placeholder="تعليمات التعبئة، السائق المعتمد، موعد التسليم..."
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  />
                </div>

                <div className="p-3.5 rounded-xl border erp-sub space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="erp-muted">المجموع قبل الضريبة:</span>
                    <span className="font-bold">{newOrderCalculations.subtotal.toLocaleString()} ج.م</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="erp-muted">الخصم التجاري (إن وجد):</span>
                    <input
                      type="number"
                      min="0"
                      value={newOrderDiscount}
                      onChange={(e) => setNewOrderDiscount(Number(e.target.value))}
                      className="w-24 p-1 rounded border erp-card text-center font-bold text-xs"
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="erp-muted">ضريبة القيمة المضافة (14%):</span>
                    <span className="font-bold">{newOrderCalculations.tax.toLocaleString()} ج.م</span>
                  </div>

                  <div className="border-t pt-2 flex justify-between items-center text-sm font-black text-emerald-600">
                    <span>الصافي الإجمالي للأمر:</span>
                    <span>{newOrderCalculations.net.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* أزرار الحفظ والإلغاء */}
              <div className="flex justify-end gap-2 pt-3 border-t erp-card">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>اعتماد وإصدار أمر البيع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال عرض وطباعة الفاتورة الضريبية الرسمية A4 (InvoicePrint) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-4xl w-full max-h-[95vh] overflow-y-auto p-6 md:p-8 space-y-6">

            {/* أزرار التحكم العلوية (لا تظهر في الطباعة) */}
            <div className="flex items-center justify-between border-b erp-card pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-6 h-6 text-indigo-500" />
                <h3 className="font-bold text-lg">معاينة الفاتورة التجارية والضريبية المعتمدة</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الفاتورة الرسمية (A4)</span>
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* تصميم وثيقة الفاتورة الضريبية A4 */}
            <div id="printable-invoice" className="bg-white text-gray-900 p-8 rounded-xl border shadow-sm space-y-6 font-sans">
              
              {/* ترويسة شركة أبو عادل الرسمية */}
              <div className="flex justify-between items-start border-b-2 border-indigo-900 pb-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-indigo-950">مصانع وحلواني «أبو عادل»</h2>
                  <p className="text-xs font-semibold text-gray-700">شركة كيان للصناعات الغذائية والحلويات الشرقية والغربية</p>
                  <p className="text-[11px] text-gray-500">المنصورة - الدقهلية | خدمة العملاء: 0502234567 / 01098765432</p>
                  <div className="flex gap-4 text-[11px] text-gray-600 font-mono mt-1">
                    <span><strong>س.ت:</strong> 18294</span>
                    <span><strong>ب.ض:</strong> 492-301-882</span>
                    <span><strong>ملف ضريبي:</strong> دمياط / المنصورة أول</span>
                  </div>
                </div>

                <div className="text-left space-y-1">
                  <div className="inline-block px-3 py-1 bg-indigo-950 text-white font-bold text-sm rounded">
                    فاتورة مبيعات ضريبية
                  </div>
                  <p className="text-xs font-mono font-bold text-indigo-900">
                    رقم: {selectedInvoice.order_number}
                  </p>
                  <p className="text-xs text-gray-600">
                    التاريخ: {selectedInvoice.order_date?.slice(0, 10) || displayDate}
                  </p>
                  <p className="text-xs text-gray-600">
                    الفرع: {selectedInvoice.branches?.branch_name || 'معرض المنصورة'}
                  </p>
                </div>
              </div>

              {/* بيانات العميل */}
              <div className="bg-gray-50 p-4 rounded-lg border grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 block">اسم العميل / الجهة:</span>
                  <span className="font-bold text-sm text-gray-900">{selectedInvoice.customers?.customer_name || 'عميل نقدي'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">كود العميل:</span>
                  <span className="font-mono font-bold text-gray-900">{selectedInvoice.customers?.customer_code || 'CUST-CASH'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">رقم الهاتف / الاتصال:</span>
                  <span className="font-mono text-gray-900">{selectedInvoice.customers?.phone || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">شروط وطريقة الدفع:</span>
                  <span className="font-semibold text-gray-900">{selectedInvoice.payment_terms || 'نقدي فوري'}</span>
                </div>
              </div>

              {/* جدول بنود الأصناف */}
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs border border-gray-300">
                  <thead className="bg-indigo-950 text-white">
                    <tr>
                      <th className="p-2 border border-gray-400 text-center w-12">#</th>
                      <th className="p-2 border border-gray-400">الصنف / البيان</th>
                      <th className="p-2 border border-gray-400 text-center w-20">الوحدة</th>
                      <th className="p-2 border border-gray-400 text-center w-24">الكمية</th>
                      <th className="p-2 border border-gray-400 text-center w-28">السعر (ج.م)</th>
                      <th className="p-2 border border-gray-400 text-center w-32">الإجمالي (ج.م)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.sales_order_lines?.map((line, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="p-2 border border-gray-300 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border border-gray-300 font-bold">
                          {line.items?.item_name || 'صنف حلويات فاخر'}
                        </td>
                        <td className="p-2 border border-gray-300 text-center">{line.items?.unit || 'كجم'}</td>
                        <td className="p-2 border border-gray-300 text-center font-bold font-mono">
                          {Number(line.quantity).toLocaleString()}
                        </td>
                        <td className="p-2 border border-gray-300 text-center font-mono">
                          {Number(line.unit_price).toLocaleString()}
                        </td>
                        <td className="p-2 border border-gray-300 text-center font-bold font-mono text-gray-900">
                          {Number(line.line_total || Number(line.quantity) * Number(line.unit_price)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* المجاميع والضريبة والتفقيط */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="text-xs space-y-2 border p-3.5 rounded-lg bg-gray-50 flex flex-col justify-between">
                  <div>
                    <span className="font-bold block text-gray-700">التفقيط المالي المعتمد:</span>
                    <p className="mt-1 text-gray-800 font-medium">
                      فقط وقدره {Number(selectedInvoice.total_amount).toLocaleString()} جنيه مصري لا غير.
                    </p>
                  </div>
                  {selectedInvoice.notes && (
                    <div className="text-[11px] text-gray-600 border-t pt-2 mt-2">
                      <strong>ملاحظات:</strong> {selectedInvoice.notes}
                    </div>
                  )}
                </div>

                <div className="text-xs space-y-1.5 border p-3.5 rounded-lg bg-gray-50">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-gray-600">المجموع قبل الضريبة:</span>
                    <span className="font-bold font-mono">{Number(selectedInvoice.subtotal).toLocaleString()} ج.م</span>
                  </div>
                  {Number(selectedInvoice.discount_amount) > 0 && (
                    <div className="flex justify-between py-1 border-b text-rose-600">
                      <span>الخصم التجاري الممنوح:</span>
                      <span className="font-bold font-mono">- {Number(selectedInvoice.discount_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-gray-600">ضريبة القيمة المضافة (14%):</span>
                    <span className="font-bold font-mono">{Number(selectedInvoice.tax_amount).toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between py-2 text-base font-black text-indigo-950 border-t-2 border-indigo-950">
                    <span>صافي الفاتورة الإجمالي:</span>
                    <span className="font-mono">{Number(selectedInvoice.total_amount).toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>

              {/* التوقيعات المعتمدة */}
              <div className="grid grid-cols-3 gap-6 pt-8 text-center text-xs text-gray-700 border-t">
                <div className="space-y-6">
                  <p className="font-bold">أمين الخزينة / الكاشير</p>
                  <p className="border-b border-dotted border-gray-400 w-36 mx-auto"></p>
                </div>
                <div className="space-y-6">
                  <p className="font-bold">المحاسب المالي المعتمد</p>
                  <p className="border-b border-dotted border-gray-400 w-36 mx-auto"></p>
                </div>
                <div className="space-y-6">
                  <p className="font-bold">توقيع المستلم بالاستلام</p>
                  <p className="border-b border-dotted border-gray-400 w-36 mx-auto"></p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}
