'use client';

import React from 'react';
import { X, Printer } from 'lucide-react';
import { FinishedGoodsTransfer } from '../page';

interface PrintScrapReportModalProps {
  transfers: FinishedGoodsTransfer[];
  onClose: () => void;
}

export default function PrintScrapReportModal({ transfers, onClose }: PrintScrapReportModalProps) {
  let totalSamples = 0;
  let totalScrap = 0;
  let totalRework = 0;
  let totalApproved = 0;
  let totalDispatched = 0;

  transfers.forEach((t) => {
    totalSamples += Number(t.qcSampleQty || 0);
    totalScrap += Number(t.qcScrapQty || 0);
    totalRework += Number(t.qcReworkQty || 0);
    totalApproved += Number(t.qcApprovedQty || 0);
    totalDispatched += Number(t.prodDispatchedQty || 0);
  });

  const scrapRate = totalDispatched > 0 ? (totalScrap / totalDispatched) * 100 : 0;
  const estimatedCost = totalScrap * 65;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white text-slate-900 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl border print:p-0 print:border-none print:shadow-none max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-slate-900">مؤسسة مصانع وحلواني أبو عادل</h3>
            <p className="text-xs text-slate-600 font-bold">
              إدارة توكيد الجودة والمعامل المركزية • تقرير الفحص المخبري وحصر الهالك والتالف الفني
            </p>
          </div>
          <div className="text-left text-xs font-mono">
            <div>تاريخ التقرير: <strong>{new Date().toLocaleDateString('ar-EG')}</strong></div>
            <div>إجمالي التشغيلات: <strong>{transfers.length} تشغيلة</strong></div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-slate-500 block text-[11px]">عينات المعمل</span>
            <span className="text-sm font-black font-mono text-cyan-700">{totalSamples.toFixed(1)} كجم</span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-slate-500 block text-[11px]">الهالك والتالف الفني</span>
            <span className="text-sm font-black font-mono text-rose-700">{totalScrap.toFixed(1)} كجم</span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-slate-500 block text-[11px]">معدل الهدر الفني</span>
            <span className="text-sm font-black font-mono text-amber-700">{scrapRate.toFixed(2)}%</span>
          </div>
          <div className="p-3 bg-slate-50 border rounded-xl text-center">
            <span className="text-slate-500 block text-[11px]">الصافي المقبول المعتمد</span>
            <span className="text-sm font-black font-mono text-emerald-700">{totalApproved.toFixed(1)} كجم</span>
          </div>
        </div>

        {/* Data Table */}
        <table className="w-full text-right text-xs border border-slate-300 rounded-xl overflow-hidden">
          <thead className="bg-slate-100 border-b border-slate-300 font-black">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">رقم الإذن</th>
              <th className="p-2">أمر التشغيل</th>
              <th className="p-2">الصنف واللوط</th>
              <th className="p-2">صالة الإنتاج</th>
              <th className="p-2 text-center">التسليم</th>
              <th className="p-2 text-center">عينة المعمل</th>
              <th className="p-2 text-center">الهالك</th>
              <th className="p-2 text-center">% الهدر</th>
              <th className="p-2 text-center">المرتجع</th>
              <th className="p-2 text-center">المقبول</th>
              <th className="p-2">ملاحظات الجودة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transfers.map((t, idx) => {
              const disp = Number(t.prodDispatchedQty || 1);
              const scrap = Number(t.qcScrapQty || 0);
              const scrapPct = ((scrap / (disp || 1)) * 100).toFixed(1);

              return (
                <tr key={t.id}>
                  <td className="p-2 text-center font-mono">{idx + 1}</td>
                  <td className="p-2 font-mono font-bold text-slate-800">{t.transferNumber}</td>
                  <td className="p-2 font-mono">{t.productionOrderNumber || '-'}</td>
                  <td className="p-2 font-bold">
                    {t.itemName} <span className="text-[10px] text-slate-500 font-mono font-normal">({t.batchNumber})</span>
                  </td>
                  <td className="p-2 text-slate-700">{t.sourceWarehouseName}</td>
                  <td className="p-2 text-center font-mono">{t.prodDispatchedQty}</td>
                  <td className="p-2 text-center font-mono text-cyan-800">{t.qcSampleQty || 0}</td>
                  <td className="p-2 text-center font-mono font-bold text-rose-800">{t.qcScrapQty || 0}</td>
                  <td className="p-2 text-center font-mono font-bold">{scrapPct}%</td>
                  <td className="p-2 text-center font-mono text-purple-800">{t.qcReworkQty || 0}</td>
                  <td className="p-2 text-center font-mono font-black text-emerald-800">{t.qcApprovedQty}</td>
                  <td className="p-2 text-slate-600 text-[11px] max-w-xs truncate">{t.qcNotes || 'مطابق معتمد'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 border-t border-slate-300 font-black font-mono">
            <tr>
              <td colSpan={5} className="p-2.5">الإجمالي العام</td>
              <td className="p-2.5 text-center">{totalDispatched.toFixed(1)} كجم</td>
              <td className="p-2.5 text-center text-cyan-800">{totalSamples.toFixed(1)}</td>
              <td className="p-2.5 text-center text-rose-800">{totalScrap.toFixed(1)}</td>
              <td className="p-2.5 text-center text-amber-800">{scrapRate.toFixed(1)}%</td>
              <td className="p-2.5 text-center text-purple-800">{totalRework.toFixed(1)}</td>
              <td className="p-2.5 text-center text-emerald-800">{totalApproved.toFixed(1)}</td>
              <td className="p-2.5"></td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-4 gap-4 pt-6 border-t text-xs text-center text-slate-700 font-bold">
          <div className="space-y-8">
            <div>أخصائي فحص المعمل وتوكيد الجودة</div>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
          </div>
          <div className="space-y-8">
            <div>مدير إدارة الإنتاج</div>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
          </div>
          <div className="space-y-8">
            <div>مراقب التكاليف الصناعية</div>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
          </div>
          <div className="space-y-8">
            <div>المدير الفني والعام</div>
            <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-100 cursor-pointer"
          >
            إغلاق
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير الفني المعتمد</span>
          </button>
        </div>
      </div>
    </div>
  );
}
