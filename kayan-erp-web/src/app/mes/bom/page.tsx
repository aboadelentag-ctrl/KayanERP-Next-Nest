'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
  Layers,
  Plus,
  RefreshCw,
  GitFork,
  Boxes,
  FileCode,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Sparkles,
  X,
  Package,
  Cpu,
  Trash2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function BomEngineeringPage() {
  const { socket } = useSocket();
  const [boms, setBoms] = useState<any[]>([]);
  const [itemsList, setItemsList] = useState<any[]>([]);
  const [selectedBom, setSelectedBom] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // New BOM Form State
  const [newBom, setNewBom] = useState({
    bomCode: '',
    bomName: '',
    itemId: '',
    version: '1.0',
    standardBatchQty: 100,
    batchUnit: 'كجم',
    totalCost: 0,
    notes: 'تركيبة معيارية معتمدة لمصانع أبو عادل',
    items: [
      { componentItemId: '', quantity: 50, unit: 'كجم', scrapFactorPct: 2, itemType: 'RAW_MATERIAL' },
    ],
  });

  useEffect(() => {
    if (!newBom.bomCode) {
      setNewBom((prev) => ({
        ...prev,
        bomCode: `BOM-${Math.floor(Math.random() * 9000 + 1000)}`,
      }));
    }
  }, [newBom.bomCode]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [bomsRes, itemsRes] = await Promise.all([
        fetch(`${API_BASE}/mes/boms`).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/inventory/items`).then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      const bomData = Array.isArray(bomsRes) ? bomsRes : [];
      setBoms(bomData);
      setItemsList(itemsRes.data || []);
      if (bomData.length > 0 && !selectedBom) {
        setSelectedBom(bomData[0]);
      }
      if (itemsRes.data?.[0] && !newBom.itemId) {
        setNewBom((prev) => ({
          ...prev,
          itemId: itemsRes.data[0].id,
          bomName: `تركيبة ${itemsRes.data[0].item_name}`,
          items: [{ ...prev.items[0], componentItemId: itemsRes.data[0].id }],
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedBom, newBom.itemId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time events
  useEffect(() => {
    if (!socket) return;
    socket.on('bom_created', () => fetchData());
    return () => {
      socket.off('bom_created');
    };
  }, [socket, fetchData]);

  const handleAddComponentLine = () => {
    setNewBom((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { componentItemId: itemsList[0]?.id || '', quantity: 10, unit: 'كجم', scrapFactorPct: 0, itemType: 'RAW_MATERIAL' },
      ],
    }));
  };

  const handleRemoveComponentLine = (index: number) => {
    setNewBom((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleCreateBom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/mes/boms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBom),
      });
      setShowCreateModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen px-3 py-3 md:px-5 space-y-3 erp-container-fluid">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
              هندسة التركيبات وقوائم المواد الصناعية (Multi-Level BOM)
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              MES & Recipe Versioning
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            إدارة إصدارات التركيبات الشجرية متعددة المستويات، نسب الهدر المعياري، والمنتجات الثانوية (By-Products)
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
            className="erp-btn-compact px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 text-xs font-bold shadow-md"
          >
            <Plus className="w-4 h-4" />
            إضافة تركيبة جديدة (New BOM)
          </button>
        </div>
      </div>

      {/* Main Split Layout: BOM List & Hierarchy Tree View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: BOM Catalog */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">
            دليل التركيبات المعتمدة ({boms.length})
          </div>

          <div className="space-y-1.5 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {boms.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-white/5">
                لا توجد تركيبات مسجلة حتى الآن. انقر على زر إضافة تركيبة للبدء.
              </div>
            ) : (
              boms.map((bom) => {
                const isSelected = selectedBom?.id === bom.id;
                return (
                  <div
                    key={bom.id}
                    onClick={() => setSelectedBom(bom)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-900/60 border-white/10 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-bold text-indigo-400">{bom.bom_code}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-white/10 text-slate-300">
                        v{bom.version}
                      </span>
                    </div>
                    <div className="font-bold text-white text-xs">{bom.bom_name}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                      <span>المنتج: {bom.itemName}</span>
                      <span className="font-bold text-slate-300">{Number(bom.standard_batch_qty)} {bom.batch_unit}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detailed Multi-Level BOM Tree & Component Breakdown */}
        <div className="lg:col-span-8">
          {selectedBom ? (
            <div className="erp-card p-3.5 rounded-xl border border-white/10 bg-slate-900/90 space-y-3">
              {/* Selected BOM Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white">{selectedBom.bom_name}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                      {selectedBom.bom_code} (v{selectedBom.version})
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    المنتج التام: <span className="font-bold text-slate-200">{selectedBom.itemName}</span> ({selectedBom.itemCode}) | التشغيلة القياسية: <span className="font-bold text-amber-400">{Number(selectedBom.standard_batch_qty)} {selectedBom.batch_unit}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] text-slate-400">التكلفة التقديرية للدفعة</div>
                  <div className="text-sm font-black text-emerald-400">
                    {Number(selectedBom.total_cost || 0).toLocaleString()} ج.م
                  </div>
                </div>
              </div>

              {/* Tree View Table of Components */}
              <div className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <GitFork className="w-4 h-4 text-indigo-400" />
                شجرة المكونات والخامات ونسب الهدر (Components & By-Products)
              </div>

              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 font-bold border-b border-white/10">
                    <tr>
                      <th className="p-2">البند / المكون</th>
                      <th className="p-2">النوع والتصنيف</th>
                      <th className="p-2">الكمية للدفعة</th>
                      <th className="p-2">الوحدة</th>
                      <th className="p-2">معامل الهدر (%)</th>
                      <th className="p-2">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedBom.bom_items?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500">
                          لا توجد مكونات مسجلة لهذه التركيبة
                        </td>
                      </tr>
                    ) : (
                      selectedBom.bom_items?.map((item: any) => {
                        const isByProduct = item.item_type === 'BY_PRODUCT';
                        const isSubAssembly = item.item_type === 'SUB_ASSEMBLY';

                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40">
                            <td className="p-2 font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-400" />
                              {item.componentName}
                              <span className="text-[10px] text-slate-400 font-mono">({item.componentCode})</span>
                            </td>
                            <td className="p-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  isByProduct
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : isSubAssembly
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}
                              >
                                {isByProduct ? 'منتج ثانوي (By-Product)' : isSubAssembly ? 'نصف مصنع (Sub-Assembly)' : 'خام أولي (Raw Material)'}
                              </span>
                            </td>
                            <td className="p-2 font-black text-slate-200">{Number(item.quantity)}</td>
                            <td className="p-2 text-slate-400">{item.unit}</td>
                            <td className="p-2 font-mono text-rose-400">{Number(item.scrap_factor_pct)}%</td>
                            <td className="p-2 text-slate-400">{item.notes || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {selectedBom.notes && (
                <div className="p-2.5 rounded-lg bg-slate-800/40 border border-white/5 text-xs text-slate-300">
                  <span className="font-bold text-amber-400">توصيات الإنتاج والمعايير: </span>
                  {selectedBom.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-slate-900/40 rounded-xl border border-white/10">
              اختر تركيبة من القائمة الجانبية لعرض تفاصيلها وشجرة مكوناتها
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create BOM */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form onSubmit={handleCreateBom} className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-2xl p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-indigo-400 font-black text-sm">
                <Layers className="w-5 h-5" />
                تعريف تركيبة صناعية جديدة (BOM Header & Lines)
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">كود التركيبة</label>
                <input
                  required
                  value={newBom.bomCode}
                  onChange={(e) => setNewBom({ ...newBom, bomCode: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">اسم التركيبة</label>
                <input
                  required
                  value={newBom.bomName}
                  onChange={(e) => setNewBom({ ...newBom, bomName: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">المنتج التام</label>
                <select
                  required
                  value={newBom.itemId}
                  onChange={(e) => setNewBom({ ...newBom, itemId: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                >
                  {itemsList.map((it) => (
                    <option key={it.id} value={it.id}>{it.item_name} ({it.unit})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">الإصدار (Version)</label>
                <input
                  value={newBom.version}
                  onChange={(e) => setNewBom({ ...newBom, version: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">حجم التشغيلة القياسية</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newBom.standardBatchQty}
                  onChange={(e) => setNewBom({ ...newBom, standardBatchQty: parseFloat(e.target.value) || 0 })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">وحدة التشغيلة</label>
                <input
                  value={newBom.batchUnit}
                  onChange={(e) => setNewBom({ ...newBom, batchUnit: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">التكلفة التقديرية (ج.م)</label>
                <input
                  type="number"
                  value={newBom.totalCost}
                  onChange={(e) => setNewBom({ ...newBom, totalCost: parseFloat(e.target.value) || 0 })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>
            </div>

            {/* Components Sub-Form */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">مكونات وخامات التركيبة (BOM Items):</span>
                <button
                  type="button"
                  onClick={handleAddComponentLine}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" /> إضافة مكون
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {newBom.items.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1.5 items-center bg-slate-800/60 p-1.5 rounded-lg border border-white/5 text-xs">
                    <div className="col-span-5">
                      <select
                        value={line.componentItemId}
                        onChange={(e) => {
                          const items = [...newBom.items];
                          items[idx].componentItemId = e.target.value;
                          setNewBom({ ...newBom, items });
                        }}
                        className="w-full erp-input-compact rounded bg-slate-700 text-white text-[11px]"
                      >
                        {itemsList.map((it) => (
                          <option key={it.id} value={it.id}>{it.item_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="الكمية"
                        value={line.quantity}
                        onChange={(e) => {
                          const items = [...newBom.items];
                          items[idx].quantity = parseFloat(e.target.value) || 0;
                          setNewBom({ ...newBom, items });
                        }}
                        className="w-full erp-input-compact rounded bg-slate-700 text-white text-[11px]"
                      />
                    </div>

                    <div className="col-span-3">
                      <select
                        value={line.itemType}
                        onChange={(e) => {
                          const items = [...newBom.items];
                          items[idx].itemType = e.target.value;
                          setNewBom({ ...newBom, items });
                        }}
                        className="w-full erp-input-compact rounded bg-slate-700 text-white text-[11px]"
                      >
                        <option value="RAW_MATERIAL">مادة خام</option>
                        <option value="SUB_ASSEMBLY">نصف مصنع</option>
                        <option value="BY_PRODUCT">منتج ثانوي</option>
                      </select>
                    </div>

                    <div className="col-span-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveComponentLine(idx)}
                        disabled={newBom.items.length <= 1}
                        className="p-1 text-rose-400 hover:text-rose-300 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
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
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow"
              >
                حفظ التركيبة الصناعية
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
