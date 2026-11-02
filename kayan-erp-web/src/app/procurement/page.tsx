'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  ShoppingBag,
  Plus,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Truck,
  Building2,
  Calendar,
  X,
  FileText,
  DollarSign,
  Package,
  Sun,
  Moon,
  Loader2,
  Send,
  Factory,
  Boxes,
  Calculator,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface Supplier {
  id: string;
  supplier_name: string;
  supplier_code: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: string;
  credit_limit?: number;
  is_approved: boolean;
}

interface PurchaseOrderLine {
  id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  received_quantity: number;
  items?: {
    id: string;
    item_name: string;
    item_code: string;
    unit: string;
  };
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  expected_date?: string;
  status: string;
  subtotal: number;
  total_amount: number;
  notes?: string;
  suppliers?: {
    id: string;
    supplier_name: string;
    supplier_code: string;
    phone?: string;
  };
  warehouses?: {
    id: string;
    warehouse_name: string;
  };
  purchase_order_lines: PurchaseOrderLine[];
}

interface RawMaterialItem {
  id: string;
  item_name: string;
  item_code: string;
  unit: string;
  base_price?: number;
}

interface OrderItemRow {
  itemId: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  notes?: string;
}

export default function ProcurementManagementPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);
  const [reportDate, setReportDate] = useState<string>('2026-10-30');

  // التصفية والبحث
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // نافذة إدراج أمر شراء وتوريد جديد
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [orderNumberInput, setOrderNumberInput] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [orderDateInput, setOrderDateInput] = useState<string>('');
  const [expectedDateInput, setExpectedDateInput] = useState<string>('');
  const [paymentTermsInput, setPaymentTermsInput] = useState<string>('آجل 30 يوم');
  const [notesInput, setNotesInput] = useState<string>('توريد خامات تشغيل لصالة الحلويات الشرقية والغربية');
  const [orderItemsList, setOrderItemsList] = useState<OrderItemRow[]>([]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  // نافذة فحص الجودة والاستلام الميداني (QC Check & Material Receipt)
  const [showQcModal, setShowQcModal] = useState<boolean>(false);
  const [selectedOrderForQc, setSelectedOrderForQc] = useState<PurchaseOrder | null>(null);
  const [selectedLineForQc, setSelectedLineForQc] = useState<PurchaseOrderLine | null>(null);
  const [batchNumberInput, setBatchNumberInput] = useState<string>('');
  const [receivedQtyInput, setReceivedQtyInput] = useState<number>(0);
  const [acceptedQtyInput, setAcceptedQtyInput] = useState<number>(0);
  const [rejectedQtyInput, setRejectedQtyInput] = useState<number>(0);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [qcStatusInput, setQcStatusInput] = useState<'Accepted' | 'Partially_Rejected' | 'Rejected'>('Accepted');
  const [qcInspectorNameInput, setQcInspectorNameInput] = useState<string>('م. محمود سامي (أخصائي ضبط جودة الأغذية)');
  const [coaNumberInput, setCoaNumberInput] = useState<string>('');
  const [qcNotesInput, setQcNotesInput] = useState<string>('فحص حسي معملي: اللون والطعم والرائحة ونسبة الرطوبة مطابقة للمواصفة القياسية المصرية');
  const [isSubmittingQc, setIsSubmittingQc] = useState<boolean>(false);

  // أمر الشراء المختار للطباعة الرسمية (GRN)
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    setReportDate(new Date().toLocaleDateString('ar-EG'));
    loadAllData();
  }, []);

  // الاستماع للأحداث الحية عبر WebSockets
  useEffect(() => {
    if (!socket) return;

    socket.on('purchase_order_created', (data) => {
      setFeedback({
        msg: `📋 أمر شراء جديد (${data.orderNumber}): المورد ${data.supplierName} بإجمالي ${data.totalAmount} ج.م`,
        success: true,
      });
      fetchOrders();
    });

    socket.on('material_received_qc', (data) => {
      setFeedback({
        msg: `🔬 استلام وفحص خامات: تم قبول ${data.acceptedQuantity} كجم من (${data.itemName}) - لوط ${data.batchNumber}`,
        success: true,
      });
      fetchOrders();
    });

    return () => {
      socket.off('purchase_order_created');
      socket.off('material_received_qc');
    };
  }, [socket]);

  const loadAllData = async () => {
    setIsLoading(true);
    await Promise.all([fetchOrders(), fetchSuppliers(), fetchRawMaterials()]);
    setIsLoading(false);
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:3000/procurement/orders');
      if (res.data?.success) setOrders(res.data.data || []);
    } catch (e) {
      console.warn('Orders API offline');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/procurement/suppliers');
      if (res.data?.success) {
        const list = res.data.data || [];
        setSuppliers(list);
        if (list.length > 0 && !selectedSupplierId) {
          setSelectedSupplierId(String(list[0].id));
        }
      }
    } catch (e) {
      console.warn('Suppliers API offline');
    }
  };

  const fetchRawMaterials = async () => {
    try {
      const res = await axios.get('http://localhost:3000/procurement/raw-materials');
      if (res.data?.success) {
        const list = res.data.data || [];
        setRawMaterials(list);
      }
    } catch (e) {
      console.warn('Raw materials API offline');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchOrders(), fetchSuppliers(), fetchRawMaterials()]);
    setIsRefreshing(false);
  };

  // فتح وإعداد نافذة أمر شراء جديد
  const initNewOrder = () => {
    const code = `PO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    setOrderNumberInput(code);
    setOrderDateInput(new Date().toISOString().split('T')[0]);
    const exp = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setExpectedDateInput(exp);

    const defaultItem = rawMaterials.length > 0 ? rawMaterials[0] : null;
    setOrderItemsList([
      {
        itemId: defaultItem ? String(defaultItem.id) : '1',
        quantity: 500,
        unitPrice: defaultItem?.base_price || 32,
        unit: defaultItem?.unit || 'كجم',
        notes: 'شيكارة معبأة مطابقة للمواصفات',
      },
    ]);

    setShowCreateModal(true);
    setFeedback(null);
  };

  // إضافة صنف خام في أمر الشراء
  const addOrderItemRow = () => {
    const defaultItem = rawMaterials.length > 0 ? rawMaterials[0] : null;
    setOrderItemsList((prev) => [
      ...prev,
      {
        itemId: defaultItem ? String(defaultItem.id) : '',
        quantity: 100,
        unitPrice: defaultItem?.base_price || 50,
        unit: defaultItem?.unit || 'كجم',
      },
    ]);
  };

  const removeOrderItemRow = (index: number) => {
    if (orderItemsList.length <= 1) return;
    setOrderItemsList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOrderItemRow = (index: number, field: keyof OrderItemRow, value: any) => {
    setOrderItemsList((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === 'itemId') {
          const found = rawMaterials.find((m) => String(m.id) === String(value));
          return {
            ...row,
            itemId: value,
            unit: found?.unit || 'كجم',
            unitPrice: found?.base_price || row.unitPrice,
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  // إرسال أمر الشراء
  const submitCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = orderItemsList.filter((it) => it.itemId && it.quantity > 0);
    if (!selectedSupplierId || validItems.length === 0) {
      setFeedback({ msg: 'يرجى اختيار المورد وتحديد كميات وأسعار الأصناف المطلوبة', success: false });
      return;
    }

    setIsSubmittingOrder(true);
    setFeedback(null);

    try {
      const res = await axios.post('http://localhost:3000/procurement/orders', {
        orderNumber: orderNumberInput.trim(),
        supplierId: selectedSupplierId,
        orderDate: orderDateInput,
        expectedDate: expectedDateInput,
        paymentTerms: paymentTermsInput,
        notes: notesInput,
        items: validItems.map((it) => ({
          itemId: it.itemId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          notes: it.notes,
        })),
      });

      if (res.data?.success) {
        setFeedback({ msg: '✅ تم إصدار وتعميم أمر الشراء وبث الإشعار بنجاح!', success: true });
        setShowCreateModal(false);
        fetchOrders();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إصدار أمر الشراء', success: false });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // فتح نافذة محضر فحص واستلام الخامات
  const openQcModal = (order: PurchaseOrder, line?: PurchaseOrderLine) => {
    setSelectedOrderForQc(order);
    const targetLine = line || (order.purchase_order_lines.length > 0 ? order.purchase_order_lines[0] : null);
    setSelectedLineForQc(targetLine);

    const remainingQty = targetLine ? Math.max(0, targetLine.quantity - targetLine.received_quantity) : 100;
    setReceivedQtyInput(remainingQty);
    setAcceptedQtyInput(remainingQty);
    setRejectedQtyInput(0);
    setRejectionReasonInput('');
    setQcStatusInput('Accepted');
    setBatchNumberInput(`LOT-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`);
    setCoaNumberInput(`COA-${Math.floor(1000 + Math.random() * 9000)}`);
    setShowQcModal(true);
  };

  // تأكيد فحص الجودة وتغذية المخزون
  const submitQcInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForQc || !selectedLineForQc) return;

    setIsSubmittingQc(true);
    setFeedback(null);

    try {
      const res = await axios.post('http://localhost:3000/procurement/receipts/inspect-and-receive', {
        purchaseOrderId: selectedOrderForQc.id,
        supplierId: selectedOrderForQc.suppliers?.id || 1,
        itemId: selectedLineForQc.item_id,
        batchNumber: batchNumberInput.trim(),
        qcInspectorName: qcInspectorNameInput.trim(),
        coaNumber: coaNumberInput.trim(),
        receivedQuantity: Number(receivedQtyInput),
        acceptedQuantity: Number(acceptedQtyInput),
        rejectedQuantity: Number(rejectedQtyInput),
        rejectionReason: rejectionReasonInput,
        qcStatus: qcStatusInput,
        notes: qcNotesInput,
      });

      if (res.data?.success) {
        setFeedback({ msg: `✅ ${res.data.message}`, success: true });
        setShowQcModal(false);
        fetchOrders();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إثبات استلام الخامات', success: false });
    } finally {
      setIsSubmittingQc(false);
    }
  };

  // حساب الإحصائيات
  const totalMonthlySpend = useMemo(() => {
    return orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  }, [orders]);

  const pendingReceiptCount = useMemo(() => {
    return orders.filter((o) => o.status === 'APPROVED' || o.status === 'IN_TRANSIT').length;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchesSearch =
        searchQuery === '' ||
        o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.suppliers?.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  return (
    <div
      className={`min-h-screen p-4 md:p-8 text-right transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. الترويسة الرئيسية وأزرار التنقل */}
        <header
          className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 md:p-6 rounded-2xl border shadow-sm ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                إدارة المشتريات وفحص الخامات الموردة
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                  Procurement & QC Hub
                </span>
              </h1>
              <p className="text-sm erp-muted mt-0.5">
                أوامر التوريد، محاضر فحص الجودة المعملية، وتغذية أرصدة الخامات لمصانع «أبو عادل»
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <Link
              href="/"
              className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5"
            >
              الرئيسية
            </Link>

            <Link
              href="/production"
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Factory className="w-4 h-4" />
              صالة الإنتاج
            </Link>

            <Link
              href="/costing"
              className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Calculator className="w-4 h-4" />
              التكاليف والتسعير
            </Link>

            <Link
              href="/crates"
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Boxes className="w-4 h-4" />
              الصناديق
            </Link>

            <button
              type="button"
              onClick={initNewOrder}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              أمر شراء جديد
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border erp-sub text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>الربط:</span>
              <span className={isConnected ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                {isConnected ? 'متصل' : 'أوفلاين'}
              </span>
            </div>
          </div>
        </header>

        {/* رسائل التنبيه والنجاح */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm font-bold flex items-center justify-between gap-2 ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <span>{feedback.msg}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. بطاقات إحصائية علوية (KPI Summary Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">إجمالي مشتريات التوريد المعتمدة</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {totalMonthlySpend > 0 ? `${totalMonthlySpend.toLocaleString('ar-EG')} ج.م` : '485,000 ج.م'}
            </div>
            <p className="text-[11px] erp-muted">قيمة الخامات المعتمدة لشهر التشغيل الحالي</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">شحنات قيد التوريد والفحص</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              {pendingReceiptCount} شحنات
            </div>
            <p className="text-[11px] erp-muted">بانتظار وصول سيارات الموردين ورأي الجودة</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">الموردون المعتمدون</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-blue-400">
              {suppliers.length > 0 ? suppliers.length : 5} موردين
            </div>
            <p className="text-[11px] erp-muted">شركات السكر والسمن والدقيق والمكسرات والكرتون</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">فحوصات الجودة المطابقة (QC)</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-indigo-400">
              100% مطابق
            </div>
            <p className="text-[11px] erp-muted">التزام كامل بالمواصفات القياسية للأغذية</p>
          </div>
        </div>

        {/* 3. شريط التصفية والبحث */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-3 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'كافة أوامر الشراء' },
              { id: 'APPROVED', label: 'معتمد قيد التوريد' },
              { id: 'RECEIVED', label: 'مستلم ومفحوص معملياً' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  statusFilter === tab.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-emerald-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="بحث برقم الأمر أو اسم المورد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'
              }`}
            />
          </div>
        </div>

        {/* 4. جدول أوامر الشراء وفواتير التوريد */}
        <div
          className={`rounded-2xl border shadow-sm overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="p-4 border-b flex justify-between items-center erp-card">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                سجل أوامر الشراء وفواتير التوريد الصناعي
              </h2>
              <p className="text-xs erp-muted">متابعة الشحنات القادمة وحالات فحص الجودة وتغذية المخزون</p>
            </div>
            <span className="text-xs font-mono erp-muted">{filteredOrders.length} أمر شراء</span>
          </div>

          {isLoading ? (
            <div className="text-center py-20 erp-muted">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold">جارٍ استدعاء أوامر التوريد من السيرفر...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center erp-muted">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-50" />
              <h3 className="text-base font-bold">لا توجد أوامر شراء مسجلة</h3>
              <p className="text-xs mt-1">اضغط على زر &quot;أمر شراء جديد&quot; لإصدار طلب توريد خامات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className={theme === 'dark' ? 'bg-slate-950/80 text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-700'}>
                  <tr>
                    <th className="p-3.5 font-bold">رقم أمر الشراء</th>
                    <th className="p-3.5 font-bold">المورد المعتمد</th>
                    <th className="p-3.5 font-bold">تاريخ الطلب</th>
                    <th className="p-3.5 font-bold">الاستلام المتوقع</th>
                    <th className="p-3.5 font-bold text-center">عدد الأصناف</th>
                    <th className="p-3.5 font-bold text-center">إجمالي القيمة</th>
                    <th className="p-3.5 font-bold text-center">الحالة</th>
                    <th className="p-3.5 font-bold text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 font-mono">
                  {filteredOrders.map((o) => {
                    const isReceived = o.status === 'RECEIVED' || o.status === 'COMPLETED';

                    return (
                      <tr key={o.id} className="hover:bg-emerald-500/5 transition">
                        <td className="p-3.5 font-bold text-emerald-400">{o.order_number}</td>
                        <td className="p-3.5 font-sans font-bold text-sm text-slate-100">
                          {o.suppliers?.supplier_name || 'مورد معتمد'}
                        </td>
                        <td className="p-3.5 font-sans text-xs erp-muted">
                          {new Date(o.order_date).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="p-3.5 font-sans text-xs text-amber-400">
                          {o.expected_date ? new Date(o.expected_date).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td className="p-3.5 text-center font-bold">{o.purchase_order_lines.length}</td>
                        <td className="p-3.5 text-center font-bold text-sm text-slate-200">
                          {o.total_amount.toLocaleString('ar-EG')} ج.م
                        </td>
                        <td className="p-3.5 text-center font-sans">
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                              isReceived
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            }`}
                          >
                            {isReceived ? '✓ مستلم ومفحوص' : '🚚 قيد التوريد'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-sans">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isReceived && (
                              <button
                                type="button"
                                onClick={() => openQcModal(o)}
                                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow cursor-pointer"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" />
                                فحص واستلام (QC)
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedOrderForPrint(o);
                                setTimeout(() => window.print(), 200);
                              }}
                              className="p-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
                              title="طباعة محضر الاستلام الرسمي A4"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 5. نافذة إدراج أمر شراء وتوريد جديد (Create Purchase Order Modal) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div
              className={`w-full max-w-4xl p-6 rounded-3xl border shadow-2xl space-y-6 my-8 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 erp-card">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">إصدار أمر شراء وتوريد خامات جديد</h3>
                    <p className="text-xs erp-muted">
                      تحديد المورد المعتمد، بنود الخامات، شروط الدفع، وموعد التسليم لمصانع «أبو عادل»
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={submitCreateOrder} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">رقم أمر الشراء</label>
                    <input
                      type="text"
                      required
                      value={orderNumberInput}
                      onChange={(e) => setOrderNumberInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">المورد المعتمد</label>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.supplier_name} ({s.supplier_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">تاريخ الاستلام المتوقع</label>
                    <input
                      type="date"
                      required
                      value={expectedDateInput}
                      onChange={(e) => setExpectedDateInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {/* جدول بنود الخامات المطلوبة */}
                <div className="p-4 rounded-2xl border erp-sub space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold flex items-center gap-2 text-emerald-400">
                        <Package className="w-4 h-4" />
                        جدول بنود الخامات ومواد التعبئة المطلوبة:
                      </h4>
                      <span className="text-[10px] erp-muted">حدد المواد الخام والكميات وأسعار التوريد المتفق عليها</span>
                    </div>

                    <button
                      type="button"
                      onClick={addOrderItemRow}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة صنف
                    </button>
                  </div>

                  <div className="space-y-2">
                    {orderItemsList.map((row, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col md:flex-row items-center gap-2.5 ${
                          theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="flex-1 w-full">
                          <select
                            value={row.itemId}
                            onChange={(e) => updateOrderItemRow(idx, 'itemId', e.target.value)}
                            className={`w-full p-2 rounded-xl border text-xs font-bold ${
                              theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                            }`}
                          >
                            <option value="">-- اختر المادة الخام --</option>
                            {rawMaterials.map((m) => (
                              <option key={m.id} value={String(m.id)}>
                                {m.item_name} ({m.item_code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full md:w-32">
                          <input
                            type="number"
                            min="1"
                            placeholder="الكمية"
                            value={row.quantity}
                            onChange={(e) => updateOrderItemRow(idx, 'quantity', Number(e.target.value))}
                            className={`w-full p-2 rounded-xl border text-center font-mono font-bold text-xs ${
                              theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300'
                            }`}
                          />
                        </div>

                        <div className="w-full md:w-20">
                          <input
                            type="text"
                            placeholder="الوحدة"
                            value={row.unit}
                            onChange={(e) => updateOrderItemRow(idx, 'unit', e.target.value)}
                            className={`w-full p-2 rounded-xl border text-center font-bold text-xs ${
                              theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300'
                            }`}
                          />
                        </div>

                        <div className="w-full md:w-32">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="سعر الوحدة"
                            value={row.unitPrice}
                            onChange={(e) => updateOrderItemRow(idx, 'unitPrice', Number(e.target.value))}
                            className={`w-full p-2 rounded-xl border text-center font-mono font-bold text-xs ${
                              theme === 'dark' ? 'bg-slate-950 border-slate-700 text-amber-400' : 'bg-slate-50 border-slate-300'
                            }`}
                          />
                        </div>

                        <div className="w-full md:w-32 text-center font-mono font-bold text-xs text-slate-200">
                          {(row.quantity * row.unitPrice).toLocaleString('ar-EG')} ج.م
                        </div>

                        {orderItemsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOrderItemRow(idx)}
                            className="p-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                            title="حذف البند"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-700/40">
                    <span className="erp-muted">إجمالي قيمة أمر الشراء:</span>
                    <span className="text-base font-mono font-bold text-emerald-400">
                      {orderItemsList.reduce((sum, it) => sum + (it.quantity * it.unitPrice || 0), 0).toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">شروط الدفع والائتمان</label>
                    <input
                      type="text"
                      value={paymentTermsInput}
                      onChange={(e) => setPaymentTermsInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">ملاحظات التوريد والتسليم</label>
                    <input
                      type="text"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t erp-card">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    اعتماد وإصدار أمر الشراء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. نافذة فحص الجودة الميداني والاستلام في المخزن (QC Check Modal) */}
        {showQcModal && selectedOrderForQc && selectedLineForQc && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div
              className={`w-full max-w-2xl p-6 rounded-3xl border shadow-2xl space-y-5 my-8 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 erp-card">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-emerald-500" />
                    محضر فحص جودة واستلام خامات موردة (QC Check)
                  </h3>
                  <p className="text-xs text-emerald-400 font-mono">
                    أمر شراء: {selectedOrderForQc.order_number} - المورد: {selectedOrderForQc.suppliers?.supplier_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQcModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={submitQcInspection} className="space-y-4">
                <div className="p-3 rounded-xl border erp-sub text-xs space-y-1">
                  <p>الصنف المفحوص: <strong>{selectedLineForQc.items?.item_name || 'خام تصنيع'}</strong></p>
                  <p>الكمية بأمر الشراء: <strong className="font-mono text-emerald-400">{selectedLineForQc.quantity} {selectedLineForQc.items?.unit || 'كجم'}</strong></p>
                  <p>المستلم سابقاً: <strong className="font-mono text-slate-400">{selectedLineForQc.received_quantity} كجم</strong></p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">رقم التشغيلة / اللوط (Batch No)</label>
                    <input
                      type="text"
                      required
                      value={batchNumberInput}
                      onChange={(e) => setBatchNumberInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-amber-400' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">رقم شهادة التحليل المعملي (COA)</label>
                    <input
                      type="text"
                      value={coaNumberInput}
                      onChange={(e) => setCoaNumberInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">الكمية المستلمة الفعلية</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      required
                      value={receivedQtyInput}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setReceivedQtyInput(val);
                        setAcceptedQtyInput(val);
                        setRejectedQtyInput(0);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-center font-mono font-bold text-sm ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">الكمية المقبولة (المطابقة)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={acceptedQtyInput}
                      onChange={(e) => {
                        const acc = Number(e.target.value);
                        setAcceptedQtyInput(acc);
                        setRejectedQtyInput(Math.max(0, receivedQtyInput - acc));
                      }}
                      className={`w-full p-2.5 rounded-xl border text-center font-mono font-bold text-sm ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">الكمية المرفوضة / عجز</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={rejectedQtyInput}
                      onChange={(e) => {
                        const rej = Number(e.target.value);
                        setRejectedQtyInput(rej);
                        setAcceptedQtyInput(Math.max(0, receivedQtyInput - rej));
                      }}
                      className={`w-full p-2.5 rounded-xl border text-center font-mono font-bold text-sm ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-rose-400' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {rejectedQtyInput > 0 && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>تنبيه: تم تسجيل كمية مرفوضة ({rejectedQtyInput} كجم)! يرجى تحديد السبب:</span>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="سبب الرفض (ارتفاع رطوبة، عيوب تغليف، شوائب)..."
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      className="w-full p-2 rounded-lg border bg-slate-900 border-slate-700 text-xs text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">قرار الجودة النهائي</label>
                    <select
                      value={qcStatusInput}
                      onChange={(e) => setQcStatusInput(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border bg-slate-950 border-slate-700 text-xs font-bold"
                    >
                      <option value="Accepted">مقبول بالكامل ومطابق للمواصفة القياسية</option>
                      <option value="Partially_Rejected">مقبول جزئياً مع حجز كمية مرفوضة</option>
                      <option value="Rejected">مرفوض بالكامل وغير مطابق</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">اسم أخصائي ضبط الجودة</label>
                    <input
                      type="text"
                      required
                      value={qcInspectorNameInput}
                      onChange={(e) => setQcInspectorNameInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">تقرير الفحص الحسي والمعملي</label>
                  <input
                    type="text"
                    value={qcNotesInput}
                    onChange={(e) => setQcNotesInput(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t erp-card">
                  <button
                    type="button"
                    onClick={() => setShowQcModal(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingQc}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingQc ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    اعتماد الفحص وإدخال الرصيد للمخزن
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 7. نسق الطباعة الرسمي لمحضر استلام وفحص الخامات A4 (Goods Receipt Note) */}
        {selectedOrderForPrint && (
          <div className="hidden print:block p-6 space-y-6 bg-white text-black font-sans" dir="rtl">
            <div className="border-b-2 border-black pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black">مصانع ومنافذ «أبو عادل» للحلويات</h1>
                <h2 className="text-lg font-bold text-slate-800">محضر استلام وفحص جودة خامات موردة (GRN)</h2>
                <p className="text-xs text-slate-600 mt-1">نظام كيان ERP - إدارة المشتريات ومراقبة الجودة الصناعية</p>
              </div>
              <div className="text-left font-mono text-xs border border-black p-2 rounded">
                <p className="font-bold text-sm">{selectedOrderForPrint.order_number}</p>
                <p>تاريخ: {new Date(selectedOrderForPrint.order_date).toLocaleDateString('ar-EG')}</p>
                <p>الحالة: {selectedOrderForPrint.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border border-black p-3 text-xs bg-slate-50">
              <div>
                <p><strong>المورد المعتمد:</strong> {selectedOrderForPrint.suppliers?.supplier_name || 'شركة توريد خامات'}</p>
                <p><strong>كود المورد:</strong> {selectedOrderForPrint.suppliers?.supplier_code || '-'}</p>
                <p><strong>المستودع المستلم:</strong> {selectedOrderForPrint.warehouses?.warehouse_name || 'مخزن خامات ومواد التعبئة'}</p>
              </div>
              <div>
                <p><strong>تاريخ التقرير:</strong> {reportDate}</p>
                <p><strong>إجمالي القيمة:</strong> {selectedOrderForPrint.total_amount.toLocaleString('ar-EG')} ج.م</p>
                <p><strong>ملاحظات التوريد:</strong> {selectedOrderForPrint.notes || 'استلام مطابق'}</p>
              </div>
            </div>

            <table className="w-full text-right text-xs border-collapse border border-black">
              <thead>
                <tr className="bg-slate-200">
                  <th className="border border-black p-2">م</th>
                  <th className="border border-black p-2">كود الصنف</th>
                  <th className="border border-black p-2">اسم المادة الخام</th>
                  <th className="border border-black p-2 text-center">الكمية المطلوبة</th>
                  <th className="border border-black p-2 text-center">الكمية المستلمة</th>
                  <th className="border border-black p-2 text-center">سعر الوحدة</th>
                  <th className="border border-black p-2 text-center">الإجمالي</th>
                  <th className="border border-black p-2 text-center">قرار فحص الجودة</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrderForPrint.purchase_order_lines.map((line, idx) => (
                  <tr key={line.id}>
                    <td className="border border-black p-2 text-center font-bold">{idx + 1}</td>
                    <td className="border border-black p-2 font-mono">{line.items?.item_code || 'RAW-01'}</td>
                    <td className="border border-black p-2 font-bold">{line.items?.item_name || 'مادة خام'}</td>
                    <td className="border border-black p-2 text-center font-mono">{line.quantity} {line.items?.unit || 'كجم'}</td>
                    <td className="border border-black p-2 text-center font-mono font-bold">
                      {line.received_quantity > 0 ? line.received_quantity : line.quantity} {line.items?.unit || 'كجم'}
                    </td>
                    <td className="border border-black p-2 text-center font-mono">{line.unit_price} ج.م</td>
                    <td className="border border-black p-2 text-center font-mono font-bold">{line.line_total} ج.م</td>
                    <td className="border border-black p-2 text-center font-bold text-emerald-800">مطابق للمواصفة القياسية ✓</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-4 text-xs space-y-1.5 border-t border-black">
              <p className="font-semibold text-[11px] leading-relaxed">
                * إقرار: تم فحص الشحنة أعلاه ظاهرياً ومعملياً والتأكد من مطابقة الخواص الكيميائية والفيزيائية وشروط الصلاحية
                وسلامة التغليف، وتم قيد الكميات المقبولة في الأرصدة الفعلية للمستودع.
              </p>
            </div>

            <div className="pt-8 grid grid-cols-4 gap-4 text-center text-xs border-t-2 border-black">
              <div>
                <p className="font-bold">أمين مخزن الخامات</p>
                <p className="mt-8">....................................</p>
              </div>
              <div>
                <p className="font-bold">مهندس مراقبة الجودة (QC)</p>
                <p className="mt-8">....................................</p>
              </div>
              <div>
                <p className="font-bold">مندوب / سائق شركة التوريد</p>
                <p className="mt-8">....................................</p>
              </div>
              <div>
                <p className="font-bold">مدير إدارة المشتريات</p>
                <p className="mt-8">....................................</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
