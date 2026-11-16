'use client';

import React, { useState, useMemo } from 'react';
import {
  Gavel,
  Scale,
  Warehouse,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  ChevronDown,
  ShieldAlert,
  ArrowRightLeft,
  FileText,
  Building2,
  UserCheck,
} from 'lucide-react';
import { FinishedGoodsTransfer } from '../page';

interface ActiveDisputesViewProps {
  transfers: FinishedGoodsTransfer[];
  onOpenCostingDispute: (trf: FinishedGoodsTransfer) => void;
  onOpenControlDispute: (trf: FinishedGoodsTransfer) => void;
  getStatusBadge: (status: string) => { label: string; color: string };
}

export default function ActiveDisputesView({
  transfers,
  onOpenCostingDispute,
  onOpenControlDispute,
  getStatusBadge,
}: ActiveDisputesViewProps) {
  const [disputeFilter, setDisputeFilter] = useState<'ALL' | 'COSTING' | 'CONTROL' | 'RESOLVED'>('ALL');

  // Active Costing Disputes
  const costingDisputes = useMemo(
    () => transfers.filter((t) => t.status === 'DISPUTE_COSTING' || (t.costingDisputeStatus === 'OPEN' && t.status !== 'COMPLETED')),
    [transfers]
  );

  // Active Control Disputes
  const controlDisputes = useMemo(
    () => transfers.filter((t) => t.status === 'IN_DISPUTE' || (t.disputeStatus === 'OPEN' && t.status !== 'COMPLETED')),
    [transfers]
  );

  // All Active
  const allActiveDisputes = useMemo(() => {
    return transfers.filter(
      (t) =>
        t.status === 'DISPUTE_COSTING' ||
        t.status === 'IN_DISPUTE' ||
        ((t.hasDispute || t.costingDisputeStatus === 'OPEN' || t.disputeStatus === 'OPEN') && t.status !== 'COMPLETED')
    );
  }, [transfers]);

  // Resolved disputes archive
  const resolvedDisputes = useMemo(() => {
    return transfers.filter(
      (t) =>
        (t.costingDisputeStatus === 'RESOLVED' || t.disputeStatus === 'RESOLVED') &&
        t.status !== 'DISPUTE_COSTING' &&
        t.status !== 'IN_DISPUTE'
    );
  }, [transfers]);

  const displayedDisputes = useMemo(() => {
    if (disputeFilter === 'COSTING') return costingDisputes;
    if (disputeFilter === 'CONTROL') return controlDisputes;
    if (disputeFilter === 'RESOLVED') return resolvedDisputes;
    return allActiveDisputes;
  }, [disputeFilter, costingDisputes, controlDisputes, allActiveDisputes, resolvedDisputes]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. Header Banner */}
      <div className="erp-sub border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border-rose-500/20 bg-gradient-to-r from-rose-500/5 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-sm">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black text-slate-100">
                لجنة فض النزاعات الفنية والمخزنية (Dispute Resolution Committee)
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black">
                حسم الفروقات وترصيد المخازن
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              حسم محاضر تضارب الأوزان وفوارق الاستلام بين صالة الإنتاج وميزان التكاليف ومخزن الكنترول مع تحديد جهات التحميل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-left px-3 py-1.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-xs">
            <span className="text-slate-400 block text-[10px]">إجمالي النزاعات النشطة</span>
            <span className="text-rose-500 font-mono font-black text-sm">{allActiveDisputes.length} نزاع قائم</span>
          </div>
        </div>
      </div>

      {/* 2. Sub Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 erp-sub border rounded-xl p-1.5 text-xs font-bold">
        <button
          onClick={() => setDisputeFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            disputeFilter === 'ALL'
              ? 'bg-rose-500 text-white font-black shadow-sm'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <Gavel className="w-3.5 h-3.5" />
          <span>كافة النزاعات القائمة ({allActiveDisputes.length})</span>
        </button>

        <button
          onClick={() => setDisputeFilter('COSTING')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            disputeFilter === 'COSTING'
              ? 'bg-rose-500 text-white font-black shadow-sm'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>نزاعات ميزان التكاليف والوزن ({costingDisputes.length})</span>
        </button>

        <button
          onClick={() => setDisputeFilter('CONTROL')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            disputeFilter === 'CONTROL'
              ? 'bg-rose-500 text-white font-black shadow-sm'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>نزاعات استلام مخزن الكنترول ({controlDisputes.length})</span>
        </button>

        <button
          onClick={() => setDisputeFilter('RESOLVED')}
          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap mr-auto ${
            disputeFilter === 'RESOLVED'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>أرشيف النزاعات المحسومة ({resolvedDisputes.length})</span>
        </button>
      </div>

      {/* 3. Dispute Cards or Empty State */}
      {disputeFilter !== 'RESOLVED' ? (
        displayedDisputes.length === 0 ? (
          <div className="erp-sub border rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-100">لا توجد نزاعات نشطة معلقة حالياً</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                كافة تشغيلات الصالة وموازين التكاليف ومخازن الكنترول متطابقة ومنتظمة دون أي تضارب كميات.
              </p>
            </div>
            {resolvedDisputes.length > 0 && (
              <button
                onClick={() => setDisputeFilter('RESOLVED')}
                className="text-xs text-amber-500 hover:underline font-bold inline-flex items-center gap-1 pt-1"
              >
                <span>عرض أرشيف المحاضر المحسومة ({resolvedDisputes.length} نزاع سابق)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayedDisputes.map((trf) => {
              const isCostingDispute = trf.status === 'DISPUTE_COSTING' || trf.costingDisputeStatus === 'OPEN';
              const isControlDispute = trf.status === 'IN_DISPUTE' || trf.disputeStatus === 'OPEN';
              const items = trf.items || [];

              return (
                <div
                  key={trf.id}
                  className="erp-sub border border-rose-500/40 rounded-2xl p-4 md:p-5 space-y-4 shadow-md bg-gradient-to-b from-rose-500/5 to-transparent transition-all"
                >
                  {/* Top Bar of the Dispute Card */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3 border-b border-rose-500/20 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-amber-500 text-sm">{trf.transferNumber}</span>
                        {trf.productionOrderNumber && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-mono text-xs font-bold">
                            أمر تشغيل: {trf.productionOrderNumber}
                          </span>
                        )}
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            isCostingDispute
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-red-500/20 text-red-400 border-red-500/40'
                          }`}
                        >
                          {isCostingDispute ? '⚖️ نزاع ميزان التكاليف والإنتاج' : '🏢 نزاع استلام مخزن الكنترول'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>المصدر: <strong className="text-slate-200">{trf.sourceWarehouseName}</strong></span>
                        <span>الوجهة: <strong className="text-slate-200">{trf.destinationWarehouseName}</strong></span>
                        <span>التاريخ: <strong className="text-slate-200 font-mono">{trf.transferDate ? trf.transferDate.split('T')[0] : '-'}</strong></span>
                      </div>
                    </div>

                    {/* Direct Action Button */}
                    <div>
                      {isCostingDispute ? (
                        <button
                          onClick={() => onOpenCostingDispute(trf)}
                          className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-rose-500/20"
                        >
                          <Gavel className="w-4 h-4" />
                          <span>حسم نزاع التكاليف (فتح محضر اللجنة)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onOpenControlDispute(trf)}
                          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-600/20"
                        >
                          <Gavel className="w-4 h-4" />
                          <span>فض نزاع الكنترول (فتح محضر اللجنة)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Discrepancy Statement */}
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-black text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        سبب النزاع:{' '}
                        {isCostingDispute
                          ? trf.costingDisputeReason || trf.costingNotes || 'فارق في وزن التشغيلة بين الصالة والميزان'
                          : trf.disputeReason || trf.controlNotes || 'عجز أو تلف في الشحنة أثناء الاستلام بمخزن الكنترول'}
                      </span>
                    </div>
                    {isCostingDispute && trf.costingAuditor && (
                      <div className="text-[11px] text-slate-400">
                        ملاحظات المراجع: <span className="text-slate-300">{trf.costingNotes || 'لا توجد ملاحظات إضافية'}</span> • المراجع:{' '}
                        <span className="text-amber-400">{trf.costingAuditor}</span>
                      </div>
                    )}
                    {isControlDispute && trf.controlReceiverName && (
                      <div className="text-[11px] text-slate-400">
                        ملاحظات أمين الكنترول: <span className="text-slate-300">{trf.controlNotes || 'لا توجد ملاحظات'}</span> • المستلم:{' '}
                        <span className="text-blue-400">{trf.controlReceiverName}</span>
                      </div>
                    )}
                  </div>

                  {/* Items Comparison Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-500/20">
                    <table className="w-full text-right text-xs">
                      <thead className="erp-sub border-b text-slate-400 font-bold">
                        <tr>
                          <th className="p-2.5">الصنف</th>
                          <th className="p-2.5 font-mono">اللوط / التشغيلة</th>
                          <th className="p-2.5 text-center text-slate-300">وزن الصالة المسلم</th>
                          <th className="p-2.5 text-center text-amber-500">وزن ميزان التكاليف</th>
                          <th className="p-2.5 text-center text-cyan-400">المقبول من الجودة</th>
                          <th className="p-2.5 text-center text-blue-400">المستلم الفعلي بالكنترول</th>
                          <th className="p-2.5 text-center text-rose-500 font-black">قيمة الفارق / العجز</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/10">
                        {items.length > 0 ? (
                          items.map((it, idx) => {
                            const prodQty = Number(it.dispatchedQty || 0);
                            const costQty = Number(it.costingActualQty ?? prodQty);
                            const rcvQty = Number(it.receivedActualQty ?? it.qcApprovedQty ?? costQty);
                            const diff = isCostingDispute ? costQty - prodQty : rcvQty - Number(it.qcApprovedQty || costQty);

                            return (
                              <tr key={idx} className="hover:bg-slate-500/5">
                                <td className="p-2.5 font-bold text-slate-100">{it.itemName}</td>
                                <td className="p-2.5 font-mono text-[11px] text-slate-400">{it.batchNumber}</td>
                                <td className="p-2.5 text-center font-mono font-bold">{prodQty} {it.itemUnit || 'كجم'}</td>
                                <td className="p-2.5 text-center font-mono font-bold text-amber-500">
                                  {it.costingActualQty !== null && it.costingActualQty !== undefined ? `${it.costingActualQty} ${it.itemUnit || 'كجم'}` : '-'}
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-cyan-400">
                                  {it.qcApprovedQty !== undefined ? `${it.qcApprovedQty} ${it.itemUnit || 'كجم'}` : '-'}
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-blue-400">
                                  {it.receivedActualQty !== null && it.receivedActualQty !== undefined ? `${it.receivedActualQty} ${it.itemUnit || 'كجم'}` : '-'}
                                </td>
                                <td className="p-2.5 text-center font-mono font-black text-rose-500">
                                  {diff !== 0 ? (diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)) : '0.00'}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr className="hover:bg-slate-500/5">
                            <td className="p-2.5 font-bold text-slate-100">{trf.itemName}</td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-400">{trf.batchNumber}</td>
                            <td className="p-2.5 text-center font-mono font-bold">{trf.prodDispatchedQty} كجم</td>
                            <td className="p-2.5 text-center font-mono font-bold text-amber-500">{trf.costingActualQty ?? '-'} كجم</td>
                            <td className="p-2.5 text-center font-mono font-bold text-cyan-400">{trf.qcApprovedQty} كجم</td>
                            <td className="p-2.5 text-center font-mono font-bold text-blue-400">{trf.receivedActualQty ?? '-'} كجم</td>
                            <td className="p-2.5 text-center font-mono font-black text-rose-500">
                              {trf.costingWeightDiff ? trf.costingWeightDiff.toFixed(2) : '-'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* 4. Resolved Disputes Archive Table */
        <div className="erp-sub border rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>أرشيف محاضر النزاعات التي تم فضها وحسمها باللجنة</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{resolvedDisputes.length} محضر معتمد</span>
          </div>

          {resolvedDisputes.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              لا توجد محاضر نزاعات سابقة في الأرشيف حتى الآن.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-500/20">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b text-slate-400 font-bold">
                  <tr>
                    <th className="p-2.5">رقم الإذن</th>
                    <th className="p-2.5">نوع النزاع</th>
                    <th className="p-2.5">الصنف</th>
                    <th className="p-2.5">قرار ومحضر اللجنة</th>
                    <th className="p-2.5">جهة التحميل المعتمدة</th>
                    <th className="p-2.5">رئيس ومسؤول الحسم</th>
                    <th className="p-2.5">تاريخ الحسم</th>
                    <th className="p-2.5 text-center">الحالة النهائية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {resolvedDisputes.map((trf) => (
                    <tr key={trf.id} className="hover:bg-slate-500/5">
                      <td className="p-2.5 font-mono font-bold text-amber-500">{trf.transferNumber}</td>
                      <td className="p-2.5 font-bold">
                        {trf.costingDisputeStatus === 'RESOLVED' ? (
                          <span className="text-amber-400">نزاع ميزان التكاليف</span>
                        ) : (
                          <span className="text-blue-400">نزاع استلام الكنترول</span>
                        )}
                      </td>
                      <td className="p-2.5 font-bold text-slate-200">{trf.itemName}</td>
                      <td className="p-2.5 text-slate-300 max-w-xs truncate">
                        {trf.costingDisputeNotes || trf.disputeResolutionNotes || 'تم التسوية والاعتماد'}
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-500/15 text-slate-300 text-[11px] font-bold">
                          {trf.costingDisputeChargeTo || trf.controlDisputeChargeTo || 'تسوية معتمدة'}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400 font-bold">
                        {trf.costingDisputeResolvedBy || trf.disputeResolvedBy || 'رئيس اللجنة المشتركة'}
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-400">
                        {trf.costingDisputeResolvedAt || trf.disputeResolvedAt ? new Date(trf.costingDisputeResolvedAt || trf.disputeResolvedAt!).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                          محسوم ومعتمد ✓
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
