'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  DollarSign,
  Tag,
} from 'lucide-react';
import EngineeringHeader from '../components/EngineeringHeader';

interface Material {
  id: string;
  code: string;
  name: string;
  material_type: string;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  unit_cost: number;
  is_remnant: boolean;
  remnant_dimension?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function EngineeringInventoryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [remnantFilter, setRemnantFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal: New Material
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'SPARE_PART' | 'STAINLESS_STEEL' | 'IRON_STEEL' | 'WOOD' | 'CONSUMABLE'>('STAINLESS_STEEL');
  const [newUnit, setNewUnit] = useState('لوح');
  const [newStock, setNewStock] = useState(10);
  const [newMinStock, setNewMinStock] = useState(2);
  const [newCost, setNewCost] = useState(1200);
  const [newIsRemnant, setNewIsRemnant] = useState(false);
  const [newRemnantDim, setNewRemnantDim] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/engineering/materials`);
      if (res.data?.success) {
        setMaterials(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    setCreating(true);
    try {
      const res = await axios.post(`${API_BASE}/engineering/materials`, {
        code: newCode,
        name: newName,
        materialType: newType,
        unit: newUnit,
        currentStock: Number(newStock),
        minStockLevel: Number(newMinStock),
        unitCost: Number(newCost),
        isRemnant: newIsRemnant,
        remnantDimension: newRemnantDim || undefined,
      });

      if (res.data?.success) {
        setShowNewModal(false);
        setNewCode('');
        setNewName('');
        setNewRemnantDim('');
        fetchMaterials();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر إضافة البند');
    } finally {
      setCreating(false);
    }
  };

  const exportRows = materials.map((m) => ({
    'كود البند': m.code,
    'اسم الخامة / قطعة الغيار': m.name,
    'النوع': m.material_type,
    'الوحدة': m.unit,
    'الرصيد الفعلي': m.current_stock,
    'حد الطلب الأدنى': m.min_stock_level,
    'تكلفة الوحدة (ج.م)': m.unit_cost,
    'فضلات وبواقي صالحة': m.is_remnant ? 'نعم' : 'لا',
    'أبعاد القطعة': m.remnant_dimension || '',
  }));

  const filteredMaterials = materials.filter((m) => {
    const matchesType = typeFilter === 'ALL' || m.material_type === typeFilter;
    const matchesRemnant =
      remnantFilter === 'ALL' ||
      (remnantFilter === 'REMNANT' && m.is_remnant) ||
      (remnantFilter === 'STANDARD' && !m.is_remnant);
    const matchesSearch =
      !searchQuery ||
      m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesRemnant && matchesSearch;
  });

  // Metrics
  const totalItems = materials.length;
  const lowStockCount = materials.filter((m) => Number(m.current_stock) <= Number(m.min_stock_level)).length;
  const remnantCount = materials.filter((m) => m.is_remnant).length;
  const totalStockValue = materials.reduce(
    (acc, m) => acc + Number(m.current_stock) * Number(m.unit_cost),
    0
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12" dir="rtl">
      <EngineeringHeader
        title="مخازن قطع الغيار والخامات الهندسية (Engineering Materials & Remnants)"
        subtitle="إدارة ألواح الاستانلس 304، الحديد، الأخشاب، ومتابعة فضلات وبواقي القص القابلة للاستخدام"
        entityName="materials"
        exportData={exportRows}
        exportFileName="مخزن_الخامات_وقطع_الغيار.xlsx"
        onImportSuccess={fetchMaterials}
        primaryAction={{
          label: 'إضافة خامة / قطعة غيار',
          onClick: () => setShowNewModal(true),
          icon: Plus,
        }}
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">إجمالي الأصناف الهندسية</span>
              <span className="text-lg font-black text-white font-mono">{totalItems}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-red-900/40 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">أصناف قاربت النفاد (حد الطلب)</span>
              <span className="text-lg font-black text-red-400 font-mono">{lowStockCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-900/40 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">فضلات وبواقي قص صالحة</span>
              <span className="text-lg font-black text-amber-400 font-mono">{remnantCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-900/40 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">القيمة المالية للمخزون</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{totalStockValue.toFixed(0)} ج.م</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-300">النوع:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white outline-none"
            >
              <option value="ALL">كافة الخامات</option>
              <option value="STAINLESS_STEEL">استانلس ستيل (ألواح ومواسير)</option>
              <option value="IRON_STEEL">حديد صلب وزوايا وكمرات</option>
              <option value="WOOD">أخشاب وألواح زان وMDF</option>
              <option value="SPARE_PART">قطع غيار ماكينات</option>
              <option value="CONSUMABLE">مستهلكات (أسلاك/غراء/مسامير)</option>
            </select>

            <span className="font-semibold text-slate-300 mr-2">التصنيف المخزني:</span>
            <div className="flex items-center gap-1">
              {[
                { k: 'ALL', l: 'الكل' },
                { k: 'STANDARD', l: 'خامات قياسية كاملة' },
                { k: 'REMNANT', l: 'فضلات وبواقي قص' },
              ].map((r) => (
                <button
                  key={r.k}
                  onClick={() => setRemnantFilter(r.k)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    remnantFilter === r.k
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {r.l}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-72">
            <input
              type="text"
              placeholder="بحث بكود الخامة، الاسم، الأبعاد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2" />
          </div>
        </div>

        {/* Materials Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3">كود البند</th>
                <th className="p-3">اسم الخامة / قطعة الغيار</th>
                <th className="p-3">النوع والمادة</th>
                <th className="p-3">الوحدة</th>
                <th className="p-3">الرصيد الفعلي</th>
                <th className="p-3">حد الطلب الأدنى</th>
                <th className="p-3">تكلفة الوحدة</th>
                <th className="p-3">طبيعة الخامة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    جاري تحميل مخزون الخامات الهندسية...
                  </td>
                </tr>
              ) : filteredMaterials.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    لا توجد خامات تطابق شروط التصفية
                  </td>
                </tr>
              ) : (
                filteredMaterials.map((m) => {
                  const isLow = Number(m.current_stock) <= Number(m.min_stock_level);
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-amber-400">{m.code}</td>
                      <td className="p-3">
                        <strong className="block text-white text-xs">{m.name}</strong>
                        {m.remnant_dimension && (
                          <span className="text-[10px] text-amber-400 font-mono">
                            أبعاد الفضلة: {m.remnant_dimension}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                          {m.material_type}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-400">{m.unit}</td>
                      <td className="p-3">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isLow ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {m.current_stock}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-400">{m.min_stock_level}</td>
                      <td className="p-3 font-mono font-bold text-white">{m.unit_cost} ج.م</td>
                      <td className="p-3">
                        {m.is_remnant ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            بواقي وفضلات
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            خامة قياسية
                          </span>
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

      {/* Modal: New Material */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-400" />
                إضافة خامة / قطعة غيار للمخزن الهندسي
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-500 hover:text-white">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateMaterial} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">كود البند:</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="MAT-SS-304"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">النوع والمادة:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="STAINLESS_STEEL">استانلس ستيل 304 عذائي</option>
                    <option value="IRON_STEEL">حديد وصلب وزوايا</option>
                    <option value="WOOD">خشب زان وألواح MDF</option>
                    <option value="SPARE_PART">قطع غيار ماكينات</option>
                    <option value="CONSUMABLE">مستهلكات ولحام</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اسم الخامة / قطعة الغيار:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="لوح استانلس 304 سمك 1.5 مم، كباس تبريد 1.5 حصان..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">وحدة القياس:</label>
                  <input
                    type="text"
                    required
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="لوح / متر / قطعة"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الرصيد المبدئي:</label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">تكلفة الوحدة (ج.م):</label>
                  <input
                    type="number"
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remnantCheck"
                    checked={newIsRemnant}
                    onChange={(e) => setNewIsRemnant(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded"
                  />
                  <label htmlFor="remnantCheck" className="text-amber-300 font-bold cursor-pointer">
                    تصنيف البند كـ (فضلات وبواقي قص صالحة للاستخدام)
                  </label>
                </div>
                {newIsRemnant && (
                  <input
                    type="text"
                    value={newRemnantDim}
                    onChange={(e) => setNewRemnantDim(e.target.value)}
                    placeholder="أبعاد القطعة: مثلاً 80 × 120 سم"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  />
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
                >
                  {creating ? 'جاري الإضافة...' : 'حفظ البند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
