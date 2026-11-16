'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HousekeepingHeader from '../components/HousekeepingHeader';
import {
  Users,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit,
  Phone,
  ShieldCheck,
  Star,
  Award,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HousekeepingWorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [zoneTypeFilter, setZoneTypeFilter] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState<any | null>(null);
  const [workerCode, setWorkerCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [assignedZoneType, setAssignedZoneType] = useState('PRODUCTION_HALL');
  const [supervisorName, setSupervisorName] = useState('م. تامر الجوهري');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/housekeeping/workers`);
      setWorkers(res.data.data || []);
    } catch (err: any) {
      console.error('Error fetching workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingWorker(null);
    setWorkerCode(`CLN-${String(workers.length + 1).padStart(3, '0')}`);
    setFullName('');
    setPhone('');
    setAssignedZoneType('PRODUCTION_HALL');
    setSupervisorName('م. تامر الجوهري');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (w: any) => {
    setEditingWorker(w);
    setWorkerCode(w.worker_code);
    setFullName(w.full_name);
    setPhone(w.phone || '');
    setAssignedZoneType(w.assigned_zone_type);
    setSupervisorName(w.supervisor_name || 'م. تامر الجوهري');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleSaveWorker = async () => {
    if (!workerCode.trim() || !fullName.trim()) {
      setErrorMsg('يرجى إدخال كود العامل والاسم بالكامل');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      if (editingWorker) {
        await axios.patch(`${API_BASE}/housekeeping/workers/${editingWorker.id}`, {
          fullName,
          phone,
          assignedZoneType,
          supervisorName,
        });
      } else {
        await axios.post(`${API_BASE}/housekeeping/workers`, {
          workerCode,
          fullName,
          phone,
          assignedZoneType,
          supervisorName,
        });
      }

      setShowModal(false);
      fetchWorkers();
    } catch (err: any) {
      console.error('Save worker error:', err);
      setErrorMsg(err.response?.data?.message || 'فشل حفظ بيانات العامل');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredWorkers = workers.filter((w) => {
    const matchesZone = zoneTypeFilter === 'ALL' || w.assigned_zone_type === zoneTypeFilter;
    const matchesSearch =
      !search.trim() ||
      w.worker_code.toLowerCase().includes(search.toLowerCase()) ||
      w.full_name.includes(search) ||
      (w.phone && w.phone.includes(search));
    return matchesZone && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      <HousekeepingHeader
        title="إدارة عمال الإشراف الداخلي وأكوادهم"
        subtitle="دليل العاملين في النظافة والتطهير، ربط الأكواد بالصالات، ومتابعة مؤشر الأداء والامتثال الميداني"
        entityName="workers"
        exportData={filteredWorkers}
        exportFileName="سجل_عمال_الإشراف_الداخلي"
        onImportSuccess={fetchWorkers}
        primaryAction={{
          label: 'إضافة عامل نظافة جديد',
          onClick: handleOpenAddModal,
          icon: Plus,
        }}
      />

      <div className="p-3 max-w-7xl mx-auto w-full space-y-4">
        {/* شريط البحث والفلترة */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> تصفية حسب منطقة التعيين:
            </span>
            <select
              value={zoneTypeFilter}
              onChange={(e) => setZoneTypeFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="ALL">كافة المناطق والأقسام</option>
              <option value="PRODUCTION_HALL">صالات الإنتاج والمصانع</option>
              <option value="RETAIL_BRANCH">فروع ومعارض الحلواني</option>
              <option value="WAREHOUSE">المستودعات وثلاجات التجميد</option>
              <option value="FLEET">أسطول الشاحنات المبردة</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالكود، الاسم، أو الهاتف..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>
        </div>

        {/* جدول العمال */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-bold">
                <tr>
                  <th className="p-3">كود العامل</th>
                  <th className="p-3">الاسم بالكامل</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">منطقة التعيين المعتمدة</th>
                  <th className="p-3">المشرف المسؤول</th>
                  <th className="p-3">مؤشر تقييم الأداء</th>
                  <th className="p-3">عدد المهام المنجزة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
                      جاري تحميل بيانات العمال...
                    </td>
                  </tr>
                ) : filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      لا يوجد عمال يطابقون معايير البحث
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((w) => {
                    const score = Number(w.performance_score || 100);
                    return (
                      <tr key={w.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <span className="font-mono font-bold text-teal-300 px-2 py-0.5 rounded bg-teal-950/70 border border-teal-800/60">
                            {w.worker_code}
                          </span>
                        </td>

                        <td className="p-3 font-semibold text-slate-100 flex items-center gap-2">
                          <Users className="w-4 h-4 text-slate-400 shrink-0" />
                          <span>{w.full_name}</span>
                        </td>

                        <td className="p-3 text-slate-300 font-mono">
                          {w.phone ? (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {w.phone}
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>

                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {w.assigned_zone_type === 'PRODUCTION_HALL'
                              ? 'صالة إنتاج ومصنع'
                              : w.assigned_zone_type === 'RETAIL_BRANCH'
                              ? 'معرض وفرع مبيعات'
                              : w.assigned_zone_type === 'WAREHOUSE'
                              ? 'مستودع وثلاجة'
                              : 'أسطول نقل وتوزيع'}
                          </span>
                        </td>

                        <td className="p-3 text-slate-400 text-[11px]">
                          {w.supervisor_name || 'عام'}
                        </td>

                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  score >= 90
                                    ? 'bg-emerald-500'
                                    : score >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${score}%` }}
                              />
                            </div>
                            <span
                              className={`text-[11px] font-bold ${
                                score >= 90
                                  ? 'text-emerald-400'
                                  : score >= 75
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {score}%
                            </span>
                          </div>
                        </td>

                        <td className="p-3">
                          <span className="font-bold text-slate-200">
                            {w._count?.sanitation_task_logs || 0} مهمة
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenEditModal(w)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-300 transition-colors"
                            title="تعديل بيانات العامل"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* مودال إضافة/تعديل عامل */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-sm font-bold text-teal-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{editingWorker ? 'تعديل بيانات العامل' : 'إضافة عامل إشراف داخلي جديد'}</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-100 font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-2 rounded bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">كود العامل الفريد:</label>
                <input
                  type="text"
                  value={workerCode}
                  onChange={(e) => setWorkerCode(e.target.value)}
                  disabled={!!editingWorker}
                  placeholder="مثال: CLN-006"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">الاسم بالكامل:</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="اسم العامل الرباعي أو الثلاثي..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">رقم الهاتف:</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">منطقة التعيين المعتمدة:</label>
                <select
                  value={assignedZoneType}
                  onChange={(e) => setAssignedZoneType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                >
                  <option value="PRODUCTION_HALL">صالات الإنتاج والمصانع</option>
                  <option value="RETAIL_BRANCH">معارض وفروع الحلواني</option>
                  <option value="WAREHOUSE">المستودعات وثلاجات التجميد</option>
                  <option value="FLEET">أسطول الشاحنات المبردة</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">المشرف المسؤول:</label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  placeholder="اسم المشرف المباشر..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveWorker}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ العامل</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
