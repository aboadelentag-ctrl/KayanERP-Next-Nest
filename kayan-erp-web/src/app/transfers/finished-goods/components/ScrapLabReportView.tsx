'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Download,
  ShieldCheck,
  Flame,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  TrendingDown,
  Warehouse,
  Scale,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FinishedGoodsTransfer, WarehouseLookup, ItemLookup } from '../page';

interface ScrapLabReportViewProps {
  transfers: FinishedGoodsTransfer[];
  warehouses: WarehouseLookup[];
  items: ItemLookup[];
  onOpenPrintModal: () => void;
  getStatusBadge: (status: string) => { label: string; color: string };
}

export default function ScrapLabReportView({
  transfers,
  warehouses,
  items,
  onOpenPrintModal,
  getStatusBadge,
}: ScrapLabReportViewProps) {
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [itemId, setItemId] = useState('');
  const [wasteFilter, setWasteFilter] = useState<string>('ALL'); // ALL, HAS_SCRAP, HAS_SAMPLE, HAS_REWORK, ZERO_SCRAP
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedTransferId, setExpandedTransferId] = useState<string | null>(null);

  // Filtered Source Warehouses
  const sourceWarehouses = useMemo(() => {
    return warehouses.filter(
      (w) =>
        w.warehouse_type === 'صالة تشغيل' ||
        w.warehouse_type === 'FLOOR_STOCK' ||
        w.warehouse_name.includes('صالة') ||
        w.warehouse_name.includes('قسم')
    );
  }, [warehouses]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return transfers.filter((t) => {
      const matchSearch =
        !searchTerm ||
        t.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.productionOrderNumber && t.productionOrderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.items && t.items.some((it) => it.itemName?.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchWh = !sourceWarehouseId || t.sourceWarehouseId === sourceWarehouseId;
      const matchItem = !itemId || t.itemId === itemId || (t.items && t.items.some((it) => it.itemId === itemId));

      let matchWaste = true;
      if (wasteFilter === 'HAS_SCRAP') {
        matchWaste = Number(t.qcScrapQty || 0) > 0;
      } else if (wasteFilter === 'HAS_SAMPLE') {
        matchWaste = Number(t.qcSampleQty || 0) > 0;
      } else if (wasteFilter === 'HAS_REWORK') {
        matchWaste = Number(t.qcReworkQty || 0) > 0;
      } else if (wasteFilter === 'ZERO_SCRAP') {
        matchWaste = Number(t.qcScrapQty || 0) === 0 && Number(t.qcApprovedQty || 0) > 0;
      }

      let matchDate = true;
      if (dateFrom && t.transferDate) {
        matchDate = matchDate && new Date(t.transferDate) >= new Date(dateFrom);
      }
      if (dateTo && t.transferDate) {
        matchDate = matchDate && new Date(t.transferDate) <= new Date(dateTo);
      }

      return matchSearch && matchWh && matchItem && matchWaste && matchDate;
    });
  }, [transfers, searchTerm, sourceWarehouseId, itemId, wasteFilter, dateFrom, dateTo]);

  // Aggregated Metrics
  const stats = useMemo(() => {
    let totalSamples = 0;
    let totalScrap = 0;
    let totalRework = 0;
    let totalApproved = 0;
    let totalDispatched = 0;

    filteredRows.forEach((t) => {
      totalSamples += Number(t.qcSampleQty || 0);
      totalScrap += Number(t.qcScrapQty || 0);
      totalRework += Number(t.qcReworkQty || 0);
      totalApproved += Number(t.qcApprovedQty || 0);
      totalDispatched += Number(t.prodDispatchedQty || 0);
    });

    const scrapRate = totalDispatched > 0 ? (totalScrap / totalDispatched) * 100 : 0;
    const reworkRate = totalDispatched > 0 ? (totalRework / totalDispatched) * 100 : 0;
    const approvedRate = totalDispatched > 0 ? (totalApproved / totalDispatched) * 100 : 0;
    const estimatedScrapCost = totalScrap * 65; // EGP average finished goods batch cost

    return {
      totalSamples,
      totalScrap,
      totalRework,
      totalApproved,
      totalDispatched,
      scrapRate,
      reworkRate,
      approvedRate,
      estimatedScrapCost,
    };
  }, [filteredRows]);

  // CSV Export
  const handleExportCsv = () => {
    if (filteredRows.length === 0) return;

    const headers = [
      'رقم الإذن',
      'التاريخ',
      'أمر التشغيل',
      'رقم اللوط',
      'الصنف',
      'صالة الإنتاج',
      'الكمية المسلمة (كجم)',
      'عينة الفحص المعملي (كجم)',
      'الهالك والتالف الفني (كجم)',
      'نسبة الهدر الفني %',
      'المرتجع للتعديل (كجم)',
      'الصافي المقبول للكنترول (كجم)',
      'مسؤول فحص الجودة',
      'أسباب التلف وملاحظات المعمل',
      'الحالة الرقابية',
    ];

    const rows = filteredRows.map((t) => {
      const disp = Number(t.prodDispatchedQty || 1);
      const scrap = Number(t.qcScrapQty || 0);
      const scrapPct = ((scrap / (disp || 1)) * 100).toFixed(1);

      return [
        t.transferNumber,
        t.transferDate ? t.transferDate.split('T')[0] : '',
        t.productionOrderNumber || '',
        t.batchNumber,
        `"${t.itemName}"`,
        `"${t.sourceWarehouseName}"`,
        t.prodDispatchedQty,
        t.qcSampleQty,
        t.qcScrapQty,
        `${scrapPct}%`,
        t.qcReworkQty,
        t.qcApprovedQty,
        `"${t.qcInspector || ''}"`,
        `"${(t.qcNotes || '').replace(/"/g, '""')}"`,
        `"${getStatusBadge(t.status).label}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_الهالك_والفحص_المعملي_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* 1. Header Banner & Universal Toolbar */}
      <div className="erp-sub border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black text-slate-100">
                تقرير الهالك والتالف الفني والفحص المعملي (QC Scrap & Lab Analytics)
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-black">
                تحليلات الهدر والجودة المعملية
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              تتبع عينات الفحص المخبري، كميات الهالك والتالف، نسب الهدر الفني، والأثر المالي على مستوى كل إذن وتشغيلة
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير Excel (CSV)</span>
          </button>

          <button
            onClick={onOpenPrintModal}
            disabled={filteredRows.length === 0}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>معاينة وطباعة التقرير الفني</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Lab Samples */}
        <div className="erp-sub border rounded-xl p-3 border-cyan-500/20 bg-cyan-500/5">
          <div className="flex items-center justify-between text-xs text-cyan-400 mb-1">
            <span>عينات الفحص المعملي</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black font-mono text-cyan-400">
            {stats.totalSamples.toFixed(1)} <span className="text-xs font-normal text-slate-400">كجم</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">مستهلكة في الاختبارات المخبرية</span>
        </div>

        {/* Technical Scrap */}
        <div className="erp-sub border rounded-xl p-3 border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
            <span>الهالك والتالف الفني</span>
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black font-mono text-rose-500">
            {stats.totalScrap.toFixed(1)} <span className="text-xs font-normal text-slate-400">كجم</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">تالف غير قابل للاستخدام</span>
        </div>

        {/* Scrap Rate */}
        <div className="erp-sub border rounded-xl p-3 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
            <span>معدل الهدر الفني</span>
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black font-mono text-amber-500">
            {stats.scrapRate.toFixed(2)}%
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">من إجمالي كميات التشغيل</span>
        </div>

        {/* Rework */}
        <div className="erp-sub border rounded-xl p-3 border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center justify-between text-xs text-purple-400 mb-1">
            <span>المرتجع للتعديل</span>
            <RotateCcw className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black font-mono text-purple-400">
            {stats.totalRework.toFixed(1)} <span className="text-xs font-normal text-slate-400">كجم</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">معاد تدويره وتشغيله</span>
        </div>

        {/* Approved Net */}
        <div className="erp-sub border rounded-xl p-3 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
            <span>الصافي المقبول والمعتمد</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black font-mono text-emerald-400">
            {stats.totalApproved.toFixed(1)} <span className="text-xs font-normal text-slate-400">كجم</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">مطابق ومسلّم للكنترول</span>
        </div>

        {/* Financial Waste Value */}
        <div className="erp-sub border rounded-xl p-3 border-slate-500/20">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>تكلفة الهدر التقديرية</span>
            <Scale className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black font-mono text-slate-200">
            {stats.estimatedScrapCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">ج.م</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">بناء على تكلفة التشغيل المباشرة</span>
        </div>
      </div>

      {/* 3. Advanced Multi-Criteria Filter Bar */}
      <div className="erp-sub border rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث برقم الإذن، أمر التشغيل، اللوط..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full erp-input-compact pr-9 pl-3 rounded-xl border erp-sub text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          {/* Source Hall */}
          <div>
            <select
              value={sourceWarehouseId}
              onChange={(e) => setSourceWarehouseId(e.target.value)}
              className="w-full erp-input-compact rounded-xl border erp-sub text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              <option value="">-- كافة صالات التشغيل --</option>
              {sourceWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.warehouse_name}
                </option>
              ))}
            </select>
          </div>

          {/* Item */}
          <div>
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="w-full erp-input-compact rounded-xl border erp-sub text-xs focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              <option value="">-- كافة الأصناف --</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.item_name} ({it.item_code})
                </option>
              ))}
            </select>
          </div>

          {/* Waste Filter */}
          <div>
            <select
              value={wasteFilter}
              onChange={(e) => setWasteFilter(e.target.value)}
              className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-bold focus:ring-2 focus:ring-cyan-500 outline-none text-slate-200"
            >
              <option value="ALL">كل التشغيلات المفحوصة</option>
              <option value="HAS_SCRAP">إذونات بها هالك وتالف فني فقط (&gt; 0)</option>
              <option value="HAS_SAMPLE">إذونات بها عينات معملية فقط (&gt; 0)</option>
              <option value="HAS_REWORK">إذونات بها مرتجع للتعديل فقط (&gt; 0)</option>
              <option value="ZERO_SCRAP">تشغيلات مطابقة 100% بدون أي هالك</option>
            </select>
          </div>

          {/* Date Range quick buttons */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-1/2 erp-input-compact rounded-xl border erp-sub text-[11px] font-mono outline-none"
              title="من تاريخ"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-1/2 erp-input-compact rounded-xl border erp-sub text-[11px] font-mono outline-none"
              title="إلى تاريخ"
            />
          </div>
        </div>
      </div>

      {/* 4. Analytical Data Table */}
      <div className="erp-sub border rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>سجل نتائج الفحص المعملي وتفاصيل الهالك ({filteredRows.length} إذن)</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            إجمالي الهالك المفلتر: <strong className="text-rose-400">{stats.totalScrap.toFixed(1)} كجم</strong>
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-bold">
            لا توجد أذونات مطابقة لمعايير الفلترة المختارة.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-500/20">
            <table className="w-full text-right text-xs">
              <thead className="erp-sub border-b text-slate-400 font-bold">
                <tr>
                  <th className="p-2.5">رقم الإذن</th>
                  <th className="p-2.5">أمر التشغيل واللوط</th>
                  <th className="p-2.5">الصنف</th>
                  <th className="p-2.5">صالة الإنتاج</th>
                  <th className="p-2.5 text-center text-slate-300">وزن التشغيلة</th>
                  <th className="p-2.5 text-center text-cyan-400">عينة المعمل</th>
                  <th className="p-2.5 text-center text-rose-500 font-black">الهالك والتالف</th>
                  <th className="p-2.5 text-center text-amber-400 font-bold">% الهدر</th>
                  <th className="p-2.5 text-center text-purple-400">المرتجع للتعديل</th>
                  <th className="p-2.5 text-center text-emerald-400 font-black">الصافي المقبول</th>
                  <th className="p-2.5">أخصائي الجودة وملاحظات المعمل</th>
                  <th className="p-2.5 text-center">قرار المعمل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500/10">
                {filteredRows.map((t) => {
                  const dispQty = Number(t.prodDispatchedQty || 1);
                  const scrapQty = Number(t.qcScrapQty || 0);
                  const sampleQty = Number(t.qcSampleQty || 0);
                  const reworkQty = Number(t.qcReworkQty || 0);
                  const approvedQty = Number(t.qcApprovedQty || 0);
                  const scrapPct = Number(((scrapQty / (dispQty || 1)) * 100).toFixed(1));
                  const isExpanded = expandedTransferId === t.id;

                  return (
                    <React.Fragment key={t.id}>
                      <tr className="hover:bg-slate-500/5 transition-all">
                        <td className="p-2.5 font-mono font-bold text-amber-500">
                          <div className="flex items-center gap-1.5">
                            {t.items && t.items.length > 1 && (
                              <button
                                onClick={() => setExpandedTransferId(isExpanded ? null : t.id)}
                                className="text-slate-400 hover:text-white"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <span>{t.transferNumber}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {t.transferDate ? t.transferDate.split('T')[0] : ''}
                          </span>
                        </td>

                        <td className="p-2.5">
                          <span className="font-mono text-slate-200 block">{t.productionOrderNumber || '-'}</span>
                          <span className="font-mono text-[10px] text-slate-400 block">{t.batchNumber}</span>
                        </td>

                        <td className="p-2.5 font-bold text-slate-100">
                          <div>{t.itemName}</div>
                          {t.items && t.items.length > 1 && (
                            <span className="text-[10px] text-cyan-400 font-mono">({t.items.length} أصناف مجمعة)</span>
                          )}
                        </td>

                        <td className="p-2.5 text-slate-300">{t.sourceWarehouseName}</td>

                        <td className="p-2.5 text-center font-mono font-bold text-slate-200">
                          {dispQty} {t.itemUnit || 'كجم'}
                        </td>

                        <td className="p-2.5 text-center font-mono font-bold text-cyan-400">
                          {sampleQty > 0 ? `${sampleQty} كجم` : '-'}
                        </td>

                        <td className="p-2.5 text-center font-mono font-black text-rose-500">
                          {scrapQty > 0 ? `${scrapQty} كجم` : '-'}
                        </td>

                        <td className="p-2.5 text-center font-mono font-bold">
                          {scrapQty > 0 ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                                scrapPct > 5
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : scrapPct > 2
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {scrapPct}%
                            </span>
                          ) : (
                            <span className="text-emerald-500 text-[11px]">0.0%</span>
                          )}
                        </td>

                        <td className="p-2.5 text-center font-mono font-bold text-purple-400">
                          {reworkQty > 0 ? `${reworkQty} كجم` : '-'}
                        </td>

                        <td className="p-2.5 text-center font-mono font-black text-emerald-400">
                          {approvedQty} {t.itemUnit || 'كجم'}
                        </td>

                        <td className="p-2.5 max-w-xs">
                          <span className="text-slate-300 block text-xs truncate">
                            {t.qcNotes || 'مطابق للمواصفات القياسية القياسية'}
                          </span>
                          {t.qcInspector && (
                            <span className="text-[10px] text-cyan-400 block font-bold">الفاحص: {t.qcInspector}</span>
                          )}
                        </td>

                        <td className="p-2.5 text-center">
                          {scrapQty > 0 && scrapPct > 5 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-black">
                              تجاوز الهدر المسموح
                            </span>
                          ) : scrapQty > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black">
                              هدر فني ضمن النسبة
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
                              مطابق معتمد ✓
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Multi-Item Expanded Rows */}
                      {isExpanded && t.items && t.items.length > 1 && (
                        <tr className="bg-slate-500/5">
                          <td colSpan={12} className="p-3">
                            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-500/20 space-y-2">
                              <span className="text-xs font-black text-cyan-400 block">
                                تفاصيل فحص الجودة المعملية لكل صنف داخل الإذن ({t.transferNumber}):
                              </span>
                              <table className="w-full text-right text-xs">
                                <thead className="border-b border-slate-500/20 text-slate-400 text-[11px]">
                                  <tr>
                                    <th className="p-1.5">الصنف</th>
                                    <th className="p-1.5">رقم اللوط</th>
                                    <th className="p-1.5 text-center">كمية التسليم</th>
                                    <th className="p-1.5 text-center text-cyan-400">عينة المعمل</th>
                                    <th className="p-1.5 text-center text-rose-500">الهالك الفني</th>
                                    <th className="p-1.5 text-center text-purple-400">المرتجع للتعديل</th>
                                    <th className="p-1.5 text-center text-emerald-400">الصافي المقبول</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-500/10">
                                  {t.items.map((it, iIdx) => (
                                    <tr key={iIdx}>
                                      <td className="p-1.5 font-bold text-slate-200">{it.itemName}</td>
                                      <td className="p-1.5 font-mono text-[10px] text-slate-400">{it.batchNumber}</td>
                                      <td className="p-1.5 text-center font-mono">{it.dispatchedQty} {it.itemUnit || 'كجم'}</td>
                                      <td className="p-1.5 text-center font-mono text-cyan-400">{it.qcSampleQty || 0} كجم</td>
                                      <td className="p-1.5 text-center font-mono text-rose-500">{it.qcScrapQty || 0} كجم</td>
                                      <td className="p-1.5 text-center font-mono text-purple-400">{it.qcReworkQty || 0} كجم</td>
                                      <td className="p-1.5 text-center font-mono text-emerald-400 font-bold">{it.qcApprovedQty || 0} كجم</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
