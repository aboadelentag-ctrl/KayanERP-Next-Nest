'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
  BellRing,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Share2,
  RefreshCw,
  Plus,
  Flame,
  UserCheck,
  Send,
  X,
  MessageSquare,
  ShieldAlert,
  ChevronUp,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AmsTasksPage() {
  const { socket } = useSocket();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Modals
  const [resolveModalTask, setResolveModalTask] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTask, setNewTask] = useState({
    taskCode: '',
    title: '',
    description: '',
    taskType: 'CCP_DEVIATION',
    priority: 'CRITICAL',
    assigneeName: 'مهندس جودة الوردية',
    assigneePhone: '01000000000',
    slaMinutes: 60,
  });
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!newTask.taskCode) {
      setNewTask((prev) => ({
        ...prev,
        taskCode: `AMS-${Math.floor(Math.random() * 90000 + 10000)}`,
      }));
    }
  }, [newTask.taskCode]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/ams/tasks?status=${activeFilter}`).then((r) => r.json()).catch(() => []);
      setTasks(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
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
    socket.on('ams_task_created', handleUpdate);
    socket.on('ams_task_escalated', handleUpdate);
    socket.on('ams_task_resolved', handleUpdate);
    socket.on('ams_whatsapp_dispatched', handleUpdate);
    return () => {
      socket.off('ams_task_created', handleUpdate);
      socket.off('ams_task_escalated', handleUpdate);
      socket.off('ams_task_resolved', handleUpdate);
      socket.off('ams_whatsapp_dispatched', handleUpdate);
    };
  }, [socket, fetchData]);

  const handleEscalate = async (taskId: string) => {
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/ams/tasks/${taskId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNotifyWhatsApp = async (taskId: string) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_BASE}/ams/tasks/${taskId}/notify-whatsapp`, {
        method: 'POST',
      }).then((r) => r.json());
      alert(res.message || 'تم إرسال إشعار WhatsApp');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalTask) return;
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/ams/tasks/${resolveModalTask.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes }),
      });
      setResolveModalTask(null);
      setResolutionNotes('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/ams/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      setShowCreateModal(false);
      setNewTask({
        taskCode: `AMS-${Date.now().toString().slice(-5)}`,
        title: '',
        description: '',
        taskType: 'CCP_DEVIATION',
        priority: 'CRITICAL',
        assigneeName: 'مهندس جودة الوردية',
        assigneePhone: '01000000000',
        slaMinutes: 60,
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
  const overdueCount = tasks.filter((t) => t.isOverdue).length;

  return (
    <div className="w-full min-h-screen px-3 py-3 md:px-5 space-y-3 erp-container-fluid">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
              منظومة إدارة الإجراءات التصحيحية والتذاكر (AMS Tasks & SLA)
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-red-500/20 text-red-300 border border-red-500/30">
              Escalation Matrix & WhatsApp
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            تتبع معالجة انحرافات الجودة والـ CCP وتوقف الماكينات مع مؤقتات الـ SLA ومصفوفة التصعيد للإدارة العليا
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
            onClick={() => setShowCreateModal(true)}
            className="erp-btn-compact px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 text-xs font-bold shadow-md"
          >
            <Plus className="w-4 h-4" />
            إصدار تذكرة تصحيحية (New Ticket)
          </button>
        </div>
      </div>

      {/* KPI SLA Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">التذاكر المفتوحة (Active)</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">{pendingCount}</div>
            <div className="text-[10px] text-amber-300">تحت الإجراء والمعالجة</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">متجاوزة للوقت (Overdue SLA)</div>
            <div className="text-xl font-black text-rose-500 mt-0.5">{overdueCount}</div>
            <div className="text-[10px] text-rose-300">تتطلب تصعيداً فورياً</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">تم تصعيدها للإدارة (Escalated)</div>
            <div className="text-xl font-black text-purple-400 mt-0.5">
              {tasks.filter((t) => t.escalation_level > 1 && t.status !== 'RESOLVED').length}
            </div>
            <div className="text-[10px] text-purple-300">مستوى 2 و 3</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <ChevronUp className="w-5 h-5" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">تم حلها وإغلاقها (Resolved)</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {tasks.filter((t) => t.status === 'RESOLVED').length}
            </div>
            <div className="text-[10px] text-emerald-300">إجراءات تصحيحية مكتملة</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {[
          { id: 'ALL', label: 'كافة التذاكر' },
          { id: 'PENDING', label: 'قيد الانتظار والمعالجة' },
          { id: 'ESCALATED', label: 'المصعدة للإدارة' },
          { id: 'RESOLVED', label: 'المغلقة والمنجزة' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              activeFilter === tab.id
                ? 'bg-red-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks Table */}
      <div className="erp-card rounded-xl border border-white/10 bg-slate-900/90 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-bold border-b border-white/10">
              <tr>
                <th className="p-2.5">كود التذكرة</th>
                <th className="p-2.5">عنوان المشكلة والحيود</th>
                <th className="p-2.5">النوع والأولوية</th>
                <th className="p-2.5">المسؤول ومستوى التصعيد</th>
                <th className="p-2.5">مهلة الـ SLA المتبقية</th>
                <th className="p-2.5">إشعار WhatsApp</th>
                <th className="p-2.5">الحالة</th>
                <th className="p-2.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    جاري تحميل تذاكر المهام التصحيحية ومؤقتات الـ SLA...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    لا توجد تذاكر مسجلة في هذا التبويب
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const isResolved = task.status === 'RESOLVED';
                  const isCritical = task.priority === 'CRITICAL';

                  return (
                    <tr key={task.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-2.5 font-bold font-mono text-white">
                        {task.task_code}
                      </td>

                      <td className="p-2.5">
                        <div className="font-bold text-white">{task.title}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-sm">{task.description}</div>
                      </td>

                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{task.task_type}</span>
                        </div>
                      </td>

                      <td className="p-2.5">
                        <div className="font-bold text-slate-200">{task.assignee_name}</div>
                        <div className="text-[10px] text-purple-400 font-semibold">
                          مستوى {task.escalation_level}: {task.escalationRole}
                        </div>
                      </td>

                      <td className="p-2.5">
                        {isResolved ? (
                          <span className="text-[11px] text-emerald-400 font-bold">تم الإنجاز ✓</span>
                        ) : task.isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-black bg-rose-600 text-white animate-pulse">
                            <Clock className="w-3 h-3" />
                            تجاوز الوقت ({Math.abs(task.remainingMinutes)} دقيقة)
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-amber-400">
                            متبقي {task.remainingMinutes} دقيقة
                          </span>
                        )}
                      </td>

                      <td className="p-2.5">
                        <button
                          onClick={() => handleNotifyWhatsApp(task.id)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 transition ${
                            task.whatsapp_status === 'SENT'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white border border-white/10'
                          }`}
                        >
                          <Send className="w-2.5 h-2.5" />
                          {task.whatsapp_status === 'SENT' ? 'تم الإرسال' : 'إرسال WhatsApp'}
                        </button>
                      </td>

                      <td className="p-2.5">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isResolved
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : task.status === 'ESCALATED'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>

                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isResolved && (
                            <>
                              <button
                                onClick={() => handleEscalate(task.id)}
                                title="تصعيد للمستوى الإداري التالي"
                                className="erp-btn-compact px-2 py-1 rounded bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white text-[11px] font-bold flex items-center gap-0.5"
                              >
                                <ChevronUp className="w-3 h-3" />
                                تصعيد
                              </button>
                              <button
                                onClick={() => setResolveModalTask(task)}
                                className="erp-btn-compact px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 shadow"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                إغلاق
                              </button>
                            </>
                          )}
                          {isResolved && (
                            <span className="text-[10px] text-slate-500 font-bold">مغلقة</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Resolve Task */}
      {resolveModalTask && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form onSubmit={handleResolve} className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                <CheckCircle2 className="w-5 h-5" />
                إغلاق واعتماد حل التذكرة
              </div>
              <button type="button" onClick={() => setResolveModalTask(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              التذكرة: <span className="font-bold text-white">{resolveModalTask.task_code}</span> - {resolveModalTask.title}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">تقرير الإجراء التصحيحي المتخذ</label>
              <textarea
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="اكتب الإجراء الفني أو التشغيلي الذي تم تنفيذه لمعالجة المشكلة..."
                className="w-full rounded-lg bg-slate-800 border border-white/10 text-white p-2 text-xs h-24"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setResolveModalTask(null)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-slate-800 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
              >
                تأكيد الحل والإغلاق
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Ticket */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form onSubmit={handleCreate} className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-red-400 font-black text-sm">
                <BellRing className="w-5 h-5" />
                إصدار تذكرة إجراء تصحيحي جديدة
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">عنوان التذكرة</label>
                <input
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="مثال: ارتفاع مفاجئ في حرارة فرن البسبوسة رقم 2"
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">نوع التذكرة</label>
                  <select
                    value={newTask.taskType}
                    onChange={(e) => setNewTask({ ...newTask, taskType: e.target.value })}
                    className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                  >
                    <option value="CCP_DEVIATION">حيود نقطة تحكم حرجة (CCP)</option>
                    <option value="QUALITY_NCR">تقرير عدم مطابقة (NCR)</option>
                    <option value="MAINTENANCE_DOWNTIME">توقف ماكينة صيانة</option>
                    <option value="SAFETY_HAZARD">سلامة وبيئة عمل</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">الأولوية والـ SLA</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => {
                      const p = e.target.value;
                      setNewTask({
                        ...newTask,
                        priority: p,
                        slaMinutes: p === 'CRITICAL' ? 60 : p === 'HIGH' ? 240 : 720,
                      });
                    }}
                    className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                  >
                    <option value="CRITICAL">حرجة (SLA: 60 دقيقة)</option>
                    <option value="HIGH">عالية (SLA: 4 ساعات)</option>
                    <option value="MEDIUM">متوسطة (SLA: 12 ساعة)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">المسؤول عن المعالجة</label>
                <input
                  required
                  value={newTask.assigneeName}
                  onChange={(e) => setNewTask({ ...newTask, assigneeName: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">هاتف المسؤول (لإشعارات WhatsApp)</label>
                <input
                  value={newTask.assigneePhone}
                  onChange={(e) => setNewTask({ ...newTask, assigneePhone: e.target.value })}
                  placeholder="010xxxxxxxx"
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">تفاصيل المشكلة والحيود</label>
                <textarea
                  required
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="وصف الانحراف وتأثيره على خط الإنتاج..."
                  className="w-full rounded-lg bg-slate-800 border border-white/10 text-white p-2 text-xs h-16"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-slate-800 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow"
              >
                إطلاق التذكرة والتنبيه
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
