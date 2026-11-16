'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import HousekeepingHeader from '../components/HousekeepingHeader';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Upload,
  User,
  MapPin,
  ClipboardList,
  ShieldAlert,
  Send,
  Wrench,
  Search,
  CheckSquare,
  XCircle,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function SupervisorLogPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [workerSearch, setWorkerSearch] = useState<string>('');
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [supervisorName, setSupervisorName] = useState<string>('م. تامر الجوهري (مشرف الإشراف الداخلي)');
  const [taskType, setTaskType] = useState<string>('SCHEDULED_SSOP');
  const [checklist, setChecklist] = useState<{ id: number; text: string; passed: boolean }[]>([]);
  const [notes, setNotes] = useState<string>('');

  // Photos
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);

  // Modal Maintenance Escalation
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [maintTitle, setMaintTitle] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintPriority, setMaintPriority] = useState('NORMAL');
  const [maintWorkshopId, setMaintWorkshopId] = useState('');
  const [lastExecutedTaskId, setLastExecutedTaskId] = useState<string | null>(null);

  // Submission Status
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  // File Inputs
  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  // Load Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [zonesRes, workersRes, tasksRes, wsRes] = await Promise.all([
        axios.get(`${API_BASE}/housekeeping/zones`),
        axios.get(`${API_BASE}/housekeeping/workers`),
        axios.get(`${API_BASE}/housekeeping/tasks?limit=10`),
        axios.get(`${API_BASE}/engineering/workshops`).catch(() => ({ data: { data: [] } })),
      ]);

      const zList = zonesRes.data.data || [];
      setZones(zList);
      setWorkers(workersRes.data.data || []);
      setRecentTasks(tasksRes.data.data || []);
      setWorkshops(wsRes.data.data || []);

      if (zList.length > 0 && !selectedZoneId) {
        setSelectedZoneId(zList[0].id.toString());
        loadChecklistForZone(zList[0]);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setStatusMessage({ text: 'فشل تحميل البيانات من الخادم', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadChecklistForZone = (zone: any) => {
    if (zone && Array.isArray(zone.checklist_items_json)) {
      setChecklist(
        zone.checklist_items_json.map((item: any) => ({
          id: item.id,
          text: item.text,
          passed: true,
        }))
      );
    } else {
      setChecklist([
        { id: 1, text: 'تطهير وتعقيم الأسطح بمطهر معتمد', passed: true },
        { id: 2, text: 'غسيل وتجفيف الأرضية تماماً', passed: true },
      ]);
    }
  };

  const handleZoneChange = (zId: string) => {
    setSelectedZoneId(zId);
    const z = zones.find((x) => x.id.toString() === zId);
    if (z) {
      loadChecklistForZone(z);
    }
  };

  // Filter Workers by search input
  const filteredWorkers = workers.filter(
    (w) =>
      w.worker_code.toLowerCase().includes(workerSearch.toLowerCase()) ||
      w.full_name.includes(workerSearch)
  );

  const handleSelectWorker = (w: any) => {
    setSelectedWorker(w);
    setWorkerSearch(`${w.worker_code} - ${w.full_name}`);
  };

  const toggleChecklistItem = (id: number) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, passed: !item.passed } : item))
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (type === 'before') {
        setBeforePhoto(dataUrl);
      } else {
        setAfterPhoto(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Task
  const handleSubmitTask = async () => {
    if (!selectedZoneId) {
      setStatusMessage({ text: 'يرجى اختيار منطقة النظافة أو الصالة', type: 'error' });
      return;
    }
    if (!selectedWorker && !workerSearch.trim()) {
      setStatusMessage({ text: 'يجب اختيار أو كتابة كود/اسم العامل المنفذ', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage(null);

      const payload = {
        zoneId: selectedZoneId,
        workerId: selectedWorker ? selectedWorker.id : undefined,
        workerCode: selectedWorker ? selectedWorker.worker_code : workerSearch.split('-')[0].trim(),
        workerName: selectedWorker ? selectedWorker.full_name : workerSearch.trim(),
        supervisorName,
        taskType,
        checklistResultsJson: checklist,
        beforePhotoUrl: beforePhoto,
        afterPhotoUrl: afterPhoto,
        notes,
      };

      const res = await axios.post(`${API_BASE}/housekeeping/tasks/execute`, payload);

      const created = res.data.data;
      setLastExecutedTaskId(created.id);
      setStatusMessage({
        text: `تم بنجاح توثيق المهمة (${created.task_number}) باسم العامل: ${created.worker_name_snapshot}`,
        type: 'success',
      });

      // Reset photos and notes
      setBeforePhoto(null);
      setAfterPhoto(null);
      setNotes('');
      if (beforeInputRef.current) beforeInputRef.current.value = '';
      if (afterInputRef.current) afterInputRef.current.value = '';

      // Refresh recent tasks & worker scores
      fetchData();
    } catch (err: any) {
      console.error('Submit error:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'فشل تسجيل المهمة، يرجى التحقق من المدخلات',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Convert to Maintenance
  const handleCreateMaintenance = async () => {
    if (!lastExecutedTaskId) {
      setStatusMessage({ text: 'يرجى تسجيل مهمة النظافة أولاً أو اختيار مهمة سابقة لربط العطل بها', type: 'error' });
      return;
    }
    if (!maintTitle.trim() || !maintDesc.trim()) {
      setStatusMessage({ text: 'يرجى كتابة عنوان ووصف العطل الفني', type: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`${API_BASE}/housekeeping/tasks/convert-to-maintenance`, {
        taskId: lastExecutedTaskId,
        title: maintTitle,
        description: maintDesc,
        priority: maintPriority,
        workshopId: maintWorkshopId || undefined,
        supervisorName,
      });

      setShowMaintModal(false);
      setMaintTitle('');
      setMaintDesc('');
      setStatusMessage({
        text: 'تم توليد تذكرة صيانة هندسية عاجلة وربطها بنجاح مع مهمة الإشراف الداخلي',
        type: 'success',
      });
      fetchData();
    } catch (err: any) {
      console.error('Maintenance error:', err);
      setStatusMessage({
        text: err.response?.data?.message || 'فشل تحويل البلاغ للصيانة',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentZone = zones.find((z) => z.id.toString() === selectedZoneId);
  const complianceRate = checklist.length
    ? Math.round((checklist.filter((c) => c.passed).length / checklist.length) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      <HousekeepingHeader
        title="شاشة المشرف الميداني للتنفيذ والتفتيش"
        subtitle="توثيق أعمال النظافة والتطهير (SSOP) بكود العامل والصور الحية واعتماد المشرف المباشر"
        entityName="tasks"
        exportData={recentTasks}
        exportFileName="سجل_مهام_المشرف_الميداني"
        onImportSuccess={fetchData}
      />

      <div className="p-3 max-w-6xl mx-auto w-full space-y-4">
        {/* شريط الإشعارات والتنبيهات */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-600 text-emerald-200'
                : 'bg-rose-950/90 border-rose-600 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            {lastExecutedTaskId && (
              <button
                onClick={() => setShowMaintModal(true)}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs flex items-center gap-1 font-bold shadow-sm"
              >
                <Wrench className="w-3.5 h-3.5" />
                تحويل لبلاغ صيانة لهذا الموقع
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* الجانب الأيمن: نموذج الإدخال السريع للمشرف (Mobile-Optimized) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <Smartphone className="w-4 h-4" />
                <span>نموذج التوثيق والاعتماد الميداني</span>
              </div>
              <span className="text-xs text-slate-400">
                المشرف: <strong className="text-slate-200">{supervisorName.split(' ')[1] || 'تامر'}</strong>
              </span>
            </div>

            {/* الخطوة 1: اختيار المنطقة / الصالة */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                1. حدد المنطقة أو صالة التصنيع / الفرع:
              </label>
              <select
                value={selectedZoneId}
                onChange={(e) => handleZoneChange(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-medium"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    [{z.zone_code}] {z.name} ({z.frequency_type})
                  </option>
                ))}
              </select>
              {currentZone && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-teal-300">
                    البيئة: {currentZone.environment_type}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    الدورية: {currentZone.frequency_type}
                  </span>
                </div>
              )}
            </div>

            {/* الخطوة 2: اختيار العامل المنفذ بالكود والاسم */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" />
                2. ابحث واختر كود واسم العامل المنفذ:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={workerSearch}
                  onChange={(e) => {
                    setWorkerSearch(e.target.value);
                    if (selectedWorker) setSelectedWorker(null);
                  }}
                  placeholder="اكتب كود العامل (مثل: CLN-001) أو اسمه..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-9 pl-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>

              {/* قائمة اقتراحات العمال السريعة */}
              {workerSearch && !selectedWorker && filteredWorkers.length > 0 && (
                <div className="mt-1 max-h-36 overflow-y-auto bg-slate-800/95 border border-slate-700 rounded-lg shadow-xl text-xs divide-y divide-slate-700 z-20">
                  {filteredWorkers.map((w) => (
                    <div
                      key={w.id}
                      onClick={() => handleSelectWorker(w)}
                      className="p-2 hover:bg-teal-900/40 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-teal-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-teal-500/30">
                          {w.worker_code}
                        </span>
                        <span className="font-medium text-slate-100">{w.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{w.assigned_zone_type}</span>
                        <span className="text-emerald-400 font-bold">
                          تقييم: {Number(w.performance_score || 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* بطاقة تأكيد العامل المختار */}
              {selectedWorker && (
                <div className="mt-2 p-2 rounded-lg bg-teal-950/40 border border-teal-700/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <div>
                      <span className="font-bold text-teal-200">
                        [{selectedWorker.worker_code}] {selectedWorker.full_name}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        منطقة التعيين: {selectedWorker.assigned_zone_type} | هاتف: {selectedWorker.phone || 'غير مسجل'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    الأداء: {Number(selectedWorker.performance_score || 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* نوع المهمة */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">نوع المهمة:</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="SCHEDULED_SSOP">نظافة وتطهير دوري مجدول (SSOP)</option>
                  <option value="DEEP_CLEANING">نظافة عميقة أسبوعية/شهرية</option>
                  <option value="POST_MAINTENANCE_CLEANUP">تنظيف ما بعد الصيانة واللحام</option>
                  <option value="EMERGENCY_SPILL">طوارئ انسكاب وتلوث مفاجئ</option>
                  <option value="FLEET_SANITIZATION">تطهير شاحنات مبردة</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">اسم المشرف المعتمد:</label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            {/* الخطوة 3: قائمة الفحص والـ SSOP */}
            <div className="border border-slate-800 rounded-lg p-3 bg-slate-950/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-teal-400" />
                  3. قائمة التحقق من بنود النظافة والتطهير:
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    complianceRate >= 90
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  نسبة الامتثال: {complianceRate}%
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto divide-y divide-slate-800/60">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className="pt-1.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 p-1.5 rounded transition-colors text-xs"
                  >
                    <span className={item.passed ? 'text-slate-200 font-medium' : 'text-slate-400 line-through'}>
                      {item.text}
                    </span>
                    <button
                      type="button"
                      className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${
                        item.passed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-900/70 border border-rose-700 text-rose-200'
                      }`}
                    >
                      {item.passed ? <CheckSquare className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {item.passed ? 'تم ومطابق' : 'لم ينفذ'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* الخطوة 4: التوثيق بالصور الحية (قبل وبعد) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-400" />
                4. صور التوثيق الميداني (من الكاميرا أو الجهاز):
              </label>

              <div className="grid grid-cols-2 gap-3">
                {/* صورة قبل */}
                <div className="border border-dashed border-slate-700 rounded-lg p-2.5 text-center bg-slate-950/40 relative">
                  <input
                    type="file"
                    ref={beforeInputRef}
                    onChange={(e) => handlePhotoUpload(e, 'before')}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                  {beforePhoto ? (
                    <div className="space-y-1">
                      <img
                        src={beforePhoto}
                        alt="صورة قبل"
                        className="w-full h-24 object-cover rounded border border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setBeforePhoto(null)}
                        className="text-[11px] text-rose-400 hover:underline"
                      >
                        إلغاء صورة قبل
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => beforeInputRef.current?.click()}
                      className="cursor-pointer py-3 flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200"
                    >
                      <Camera className="w-6 h-6 text-slate-500" />
                      <span className="text-[11px] font-bold text-amber-300">التقاط صورة [قبل التنظيف]</span>
                      <span className="text-[10px] text-slate-500">حالة الصالة/الماكينة قبل البدء</span>
                    </div>
                  )}
                </div>

                {/* صورة بعد */}
                <div className="border border-dashed border-slate-700 rounded-lg p-2.5 text-center bg-slate-950/40 relative">
                  <input
                    type="file"
                    ref={afterInputRef}
                    onChange={(e) => handlePhotoUpload(e, 'after')}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                  {afterPhoto ? (
                    <div className="space-y-1">
                      <img
                        src={afterPhoto}
                        alt="صورة بعد"
                        className="w-full h-24 object-cover rounded border border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setAfterPhoto(null)}
                        className="text-[11px] text-rose-400 hover:underline"
                      >
                        إلغاء صورة بعد
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => afterInputRef.current?.click()}
                      className="cursor-pointer py-3 flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200"
                    >
                      <Camera className="w-6 h-6 text-slate-500" />
                      <span className="text-[11px] font-bold text-teal-300">التقاط صورة [بعد التطهير]</span>
                      <span className="text-[10px] text-slate-500">خلو الرايش ونظافة الاستانلس</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ملاحظات إضافية */}
            <div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات المشرف الميدانية (اختياري)..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* زر الاعتماد والتسجيل */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSubmitTask}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-950/50 disabled:opacity-50 transition-colors"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>اعتماد وتسجيل المهمة باسم العامل ({selectedWorker ? selectedWorker.worker_code : 'المحدد'})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMaintModal(true)}
                className="py-2.5 px-3 bg-amber-600/90 hover:bg-amber-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                title="تحويل لملاحظة صيانة عاجلة"
              >
                <Wrench className="w-4 h-4" />
                <span>إبلاغ صيانة</span>
              </button>
            </div>
          </div>

          {/* الجانب الأيسر: سجل آخر المهام المعتمدة للمشرف */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  آخر مهام النظافة والتطهير المعتمدة اليوم:
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {recentTasks.length} مهمة
                </span>
              </div>

              {recentTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  لا توجد مهام مسجلة اليوم، ابدأ بتوثيق أول مهمة الآن.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                  {recentTasks.slice(0, 10).map((t) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-colors space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-teal-300">{t.task_number}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            t.status === 'QA_VERIFIED'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : t.status === 'FAILED_RECLEAN_REQUIRED'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-teal-500/20 text-teal-300'
                          }`}
                        >
                          {t.status === 'QA_VERIFIED'
                            ? 'معتمد من الجودة'
                            : t.status === 'FAILED_RECLEAN_REQUIRED'
                            ? 'مرفوض - إعادة تنظيف'
                            : 'معتمد من المشرف'}
                        </span>
                      </div>

                      <div className="font-semibold text-slate-200">{t.sanitation_zones?.name}</div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          العامل: <strong className="text-slate-300">{t.worker_name_snapshot}</strong> ({t.worker_code_snapshot})
                        </span>
                        <span className="text-emerald-400 font-bold">
                          الامتثال: {Number(t.compliance_score || 100)}%
                        </span>
                      </div>

                      {/* صور قبل وبعد إن وجدت */}
                      {(t.before_photo_url || t.after_photo_url) && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                          {t.before_photo_url && (
                            <div className="relative group">
                              <img
                                src={t.before_photo_url}
                                alt="قبل"
                                className="w-10 h-10 object-cover rounded border border-slate-700"
                              />
                              <span className="text-[9px] text-amber-300 block text-center">قبل</span>
                            </div>
                          )}
                          {t.after_photo_url && (
                            <div className="relative group">
                              <img
                                src={t.after_photo_url}
                                alt="بعد"
                                className="w-10 h-10 object-cover rounded border border-slate-700"
                              />
                              <span className="text-[9px] text-teal-300 block text-center">بعد</span>
                            </div>
                          )}
                        </div>
                      )}

                      {t.maintenance_tickets && (
                        <div className="mt-1 p-1 bg-amber-950/40 border border-amber-800/40 rounded text-[10px] text-amber-300 flex items-center gap-1">
                          <Wrench className="w-3 h-3 shrink-0" />
                          <span>مرتبط بتذكرة صيانة رقم: {t.maintenance_tickets.ticket_number}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* مودال تحويل البلاغ للصيانة الهندسية */}
      {showMaintModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Wrench className="w-4 h-4" />
                <span>تحويل ملاحظة نظافة لبلاغ صيانة هندسية</span>
              </div>
              <button
                onClick={() => setShowMaintModal(false)}
                className="text-slate-400 hover:text-slate-100 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              في حال اكتشاف انسداد في الصرف، تسريب مياه أو فريون، أو كسر في بلاط الصالة أثناء التفتيش،
              سيتم إنشاء تذكرة صيانة موحدة فوراً وإرسالها لفرق الصيانة المعنية.
            </p>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">عنوان العطل الفني:</label>
                <input
                  type="text"
                  value={maintTitle}
                  onChange={(e) => setMaintTitle(e.target.value)}
                  placeholder="مثال: انسداد مجرى الصرف الأرضي بقسم العجن"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">الورشة الهندسية المسؤولة:</label>
                <select
                  value={maintWorkshopId}
                  onChange={(e) => setMaintWorkshopId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none"
                >
                  <option value="">-- اختر الورشة المعنية --</option>
                  {workshops.map((w: any) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.specialtyType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">درجة الأهمية والخطورة:</label>
                <select
                  value={maintPriority}
                  onChange={(e) => setMaintPriority(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none"
                >
                  <option value="NORMAL">عادي (خلال ساعتين)</option>
                  <option value="HIGH">مرتفع - يعيق الصالة (خلال 60 دقيقة)</option>
                  <option value="CRITICAL">طارئ حرج جداً - خط إنتاج معطل (خلال 30 دقيقة)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">تفاصيل وموقع العطل بدقة:</label>
                <textarea
                  rows={3}
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  placeholder="يرجى كتابة التفاصيل التي لاحظها مشرف النظافة لسرعة توجه الفني بالقطع المناسبة..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowMaintModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleCreateMaintenance}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
                <span>إصدار بلاغ الصيانة الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
