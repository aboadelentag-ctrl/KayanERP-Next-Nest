'use client';

import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Factory,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Sparkles,
  ArrowRightLeft,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { FinishedGoodsTransfer } from '../page';

interface FloorReworkViewProps {
  transfers: FinishedGoodsTransfer[];
  onResubmitRework: (transferId: string, adjustedQty: number, adjustedCount: number, notes?: string) => Promise<void>;
  isProcessing: boolean;
  getStatusBadge: (status: string) => { label: string; color: string };
}

export default function FloorReworkView({
  transfers,
  onResubmitRework,
  isProcessing,
  getStatusBadge,
}: FloorReworkViewProps) {
  const [subTab, setSubTab] = useState<'ACTIVE' | 'ARCHIVE'>('ACTIVE');

  // Active Rework batches
  const activeReworkBatches = useMemo(() => {
    return transfers.filter(
      (t) => t.status === 'REWORK_IN_PRODUCTION' || t.status === 'QC_REWORK'
    );
  }, [transfers]);

  // Rework history (items that had rework but are now completed)
  const reworkHistory = useMemo(() => {
    return transfers.filter(
      (t) => Number(t.qcReworkQty || 0) > 0 && t.status !== 'REWORK_IN_PRODUCTION' && t.status !== 'QC_REWORK'
    );
  }, [transfers]);

  // Total active rework weight
  const totalActiveReworkQty = useMemo(() => {
    return activeReworkBatches.reduce((acc, t) => acc + Number(t.qcReworkQty || t.prodDispatchedQty || 0), 0);
  }, [activeReworkBatches]);

  // Local form inputs per batch
  const [reworkForms, setReworkForms] = useState<
    Record<
      string,
      {
        adjustedQty: number;
        adjustedCount: number;
        correctionType: string;
        notes: string;
      }
    >
  >({});

  const getFormState = (trf: FinishedGoodsTransfer) => {
    if (reworkForms[trf.id]) return reworkForms[trf.id];
    return {
      adjustedQty: Number(trf.qcReworkQty || trf.prodDispatchedQty || 0),
      adjustedCount: Number(trf.prodDispatchedCount || 0),
      correctionType: 'إعادة تسوية وخبيز',
      notes: '',
    };
  };

  const updateFormState = (trfId: string, updates: Partial<{ adjustedQty: number; adjustedCount: number; correctionType: string; notes: string }>) => {
    setReworkForms((prev) => ({
      ...prev,
      [trfId]: {
        ...(prev[trfId] || { adjustedQty: 0, adjustedCount: 0, correctionType: 'إعادة تسوية وخبيز', notes: '' }),
        ...updates,
      },
    }));
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. Header Banner */}
      <div className="erp-sub border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border-purple-500/20 bg-gradient-to-r from-purple-500/5 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-sm">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black text-slate-100">
                صالة الإنتاج - إدارة مرتجعات الجودة وإعادة التشغيل (Floor Rework Hub)
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-black">
                المحطة الخامسة • استلام وتصحيح العيوب
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              استلام دفعات المنتجات المرتجعة من توكيد الجودة، تسجيل الإجراء التصحيحي بالصالة، وإعادة الدفع للميزان
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
            <span className="text-slate-400 block text-[10px]">دفعات قيد التعديل بالصالة</span>
            <span className="text-purple-400 font-mono font-black text-sm">
              {activeReworkBatches.length} تشغيلة ({totalActiveReworkQty.toFixed(1)} كجم)
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sub Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 erp-sub border rounded-xl p-1.5 text-xs font-bold">
        <button
          onClick={() => setSubTab('ACTIVE')}
          className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'ACTIVE'
              ? 'bg-purple-600 text-white font-black shadow-sm'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>الدفعات الجارية للتعديل بالصالة ({activeReworkBatches.length})</span>
        </button>

        <button
          onClick={() => setSubTab('ARCHIVE')}
          className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'ARCHIVE'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>سجل وتاريخ دفعات إعادة التشغيل المنجزة ({reworkHistory.length})</span>
        </button>
      </div>

      {/* 3. Active Batches View */}
      {subTab === 'ACTIVE' ? (
        activeReworkBatches.length === 0 ? (
          <div className="erp-sub border rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-100">لا توجد تشغيلات مرتجعة للتعديل بالصالة حالياً</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                جميع تشغيلات صالات الإنتاج اجتازت فحص الجودة بنجاح وتم تحويلها لمحطات الميزان واستلام الكنترول.
              </p>
            </div>
            {reworkHistory.length > 0 && (
              <button
                onClick={() => setSubTab('ARCHIVE')}
                className="text-xs text-purple-400 hover:underline font-bold inline-flex items-center gap-1 pt-1"
              >
                <span>عرض سجل دفعات إعادة التشغيل السابقة ({reworkHistory.length} دفعة سابقة)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activeReworkBatches.map((trf) => {
              const form = getFormState(trf);

              return (
                <div
                  key={trf.id}
                  className="erp-sub border border-purple-500/40 rounded-2xl p-4 md:p-5 space-y-4 shadow-md bg-gradient-to-b from-purple-500/5 to-transparent transition-all"
                >
                  {/* Batch Header */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3 border-b border-purple-500/20 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-purple-400 text-sm">{trf.transferNumber}</span>
                        {trf.productionOrderNumber && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-mono text-xs font-bold">
                            أمر تشغيل: {trf.productionOrderNumber}
                          </span>
                        )}
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30">
                          {trf.itemName}
                        </span>
                        <span className="font-mono text-xs text-slate-400">لوط: {trf.batchNumber}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>صالة التصنيع: <strong className="text-slate-200">{trf.sourceWarehouseName}</strong></span>
                        <span>مخزن الوجهة: <strong className="text-slate-200">{trf.destinationWarehouseName}</strong></span>
                      </div>
                    </div>

                    <div className="text-left px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                      <span className="text-slate-400 block text-[10px]">الكمية المرتجعة بقرار الجودة</span>
                      <span className="text-rose-400 font-mono font-black text-sm">
                        {trf.qcReworkQty || trf.prodDispatchedQty} {trf.itemUnit || 'كجم'}
                      </span>
                    </div>
                  </div>

                  {/* QC Defect Statement */}
                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-1">
                    <div className="flex items-center gap-2 font-black text-purple-300">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-purple-400" />
                      <span>تقرير وقرار مهندس توكيد الجودة:</span>
                    </div>
                    <p className="text-slate-300 mr-6">
                      {trf.qcNotes || 'ارتجاع الدفعة للصالة لإعادة المعالجة والتعديل الفني قبل التمرير النهائي.'}
                    </p>
                    {trf.qcInspector && (
                      <div className="text-[11px] text-slate-400 mr-6 pt-1">
                        أخصائي الفحص: <strong className="text-cyan-400">{trf.qcInspector}</strong>
                      </div>
                    )}
                  </div>

                  {/* Adjustment Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-500/5 p-3.5 rounded-xl border border-slate-500/15">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        الوزن الفعلي بعد التعديل (كجم) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.adjustedQty || ''}
                        onChange={(e) =>
                          updateFormState(trf.id, { adjustedQty: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-mono font-black text-center text-emerald-400 outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        العدد الفعلي بعد التعديل (صاج/صندوق)
                      </label>
                      <input
                        type="number"
                        value={form.adjustedCount || ''}
                        onChange={(e) =>
                          updateFormState(trf.id, { adjustedCount: parseInt(e.target.value) || 0 })
                        }
                        className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-mono font-bold text-center outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        نوع الإجراء التصحيحي المنفّذ *
                      </label>
                      <select
                        value={form.correctionType}
                        onChange={(e) => updateFormState(trf.id, { correctionType: e.target.value })}
                        className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="إعادة تسوية وخبيز">إعادة تسوية وخبيز بالأفران</option>
                        <option value="تعديل زينة وتشطيب وتغليف">تعديل زينة وتشطيب وفنش</option>
                        <option value="فرز وتعبئة جديدة مطابقة">فرز وتعبئة جديدة مطابقة</option>
                        <option value="إعادة خلط وتدوير بالتشغيلة">إعادة خلط وتدوير بالعجين</option>
                        <option value="إصلاح عيوب التقطيع والأبعاد">إصلاح عيوب التقطيع والأبعاد</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ملاحظات مشرف الصالة المنفذ
                      </label>
                      <input
                        type="text"
                        placeholder="تم إعادة الخبز والتعديل..."
                        value={form.notes}
                        onChange={(e) => updateFormState(trf.id, { notes: e.target.value })}
                        className="w-full erp-input-compact rounded-xl border erp-sub text-xs outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() =>
                        onResubmitRework(
                          trf.id,
                          form.adjustedQty,
                          form.adjustedCount,
                          `${form.correctionType}: ${form.notes || 'تم إنهاء التعديل بالصالة'}`
                        )
                      }
                      disabled={isProcessing}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-md shadow-purple-600/20 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>اعتماد التعديل وإعادة الإرسال إلى ميزان التكاليف وتوكيد الجودة</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* 4. Rework History Archive */
        <div className="erp-sub border rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>سجل دفعات إعادة التشغيل التي تم تعديلها واعتمادها بنجاح</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{reworkHistory.length} دفعة منجزة</span>
          </div>

          {reworkHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              لا توجد دفعات مرتجعة سابقة مسجلة في الأرشيف.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-500/20">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b text-slate-400 font-bold">
                  <tr>
                    <th className="p-2.5">رقم الإذن</th>
                    <th className="p-2.5">أمر التشغيل</th>
                    <th className="p-2.5">الصنف</th>
                    <th className="p-2.5">صالة الإنتاج</th>
                    <th className="p-2.5 text-center text-purple-400">الكمية التي تم تعديلها</th>
                    <th className="p-2.5 text-center text-emerald-400">الصافي المقبول نهائياً</th>
                    <th className="p-2.5">ملاحظات الفحص والجودة</th>
                    <th className="p-2.5 text-center">الحالة الحالية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {reworkHistory.map((trf) => (
                    <tr key={trf.id} className="hover:bg-slate-500/5">
                      <td className="p-2.5 font-mono font-bold text-amber-500">{trf.transferNumber}</td>
                      <td className="p-2.5 font-mono text-slate-400">{trf.productionOrderNumber || '-'}</td>
                      <td className="p-2.5 font-bold text-slate-100">{trf.itemName}</td>
                      <td className="p-2.5 text-slate-300">{trf.sourceWarehouseName}</td>
                      <td className="p-2.5 text-center font-mono font-bold text-purple-400">
                        {trf.qcReworkQty} {trf.itemUnit || 'كجم'}
                      </td>
                      <td className="p-2.5 text-center font-mono font-black text-emerald-400">
                        {trf.qcApprovedQty} {trf.itemUnit || 'كجم'}
                      </td>
                      <td className="p-2.5 text-slate-400 max-w-xs truncate">{trf.qcNotes || 'تم تصحيح التشغيلة'}</td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                          {getStatusBadge(trf.status).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
