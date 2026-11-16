'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Boxes,
  Truck,
  RotateCcw,
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
  Layers,
  ArrowRightLeft,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface CirculatingContainer {
  id: number;
  container_name: string;
  specification?: string;
  total_factory_quantity: number;
  in_production_floor_quantity: number;
  in_packaging_warehouse_quantity: number;
  with_drivers_and_branches_quantity: number;
  disputed_quantity: number;
  damaged_quantity: number;
}

interface CrateMovement {
  id: string;
  movement_number: string;
  created_at: string;
  movement_type: string;
  container_name: string;
  dispatched_quantity: number;
  source_location: string;
  destination_location: string;
  dispatched_by_name?: string;
  received_quantity?: number;
  shortage_quantity: number;
  damaged_count: number;
  status: string;
  notes?: string;
  receive_notes?: string;
  arbitration_text?: string;
}

interface CustodyReport {
  location: string;
  dispatched: number;
  returned: number;
  balance: number;
  damaged: number;
}

interface BranchInventoryItem {
  id: string;
  branchCode: string;
  branchName: string;
  maxAllowed: number;
  currentBalance: number;
  status: 'NORMAL' | 'WARNING' | 'EXCEEDED';
  overdueCount: number;
  lastDeliveryDate: string;
}

export default function CratesManagementPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [containers, setContainers] = useState<CirculatingContainer[]>([]);
  const [movements, setMovements] = useState<CrateMovement[]>([]);
  const [custodyList, setCustodyList] = useState<CustodyReport[]>([]);
  const [branchInventory, setBranchInventory] = useState<BranchInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // تصفية السجل
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // نموذج الإدخال الميداني السريع (Quick Field Dispatch/Return)
  const [showModal, setShowModal] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'DISPATCH_BRANCH' | 'RETURN_EMPTY'>('DISPATCH_BRANCH');
  const [selectedContainer, setSelectedContainer] = useState<string>('سرفيس حلويات استيل (قياسي)');
  const [quantity, setQuantity] = useState<number>(50);
  const [sourceLocation, setSourceLocation] = useState<string>('المصنع الرئيسي - التعبئة');
  const [destinationLocation, setDestinationLocation] = useState<string>('معرض المنصورة الرئيسي');
  const [dispatchedByName, setDispatchedByName] = useState<string>('أمين مخزن التعبئة');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // نافذة تأكيد الاستلام الميداني
  const [selectedMovementForReceive, setSelectedMovementForReceive] = useState<CrateMovement | null>(null);
  const [receivedQtyInput, setReceivedQtyInput] = useState<number>(0);
  const [damagedCountInput, setDamagedCountInput] = useState<number>(0);
  const [receiveNotesInput, setReceiveNotesInput] = useState<string>('');
  const [isReceiving, setIsReceiving] = useState<boolean>(false);

  useEffect(() => {
    loadAll();
  }, []);

  // الاستماع للأحداث الحية عبر WebSockets
  useEffect(() => {
    if (!socket) return;

    socket.on('crate_movement_created', (data) => {
      setFeedback({
        msg: `📦 حركة صناديق جديدة (${data.movementNumber}): تم صرف ${data.quantity} من ${data.containerName} إلى ${data.destination}`,
        success: true,
      });
      fetchMovements();
      fetchContainers();
      fetchCustody();
    });

    socket.on('crate_movement_received', (data) => {
      setFeedback({
        msg: `✓ تم تأكيد استلام حركة الصناديق ${data.movementNumber} - الحالة: ${data.status}`,
        success: true,
      });
      fetchMovements();
      fetchContainers();
      fetchCustody();
    });

    return () => {
      socket.off('crate_movement_created');
      socket.off('crate_movement_received');
    };
  }, [socket]);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([fetchContainers(), fetchMovements(), fetchCustody(), fetchInventory()]);
    setIsLoading(false);
  };

  const fetchInventory = async () => {
    try {
      const res = await axios.get('http://localhost:3000/crates/inventory');
      if (res.data?.success) setBranchInventory(res.data.data || []);
    } catch (e) {
      console.warn('Inventory API offline');
    }
  };

  const fetchContainers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/crates/containers');
      if (res.data?.success) setContainers(res.data.data || []);
    } catch (e) {
      console.warn('API offline');
    }
  };

  const fetchMovements = async () => {
    try {
      const res = await axios.get('http://localhost:3000/crates/movements');
      if (res.data?.success) setMovements(res.data.data || []);
    } catch (e) {
      console.warn('API offline');
    }
  };

  const fetchCustody = async () => {
    try {
      const res = await axios.get('http://localhost:3000/crates/custody-balances');
      if (res.data?.success) setCustodyList(res.data.data || []);
    } catch (e) {
      console.warn('API offline');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchContainers(), fetchMovements(), fetchCustody()]);
    setIsRefreshing(false);
  };

  // فتح نافذة الإدخال السريع
  const openNewMovementModal = (type: 'DISPATCH_BRANCH' | 'RETURN_EMPTY') => {
    setMovementType(type);
    if (type === 'RETURN_EMPTY') {
      setSourceLocation('معرض المنصورة الرئيسي');
      setDestinationLocation('المصنع الرئيسي - غسيل وتعقيم السرافيس');
      setNotes('استرجاع سرافيس فارغة نظيفة للمصنع');
    } else {
      setSourceLocation('المصنع الرئيسي - التعبئة');
      setDestinationLocation('معرض المنصورة الرئيسي');
      setNotes('صرف سرافيس محملة بحلويات شرقية وغربية');
    }
    setQuantity(50);
    setShowModal(true);
    setFeedback(null);
  };

  // إرسال وقيد الحركة في الباك إند
  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContainer || quantity <= 0) {
      setFeedback({ msg: 'يرجى اختيار نوع الصندوق والكمية المنصرفة', success: false });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await axios.post('http://localhost:3000/crates/movements', {
        movementType,
        containerName: selectedContainer,
        dispatchedQuantity: quantity,
        sourceLocation,
        destinationLocation,
        dispatchedByName,
        notes,
      });

      if (res.data?.success) {
        setFeedback({ msg: '✅ تم توثيق حركة الصناديق وبث الإشعار لحظياً بنجاح!', success: true });
        setShowModal(false);
        fetchMovements();
        fetchContainers();
        fetchCustody();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تسجيل الحركة', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح نافذة الاستلام وتأكيد وصول الصناديق
  const openReceiveModal = (m: CrateMovement) => {
    setSelectedMovementForReceive(m);
    setReceivedQtyInput(m.dispatched_quantity);
    setDamagedCountInput(0);
    setReceiveNotesInput('');
  };

  // تأكيد الاستلام الميداني
  const confirmReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMovementForReceive) return;

    setIsReceiving(true);
    try {
      const res = await axios.patch(
        `http://localhost:3000/crates/movements/${selectedMovementForReceive.id}/receive`,
        {
          receivedQuantity: receivedQtyInput,
          damagedCount: damagedCountInput,
          receiveNotes: receiveNotesInput,
          disputeNotes: damagedCountInput > 0 || (selectedMovementForReceive.dispatched_quantity - receivedQtyInput > 0)
            ? `عجز مسجل بمعرفة مستلم المعرض: عجز (${selectedMovementForReceive.dispatched_quantity - receivedQtyInput}) وتالف (${damagedCountInput})`
            : undefined,
        }
      );

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setSelectedMovementForReceive(null);
        fetchMovements();
        fetchContainers();
        fetchCustody();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تأكيد الاستلام', success: false });
    } finally {
      setIsReceiving(false);
    }
  };

  // تصفية الحركات
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || m.movement_type === typeFilter;
      const matchesSearch =
        searchQuery === '' ||
        m.movement_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.container_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.destination_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.source_location?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [movements, statusFilter, typeFilter, searchQuery]);

  return (
    <div
      className={`min-h-screen text-right transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir="rtl"
    >
      <div className="erp-container-fluid space-y-4">

        {/* 1. الترويسة الرئيسية وأزرار التنقل */}
        <header
          className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 md:p-6 rounded-2xl border shadow-sm ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <Boxes className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                منظومة تتبع الصناديق والسرافيس المتداولة
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-mono">
                  Circulating Crates Hub
                </span>
              </h1>
              <p className="text-sm erp-muted mt-0.5">
                تتبع حركة السرافيس والصناديق الفارغة والمحملة وضبط عهد الفروع والسائقين لمصانع «أبو عادل»
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
              href="/transfers"
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Truck className="w-4 h-4" />
              تحويلات الفروع
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

        {/* 2. بطاقات إحصائية علوية (KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">في المصنع (جاهزة للاستخدام)</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Factory className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-500">
              {containers.reduce((sum, c) => sum + (c.in_production_floor_quantity || 0) + (c.in_packaging_warehouse_quantity || 0), 0)}
            </div>
            <p className="text-[11px] erp-muted">سرافيس جاهزة بالإنتاج والتعبئة</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">مع السائقين/السيارات (قيد النقل)</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Truck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-blue-500">
              {Math.round(containers.reduce((sum, c) => sum + (c.with_drivers_and_branches_quantity || 0), 0) * 0.35)}
            </div>
            <p className="text-[11px] erp-muted">شحنات متداولة على خطوط التوزيع</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">عهدة معارض الفروع</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-indigo-400">
              {containers.reduce((sum, c) => sum + (c.with_drivers_and_branches_quantity || 0), 0) - Math.round(containers.reduce((sum, c) => sum + (c.with_drivers_and_branches_quantity || 0), 0) * 0.35)}
            </div>
            <p className="text-[11px] erp-muted">سرافيس موزعة بـ 7 معارض</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">تالف / صيانة وغسيل</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-rose-500">
              {containers.reduce((sum, c) => sum + (c.damaged_quantity || 0) + (c.disputed_quantity || 0), 0)}
            </div>
            <p className="text-[11px] erp-muted">صناديق محتاجة تعقيم أو استبدال</p>
          </div>
        </div>

        {/* 2. كروت الأرصدة الإجمالية للأوعية (Containers Overview) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {containers.map((c) => (
            <div
              key={c.id}
              className={`p-5 rounded-2xl border shadow-sm space-y-3 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold truncate max-w-[170px]" title={c.container_name}>
                    {c.container_name}
                  </h3>
                  <span className="text-[11px] erp-muted">الرصيد الإجمالي بالمصنع</span>
                </div>
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-500 font-mono font-bold text-sm">
                  {c.total_factory_quantity}
                </span>
              </div>

              <div className="space-y-1.5 text-xs pt-1 border-t erp-card">
                <div className="flex justify-between">
                  <span className="erp-muted">في صالة الإنتاج والتجهيز:</span>
                  <span className="font-bold">{c.in_production_floor_quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="erp-muted">في مخزن التعبئة والتغليف:</span>
                  <span className="font-bold text-amber-500">{c.in_packaging_warehouse_quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="erp-muted">مع السائقين والمعارض:</span>
                  <span className="font-bold text-blue-400 font-mono">{c.with_drivers_and_branches_quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="erp-muted">عجز قيد النزاع / تالف:</span>
                  <span className="font-bold text-rose-500 font-mono">{c.disputed_quantity + c.damaged_quantity}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 3. شريط الإجراءات السريعة للميدان */}
        <div
          className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <h2 className="text-base font-bold">العمليات السريعة لحركات الصناديق والسرافيس</h2>
            <p className="text-xs erp-muted">تسجيل خروج شحنات محملة للمعارض أو استرجاع سرافيس فارغة للمصنع</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => openNewMovementModal('DISPATCH_BRANCH')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              صرف سرافيس محملة لفرع
            </button>

            <button
              type="button"
              onClick={() => openNewMovementModal('RETURN_EMPTY')}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              استرجاع سرافيس فارغة
            </button>
          </div>
        </div>

        {/* 4. تبويبات تصفية السجل وحقل البحث */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-3 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { id: 'ALL', label: 'كافة الحركات' },
              { id: 'DISPATCHED', label: 'في الطريق (مفتوحة)' },
              { id: 'RECEIVED', label: 'مستلمة ومطابقة' },
              { id: 'DISPUTED', label: 'عجز ونزاع معلق' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow'
                    : theme === 'dark'
                    ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-blue-500'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-blue-500'
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
              placeholder="بحث برقم الحركة أو اسم المعرض..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                theme === 'dark'
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-slate-50 border-slate-300 text-black'
              }`}
            />
          </div>
        </div>

        {/* 5. جدول حركات الصناديق الميدانية */}
        {isLoading ? (
          <div className="text-center py-20 erp-muted">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
            <p className="text-sm font-semibold">جارٍ استدعاء حركات الصناديق من السيرفر...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div
            className={`p-12 text-center rounded-2xl border ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <Boxes className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-50" />
            <h3 className="text-base font-bold">لا توجد حركات صناديق مسجلة مطابقة</h3>
            <p className="text-xs erp-muted mt-1">اضغط على أزرار الصرف أو الاسترجاع لبدء حركة جديدة</p>
          </div>
        ) : (
          <div
            className={`rounded-2xl border shadow-sm overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className={theme === 'dark' ? 'bg-slate-950/60 border-b border-slate-800' : 'bg-slate-100 border-b border-slate-200'}>
                    <th className="p-3.5 font-bold">رقم الإذن</th>
                    <th className="p-3.5 font-bold">نوع الحركة</th>
                    <th className="p-3.5 font-bold">نوع الصندوق</th>
                    <th className="p-3.5 font-bold">المنصرف</th>
                    <th className="p-3.5 font-bold">المستلم الفعلي</th>
                    <th className="p-3.5 font-bold">العجز والتالف</th>
                    <th className="p-3.5 font-bold">من جهة</th>
                    <th className="p-3.5 font-bold">إلى جهة</th>
                    <th className="p-3.5 font-bold">الحالة</th>
                    <th className="p-3.5 font-bold text-center">الإجراء الميداني</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredMovements.map((m) => {
                    const isDispatched = m.status === 'DISPATCHED';
                    const isReceived = m.status === 'RECEIVED';
                    const isDisputed = m.status === 'DISPUTED';

                    return (
                      <tr
                        key={m.id}
                        className={`transition ${
                          theme === 'dark' ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-3.5 font-mono font-bold text-blue-500">{m.movement_number}</td>
                        <td className="p-3.5 font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              m.movement_type.includes('DISPATCH')
                                ? 'bg-blue-500/10 text-blue-500'
                                : 'bg-emerald-500/10 text-emerald-500'
                            }`}
                          >
                            {m.movement_type.includes('DISPATCH') ? 'صرف محمل' : 'استرجاع فارغ'}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium">{m.container_name}</td>
                        <td className="p-3.5 font-mono font-bold text-slate-200">{m.dispatched_quantity}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-400">
                          {m.received_quantity !== null ? m.received_quantity : '-'}
                        </td>
                        <td className="p-3.5 font-mono font-bold">
                          {m.shortage_quantity > 0 || m.damaged_count > 0 ? (
                            <span className="text-rose-400 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              عجز {m.shortage_quantity} / تالف {m.damaged_count}
                            </span>
                          ) : (
                            <span className="text-emerald-500">0</span>
                          )}
                        </td>
                        <td className="p-3.5 erp-muted truncate max-w-[120px]">{m.source_location}</td>
                        <td className="p-3.5 font-medium truncate max-w-[120px]">{m.destination_location}</td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              isReceived
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                : isDisputed
                                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse'
                                : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            }`}
                          >
                            {isReceived ? '✓ مستلم ومطابق' : isDisputed ? '⚠️ عجز ونزاع' : '🚚 في الطريق'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          {isDispatched && (
                            <button
                              type="button"
                              onClick={() => openReceiveModal(m)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              تأكيد الاستلام
                            </button>
                          )}
                          {!isDispatched && (
                            <span className="text-xs text-slate-400 font-mono">
                              {new Date(m.created_at).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. مؤشرات عهدة الفروع بالألوان والتنبيه عند تجاوز الحد المسموح */}
        <div
          className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3 erp-card">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-base text-indigo-400">مؤشرات عهدة الصناديق بفروع ومعارض «أبو عادل»</h3>
            </div>
            <span className="text-xs erp-muted">
              مراقبة آنية لمنع تراكم السرافيس لدى المعارض وضمان سرعة التدوير
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(branchInventory.length > 0 ? branchInventory : [
              { id: '1', branchCode: 'BR-MANS-01', branchName: 'معرض المنصورة الرئيسي (حي الجامعة)', maxAllowed: 200, currentBalance: 165, status: 'NORMAL', overdueCount: 0 },
              { id: '2', branchCode: 'BR-DKR-01', branchName: 'معرض دكرنس المركزي', maxAllowed: 120, currentBalance: 128, status: 'EXCEEDED', overdueCount: 8 },
              { id: '3', branchCode: 'BR-MNSR-01', branchName: 'معرض منية النصر', maxAllowed: 100, currentBalance: 72, status: 'NORMAL', overdueCount: 0 },
              { id: '4', branchCode: 'BR-SHRB-01', branchName: 'معرض شربين', maxAllowed: 80, currentBalance: 75, status: 'WARNING', overdueCount: 0 },
              { id: '5', branchCode: 'BR-BLQ-01', branchName: 'معرض بلقاس', maxAllowed: 90, currentBalance: 54, status: 'NORMAL', overdueCount: 0 },
              { id: '6', branchCode: 'BR-ZGZ-01', branchName: 'معرض الزقازيق', maxAllowed: 150, currentBalance: 158, status: 'EXCEEDED', overdueCount: 8 },
              { id: '7', branchCode: 'BR-SNB-01', branchName: 'معرض السنبلاوين', maxAllowed: 80, currentBalance: 42, status: 'NORMAL', overdueCount: 0 },
            ]).map((b: any, idx: number) => {
              const isExceeded = b.status === 'EXCEEDED';
              const isWarning = b.status === 'WARNING';
              const percent = Math.min(100, Math.round((b.currentBalance / b.maxAllowed) * 100));

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    isExceeded
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 ring-2 ring-rose-500/20'
                      : isWarning
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : theme === 'dark'
                      ? 'bg-slate-950/60 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs truncate max-w-[170px]" title={b.branchName}>
                        {b.branchName}
                      </h4>
                      <span className="text-[10px] font-mono erp-muted">{b.branchCode}</span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isExceeded
                          ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isExceeded ? '⚠️ تجاوز الحد' : isWarning ? '⚡ اقترب من الحد' : '✓ طبيعي'}
                    </span>
                  </div>

                  {/* العداد والرصيد */}
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-xs erp-muted">العهدة الحالية:</span>
                    <span className="text-base font-bold font-mono">
                      {b.currentBalance}{' '}
                      <span className="text-[10px] font-normal text-slate-400">/ حد أقصى {b.maxAllowed}</span>
                    </span>
                  </div>

                  {/* شريط النسبة المئوية */}
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* زر طلب استرجاع سريع */}
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType('RETURN_EMPTY');
                      setSourceLocation(b.branchName);
                      setDestinationLocation('المصنع الرئيسي - غسيل وتعقيم السرافيس');
                      setQuantity(isExceeded ? b.overdueCount + 30 : 25);
                      setNotes(`استرجاع سرافيس فارغة لضبط عهدة ${b.branchName}`);
                      setShowModal(true);
                    }}
                    className={`w-full py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      isExceeded
                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow'
                        : theme === 'dark'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border border-slate-300'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    طلب استرجاع سرافيس فارغة
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7. نافذة صرف أو استرجاع صناديق جديدة */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-xl p-6 rounded-3xl border shadow-2xl space-y-5 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 erp-card">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-blue-500" />
                  {movementType === 'DISPATCH_BRANCH' ? 'إذن صرف سرافيس محملة لفرع' : 'إذن استرجاع سرافيس فارغة للمصنع'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={submitMovement} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1">نوع الصندوق أو الوعاء</label>
                  <select
                    value={selectedContainer}
                    onChange={(e) => setSelectedContainer(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  >
                    {containers.map((c) => (
                      <option key={c.id} value={c.container_name}>
                        {c.container_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* أزرار لمس سريعة للكمية */}
                <div>
                  <label className="block text-xs font-bold mb-1">الكمية المنقولة (مع أزرار اللمس السريعة)</label>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 50))}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-slate-800 text-rose-300 border-slate-700 hover:bg-slate-700 cursor-pointer"
                      >
                        -50
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 10))}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-slate-800 text-rose-300 border-slate-700 hover:bg-slate-700 cursor-pointer"
                      >
                        -10
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 10)}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-slate-800 text-emerald-300 border-slate-700 hover:bg-slate-700 cursor-pointer"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => q + 50)}
                        className="px-2.5 py-1.5 rounded-lg border text-xs font-bold bg-slate-800 text-emerald-300 border-slate-700 hover:bg-slate-700 cursor-pointer"
                      >
                        +50
                      </button>
                    </div>

                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className={`flex-1 min-w-[70px] p-2 rounded-xl border text-center font-bold font-mono text-base ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-blue-400' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">من جهة / مخزن</label>
                    <input
                      type="text"
                      value={sourceLocation}
                      onChange={(e) => setSourceLocation(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">إلى جهة / معرض</label>
                    <select
                      value={destinationLocation}
                      onChange={(e) => setDestinationLocation(e.target.value)}
                      className={`w-full p-2 rounded-xl border text-xs font-medium ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <option value="معرض المنصورة الرئيسي (حي الجامعة)">معرض المنصورة الرئيسي (حي الجامعة)</option>
                      <option value="معرض دكرنس المركزي">معرض دكرنس المركزي</option>
                      <option value="معرض منية النصر">معرض منية النصر</option>
                      <option value="معرض شربين">معرض شربين</option>
                      <option value="معرض بلقاس">معرض بلقاس</option>
                      <option value="معرض الزقازيق">معرض الزقازيق</option>
                      <option value="معرض السنبلاوين">معرض السنبلاوين</option>
                      <option value="المصنع الرئيسي - غسيل وتعقيم السرافيس">المصنع الرئيسي - غسيل وتعقيم السرافيس</option>
                      <option value="المصنع الرئيسي - صالة التعبئة والتغليف">المصنع الرئيسي - صالة التعبئة والتغليف</option>
                      <option value="سيارة التوزيع رقم 1 (أحمد عبد العزيز)">سيارة التوزيع رقم 1 (أحمد عبد العزيز)</option>
                      <option value="سيارة التوزيع رقم 2 (سامح الباز)">سيارة التوزيع رقم 2 (سامح الباز)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">المسؤول عن الصرف / السائق</label>
                  <input
                    type="text"
                    value={dispatchedByName}
                    onChange={(e) => setDispatchedByName(e.target.value)}
                    className={`w-full p-2 rounded-xl border text-xs ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">ملاحظات الإذن</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أي ملاحظات تخص حالة الصناديق..."
                    className={`w-full p-2 rounded-xl border text-xs ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t erp-card">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    قيد وتعميم الحركة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 8. نافذة تأكيد الاستلام الميداني وحصر العجز */}
        {selectedMovementForReceive && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className={`w-full max-w-md p-6 rounded-3xl border shadow-2xl space-y-4 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 erp-card">
                <div>
                  <h3 className="text-base font-bold">تأكيد استلام الصناديق</h3>
                  <p className="text-xs text-blue-400 font-mono">{selectedMovementForReceive.movement_number}</p>
                </div>
                <button
                  onClick={() => setSelectedMovementForReceive(null)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={confirmReceive} className="space-y-4">
                <div className="p-3 rounded-xl border erp-sub text-xs space-y-1">
                  <p>نوع الصندوق: <strong>{selectedMovementForReceive.container_name}</strong></p>
                  <p>الكمية المنصرفة بالإذن: <strong className="font-mono text-amber-400">{selectedMovementForReceive.dispatched_quantity}</strong></p>
                  <p>الجهة المرسلة: <strong>{selectedMovementForReceive.source_location}</strong></p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1">العدد المستلم الفعلي (سليم)</label>
                    <input
                      type="number"
                      min="0"
                      value={receivedQtyInput}
                      onChange={(e) => setReceivedQtyInput(Number(e.target.value))}
                      className={`w-full p-2 rounded-xl border text-center font-bold font-mono text-sm ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-emerald-400' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">العدد التالف / مكسور</label>
                    <input
                      type="number"
                      min="0"
                      value={damagedCountInput}
                      onChange={(e) => setDamagedCountInput(Number(e.target.value))}
                      className={`w-full p-2 rounded-xl border text-center font-bold font-mono text-sm ${
                        theme === 'dark' ? 'bg-slate-950 border-slate-700 text-rose-400' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {/* مؤشر العجز التلقائي */}
                {selectedMovementForReceive.dispatched_quantity - (receivedQtyInput + damagedCountInput) > 0 && (
                  <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      تنبيه: سيتم تسجيل عجز مقداره (
                      {selectedMovementForReceive.dispatched_quantity - (receivedQtyInput + damagedCountInput)}) صندوق وقيده للتحقيق!
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold mb-1">ملاحظات الاستلام</label>
                  <input
                    type="text"
                    value={receiveNotesInput}
                    onChange={(e) => setReceiveNotesInput(e.target.value)}
                    placeholder="ملاحظات مشرف المعرض عند الاستلام..."
                    className={`w-full p-2 rounded-xl border text-xs ${
                      theme === 'dark' ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t erp-card">
                  <button
                    type="button"
                    onClick={() => setSelectedMovementForReceive(null)}
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
                    اعتماد الاستلام
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
