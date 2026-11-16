'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Wrench,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  User,
  Building,
  Radio,
  FileSpreadsheet,
  RefreshCw,
  Flame,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import EngineeringHeader from '../components/EngineeringHeader';

interface MaintenanceTicket {
  id: string;
  ticket_number: string;
  title: string;
  description?: string;
  source_type: string;
  priority: string;
  status: string;
  current_step_index: number;
  current_step_name?: string;
  steps_progress_json?: any[];
  sla_minutes: number;
  sla_deadline?: string;
  downtime_minutes: number;
  total_cost: number;
  requires_qa_clearance: boolean;
  qa_cleared_at?: string;
  qa_cleared_by_name?: string;
  assigned_staff_name?: string;
  created_at: string;
  engineering_assets?: {
    id: string;
    asset_code: string;
    name: string;
    category: string;
  };
  engineering_workshops?: {
    id: string;
    name: string;
    code: string;
  };
  maintenance_workflow_routes?: {
    id: string;
    name: string;
    steps_json: any[];
  };
}

interface Workshop {
  id: string;
  name: string;
  code: string;
  specialtyType: string;
}

interface Asset {
  id: string;
  name: string;
  asset_code: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function MaintenanceTicketsPage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [workshopFilter, setWorkshopFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Metrics
  const [metrics, setMetrics] = useState({
    totalDowntimeMinutes: 0,
    totalDowntimeHours: 0,
    emergencyCount: 0,
    pendingQaCount: 0,
    openCount: 0,
    availabilityRate: 98.5,
    totalTickets: 0,
  });

  // Modal: New Ticket
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSource, setNewSource] = useState('EMERGENCY_BREAKDOWN');
  const [newPriority, setNewPriority] = useState('HIGH');
  const [newWorkshopId, setNewWorkshopId] = useState('');
  const [newAssetId, setNewAssetId] = useState('');
  const [newSla, setNewSla] = useState(45);
  const [newRequiresQa, setNewRequiresQa] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Modal: Add Dynamic Workflow Route
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeWorkshopId, setRouteWorkshopId] = useState('');
  const [routeSla, setRouteSla] = useState(60);
  const [routeSteps, setRouteSteps] = useState([
    { step: 1, name: 'فحص أولي وتحديد العطل', role: 'TECHNICIAN' },
    { step: 2, name: 'طلب وصرف قطع الغيار والخامات', role: 'ENGINEER' },
    { step: 3, name: 'التنفيذ والإصلاح الهندسي', role: 'TECHNICIAN' },
    { step: 4, name: 'اعتماد سلامة الغذاء (QMS)', role: 'QA_INSPECTOR' },
    { step: 5, name: 'إغلاق البلاغ والتشغيل الفعلي', role: 'SUPERVISOR' },
  ]);
  const [creatingRoute, setCreatingRoute] = useState(false);

  // Modal: QA Sign-off
  const [selectedQaTicket, setSelectedQaTicket] = useState<MaintenanceTicket | null>(null);
  const [qaInspectorName, setQaInspectorName] = useState('د. حسام الجوهري (مفتش سلامة الغذاء)');
  const [signingQa, setSigningQa] = useState(false);

  // Modal: Close Ticket
  const [closingTicket, setClosingTicket] = useState<MaintenanceTicket | null>(null);
  const [closeDowntime, setCloseDowntime] = useState(30);
  const [closeNotes, setCloseNotes] = useState('');
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, workshopsRes, assetsRes, metricsRes] = await Promise.all([
        axios.get(`${API_BASE}/engineering/tickets`),
        axios.get(`${API_BASE}/engineering/workshops`),
        axios.get(`${API_BASE}/engineering/assets`),
        axios.get(`${API_BASE}/engineering/metrics/downtime-oee`),
      ]);

      if (ticketsRes.data?.success) setTickets(ticketsRes.data.data);
      if (workshopsRes.data?.success) setWorkshops(workshopsRes.data.data);
      if (assetsRes.data?.success) setAssets(assetsRes.data.data);
      if (metricsRes.data?.success) setMetrics(metricsRes.data.data);
    } catch (err) {
      console.error('Failed to load tickets data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setCreatingTicket(true);
    try {
      const res = await axios.post(`${API_BASE}/engineering/tickets`, {
        title: newTitle,
        description: newDesc,
        sourceType: newSource,
        priority: newPriority,
        workshopId: newWorkshopId || undefined,
        assetId: newAssetId || undefined,
        slaMinutes: Number(newSla),
        requiresQaClearance: newRequiresQa,
      });

      if (res.data?.success) {
        setShowNewModal(false);
        setNewTitle('');
        setNewDesc('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر إنشاء البلاغ');
    } finally {
      setCreatingTicket(false);
    }
  };

  // Create Dynamic Workflow Route
  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim() || !routeWorkshopId) return;

    setCreatingRoute(true);
    try {
      const res = await axios.post(`${API_BASE}/engineering/workshops/routes`, {
        workshopId: routeWorkshopId,
        name: routeName,
        slaMinutes: Number(routeSla),
        stepsJson: routeSteps,
        type: 'MAINTENANCE',
      });

      if (res.data?.success) {
        setShowRouteModal(false);
        setRouteName('');
        alert('تم حفظ مسار الصيانة الديناميكي بنجاح');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر حفظ المسار');
    } finally {
      setCreatingRoute(false);
    }
  };

  // Advance Step
  const handleAdvanceStep = async (ticket: MaintenanceTicket) => {
    const nextIndex = ticket.current_step_index + 1;
    const defaultSteps = [
      'فحص أولي وتحديد العطل',
      'صرف قطع الغيار والخامات',
      'التنفيذ والإصلاح الهندسي',
      'اعتماد سلامة الغذاء (QMS)',
      'إغلاق البلاغ والتشغيل',
    ];
    const nextName = defaultSteps[nextIndex] || `مرحلة ${nextIndex + 1}`;

    try {
      const res = await axios.patch(`${API_BASE}/engineering/tickets/${ticket.id}/advance`, {
        stepIndex: nextIndex,
        stepName: nextName,
      });
      if (res.data?.success) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر ترقية خطوة المسار');
    }
  };

  // QA Sign-off
  const handleQaSignoff = async () => {
    if (!selectedQaTicket || !qaInspectorName.trim()) return;

    setSigningQa(true);
    try {
      const res = await axios.patch(
        `${API_BASE}/engineering/tickets/${selectedQaTicket.id}/qa-clearance`,
        { qaClearedByName: qaInspectorName }
      );
      if (res.data?.success) {
        setSelectedQaTicket(null);
        alert('تم اعتماد سلامة الغذاء بنجاح');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر اعتماد الجودة');
    } finally {
      setSigningQa(false);
    }
  };

  // Close Ticket
  const handleCloseTicket = async () => {
    if (!closingTicket) return;

    setClosing(true);
    try {
      const res = await axios.patch(`${API_BASE}/engineering/tickets/${closingTicket.id}/close`, {
        downtimeMinutes: Number(closeDowntime),
        closureNotes: closeNotes,
      });
      if (res.data?.success) {
        setClosingTicket(null);
        setCloseNotes('');
        alert('تم إغلاق أمر الصيانة بنجاح');
        fetchData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'تعذر إغلاق البلاغ');
    } finally {
      setClosing(false);
    }
  };

  // Excel Export preparation
  const exportRows = tickets.map((t) => ({
    'رقم البلاغ': t.ticket_number,
    'عنوان البلاغ': t.title,
    'المصدر': t.source_type,
    'الأولوية': t.priority,
    'الورشة': t.engineering_workshops?.name || 'عام',
    'الأصل': t.engineering_assets?.name || 'غير محدد',
    'الحالة': t.status,
    'المرحلة': t.current_step_name,
    'دقائق التوقف': t.downtime_minutes,
    'سلامة الغذاء': t.qa_cleared_at ? 'معتمد' : t.requires_qa_clearance ? 'بانتظار الاعتماد' : 'غير مطلوب',
  }));

  // Filtering
  const filteredTickets = tickets.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesWorkshop = workshopFilter === 'ALL' || t.engineering_workshops?.id === workshopFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    const matchesSearch =
      !searchQuery ||
      t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.engineering_assets?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesWorkshop && matchesPriority && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12" dir="rtl">
      {/* 1. Universal Enterprise Header with Excel buttons */}
      <EngineeringHeader
        title="مركز قيادة الصيانة والمهام الطارئة (CMMS & Unified Emergency)"
        subtitle="توحيد بلاغات الطوارئ، التوجيه الآلي للورش، ومؤقتات SLA، مع قفل سلامة الغذاء الإلزامي"
        entityName="tickets"
        exportData={exportRows}
        exportFileName="تذاكر_الصيانة_والطوارئ.xlsx"
        onImportSuccess={fetchData}
        secondaryAction={{
          label: 'إضافة مسار صيانة ديناميكي',
          onClick: () => setShowRouteModal(true),
          icon: Sparkles,
        }}
        primaryAction={{
          label: 'تسجيل بلاغ / مهمة طارئة',
          onClick: () => setShowNewModal(true),
          icon: Plus,
        }}
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
        {/* 2. Top Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/80 border border-red-900/40 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-red-600/20 text-red-400 rounded-xl">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">أعطال طارئة حرجة</span>
              <span className="text-lg font-black text-red-400 font-mono">{metrics.emergencyCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-900/40 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">مهام جارية التنفيذ</span>
              <span className="text-lg font-black text-amber-400 font-mono">{metrics.openCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-teal-900/40 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">بانتظار اعتماد الجودة QMS</span>
              <span className="text-lg font-black text-teal-400 font-mono">{metrics.pendingQaCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">إجمالي التوقف (Downtime)</span>
              <span className="text-lg font-black text-white font-mono">{metrics.totalDowntimeHours} س</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-900/40 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">جاهزية المعدات (OEE)</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{metrics.availabilityRate}%</span>
            </div>
          </div>
        </div>

        {/* 3. Filter Bar */}
        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-300">الورشة:</span>
            <select
              value={workshopFilter}
              onChange={(e) => setWorkshopFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white outline-none"
            >
              <option value="ALL">كافة الورش</option>
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <span className="font-semibold text-slate-300 mr-2">الحالة:</span>
            <div className="flex items-center gap-1">
              {[
                { k: 'ALL', l: 'الكل' },
                { k: 'PENDING', l: 'جديد' },
                { k: 'IN_PROGRESS', l: 'قيد التنفيذ' },
                { k: 'PENDING_QA_CLEARANCE', l: 'قفل الجودة QMS' },
                { k: 'COMPLETED', l: 'مكتمل' },
              ].map((s) => (
                <button
                  key={s.k}
                  onClick={() => setStatusFilter(s.k)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    statusFilter === s.k
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-72">
            <input
              type="text"
              placeholder="بحث برقم البلاغ، اسم الماكينة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2" />
          </div>
        </div>

        {/* 4. Tickets Cards List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-xs">جاري تحميل مركز عمليات الصيانة...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
              لا توجد بلاغات تطابق شروط التصفية
            </div>
          ) : (
            filteredTickets.map((t) => {
              const isCritical = t.priority === 'CRITICAL';
              const isPendingQa = t.status === 'PENDING_QA_CLEARANCE';
              const isCompleted = t.status === 'COMPLETED';

              return (
                <div
                  key={t.id}
                  className={`bg-slate-900/80 hover:bg-slate-900 border rounded-2xl p-4 transition shadow-sm space-y-3 ${
                    isPendingQa
                      ? 'border-teal-500/50 bg-teal-950/10'
                      : isCritical
                      ? 'border-red-900/50'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-amber-400">{t.ticket_number}</span>
                        <h3 className="font-bold text-white text-sm">{t.title}</h3>

                        {/* Priority Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isCritical
                              ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {t.priority}
                        </span>

                        {/* Source Badge */}
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                          {t.source_type}
                        </span>

                        {/* QA Food Safety Lock Badge */}
                        {t.requires_qa_clearance && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              t.qa_cleared_at
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                            }`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {t.qa_cleared_at ? `معتمد سلامة غذاء (${t.qa_cleared_by_name})` : 'قفل سلامة الغذاء (QMS)'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>
                          الورشة: <strong className="text-slate-200">{t.engineering_workshops?.name || 'عام'}</strong>
                        </span>
                        {t.engineering_assets && (
                          <span>
                            الأصل: <strong className="text-indigo-400">{t.engineering_assets.name} [{t.engineering_assets.asset_code}]</strong>
                          </span>
                        )}
                        <span>
                          المكلف: <strong className="text-slate-200">{t.assigned_staff_name || 'لم يحدد'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!isCompleted && !isPendingQa && (
                        <button
                          onClick={() => handleAdvanceStep(t)}
                          className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          التقدم للخطوة التالية
                        </button>
                      )}

                      {isPendingQa && (
                        <button
                          onClick={() => setSelectedQaTicket(t)}
                          className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          توقيع سلامة الغذاء (QA Sign-off)
                        </button>
                      )}

                      {!isCompleted && (
                        <button
                          onClick={() => setClosingTicket(t)}
                          className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          إغلاق البلاغ
                        </button>
                      )}

                      {isCompleted && (
                        <span className="text-xs text-emerald-400 font-bold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مكتمل ومغلق ({t.downtime_minutes} د توقف)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Step Progress Tracker */}
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">المرحلة الحالية:</span>
                      <span className="font-bold text-amber-300">{t.current_step_name || 'قيد المعاينة'}</span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400">
                      <span>المهلة (SLA): <strong className="text-slate-200 font-mono">{t.sla_minutes} دقيقة</strong></span>
                      <span>التكلفة التراكمية: <strong className="text-amber-400 font-mono font-bold">{t.total_cost} ج.م</strong></span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: Register Maintenance / Emergency Ticket */}
      {/* ======================================================== */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                تسجيل بلاغ صيانة أو مهمة طارئة جديدة
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-500 hover:text-white text-xs">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">عنوان العطل / البلاغ:</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="عطل محرك سير العجين الرئيسي، تسريب فريون ثلاجة المعرض..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الورشة المختصة:</label>
                  <select
                    value={newWorkshopId}
                    onChange={(e) => setNewWorkshopId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none"
                  >
                    <option value="">توجيه تلقائي ذكي</option>
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الماكينة / الأصل المرتبط:</label>
                  <select
                    value={newAssetId}
                    onChange={(e) => setNewAssetId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none"
                  >
                    <option value="">اختر الأصل...</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} [{a.asset_code}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">مصدر البلاغ:</label>
                  <select
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none"
                  >
                    <option value="EMERGENCY_BREAKDOWN">عطل طارئ وتوقف خط</option>
                    <option value="PREVENTIVE_PM">صيانة وقائية دورية</option>
                    <option value="QMS_NCR">ملاحظة جودة QMS</option>
                    <option value="BRANCH_REQUEST">طلب صيانة معرض</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">درجة الأهمية:</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none"
                  >
                    <option value="NORMAL">عادية (NORMAL)</option>
                    <option value="HIGH">عالية (HIGH)</option>
                    <option value="CRITICAL">حرجة جداً (CRITICAL)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">المهلة (SLA دقائق):</label>
                  <input
                    type="number"
                    value={newSla}
                    onChange={(e) => setNewSla(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none font-mono"
                  />
                </div>
              </div>

              {/* Food Safety Lock Checkbox */}
              <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="qaCheck"
                  checked={newRequiresQa}
                  onChange={(e) => setNewRequiresQa(e.target.checked)}
                  className="w-4 h-4 accent-teal-500 rounded"
                />
                <label htmlFor="qaCheck" className="text-teal-300 text-xs cursor-pointer font-bold">
                  تفعيل قفل سلامة الغذاء (QMS Food Safety Lock) - يمنع تشغيل الماكينة وإغلاق البلاغ إلا بعد توقيع مفتش الجودة.
                </label>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">وصف العطل والأعراض الملاحظة:</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="صوت غير طبيعي، ارتفاع حرارة الموتور، كسر بالمفصلات..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-xl"
                >
                  {creatingTicket ? 'جاري الفتح...' : 'تأكيد وفتح البلاغ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Add Dynamic Maintenance Workflow Route */}
      {/* ======================================================== */}
      {showRouteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                بناء مسار صيانة ديناميكي جديد (Workflow Builder)
              </h3>
              <button onClick={() => setShowRouteModal(false)} className="text-slate-500 hover:text-white text-xs">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">اسم المسار:</label>
                  <input
                    type="text"
                    required
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                    placeholder="مسار صيانة خطوط أفران الدوار..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الورشة التابع لها:</label>
                  <select
                    required
                    value={routeWorkshopId}
                    onChange={(e) => setRouteWorkshopId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="">اختر الورشة...</option>
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-semibold">خطوات ومراحل المسار التتابعية:</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {routeSteps.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                        {s.step}
                      </span>
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => {
                          const next = [...routeSteps];
                          next[idx].name = e.target.value;
                          setRouteSteps(next);
                        }}
                        className="flex-1 bg-transparent text-white text-xs outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">{s.role}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRouteModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingRoute}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                >
                  {creatingRoute ? 'جاري الحفظ...' : 'حفظ مسار الصيانة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: QA Food Safety Sign-off */}
      {/* ======================================================== */}
      {selectedQaTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-teal-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-teal-500/20 text-teal-400 mx-auto flex items-center justify-center border border-teal-500/30">
              <ShieldCheck className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-white text-sm">اعتماد سلامة الغذاء (QMS Food Safety Sign-off)</h3>
              <p className="text-xs text-slate-400 mt-1">
                تأكيد خلو منطقة الإصلاح من الشظايا أو تسريب الزيوت الغذائية، والتأكد من مطابقة شروط الهاسب (HACCP) لخطوط الإنتاج.
              </p>
            </div>

            <div className="text-right text-xs space-y-2">
              <label className="text-slate-300 block">اسم مفتش / طبيب الجودة المعتمد:</label>
              <input
                type="text"
                value={qaInspectorName}
                onChange={(e) => setQaInspectorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedQaTicket(null)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                تراجع
              </button>
              <button
                onClick={handleQaSignoff}
                disabled={signingQa}
                className="flex-1 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                {signingQa ? 'جاري الاعتماد...' : 'توقيع وفك القفل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Close Ticket */}
      {/* ======================================================== */}
      {closingTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                إغلاق أمر الصيانة ({closingTicket.ticket_number})
              </h3>
              <button onClick={() => setClosingTicket(null)} className="text-slate-500 hover:text-white text-xs">
                إلغاء
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">زمن التوقف الفعلي للأصل (دقائق Downtime):</label>
                <input
                  type="number"
                  value={closeDowntime}
                  onChange={(e) => setCloseDowntime(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">تقرير إغلاق الفني وملاحظات الإصلاح:</label>
                <textarea
                  rows={3}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="تم تغيير الجلبة وضبط التروس واختبار الماكينة تحت الحمل..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setClosingTicket(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleCloseTicket}
                  disabled={closing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                >
                  {closing ? 'جاري الإغلاق...' : 'تأكيد إغلاق البلاغ وتشغيل الأصل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
