'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  AlertTriangle,
  Search,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Clock,
  Printer,
  RotateCw,
  Play,
  CheckSquare,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  X,
  Loader2,
  ShieldAlert,
  Flame,
  UserCheck,
} from 'lucide-react';

interface EmergencyTask {
  id: string;
  taskNumber: string;
  title: string;
  description: string;
  senderDepartment: string;
  senderEmployeeName: string;
  targetDepartment: string;
  assignedTechnicianName?: string | null;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'CLOSED';
  createdAt: string;
  targetResolutionMinutes: number;
  respondedAt?: string | null;
  assetCode?: string;
}

export default function EmergencyTasksPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [tasks, setTasks] = useState<EmergencyTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // مودالات
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDelegateModal, setShowDelegateModal] = useState<boolean>(false);
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<EmergencyTask | null>(null);

  // فورم بلاغ جديد
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newSenderDept, setNewSenderDept] = useState<string>('صالة الحلويات الشرقية');
  const [newPriority, setNewPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'>('CRITICAL');
  const [newAssetCode, setNewAssetCode] = useState<string>('AST-1001');
  const [newSlaMinutes, setNewSlaMinutes] = useState<number>(30);

  // تكليف فني
  const [technicianName, setTechnicianName] = useState<string>('فني أول عبد الله بدوي');

  // إغلاق البلاغ
  const [closureNotes, setClosureNotes] = useState<string>('');
  const [sparePartsUsed, setSparePartsUsed] = useState<string>('');
  const [downtimeMinutes, setDowntimeMinutes] = useState<number>(20);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadTasks();

    if (socket) {
      socket.on('emergency_task_created', (data) => {
        setFeedback({ msg: `🚨 بلاغ عطل طارئ جديد: [${data.taskNumber}] ${data.title}`, success: false });
        loadTasks();
      });

      socket.on('emergency_task_updated', () => loadTasks());
      socket.on('emergency_task_resolved', () => loadTasks());

      return () => {
        socket.off('emergency_task_created');
        socket.off('emergency_task_updated');
        socket.off('emergency_task_resolved');
      };
    }
  }, [socket]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/emergency-tasks');
      if (res.data?.success && res.data.data) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch emergency tasks', err);
    } finally {
      setLoading(false);
    }
  };

  // إحصائيات علوية
  const kpis = useMemo(() => {
    const total = tasks.length;
    const critical = tasks.filter((t) => t.priority === 'CRITICAL' && t.status !== 'CLOSED').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const closed = tasks.filter((t) => t.status === 'CLOSED').length;
    return { total, critical, inProgress, closed };
  }, [tasks]);

  // تصفية البلاغات
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const s = searchTerm.toLowerCase().trim();
      const matchesSearch =
        s === '' ||
        t.taskNumber.toLowerCase().includes(s) ||
        t.title.toLowerCase().includes(s) ||
        t.senderDepartment.toLowerCase().includes(s) ||
        (t.assetCode && t.assetCode.toLowerCase().includes(s));
      return matchesPriority && matchesStatus && matchesSearch;
    });
  }, [tasks, priorityFilter, statusFilter, searchTerm]);

  // إطلاق بلاغ طارئ جديد
  const handleCreateEmergencyTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:3000/emergency-tasks', {
        title: newTitle.trim(),
        description: newDescription.trim(),
        senderDepartment: newSenderDept,
        priority: newPriority,
        assetCode: newAssetCode.trim(),
        targetResolutionMinutes: newSlaMinutes,
      });

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setShowCreateModal(false);
        setNewTitle('');
        setNewDescription('');
        loadTasks();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إطلاق البلاغ', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تكليف فني
  const handleDelegateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      const res = await axios.post(`http://localhost:3000/emergency-tasks/${selectedTask.id}/delegate`, {
        technicianName,
      });
      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setShowDelegateModal(false);
        loadTasks();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تكليف الفني', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تسجيل بدء الاستجابة الميدانية
  const handleRespond = async (task: EmergencyTask) => {
    try {
      const res = await axios.post(`http://localhost:3000/emergency-tasks/${task.id}/respond`);
      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        loadTasks();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تسجيل الاستجابة', success: false });
    }
  };

  // إغلاق البلاغ واستعادة تشغيل الماكينة
  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      const res = await axios.post(`http://localhost:3000/emergency-tasks/${selectedTask.id}/complete`, {
        closureNotes,
        sparePartsUsed,
        downtimeMinutes,
      });
      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setShowCompleteModal(false);
        loadTasks();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إغلاق البلاغ', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-200" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* الترويسة */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-200 print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer">
              <ArrowRight className="w-5 h-5 text-indigo-600" />
            </Link>
            <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">غرفة بلاغات الطوارئ والأعطال (SOS & SLA)</h1>
              <p className="text-xs erp-muted">
                مصانع وحلواني أبو عادل | الاستجابة السريعة لأعطال الماكينات وخطوط الإنتاج وتتبع زمن التوقف
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>إطلاق بلاغ طارئ (SOS)</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة تقرير البلاغات A4</span>
            </button>

            <button
              onClick={loadTasks}
              disabled={loading}
              className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <div className="flex items-center gap-2 erp-sub px-3 py-1.5 rounded-xl border text-xs">
              <span>الربط:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-bold text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" /> غير متصل
                </span>
              )}
            </div>
          </div>
        </header>

        {/* رسائل التنبيه والنجاح */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-bold transition-all ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {/* بطاقات الإحصائيات (KPI Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-rose-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">بلاغات حرجة قيد المعالجة</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-rose-600">{kpis.critical}</span>
              <span className="text-[11px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">تعطل خطوط</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-amber-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">مهام جاري تنفيذها ميدانياً</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-amber-500">{kpis.inProgress}</span>
              <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">فنيون في الموقع</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-emerald-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">أعطال تم إصلاحها اليوم</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-emerald-600">{kpis.closed}</span>
              <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">تم استعادة التشغيل</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-indigo-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">إجمالي سجل البلاغات</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono">{kpis.total}</span>
              <span className="text-[11px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">بلاغ مدون</span>
            </div>
          </div>
        </div>

        {/* فلاتر البحث */}
        <div className="erp-card p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="p-2 rounded-xl border erp-sub outline-none font-bold"
            >
              <option value="ALL">كافة الأولويات</option>
              <option value="CRITICAL">حرج (توقف إنتاج)</option>
              <option value="HIGH">مرتفع</option>
              <option value="NORMAL">عادي</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 rounded-xl border erp-sub outline-none font-bold"
            >
              <option value="ALL">كافة الحالات</option>
              <option value="PENDING">جديد (بانتظار التكليف)</option>
              <option value="ASSIGNED">تم تكليف الفني</option>
              <option value="IN_PROGRESS">جاري العمل ميدانياً</option>
              <option value="CLOSED">تم الإصلاح والإغلاق</option>
            </select>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
            <input
              type="text"
              placeholder="بحث برقم البلاغ، الماكينة، أو العنوان..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border erp-sub outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />
          </div>
        </div>

        {/* ترويسة الطباعة الرسمية A4 */}
        <div className="hidden print:block border-b-2 border-black pb-3 mb-4 text-center">
          <h2 className="text-xl font-black">مصانع وحلواني أبو عادل</h2>
          <p className="text-xs text-gray-700">تقرير بلاغات الأعطال الطارئة وأوقات الاستجابة الفنية (SLA & Incident Report)</p>
          <div className="flex justify-between items-center text-xs mt-2 px-4 font-bold">
            <span>إدارة الصيانة والتشغيل الهندسي</span>
            <span>تاريخ التقرير: {displayDate}</span>
          </div>
        </div>

        {/* قائمة بلاغات الأعطال */}
        <div className="space-y-4">
          {loading ? (
            <div className="erp-card p-8 text-center erp-muted text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <span>جاري تحميل غرفة البلاغات...</span>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="erp-card p-8 text-center erp-muted text-xs">
              لا توجد بلاغات طارئة مطابقة لمعايير البحث.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div key={task.id} className="erp-card p-5 rounded-2xl shadow-sm border space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b erp-card pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-rose-600 text-sm">{task.taskNumber}</span>
                    <h3 className="font-bold text-sm text-gray-800 dark:text-gray-100">{task.title}</h3>
                    {task.assetCode && (
                      <span className="font-mono text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">
                        الأصل: {task.assetCode}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        task.priority === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse'
                          : task.priority === 'HIGH'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}
                    >
                      {task.priority === 'CRITICAL' ? 'حرج (توقف إنتاج)' : task.priority === 'HIGH' ? 'مرتفع' : 'عادي'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        task.status === 'CLOSED'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-amber-500/10 text-amber-500'
                          : task.status === 'ASSIGNED'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {task.status === 'CLOSED'
                        ? 'تم الإصلاح'
                        : task.status === 'IN_PROGRESS'
                        ? 'جاري العمل'
                        : task.status === 'ASSIGNED'
                        ? 'تم التكليف'
                        : 'بانتظار الفني'}
                    </span>

                    {/* إجراءات البلاغ */}
                    <div className="flex items-center gap-1.5 print:hidden mr-2">
                      {task.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowDelegateModal(true);
                          }}
                          className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>تكليف فني</span>
                        </button>
                      )}

                      {task.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleRespond(task)}
                          className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>بدء المعالجة</span>
                        </button>
                      )}

                      {task.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowCompleteModal(true);
                          }}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>إغلاق وإعادة التشغيل</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-300">{task.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-500 pt-2 border-t erp-card">
                  <div>القسم الطالب: <strong className="text-gray-800 dark:text-gray-200">{task.senderDepartment}</strong></div>
                  <div>المبلغ: <strong className="text-gray-800 dark:text-gray-200">{task.senderEmployeeName}</strong></div>
                  <div>الفني المكلف: <strong className="text-gray-800 dark:text-gray-200">{task.assignedTechnicianName || 'غير مكلف بعد'}</strong></div>
                  <div>وقت البلاغ: <strong className="font-mono text-gray-800 dark:text-gray-200">{task.createdAt}</strong></div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* توقيعات تقرير الحوادث A4 */}
        <div className="hidden print:grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-gray-300 text-xs text-center font-bold">
          <div>
            <p>مشرف الموقع المتضرر</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>فني الصيانة المنفذ</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>مدير الصيانة والتشغيل الهندسي</p>
            <div className="mt-8">......................................</div>
          </div>
        </div>

      </div>

      {/* مودال 1: إطلاق بلاغ طارئ جديد */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="font-bold text-base">إطلاق بلاغ عطل طارئ (SOS)</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmergencyTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">عنوان العطل / المشكلة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: توقف مفاجئ في خط تغذية العجانات الآلية"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">القسم / الموقع *</label>
                  <select
                    value={newSenderDept}
                    onChange={(e) => setNewSenderDept(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  >
                    <option value="صالة الحلويات الشرقية">صالة الحلويات الشرقية</option>
                    <option value="صالة المعجنات والمخبوزات">صالة المعجنات والمخبوزات</option>
                    <option value="صالة الحلويات الغربية والجاتوه">صالة الحلويات الغربية والجاتوه</option>
                    <option value="صالة التعبئة والتغليف">صالة التعبئة والتغليف</option>
                    <option value="أسطول النقل والشحن المبرد">أسطول النقل والشحن المبرد</option>
                    <option value="مخزن بضاعة تامة وحلويات جاهزة">مخزن بضاعة تامة وحلويات جاهزة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">كود الأصل / الماكينة المتوقفة</label>
                  <input
                    type="text"
                    placeholder="مثال: AST-1001"
                    value={newAssetCode}
                    onChange={(e) => setNewAssetCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">مستوى الأولوية والخطورة</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold text-rose-600"
                  >
                    <option value="CRITICAL">حرج جداً (توقف صالة إنتاج)</option>
                    <option value="HIGH">مرتفع</option>
                    <option value="NORMAL">عادي</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">المستهدف الزمني للحل (SLA بالدقائق)</label>
                  <input
                    type="number"
                    value={newSlaMinutes}
                    onChange={(e) => setNewSlaMinutes(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">شرح تفصيلي للأعراض والأصوات غير الطبيعية</label>
                <textarea
                  rows={3}
                  required
                  placeholder="وصف المشكلة بدقة لمساعدة الفني في إحضار الأدوات المناسبة..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                  <span>بث البلاغ العاجل وفصل الماكينة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال 2: تكليف فني صيانة */}
      {showDelegateModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base">تكليف فني صيانة: [{selectedTask.taskNumber}]</h3>
              </div>
              <button onClick={() => setShowDelegateModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDelegateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">الفني المكلف بالاستجابة *</label>
                <select
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                >
                  <option value="فني أول عبد الله بدوي">فني أول عبد الله بدوي (ميكانيكا وأفران)</option>
                  <option value="فني تبريد سامح كمال">فني تبريد سامح كمال (غرف تجميد وثلاجات)</option>
                  <option value="فني كهرباء وتحكم م. طارق">فني كهرباء وتحكم م. طارق (PLC وحساسات)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowDelegateModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>تأكيد التكليف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال 3: إغلاق البلاغ واستعادة تشغيل الماكينة */}
      {showCompleteModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">إغلاق البلاغ واستعادة التشغيل</h3>
              </div>
              <button onClick={() => setShowCompleteModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">تقرير الإصلاح والإجراء المتخذ *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="مثال: تم شد السير وتغيير بلي التروس وتشحيم المحرك واختبار الدوران..."
                  value={closureNotes}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">قطع الغيار المستهلكة</label>
                <input
                  type="text"
                  placeholder="مثال: رولمان بلي 6204 + سير مقاس 1250"
                  value={sparePartsUsed}
                  onChange={(e) => setSparePartsUsed(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">إجمالي زمن التوقف الفعلي (دقيقة)</label>
                <input
                  type="number"
                  value={downtimeMinutes}
                  onChange={(e) => setDowntimeMinutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono text-center font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                  <span>إعادة تشغيل الماكينة واعتماد الإغلاق</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
