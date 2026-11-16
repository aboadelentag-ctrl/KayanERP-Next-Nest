'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HousekeepingHeader from '../components/HousekeepingHeader';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  XCircle,
  Filter,
  Eye,
  Camera,
  Wrench,
  Search,
  RefreshCw,
  Building,
  Truck,
  Droplets,
  Users,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HousekeepingDashboardPage() {
  const [metrics, setMetrics] = useState<any>({
    totalWorkers: 0,
    totalZones: 0,
    completedToday: 0,
    pendingQa: 0,
    failedReclean: 0,
    lowStockSupplies: 0,
    avgCompliance: 98,
  });

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [envFilter, setEnvFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // QA Verification Modal
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [showQaModal, setShowQaModal] = useState(false);
  const [qaInspectorName, setQaInspectorName] = useState('د. مروة الشاذلي (مفتش سلامة الغذاء)');
  const [qaDecision, setQaDecision] = useState<'QA_VERIFIED' | 'FAILED_RECLEAN_REQUIRED'>('QA_VERIFIED');
  const [qaNotes, setQaNotes] = useState('');
  const [submittingQa, setSubmittingQa] = useState(false);

  // Photo Inspection Modal
  const [photoModalTask, setPhotoModalTask] = useState<any | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, tasksRes] = await Promise.all([
        axios.get(`${API_BASE}/housekeeping/metrics/dashboard`),
        axios.get(`${API_BASE}/housekeeping/tasks`),
      ]);

      setMetrics(metricsRes.data.data || {});
      setTasks(tasksRes.data.data || []);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesEnv =
      envFilter === 'ALL' || t.sanitation_zones?.environment_type === envFilter;
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch =
      !searchTerm.trim() ||
      t.task_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.worker_name_snapshot?.includes(searchTerm) ||
      t.worker_code_snapshot?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sanitation_zones?.name?.includes(searchTerm);

    return matchesEnv && matchesStatus && matchesSearch;
  });

  const handleOpenQaModal = (task: any) => {
    setSelectedTask(task);
    setQaDecision('QA_VERIFIED');
    setQaNotes('');
    setShowQaModal(true);
  };

  const handleSaveQaVerification = async () => {
    if (!selectedTask) return;
    try {
      setSubmittingQa(true);
      await axios.post(`${API_BASE}/housekeeping/tasks/verify-qa`, {
        taskId: selectedTask.id,
        status: qaDecision,
        qaVerifiedByName: qaInspectorName,
        qaNotes,
      });

      setShowQaModal(false);
      setSelectedTask(null);
      fetchData();
    } catch (err: any) {
      console.error('QA submit error:', err);
      alert('حدث خطأ أثناء اعتماد فحص الجودة');
    } finally {
      setSubmittingQa(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      <HousekeepingHeader
        title="لوحة متابعة النظافة العامة والـ SSOP"
        subtitle="المتابعة المركزية لامتثال صالات الإنتاج والمعارض، فحص صور التوثيق، واعتمادات سلامة الغذاء"
        entityName="tasks"
        exportData={filteredTasks}
        exportFileName="سجل_متابعة_النظافة_والـSSOP"
        onImportSuccess={fetchData}
      />

      <div className="p-3 max-w-7xl mx-auto w-full space-y-4">
        {/* صف كروت المؤشرات الحية KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-teal-400" />
              إجمالي العمالة
            </span>
            <div className="text-xl font-bold text-slate-100 mt-1">{metrics.totalWorkers} عامل</div>
            <span className="text-[10px] text-teal-400">على قوة الإشراف الداخلي</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              المناطق المسجلة
            </span>
            <div className="text-xl font-bold text-slate-100 mt-1">{metrics.totalZones} منطقة</div>
            <span className="text-[10px] text-blue-400">صالات إنتاج، فروع، أسطول</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              مهام اليوم المنجزة
            </span>
            <div className="text-xl font-bold text-emerald-400 mt-1">{metrics.completedToday} مهمة</div>
            <span className="text-[10px] text-emerald-500">تم اعتمادها وتوثيقها</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              بانتظار فحص الجودة
            </span>
            <div className="text-xl font-bold text-amber-400 mt-1">{metrics.pendingQa}</div>
            <span className="text-[10px] text-amber-500">تحتاج مسحة/اعتماد QMS</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              نسبة الامتثال العامة
            </span>
            <div className="text-xl font-bold text-purple-300 mt-1">{metrics.avgCompliance}%</div>
            <span className="text-[10px] text-purple-400">مطابقة معايير SSOP</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-sm">
            <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-rose-400" />
              نواقص المنظفات
            </span>
            <div className="text-xl font-bold text-rose-400 mt-1">{metrics.lowStockSupplies} أصناف</div>
            <span className="text-[10px] text-rose-400">أقل من حد الأمان بالمخزن</span>
          </div>
        </div>

        {/* شريط الفلاتر والبحث */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center flex-wrap gap-2 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> الفلاتر:
            </span>

            {/* فلتر البيئة */}
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="ALL">كافة البيئات والمواقع</option>
              <option value="PRODUCTION_SSOP">صالات الإنتاج والمصانع (SSOP)</option>
              <option value="RETAIL_SHOWROOM">معارض وفروع الحلواني</option>
              <option value="WAREHOUSE">المستودعات وثلاجات التجميد</option>
              <option value="FLEET_VEHICLE">أسطول التوزيع المبرد</option>
            </select>

            {/* فلتر الحالة */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="ALL">كافة حالات المهام</option>
              <option value="COMPLETED_BY_SUPERVISOR">معتمد من المشرف (بانتظار الجودة)</option>
              <option value="QA_VERIFIED">معتمد ومطابق لسلامة الغذاء</option>
              <option value="FAILED_RECLEAN_REQUIRED">مرفوض - مطلوب إعادة تطهير</option>
            </select>
          </div>

          {/* مربع البحث */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم المهمة، كود العامل، أو المنطقة..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>
        </div>

        {/* جدول المهام الحية */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-bold">
                <tr>
                  <th className="p-3">رقم المهمة</th>
                  <th className="p-3">المنطقة / الموقع</th>
                  <th className="p-3">كود واسم العامل</th>
                  <th className="p-3">المشرف المعتمد</th>
                  <th className="p-3">الامتثال %</th>
                  <th className="p-3">صور التوثيق</th>
                  <th className="p-3">الحالة والاعتماد</th>
                  <th className="p-3">التاريخ والوقت</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
                      جاري تحميل سجلات التفتيش والنظافة...
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      لا توجد مهام تطابق الفلاتر المحددة
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-teal-300">{t.task_number}</td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{t.sanitation_zones?.name}</div>
                        <span className="text-[10px] text-slate-400 block">
                          [{t.sanitation_zones?.zone_code}] - {t.sanitation_zones?.environment_type}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-100">{t.worker_name_snapshot}</div>
                        <span className="text-[10px] text-teal-400 font-mono font-bold">
                          كود: {t.worker_code_snapshot}
                        </span>
                      </td>

                      <td className="p-3 text-slate-300">{t.supervisor_name || 'غير محدد'}</td>

                      <td className="p-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            Number(t.compliance_score || 100) >= 90
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {Number(t.compliance_score || 100)}%
                        </span>
                      </td>

                      <td className="p-3">
                        {t.before_photo_url || t.after_photo_url ? (
                          <button
                            onClick={() => setPhotoModalTask(t)}
                            className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-bold bg-teal-950/60 border border-teal-800/60 px-2 py-1 rounded"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            معاينة الصور
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500">بدون صور</span>
                        )}
                      </td>

                      <td className="p-3">
                        {t.status === 'QA_VERIFIED' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" />
                              معتمد (سلامة الغذاء)
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              بواسطة: {t.qa_verified_by_name}
                            </span>
                          </div>
                        ) : t.status === 'FAILED_RECLEAN_REQUIRED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            مرفوض - إعادة تنظيف
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            معتمد من المشرف
                          </span>
                        )}

                        {t.maintenance_tickets && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/40 block">
                            <Wrench className="w-2.5 h-2.5" /> صيانة #{t.maintenance_tickets.ticket_number}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-slate-400 text-[11px]">
                        {t.completed_at ? new Date(t.completed_at).toLocaleString('ar-EG') : '-'}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleOpenQaModal(t)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold border border-slate-700 text-[11px] transition-colors"
                        >
                          اعتماد الجودة
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

      {/* مودال اعتماد الجودة وسلامة الغذاء QMS */}
      {showQaModal && selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>اعتماد جودة التطهير ومسحة سلامة الغذاء (QMS)</span>
              </div>
              <button
                onClick={() => setShowQaModal(false)}
                className="text-slate-400 hover:text-slate-100 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div>
                رقم المهمة: <strong className="text-teal-300">{selectedTask.task_number}</strong>
              </div>
              <div>
                الموقع: <strong className="text-slate-200">{selectedTask.sanitation_zones?.name}</strong>
              </div>
              <div>
                العامل المنفذ:{' '}
                <strong className="text-slate-200">{selectedTask.worker_name_snapshot}</strong> (
                {selectedTask.worker_code_snapshot})
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">قرار مفتش الجودة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQaDecision('QA_VERIFIED')}
                    className={`py-2 px-3 rounded-lg font-bold border text-center transition-colors ${
                      qaDecision === 'QA_VERIFIED'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    مطابق ومعتمد (Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaDecision('FAILED_RECLEAN_REQUIRED')}
                    className={`py-2 px-3 rounded-lg font-bold border text-center transition-colors ${
                      qaDecision === 'FAILED_RECLEAN_REQUIRED'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    مرفوض - إعادة تنظيف (Fail)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اسم مفتش الجودة:</label>
                <input
                  type="text"
                  value={qaInspectorName}
                  onChange={(e) => setQaInspectorName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">ملاحظات ونتائج المسحة المعملية:</label>
                <textarea
                  rows={2}
                  value={qaNotes}
                  onChange={(e) => setQaNotes(e.target.value)}
                  placeholder="سجل نتائج فحص ATP أو مسحات البكتيريا أو ملاحظات النظافة..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowQaModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveQaVerification}
                disabled={submittingQa}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5"
              >
                {submittingQa && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ اعتماد الجودة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال فحص صور قبل وبعد */}
      {photoModalTask && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-sm font-bold text-slate-200">
                توثيق صور المهمة: <span className="text-teal-400 font-mono">{photoModalTask.task_number}</span> -{' '}
                {photoModalTask.sanitation_zones?.name}
              </div>
              <button
                onClick={() => setPhotoModalTask(null)}
                className="text-slate-400 hover:text-slate-100 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-bold text-amber-300 mb-1 block">صورة قبل التطهير:</span>
                {photoModalTask.before_photo_url ? (
                  <img
                    src={photoModalTask.before_photo_url}
                    alt="قبل"
                    className="w-full h-64 object-cover rounded-lg border border-slate-700"
                  />
                ) : (
                  <div className="h-64 rounded-lg bg-slate-950 flex items-center justify-center text-xs text-slate-500">
                    لم يتم التقاط صورة قبل
                  </div>
                )}
              </div>

              <div>
                <span className="text-xs font-bold text-teal-300 mb-1 block">صورة بعد التطهير:</span>
                {photoModalTask.after_photo_url ? (
                  <img
                    src={photoModalTask.after_photo_url}
                    alt="بعد"
                    className="w-full h-64 object-cover rounded-lg border border-slate-700"
                  />
                ) : (
                  <div className="h-64 rounded-lg bg-slate-950 flex items-center justify-center text-xs text-slate-500">
                    لم يتم التقاط صورة بعد
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-400 flex items-center justify-between border-t border-slate-800 pt-2">
              <span>العامل المنفذ: {photoModalTask.worker_name_snapshot} ({photoModalTask.worker_code_snapshot})</span>
              <span>المشرف: {photoModalTask.supervisor_name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
