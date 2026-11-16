'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import UnifiedWorkOrderModal from '../../components/UnifiedWorkOrderModal';
import {
  Factory,
  Play,
  CheckCircle,
  AlertTriangle,
  Flame,
  Clock,
  Plus,
  RefreshCw,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  X,
  CheckCircle2,
  AlertOctagon,
  Wrench,
  Thermometer,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ShopFloorPage() {
  const { socket, isConnected } = useSocket();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [oeeStats, setOeeStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('IN_PROGRESS');

  // Modals
  const [scrapModalOrder, setScrapModalOrder] = useState<any | null>(null);
  const [scrapQty, setScrapQty] = useState<number>(1);
  const [scrapCategory, setScrapCategory] = useState<string>('MATERIAL');
  const [scrapReason, setScrapReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // New Work Order Modal
  const [showNewOrderModal, setShowNewOrderModal] = useState<boolean>(false);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [warehousesList, setWarehousesList] = useState<any[]>([]);
  const [newOrderForm, setNewOrderForm] = useState({
    workOrderNumber: '',
    batchId: '',
    itemId: '',
    warehouseId: '',
    targetQuantity: 100,
    priority: 'HIGH',
    notes: 'تشغيلة صالة حلواني أبو عادل اليومية',
  });

  useEffect(() => {
    if (!newOrderForm.workOrderNumber) {
      const code = Math.floor(Math.random() * 90000 + 10000);
      setNewOrderForm((prev) => ({
        ...prev,
        workOrderNumber: `WO-${code}`,
        batchId: `BATCH-PROD-${code}`,
      }));
    }
  }, [newOrderForm.workOrderNumber]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersRes, oeeRes, itemsRes, whRes] = await Promise.all([
        fetch(`${API_BASE}/mes/work-orders?status=${activeFilter}`).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/mes/oee-stats`).then((r) => r.json()).catch(() => null),
        fetch(`${API_BASE}/inventory/items`).then((r) => r.json()).catch(() => ({ data: [] })),
        fetch(`${API_BASE}/inventory/warehouses`).then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      setWorkOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setOeeStats(oeeRes);
      setItemsList(itemsRes.data || []);
      setWarehousesList(whRes.data || []);
      if (!newOrderForm.itemId && itemsRes.data?.[0]) {
        setNewOrderForm((prev) => ({ ...prev, itemId: itemsRes.data[0].id }));
      }
      if (!newOrderForm.warehouseId && whRes.data?.[0]) {
        setNewOrderForm((prev) => ({ ...prev, warehouseId: whRes.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching shop floor data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time events
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchData();
    socket.on('work_order_created', handleUpdate);
    socket.on('routing_step_started', handleUpdate);
    socket.on('routing_step_completed', handleUpdate);
    socket.on('scrap_logged', handleUpdate);
    socket.on('work_order_completed', handleUpdate);

    return () => {
      socket.off('work_order_created', handleUpdate);
      socket.off('routing_step_started', handleUpdate);
      socket.off('routing_step_completed', handleUpdate);
      socket.off('scrap_logged', handleUpdate);
      socket.off('work_order_completed', handleUpdate);
    };
  }, [socket, fetchData]);

  // Actions
  const handleStartStep = async (workOrderId: string, stepId: string) => {
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/mes/work-orders/${workOrderId}/step/${stepId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorName: 'مشغل صالة الحلواني' }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteStep = async (workOrderId: string, stepId: string, defaultQty: number) => {
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/mes/work-orders/${workOrderId}/step/${stepId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputQuantity: defaultQty }),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogScrap = async () => {
    if (!scrapModalOrder) return;
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/mes/work-orders/${scrapModalOrder.id}/scrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: scrapModalOrder.item_id,
          quantity: scrapQty,
          scrapReasonCategory: scrapCategory,
          scrapReasonDetail: scrapReason || 'هالك مرحلي طبيعي أثناء التشغيل',
        }),
      });
      setScrapModalOrder(null);
      setScrapReason('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/mes/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrderForm),
      });
      setShowNewOrderModal(false);
      setNewOrderForm({
        workOrderNumber: `WO-${Date.now().toString().slice(-5)}`,
        batchId: `BATCH-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 900 + 100)}`,
        itemId: itemsList[0]?.id || '',
        warehouseId: warehousesList[0]?.id || '',
        targetQuantity: 100,
        priority: 'HIGH',
        notes: 'تشغيلة صالة حلواني أبو عادل اليومية',
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen px-3 py-3 md:px-5 space-y-3 erp-container-fluid">
      {/* Header & Line Telemetry */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Factory className="w-5 h-5" />
            </span>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
              صالة التصنيع الرقمية وخطوط الإنتاج (Shop Floor MES)
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              مصانع وحلواني أبو عادل
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            التحكم الصناعي اللحظي في مسارات العجن، الخبيز، التبريد، والتغليف مع رصد الهوالك ومعايير OEE
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="erp-btn-compact px-3 py-1.5 rounded-lg border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={() => setShowNewOrderModal(true)}
            className="erp-btn-compact px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 text-xs font-bold shadow-md"
          >
            <Plus className="w-4 h-4" />
            إصدار أمر تشغيل (Work Order)
          </button>
        </div>
      </div>

      {/* Industrial OEE Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">مؤشر الكفاءة التشغيلية (OEE)</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {oeeStats?.oeeScore || 91}%
            </div>
            <div className="text-[10px] text-emerald-400">كفاءة معتمدة دولياً</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">الجاهزية (Availability)</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {oeeStats?.availabilityRate || 95}%
            </div>
            <div className="text-[10px] text-slate-400">توقف ماكينات 5%</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">الأداء (Performance)</div>
            <div className="text-xl font-black text-cyan-400 mt-0.5">
              {oeeStats?.performanceRate || 93}%
            </div>
            <div className="text-[10px] text-slate-400">سرعة خطوط العجن والخبيز</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">الجودة (Quality Rate)</div>
            <div className="text-xl font-black text-blue-400 mt-0.5">
              {oeeStats?.qualityRate || 97}%
            </div>
            <div className="text-[10px] text-emerald-400">مطابقة المواصفات القياسية</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between col-span-2 md:col-span-1">
          <div>
            <div className="text-[11px] font-bold text-slate-400">إجمالي الهالك (Scrap)</div>
            <div className="text-xl font-black text-rose-400 mt-0.5">
              {oeeStats?.totalScrap || 0} كجم
            </div>
            <div className="text-[10px] text-rose-300">هالك عجين وخبيز</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {[
          { id: 'IN_PROGRESS', label: 'قيد التشغيل اللحظي بالصالة' },
          { id: 'PLANNED', label: 'المخططة والمعتمدة' },
          { id: 'COMPLETED', label: 'التشغيلات المكتملة' },
          { id: 'ALL', label: 'كافة أوامر التشغيل' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              activeFilter === tab.id
                ? 'bg-amber-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Work Orders Shop Floor Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">جاري تحميل بيانات خطوط الإنتاج والتشغيل اللحظية...</div>
      ) : workOrders.length === 0 ? (
        <div className="p-8 text-center bg-slate-900/40 rounded-xl border border-white/10 space-y-2">
          <Factory className="w-10 h-10 text-slate-500 mx-auto" />
          <div className="text-sm font-bold text-slate-300">لا توجد أوامر تشغيل في هذا التبويب حالياً</div>
          <p className="text-xs text-slate-500">يمكنك إصدار أمر تشغيل جديد عبر زر &quot;إصدار أمر تشغيل&quot; أعلاه</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workOrders.map((order) => (
            <div
              key={order.id}
              className="erp-card p-3 rounded-xl border border-white/10 bg-slate-900/90 shadow-md space-y-2.5"
            >
              {/* Order Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black">
                    {order.work_order_number}
                  </span>
                  <span className="text-sm font-black text-white">{order.itemName}</span>
                  <span className="text-[11px] text-slate-400">({order.itemCode})</span>
                  <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    تشغيلة: {order.batch_id}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs">
                    <span className="text-slate-400 font-semibold">المستهدف: </span>
                    <span className="font-black text-white">{Number(order.target_quantity)} {order.unit}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-400 font-semibold">المنجز: </span>
                    <span className="font-black text-emerald-400">{Number(order.produced_quantity)} {order.unit}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-slate-400 font-semibold">الهالك: </span>
                    <span className="font-black text-rose-400">{order.totalScrap} {order.unit}</span>
                  </div>
                  <button
                    onClick={() => setScrapModalOrder(order)}
                    className="erp-btn-compact px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[11px] font-bold flex items-center gap-1 transition"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    تسجيل هالك
                  </button>
                </div>
              </div>

              {/* Routing Steps Interactive Strip (Large Industrial Touch Buttons) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                {order.routing_steps?.map((step: any) => {
                  const isRunning = step.status === 'RUNNING';
                  const isDone = step.status === 'COMPLETED';

                  return (
                    <div
                      key={step.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        isRunning
                          ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-500/10'
                          : isDone
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-slate-800/40 border-white/5 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-white text-[11px]">{step.step_name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            isRunning
                              ? 'bg-amber-500 text-black animate-pulse'
                              : isDone
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isRunning ? 'قيد التنفيذ' : isDone ? 'مكتملة' : 'انتظار'}
                        </span>
                      </div>

                      {/* Touch Action Buttons */}
                      <div className="flex items-center gap-1.5 mt-2">
                        {!isDone && !isRunning && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleStartStep(order.id, step.id)}
                            className="w-full py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow"
                          >
                            <Play className="w-3.5 h-3.5" />
                            بدء المرحلة
                          </button>
                        )}
                        {isRunning && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleCompleteStep(order.id, step.id, Number(order.target_quantity))}
                            className="w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow animate-bounce"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            إنهاء وتسليم
                          </button>
                        )}
                        {isDone && (
                          <div className="w-full py-1 text-center text-[10px] text-emerald-400 font-bold bg-emerald-500/10 rounded border border-emerald-500/20">
                            تمت بنجاح ({step.actual_minutes || 60} دقيقة)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${order.progressPct || 25}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Log Scrap */}
      {scrapModalOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                <AlertOctagon className="w-5 h-5" />
                تسجيل هالك صناعي (Waste / Scrap)
              </div>
              <button onClick={() => setScrapModalOrder(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              أمر التشغيل: <span className="font-bold text-white">{scrapModalOrder.work_order_number}</span> - {scrapModalOrder.itemName}
            </div>

            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">الكمية الهالكة ({scrapModalOrder.unit})</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={scrapQty}
                  onChange={(e) => setScrapQty(parseFloat(e.target.value) || 0)}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">تصنيف سبب الهدر</label>
                <select
                  value={scrapCategory}
                  onChange={(e) => setScrapCategory(e.target.value)}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3 text-xs"
                >
                  <option value="MATERIAL">عيوب خامات ومواد أولية (دقيق/سمن/سكر)</option>
                  <option value="MACHINE">عطل أو اضطراب ماكينة أو أفران</option>
                  <option value="HUMAN">خطأ تشغيلي أو بشري</option>
                  <option value="ENVIRONMENTAL">ظروف بيئية وحرارة</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">ملاحظات وسبب الهدر بالتفصيل</label>
                <textarea
                  value={scrapReason}
                  onChange={(e) => setScrapReason(e.target.value)}
                  placeholder="اكتب التوصيف الفني لسبب الفاقد..."
                  className="w-full rounded-lg bg-slate-800 border border-white/10 text-white p-2 text-xs h-20"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => setScrapModalOrder(null)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-slate-800 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                disabled={actionLoading}
                onClick={handleLogScrap}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow"
              >
                تأكيد وقيد الهالك
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Work Order Modal - توحيد أمر التشغيل الصناعي */}
      <UnifiedWorkOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
