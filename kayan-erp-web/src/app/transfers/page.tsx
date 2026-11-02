'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Truck,
  Boxes,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sun,
  Moon,
  Loader2,
  X,
  Factory,
  FileText,
  Calendar,
  Check,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

interface Branch {
  id: string;
  branch_name: string;
  branch_code: string;
  phone?: string;
  address?: string;
}

interface ItemOption {
  id: string;
  item_code: string;
  item_name: string;
  unit: string;
}

export interface TransferItemRow {
  itemId: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface BranchTransfer {
  id: string;
  transfer_number: string;
  transfer_date: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  destination_branch_id: string;
  item_id: string;
  batch_number?: string;
  dispatched_qty: number | string;
  dispatched_count: number;
  driver_name?: string;
  vehicle_number?: string;
  dispatcher_name?: string;
  received_qty?: number | string;
  received_count?: number;
  receiver_name?: string;
  status: string;
  dispute_reason?: string;
  dispute_charge_to?: string;
  dispute_notes?: string;
  notes?: string;
  container_type?: string;
  crate_count?: number;
  inner_count?: number;
  received_crate_count?: number;
  branches?: {
    branch_name: string;
    branch_code: string;
    phone?: string;
  };
  items?: {
    item_name: string;
    item_code: string;
    unit: string;
  };
}

export default function BranchTransfersPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [transfers, setTransfers] = useState<BranchTransfer[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // التصفية والبحث
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // نافذة إصدار إذن تحويل جديد
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [transferNumberInput, setTransferNumberInput] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [dispatchedQtyInput, setDispatchedQtyInput] = useState<number>(45.5);
  const [dispatchedCountInput, setDispatchedCountInput] = useState<number>(4);
  const [crateCountInput, setCrateCountInput] = useState<number>(4);
  const [containerTypeInput, setContainerTypeInput] = useState<string>('سرفيس حلويات استيل');
  const [driverNameInput, setDriverNameInput] = useState<string>('أحمد عبد العزيز (سائق خط المنصورة)');
  const [vehicleNumberInput, setVehicleNumberInput] = useState<string>('د ق أ 8921');
  const [dispatcherNameInput, setDispatcherNameInput] = useState<string>('محمود حسن (أمين التوزيع)');
  const [notesInput, setNotesInput] = useState<string>('طلبية صباحية طازجة');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // قائمة بنود الحلويات التامة المحولة (دعم الأصناف المتعددة)
  const [transferItemsList, setTransferItemsList] = useState<TransferItemRow[]>([
    { itemId: '', quantity: 25, unit: 'كجم' },
  ]);

  const addTransferItemRow = () => {
    const defaultId = items.length > 0 ? String(items[0].id) : '';
    const defaultUnit = items.length > 0 ? (items[0].unit || 'كجم') : 'كجم';
    setTransferItemsList((prev) => [...prev, { itemId: defaultId, quantity: 15, unit: defaultUnit }]);
  };

  const removeTransferItemRow = (index: number) => {
    if (transferItemsList.length <= 1) return;
    setTransferItemsList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTransferItemRow = (index: number, field: keyof TransferItemRow, value: any) => {
    setTransferItemsList((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === 'itemId') {
          const found = items.find((it) => String(it.id) === String(value));
          return { ...row, itemId: value, unit: found?.unit || 'كجم' };
        }
        return { ...row, [field]: value };
      })
    );
  };

  // نافذة تأكيد الاستلام بالمعرض وحصر العجز
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<BranchTransfer | null>(null);
  const [receivedQtyInput, setReceivedQtyInput] = useState<number>(0);
  const [receivedCountInput, setReceivedCountInput] = useState<number>(0);
  const [receivedCrateCountInput, setReceivedCrateCountInput] = useState<number>(0);
  const [receiverNameInput, setReceiverNameInput] = useState<string>('مدير فرع المعرض');
  const [disputeReasonInput, setDisputeReasonInput] = useState<string>('');
  const [disputeChargeToInput, setDisputeChargeToInput] = useState<string>('سائق سيارة التوزيع');
  const [isReceiving, setIsReceiving] = useState<boolean>(false);

  // أمر التحويل المحدد للطباعة
  const [selectedTransferForPrint, setSelectedTransferForPrint] = useState<BranchTransfer | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  // الاستماع للأحداث الحية عبر WebSockets
  useEffect(() => {
    if (!socket) return;

    socket.on('branch_transfer_created', (data) => {
      setFeedback({
        msg: `🚚 إذن تحويل جديد (${data.transferNumber}): تم شحن ${data.dispatchedQty} كجم (${data.itemName}) إلى ${data.branchName} مع ${data.driverName}`,
        success: true,
      });
      fetchTransfers();
    });

    socket.on('branch_transfer_received', (data) => {
      setFeedback({
        msg: `✓ تم تأكيد استلام إذن التحويل ${data.transferNumber} بمعرض ${data.branchName} - الحالة: ${data.status}`,
        success: true,
      });
      fetchTransfers();
    });

    return () => {
      socket.off('branch_transfer_created');
      socket.off('branch_transfer_received');
    };
  }, [socket]);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchTransfers(), fetchBranches(), fetchItems()]);
    setIsLoading(false);
  };

  const fetchTransfers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/transfers/branch-transfers');
      if (res.data?.success) setTransfers(res.data.data || []);
    } catch (e) {
      console.warn('API offline');
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get('http://localhost:3000/transfers/branches');
      if (res.data?.success) {
        const list = res.data.data || [];
        setBranches(list);
        if (list.length > 0 && !selectedBranchId) {
          setSelectedBranchId(String(list[0].id));
        }
      }
    } catch (e) {
      console.warn('API offline');
    }
  };

  const fetchItems = async () => {
    try {
      const res = await axios.get('http://localhost:3000/manufacturing/items');
      if (res.data?.success) {
        const list = res.data.data || [];
        setItems(list);
        if (list.length > 0 && !selectedItemId) {
          setSelectedItemId(String(list[0].id));
        }
      }
    } catch (e) {
      console.warn('API offline');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchTransfers(), fetchBranches(), fetchItems()]);
    setIsRefreshing(false);
  };

  // فتح وإعداد نافذة إذن جديد
  const initNewTransfer = () => {
    const code = `TR-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    setTransferNumberInput(code);
    const defaultId = items.length > 0 ? String(items[0].id) : '';
    const defaultUnit = items.length > 0 ? (items[0].unit || 'كجم') : 'كجم';
    setTransferItemsList([
      { itemId: defaultId, quantity: 25, unit: defaultUnit },
    ]);
    setShowCreateModal(true);
    setFeedback(null);
  };

  // إرسال وقيد إذن التحويل
  const submitCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = transferItemsList.filter((it) => it.itemId && it.quantity > 0);
    if (!selectedBranchId || validItems.length === 0) {
      setFeedback({ msg: 'يرجى اختيار الفرع المستلم وإضافة صنف واحد على الأقل مع تحديد الكمية', success: false });
      return;
    }

    const primaryItem = validItems[0];
    const totalQty = validItems.reduce((sum, it) => sum + Number(it.quantity), 0);

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await axios.post('http://localhost:3000/transfers/branch-transfers', {
        transferNumber: transferNumberInput.trim(),
        destinationBranchId: selectedBranchId,
        toBranchId: selectedBranchId,
        itemId: primaryItem.itemId,
        dispatchedQty: totalQty,
        dispatchedCount: dispatchedCountInput,
        crateCount: crateCountInput,
        containerType: containerTypeInput,
        driverName: driverNameInput,
        vehicleNumber: vehicleNumberInput,
        dispatcherName: dispatcherNameInput,
        notes: notesInput,
        items: validItems.map((it) => ({
          itemId: it.itemId,
          quantity: Number(it.quantity),
          unit: it.unit,
          notes: it.notes,
        })),
      });

      if (res.data?.success) {
        setFeedback({ msg: '✅ تم إصدار إذن التحويل وتوثيق حركة الصناديق وبث الإشعار بنجاح!', success: true });
        setShowCreateModal(false);
        fetchTransfers();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إصدار إذن التحويل', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح نافذة تأكيد الاستلام الميداني
  const openReceiveModal = (t: BranchTransfer) => {
    setSelectedTransferForReceive(t);
    setReceivedQtyInput(Number(t.dispatched_qty));
    setReceivedCountInput(t.dispatched_count);
    setReceivedCrateCountInput(t.crate_count || 0);
    setDisputeReasonInput('');
  };

  // تأكيد الاستلام وحسم الفروقات
  const confirmReceiveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransferForReceive) return;

    setIsReceiving(true);
    try {
      const res = await axios.patch(
        `http://localhost:3000/transfers/branch-transfers/${selectedTransferForReceive.id}/receive`,
        {
          receivedQty: receivedQtyInput,
          receivedCount: receivedCountInput,
          receivedCrateCount: receivedCrateCountInput,
          receiverName: receiverNameInput,
          disputeReason: disputeReasonInput || undefined,
          disputeChargeTo: disputeChargeToInput,
        }
      );

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setSelectedTransferForReceive(null);
        fetchTransfers();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تأكيد الاستلام', success: false });
    } finally {
      setIsReceiving(false);
    }
  };

  // إعداد الإذن للطباعة الرسمية (A4 Print)
  const handlePrintTransfer = (t: BranchTransfer) => {
    setSelectedTransferForPrint(t);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // تصفية الأذونات
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchesBranch = branchFilter === 'ALL' || String(t.destination_branch_id) === branchFilter;
      const matchesSearch =
        searchQuery === '' ||
        t.transfer_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.driver_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.items?.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.branches?.branch_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesBranch && matchesSearch;
    });
  }, [transfers, statusFilter, branchFilter, searchQuery]);

  return (
    <div
      className={`min-h-screen p-4 md:p-8 text-right transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. الترويسة الرئيسية وأدوات التحكم السريع */}
        <header
          className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 md:p-6 rounded-2xl border shadow-sm print:hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                إدارة تحويلات وتسليمات المعارض والفروع
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-mono">
                  Branch Transfers Hub
                </span>
              </h1>
              <p className="text-sm erp-muted mt-0.5">
                أذونات شحن البضاعة التامة، تسليم الصناديق، إثبات عهدة السائقين، وتأكيد الاستلام بالمعارض
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
              href="/crates"
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Boxes className="w-4 h-4" />
              تتبع الصناديق
            </Link>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-xs font-bold cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                  : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-xs font-bold cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border erp-sub text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>الربط:</span>
              <span className={isConnected ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                {isConnected ? 'متصل' : 'أوفلاين'}
              </span>
            </div>

            <button
              type="button"
              onClick={initNewTransfer}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إصدار إذن تحويل فرع جديد
            </button>
          </div>
        </header>

        {/* رسائل التنبيه والنجاح */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm font-bold flex items-center justify-between gap-2 print:hidden ${
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

        {/* 2. شريط التصفية والبحث في أذونات التحويل */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-3 print:hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* تبويبات الحالة */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'كافة التحويلات' },
              { id: 'IN_TRANSIT', label: '🚚 في الطريق' },
              { id: 'RECEIVED', label: '✓ مستلم ومطابق' },
              { id: 'DISPUTED', label: '⚠️ عجز ونزاع' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                    : theme === 'dark'
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-indigo-500'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-indigo-500'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* تصفية بالفرع والبحث */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className={`p-2 rounded-xl border text-xs font-bold ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
              }`}
            >
              <option value="ALL">-- كافة المعارض --</option>
              {branches.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.branch_name}
                </option>
              ))}
            </select>

            <div className="relative w-full md:w-60">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="رقم الإذن أو السائق..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs ${
                  theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 3. قائمة أذونات التحويل والشحن */}
        {isLoading ? (
          <div className="text-center py-20 erp-muted">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500 mb-2" />
            <p className="text-sm font-semibold">جارٍ استدعاء أذونات التحويل من السيرفر...</p>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <Truck className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-50" />
            <h3 className="text-base font-bold">لا توجد أذونات تحويل مطابقة</h3>
            <p className="text-xs erp-muted mt-1">اضغط على زر إصدار إذن تحويل لإنشاء شحنة جديدة</p>
          </div>
        ) : (
          <div className="space-y-4 print:hidden">
            {filteredTransfers.map((t) => {
              const isTransit = t.status === 'IN_TRANSIT';
              const isReceived = t.status === 'RECEIVED';
              const isDisputed = t.status === 'DISPUTED';

              return (
                <div
                  key={t.id}
                  className={`p-5 rounded-2xl border shadow-sm space-y-4 transition-all duration-200 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 erp-card">
                    <div className="flex items-center gap-3">
                      <span className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                        <Truck className="w-5 h-5" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-bold font-mono text-indigo-400">{t.transfer_number}</h2>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                              isReceived
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : isDisputed
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            }`}
                          >
                            {isReceived ? '✓ مستلم ومطابق' : isDisputed ? '⚠️ عجز ونزاع معلق' : '🚚 في الطريق'}
                          </span>
                        </div>
                        <p className="text-xs erp-muted mt-0.5">
                          إلى: <strong className="text-slate-200">{t.branches?.branch_name}</strong> • السائق:{' '}
                          {t.driver_name} ({t.vehicle_number})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => handlePrintTransfer(t)}
                        className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="طباعة إذن التسليم الرسمي"
                      >
                        <Printer className="w-4 h-4 text-emerald-500" />
                        <span>طباعة الإذن (A4)</span>
                      </button>

                      {isTransit && (
                        <button
                          type="button"
                          onClick={() => openReceiveModal(t)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                        >
                          <Check className="w-3.5 h-3.5" />
                          تأكيد الاستلام بالمعرض
                        </button>
                      )}
                    </div>
                  </div>

                  {/* تفاصيل البضاعة والصناديق المنصرفة */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl border erp-sub space-y-1">
                      <span className="erp-muted text-[11px] block">صنف الحلويات:</span>
                      <strong className="text-sm block">{t.items?.item_name || 'صنف حلويات'}</strong>
                      <span className="text-[10px] erp-muted font-mono">كود: {t.items?.item_code}</span>
                    </div>

                    <div className="p-3 rounded-xl border erp-sub space-y-1">
                      <span className="erp-muted text-[11px] block">الوزن والكمية المنصرفة:</span>
                      <strong className="text-sm font-mono text-indigo-400 block">
                        {Number(t.dispatched_qty)} {t.items?.unit || 'كجم'}
                      </strong>
                      <span className="text-[10px] erp-muted">العدد: {t.dispatched_count} صينية/سرفيس</span>
                    </div>

                    <div className="p-3 rounded-xl border erp-sub space-y-1">
                      <span className="erp-muted text-[11px] block">الصناديق والسرافيس المتداولة:</span>
                      <strong className="text-sm font-mono text-amber-400 block">
                        {t.crate_count || 0} {t.container_type || 'صندوق'}
                      </strong>
                      <span className="text-[10px] erp-muted">المستلم: {t.received_crate_count ?? '-'}</span>
                    </div>

                    <div className="p-3 rounded-xl border erp-sub space-y-1">
                      <span className="erp-muted text-[11px] block">حالة الاستلام الفعلي:</span>
                      {t.received_qty !== null ? (
                        <strong className="text-sm font-mono text-emerald-400 block">
                          تم استلام {Number(t.received_qty)} كجم
                        </strong>
                      ) : (
                        <strong className="text-xs text-amber-500 block">بانتظار وصول الشاحنة للمنفذ</strong>
                      )}
                      <span className="text-[10px] erp-muted">مستلم: {t.receiver_name || '-'}</span>
                    </div>
                  </div>

                  {/* تنبيه النزاع والعجز في حال وجوده */}
                  {isDisputed && (
                    <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 shrink-0" />
                        <span>سبب النزاع: {t.dispute_reason}</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        العهدة محمّلة على: {t.dispute_charge_to || 'السائق'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 4. نافذة إصدار إذن تحويل جديد */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
            <div
              className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl border shadow-2xl space-y-5 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 erp-card">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">إصدار إذن تحويل وصرف بضاعة لمعرض</h2>
                    <p className="text-xs erp-muted">يتم تسجيل إذن الشحن وربط عهدة الصناديق وخصم رصيد المستودع تلقائياً</p>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={submitCreateTransfer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">رقم إذن التحويل</label>
                    <input
                      type="text"
                      required
                      value={transferNumberInput}
                      onChange={(e) => setTransferNumberInput(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-mono font-bold ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-indigo-400' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">المعرض أو المنفذ المستلم</label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.branch_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* جدول إدراج بنود الحلويات التامة المحولة */}
                <div className="p-4 rounded-2xl border erp-sub space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold flex items-center gap-2 text-indigo-400">
                        <FileText className="w-4 h-4" />
                        جدول بنود الحلويات التامة المحولة (أصناف متعددة):
                      </h4>
                      <span className="text-[10px] erp-muted">حدد أصناف الحلويات والكميات المحولة في هذه الشحنة</span>
                    </div>

                    <button
                      type="button"
                      onClick={addTransferItemRow}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 shadow cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة صنف للشحنة
                    </button>
                  </div>

                  <div className="space-y-2">
                    {transferItemsList.map((row, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col md:flex-row items-center gap-2.5 ${
                          theme === 'dark' ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        <div className="flex-1 w-full">
                          <select
                            value={row.itemId}
                            onChange={(e) => updateTransferItemRow(idx, 'itemId', e.target.value)}
                            className={`w-full p-2 rounded-xl border text-xs font-bold ${
                              theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                            }`}
                          >
                            <option value="">-- اختر صنف الحلويات --</option>
                            {items.map((it) => (
                              <option key={it.id} value={String(it.id)}>
                                {it.item_name} ({it.item_code})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full md:w-32">
                          <input
                            type="number"
                            step="0.5"
                            min="0.1"
                            placeholder="الكمية"
                            value={row.quantity}
                            onChange={(e) => updateTransferItemRow(idx, 'quantity', Number(e.target.value))}
                            className={`w-full p-2 rounded-xl border text-center font-mono font-bold text-xs ${
                              theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-slate-50 border-slate-300'
                            }`}
                          />
                        </div>

                        <div className="w-full md:w-24">
                          <input
                            type="text"
                            placeholder="الوحدة"
                            value={row.unit}
                            onChange={(e) => updateTransferItemRow(idx, 'unit', e.target.value)}
                            className={`w-full p-2 rounded-xl border text-center font-bold text-xs ${
                              theme === 'dark' ? 'bg-slate-950 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-300'
                            }`}
                          />
                        </div>

                        {transferItemsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTransferItemRow(idx)}
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
                    <span className="erp-muted">إجمالي وزن البضاعة المحولة:</span>
                    <span className="text-sm font-mono text-indigo-400">
                      {transferItemsList.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0).toFixed(2)} كجم
                    </span>
                  </div>
                </div>

                {/* ربط الصناديق المتداولة */}
                <div className="p-4 rounded-2xl border erp-sub space-y-3">
                  <h4 className="text-xs font-bold flex items-center gap-2 text-amber-500">
                    <Boxes className="w-4 h-4" />
                    بيانات الأوعية والصناديق المتداولة المرافقة للشحنة:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold mb-1">نوع الصناديق</label>
                      <input
                        type="text"
                        value={containerTypeInput}
                        onChange={(e) => setContainerTypeInput(e.target.value)}
                        className={`w-full p-2 rounded-xl border text-xs ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold mb-1">عدد الصناديق المصاحبة</label>
                      <input
                        type="number"
                        min="0"
                        value={crateCountInput}
                        onChange={(e) => setCrateCountInput(Number(e.target.value))}
                        className={`w-full p-2 rounded-xl border text-center font-bold font-mono text-xs ${
                          theme === 'dark' ? 'bg-slate-950 border-slate-700 text-amber-400' : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* السائق والشاحنة */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">اسم السائق المستلم</label>
                    <input
                      type="text"
                      value={driverNameInput}
                      onChange={(e) => setDriverNameInput(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">رقم لوحة السيارة</label>
                    <input
                      type="text"
                      value={vehicleNumberInput}
                      onChange={(e) => setVehicleNumberInput(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs font-mono ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">أمين مخزن التوزيع</label>
                    <input
                      type="text"
                      value={dispatcherNameInput}
                      onChange={(e) => setDispatcherNameInput(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t erp-card">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    إصدار إذن التحويل والشحن
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 5. نافذة تأكيد الاستلام الميداني بالمعرض */}
        {selectedTransferForReceive && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
            <div
              className={`w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 erp-card">
                <div>
                  <h3 className="text-base font-bold">تأكيد استلام شحنة المعرض</h3>
                  <p className="text-xs text-indigo-400 font-mono">{selectedTransferForReceive.transfer_number}</p>
                </div>
                <button onClick={() => setSelectedTransferForReceive(null)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={confirmReceiveTransfer} className="space-y-4">
                <div className="p-3 rounded-xl border erp-sub text-xs space-y-1">
                  <p>الصنف: <strong>{selectedTransferForReceive.items?.item_name}</strong></p>
                  <p>الوزن المنصرف: <strong className="font-mono text-indigo-400">{Number(selectedTransferForReceive.dispatched_qty)} كجم</strong></p>
                  <p>الصناديق المنصرفة: <strong className="font-mono text-amber-400">{selectedTransferForReceive.crate_count} صندوق</strong></p>
                  <p>السائق: <strong>{selectedTransferForReceive.driver_name}</strong></p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">الوزن الفعلي المستلم (كجم)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={receivedQtyInput}
                      onChange={(e) => setReceivedQtyInput(Number(e.target.value))}
                      className={`w-full p-2.5 rounded-xl border text-center font-bold font-mono text-sm ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">عدد الصناديق المستلمة</label>
                    <input
                      type="number"
                      min="0"
                      value={receivedCrateCountInput}
                      onChange={(e) => setReceivedCrateCountInput(Number(e.target.value))}
                      className={`w-full p-2.5 rounded-xl border text-center font-bold font-mono text-sm ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {/* كشف العجز التلقائي */}
                {Number(selectedTransferForReceive.dispatched_qty) - receivedQtyInput > 0 && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>
                        تنبيه: يوجد عجز في الوزن مقداره (
                        {(Number(selectedTransferForReceive.dispatched_qty) - receivedQtyInput).toFixed(2)} كجم)!
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] mb-1">الجهة المسؤولة عن العجز:</label>
                      <select
                        value={disputeChargeToInput}
                        onChange={(e) => setDisputeChargeToInput(e.target.value)}
                        className="w-full p-1.5 rounded-lg border bg-slate-900 border-slate-700 text-xs"
                      >
                        <option value="سائق سيارة التوزيع">سائق سيارة التوزيع (عهدة نقل)</option>
                        <option value="صالة التعبئة والتغليف">صالة التعبئة والتغليف (خطأ وزن مسبق)</option>
                        <option value="معرض الفرع المستلم">معرض الفرع المستلم</option>
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1">اسم مستلم الشحنة بالمعرض</label>
                  <input
                    type="text"
                    value={receiverNameInput}
                    onChange={(e) => setReceiverNameInput(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t erp-card">
                  <button
                    type="button"
                    onClick={() => setSelectedTransferForReceive(null)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isReceiving}
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isReceiving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    اعتماد الاستلام بالمعرض
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 6. بطاقة إذن التسليم الرسمي القياسي (A4 Delivery Note Layout) */}
        {selectedTransferForPrint && (
          <div className="hidden print:block p-4 space-y-6 bg-white text-black font-sans" dir="rtl">
            {/* الترويسة الرسمية */}
            <div className="border-b-2 border-black pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black">مصانع ومنافذ «أبو عادل» للحلويات</h1>
                <h2 className="text-lg font-bold text-slate-800">إذن تسليم وتحويل بضاعة تامة وصناديق (Delivery Note)</h2>
                <p className="text-xs text-slate-600 mt-1">نظام كيان ERP - إدارة سلاسل الإمداد ومنافذ التوزيع</p>
              </div>
              <div className="text-left font-mono text-sm border-2 border-black p-2 rounded">
                <p className="font-bold text-base">{selectedTransferForPrint.transfer_number}</p>
                <p className="text-xs">تاريخ: {new Date(selectedTransferForPrint.transfer_date).toLocaleDateString('ar-EG')}</p>
                <p className="text-xs">الحالة: {selectedTransferForPrint.status}</p>
              </div>
            </div>

            {/* بيانات المسار والسيارة */}
            <div className="grid grid-cols-2 gap-4 border border-black p-3 text-xs bg-slate-50">
              <div>
                <p><strong>من المستودع:</strong> مخزن إنتاج تام - المعمل الرئيسي</p>
                <p><strong>إلى المعرض:</strong> {selectedTransferForPrint.branches?.branch_name || 'معرض الفرع'}</p>
                <p><strong>أمين التوزيع:</strong> {selectedTransferForPrint.dispatcher_name || 'أمين المستودع'}</p>
              </div>
              <div>
                <p><strong>السائق المستلم:</strong> {selectedTransferForPrint.driver_name || 'سائق التوزيع'}</p>
                <p><strong>رقم الشاحنة:</strong> {selectedTransferForPrint.vehicle_number || '-'}</p>
                <p><strong>ملاحظات:</strong> {selectedTransferForPrint.notes || 'تسليم فوري'}</p>
              </div>
            </div>

            {/* جدول تفاصيل البضاعة التامة والصناديق */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm border-b border-black pb-1">بيانات البضاعة والأوعية المتداولة:</h3>
              <table className="w-full text-right text-xs border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-200">
                    <th className="border border-black p-2">م</th>
                    <th className="border border-black p-2">كود الصنف</th>
                    <th className="border border-black p-2">اسم صنف الحلويات</th>
                    <th className="border border-black p-2">الوزن المنصرف</th>
                    <th className="border border-black p-2">عدد الصواني</th>
                    <th className="border border-black p-2">نوع الصناديق</th>
                    <th className="border border-black p-2">عدد الصناديق</th>
                    <th className="border border-black p-2">الوزن المستلم</th>
                    <th className="border border-black p-2">الفارق / العجز</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black p-2 text-center font-bold">1</td>
                    <td className="border border-black p-2 font-mono">{selectedTransferForPrint.items?.item_code || 'ITM-01'}</td>
                    <td className="border border-black p-2 font-bold">{selectedTransferForPrint.items?.item_name || 'حلويات مشكلة'}</td>
                    <td className="border border-black p-2 font-mono font-bold text-center">
                      {Number(selectedTransferForPrint.dispatched_qty)} كجم
                    </td>
                    <td className="border border-black p-2 text-center">{selectedTransferForPrint.dispatched_count}</td>
                    <td className="border border-black p-2 text-center">{selectedTransferForPrint.container_type || 'سرفيس استيل'}</td>
                    <td className="border border-black p-2 text-center font-mono font-bold">{selectedTransferForPrint.crate_count || 0}</td>
                    <td className="border border-black p-2 text-center font-mono">
                      {selectedTransferForPrint.received_qty !== null ? `${Number(selectedTransferForPrint.received_qty)} كجم` : ''}
                    </td>
                    <td className="border border-black p-2 text-center">
                      {selectedTransferForPrint.dispute_reason ? selectedTransferForPrint.dispute_reason : 'مطابق'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* إقرار العهدة والتواقيع الرسمية */}
            <div className="pt-4 text-xs space-y-2 border-t border-black">
              <p className="font-semibold text-[11px] leading-relaxed">
                * إقرار: يقر سائق الشاحنة باستلام الأصناف والصناديق المذكورة أعلاه بحالة سليمة وتحت مسؤوليته لحين تسليمها
                لمسؤول المعرض، ويعتبر توقيع مستلم المعرض إبراء لذمة السائق بمقدار الكمية المستلمة الفعلية.
              </p>
            </div>

            <div className="pt-8 grid grid-cols-4 gap-4 text-center text-xs border-t-2 border-black">
              <div>
                <p className="font-bold">أمين مخزن الإنتاج التام</p>
                <p className="mt-8">....................................</p>
              </div>
              <div>
                <p className="font-bold">سائق سيارة النقل والتوزيع</p>
                <p className="mt-8">....................................</p>
              </div>
              <div>
                <p className="font-bold">مراقب الجودة بالمصنع</p>
                <p className="mt-8">....................................</p>
              </div>
              <div>
                <p className="font-bold">مستلم المعرض المعتمد</p>
                <p className="mt-8">....................................</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
