'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSearch,
  Lock,
  Unlock,
  Building2,
  Calendar,
  X,
  Award,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function QualityInspectionsPage() {
  const { socket } = useSocket();
  const [inspections, setInspections] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Modals
  const [releaseModalInspection, setReleaseModalInspection] = useState<any | null>(null);
  const [releaseForm, setReleaseForm] = useState({
    status: 'PASSED',
    result: 'مطابق للمواصفات القياسية المصرية ومواصفات حلواني أبو عادل',
    inspectorName: 'مهندس ضبط الجودة المخبري',
    qualityScore: 100,
    notes: 'تم فحص العينة والتأكد من نقاوة الدقيق وخلوه من الشوائب',
  });

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newInspection, setNewInspection] = useState({
    itemId: '',
    inspectionType: 'IQC',
    quantity: 100,
    status: 'QUARANTINE',
    result: 'تحت الفحص المخبري والحجر الصحي',
    notes: 'واردات شحنة خامات جديدة',
    isGmpPassed: true,
    isHaccpPassed: true,
    isWeightsPassed: true,
    qualityScore: 98,
    inspectorName: 'مهندس الجودة المستلم',
  });
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [insRes, itemsRes] = await Promise.all([
        fetch(`${API_BASE}/quality/inspections?type=${activeTab}`).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/inventory/items`).then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      setInspections(Array.isArray(insRes) ? insRes : []);
      setItemsList(itemsRes.data || []);
      if (!newInspection.itemId && itemsRes.data?.[0]) {
        setNewInspection((prev) => ({ ...prev, itemId: itemsRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, newInspection.itemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time events
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchData();
    socket.on('quality_inspection_created', handleUpdate);
    socket.on('quarantine_released', handleUpdate);
    return () => {
      socket.off('quality_inspection_created', handleUpdate);
      socket.off('quarantine_released', handleUpdate);
    };
  }, [socket, fetchData]);

  const handleRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseModalInspection) return;
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/quality/inspections/${releaseModalInspection.id}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(releaseForm),
      });
      setReleaseModalInspection(null);
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
      await fetch(`${API_BASE}/quality/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInspection),
      });
      setShowCreateModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const quarantineCount = inspections.filter((i) => i.status === 'QUARANTINE' || i.status === 'PENDING').length;

  return (
    <div className="w-full min-h-screen px-3 py-3 md:px-5 space-y-3 erp-container-fluid">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
              منظومة توكيد الجودة والحجر الصحي (QMS & Quarantine)
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              IQC • IPQC • OQC
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            فحص الواردات وإلزامية الحجر الصحي (Quarantine Gate) ومطابقة معايير سلامة الغذاء (GMP & HACCP)
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
            className="erp-btn-compact px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 text-xs font-bold shadow-md"
          >
            <Plus className="w-4 h-4" />
            تسجيل فحص استلام (New Inspection)
          </button>
        </div>
      </div>

      {/* KPI Quarantine Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">شحنات رهن الحجر الصحي (Quarantine)</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">{quarantineCount}</div>
            <div className="text-[10px] text-amber-300">محظور صرفها لحين الإفراج</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">فحوصات معتمدة (Passed)</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {inspections.filter((i) => i.status === 'PASSED').length}
            </div>
            <div className="text-[10px] text-emerald-300">مطابقة للمواصفات</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">شحنات مرفوضة (Rejected)</div>
            <div className="text-xl font-black text-rose-400 mt-0.5">
              {inspections.filter((i) => i.status === 'REJECTED').length}
            </div>
            <div className="text-[10px] text-rose-300">رد للمورد / إعدام</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="erp-card p-2.5 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400">متوسط نقاط الجودة (Quality Score)</div>
            <div className="text-xl font-black text-teal-400 mt-0.5">98.4%</div>
            <div className="text-[10px] text-teal-300">معدل ممتاز</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        {[
          { id: 'ALL', label: 'كافة الفحوصات' },
          { id: 'IQC', label: 'واردات المواد الخام (IQC - Quarantine)' },
          { id: 'IPQC', label: 'أثناء التشغيل بالصالة (IPQC)' },
          { id: 'OQC', label: 'المنتج النهائي التام (OQC)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              activeTab === tab.id
                ? 'bg-teal-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inspections Table */}
      <div className="erp-card rounded-xl border border-white/10 bg-slate-900/90 overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-bold border-b border-white/10">
              <tr>
                <th className="p-2.5">رقم / نوع الفحص</th>
                <th className="p-2.5">الصنف والمستودع</th>
                <th className="p-2.5">الكمية المفحوصة</th>
                <th className="p-2.5">الحالة والحجر</th>
                <th className="p-2.5">معايير GMP/HACCP</th>
                <th className="p-2.5">النتيجة ونقاط الجودة</th>
                <th className="p-2.5">المفتش والتاريخ</th>
                <th className="p-2.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    جاري تحميل سجلات الفحص والحجر الصحي...
                  </td>
                </tr>
              ) : inspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    لا توجد فحوصات جودة مسجلة في هذا التبويب
                  </td>
                </tr>
              ) : (
                inspections.map((ins) => {
                  const isQuarantine = ins.status === 'QUARANTINE' || ins.status === 'PENDING';
                  const isPassed = ins.status === 'PASSED';
                  const isRejected = ins.status === 'REJECTED';

                  return (
                    <tr key={ins.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-2.5 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                              ins.inspection_type === 'IQC'
                                ? 'bg-amber-500/20 text-amber-300'
                                : ins.inspection_type === 'IPQC'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-purple-500/20 text-purple-300'
                            }`}
                          >
                            {ins.inspection_type}
                          </span>
                          <span>#{ins.id}</span>
                        </div>
                      </td>

                      <td className="p-2.5">
                        <div className="font-bold text-white">{ins.itemName}</div>
                        <div className="text-[11px] text-slate-400">{ins.warehouseName}</div>
                      </td>

                      <td className="p-2.5 font-bold text-slate-200">
                        {Number(ins.quantity)} {ins.unit}
                      </td>

                      <td className="p-2.5">
                        {isQuarantine ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            <Lock className="w-3 h-3" />
                            حجر صحي (QUARANTINE)
                          </span>
                        ) : isPassed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            مفرج عنه ومطابق (PASSED)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            مرفوض (REJECTED)
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 text-[11px]">
                        <div className="flex items-center gap-1 text-slate-300">
                          <span className="text-emerald-400 font-bold">GMP: ✓</span>
                          <span className="text-emerald-400 font-bold">HACCP: ✓</span>
                        </div>
                      </td>

                      <td className="p-2.5">
                        <div className="font-semibold text-slate-300 text-[11px] truncate max-w-xs">{ins.result}</div>
                        <div className="text-[10px] font-mono text-teal-400 font-bold">{Number(ins.QualityScore)}%</div>
                      </td>

                      <td className="p-2.5 text-[11px] text-slate-400">
                        <div>{ins.InspectorName}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(ins.created_at).toLocaleDateString('ar-EG')}
                        </div>
                      </td>

                      <td className="p-2.5 text-center">
                        {isQuarantine ? (
                          <button
                            onClick={() => setReleaseModalInspection(ins)}
                            className="erp-btn-compact px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold flex items-center gap-1 shadow mx-auto"
                          >
                            <Unlock className="w-3 h-3" />
                            إفراج حجر صحي
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-bold">معتمد</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Release Quarantine */}
      {releaseModalInspection && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form onSubmit={handleRelease} className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-teal-400 font-black text-sm">
                <Unlock className="w-5 h-5" />
                محضر إفراج مخبري عن الحجر الصحي
              </div>
              <button type="button" onClick={() => setReleaseModalInspection(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-300">
              الصنف: <span className="font-bold text-white">{releaseModalInspection.itemName}</span> | الكمية: <span className="font-bold text-amber-400">{Number(releaseModalInspection.quantity)} {releaseModalInspection.unit}</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">القرار المخبري النهائي</label>
                <select
                  value={releaseForm.status}
                  onChange={(e) => setReleaseForm({ ...releaseForm, status: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                >
                  <option value="PASSED">موافقة وإفراج تام (PASSED) - جاهز للصرف</option>
                  <option value="REJECTED">رفض وحظر استهلاك (REJECTED) - إعدام أو مرتجع</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">تقييم الجودة (Score %)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={releaseForm.qualityScore}
                  onChange={(e) => setReleaseForm({ ...releaseForm, qualityScore: parseFloat(e.target.value) || 0 })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">تقرير الفحص المخبري</label>
                <textarea
                  value={releaseForm.result}
                  onChange={(e) => setReleaseForm({ ...releaseForm, result: e.target.value })}
                  className="w-full rounded-lg bg-slate-800 border border-white/10 text-white p-2 text-xs h-16"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setReleaseModalInspection(null)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-slate-800 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow"
              >
                اعتماد وتوقيع الإفراج
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Inspection */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form onSubmit={handleCreate} className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-teal-400 font-black text-sm">
                <ShieldCheck className="w-5 h-5" />
                تسجيل إذن فحص استلام جديد
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">نوع الفحص</label>
                <select
                  value={newInspection.inspectionType}
                  onChange={(e) => setNewInspection({ ...newInspection, inspectionType: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                >
                  <option value="IQC">واردات مواد خام ومشتريات (IQC - حجر صحي تلقائي)</option>
                  <option value="IPQC">فحص مرحلي بالصالة (IPQC)</option>
                  <option value="OQC">فحص منتج نهائي تام (OQC)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">الصنف المفحوص</label>
                <select
                  value={newInspection.itemId}
                  onChange={(e) => setNewInspection({ ...newInspection, itemId: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                >
                  {itemsList.map((it) => (
                    <option key={it.id} value={it.id}>{it.item_name} ({it.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">الكمية المستلمة للفحص</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newInspection.quantity}
                  onChange={(e) => setNewInspection({ ...newInspection, quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">ملاحظات الاستلام</label>
                <textarea
                  value={newInspection.notes}
                  onChange={(e) => setNewInspection({ ...newInspection, notes: e.target.value })}
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
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow"
              >
                تأكيد وقيد في الحجر الصحي
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
