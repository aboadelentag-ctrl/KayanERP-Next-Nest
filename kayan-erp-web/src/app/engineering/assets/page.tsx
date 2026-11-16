'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings,
  Plus,
  Search,
  Filter,
  Building,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  DollarSign,
  Layers,
  Wrench,
  Boxes,
} from 'lucide-react';
import EngineeringHeader from '../components/EngineeringHeader';

interface EngineeringAsset {
  id: string;
  asset_code: string;
  name: string;
  category: string;
  serial_number?: string;
  warranty_expiry?: string;
  status: string;
  total_maintenance_cost: number;
  is_internally_fabricated: boolean;
  created_at: string;
  branches?: {
    id: string;
    branch_name: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function EngineeringAssetsPage() {
  const [assets, setAssets] = useState<EngineeringAsset[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal: New Asset
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'PRODUCTION_LINE' | 'RETAIL_REFRIGERATION' | 'FLEET_COOLING' | 'FURNITURE_TROLLEY' | 'FACILITY'>('PRODUCTION_LINE');
  const [newBranchId, setNewBranchId] = useState('');
  const [newSerial, setNewSerial] = useState('');
  const [newWarranty, setNewWarranty] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetsRes, branchesRes] = await Promise.all([
        axios.get(`${API_BASE}/engineering/assets`),
        axios.get(`${API_BASE}/branches`),
      ]);

      if (assetsRes.data?.success) setAssets(assetsRes.data.data);
      if (branchesRes.data?.success) setBranches(branchesRes.data.data);
    } catch (err) {
      console.error('Failed to load assets data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    setCreating(true);
    try {
      const res = await axios.post(`${API_BASE}/engineering/assets`, {
        assetCode: newCode,
        name: newName,
        category: newCategory,
        branchId: newBranchId || undefined,
        serialNumber: newSerial || undefined,
        warrantyExpiry: newWarranty || undefined,
      });

      if (res.data?.success) {
        setShowNewModal(false);
        setNewCode('');
        setNewName('');
        setNewSerial('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر إنشاء الأصل');
    } finally {
      setCreating(false);
    }
  };

  const exportRows = assets.map((a) => ({
    'كود الأصل': a.asset_code,
    'اسم الأصل': a.name,
    'التصنيف': a.category,
    'الفرع المخصص': a.branches?.branch_name || 'عام',
    'الرقم التسلسلي': a.serial_number || 'غير مسجل',
    'حالة الأصل': a.status,
    'تكلفة الصيانة التراكمية (ج.م)': a.total_maintenance_cost,
    'تصنيع داخلي': a.is_internally_fabricated ? 'نعم' : 'لا',
    'تاريخ الإدخال': a.created_at.split('T')[0],
  }));

  const filteredAssets = assets.filter((a) => {
    const matchesCat = categoryFilter === 'ALL' || a.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      a.asset_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStatus && matchesSearch;
  });

  // Category counts
  const totalAssets = assets.length;
  const operationalCount = assets.filter((a) => a.status === 'OPERATIONAL').length;
  const inMaintCount = assets.filter((a) => a.status === 'UNDER_MAINTENANCE' || a.status === 'PENDING_QA_CLEARANCE').length;
  const internallyFabCount = assets.filter((a) => a.is_internally_fabricated).length;
  const totalMaintCost = assets.reduce((acc, a) => acc + Number(a.total_maintenance_cost || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12" dir="rtl">
      <EngineeringHeader
        title="سجل الأصول الهندسية والماكينات (Engineering Assets & CMMS Registry)"
        subtitle="حصر ماكينات خطوط الإنتاج، ثلاجات العرض، أساطيل التبريد، والأثاث والتروليات المصنعة داخلياً"
        entityName="assets"
        exportData={exportRows}
        exportFileName="سجل_الأصول_الهندسية.xlsx"
        onImportSuccess={fetchData}
        primaryAction={{
          label: 'إضافة أصل هندسي جديد',
          onClick: () => setShowNewModal(true),
          icon: Plus,
        }}
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Metric Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">إجمالي الأصول</span>
              <span className="text-lg font-black text-white font-mono">{totalAssets}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-900/40 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">أصول تعمل بكفاءة</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{operationalCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-red-900/40 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-red-500/20 text-red-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">قيد الصيانة والتأهيل</span>
              <span className="text-lg font-black text-red-400 font-mono">{inMaintCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-900/40 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">تصنيع ورش داخلي</span>
              <span className="text-lg font-black text-amber-400 font-mono">{internallyFabCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">مصروفات الصيانة التراكمية</span>
              <span className="text-lg font-black text-white font-mono">{totalMaintCost.toFixed(0)} ج.م</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-300">التصنيف:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white outline-none"
            >
              <option value="ALL">كافة التصنيفات</option>
              <option value="PRODUCTION_LINE">خطوط وماكينات الإنتاج (MES)</option>
              <option value="RETAIL_REFRIGERATION">ثلاجات ومبردات المعارض</option>
              <option value="FLEET_COOLING">سيارات التوزيع المبردة</option>
              <option value="FURNITURE_TROLLEY">تروليات وأثاث ومكاتب</option>
              <option value="FACILITY">تجهيزات ومرافق المبنى</option>
            </select>

            <span className="font-semibold text-slate-300 mr-2">الحالة:</span>
            <div className="flex items-center gap-1">
              {[
                { k: 'ALL', l: 'الكل' },
                { k: 'OPERATIONAL', l: 'يعمل' },
                { k: 'UNDER_MAINTENANCE', l: 'صيانة' },
                { k: 'PENDING_QA_CLEARANCE', l: 'قفل الجودة' },
              ].map((s) => (
                <button
                  key={s.k}
                  onClick={() => setStatusFilter(s.k)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    statusFilter === s.k
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-72">
            <input
              type="text"
              placeholder="بحث بكود الأصل، اسم الماكينة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2" />
          </div>
        </div>

        {/* Assets Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3">كود الأصل</th>
                <th className="p-3">اسم الأصل والمعدة</th>
                <th className="p-3">التصنيف الهندسي</th>
                <th className="p-3">الفرع المخصص</th>
                <th className="p-3">مصدر الأصل</th>
                <th className="p-3">حالة التشغيل</th>
                <th className="p-3 text-left">تكلفة الصيانة التراكمية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    جاري تحميل سجل الأصول الهندسية...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    لا توجد أصول تطابق شروط التصفية
                  </td>
                </tr>
              ) : (
                filteredAssets.map((a) => {
                  const isUnderMaint = a.status === 'UNDER_MAINTENANCE' || a.status === 'PENDING_QA_CLEARANCE';
                  return (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono font-bold text-amber-400">{a.asset_code}</td>
                      <td className="p-3">
                        <strong className="block text-white text-xs">{a.name}</strong>
                        {a.serial_number && (
                          <span className="text-[10px] text-slate-500 font-mono">S/N: {a.serial_number}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-medium">
                          {a.category}
                        </span>
                      </td>
                      <td className="p-3">{a.branches?.branch_name || 'الفرع الرئيسي - المصنع'}</td>
                      <td className="p-3">
                        {a.is_internally_fabricated ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                            تصنيع ورش داخلي
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">توريد خارجي</span>
                        )}
                      </td>
                      <td className="p-3">
                        {a.status === 'OPERATIONAL' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            يعمل بكفاءة
                          </span>
                        )}
                        {a.status === 'UNDER_MAINTENANCE' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-bold flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            تحت الصيانة
                          </span>
                        )}
                        {a.status === 'PENDING_QA_CLEARANCE' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3" />
                            بانتظار توقيع الجودة
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-amber-300">
                        {Number(a.total_maintenance_cost || 0).toFixed(2)} ج.م
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Asset */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                إضافة أصل هندسي / ماكينة جديدة
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-500 hover:text-white">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">كود الأصل:</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="EQ-OVEN-01"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">التصنيف:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="PRODUCTION_LINE">خط وماكينة إنتاج (MES)</option>
                    <option value="RETAIL_REFRIGERATION">ثلاجة عرض معرض</option>
                    <option value="FLEET_COOLING">سيارة نقل مبردة</option>
                    <option value="FURNITURE_TROLLEY">ترولي أو أثاث</option>
                    <option value="FACILITY">مرفق ومبنى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اسم الأصل / الماكينة:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="فرن دوار إيطالي 180 رغيف، عجانة حلواني حلزونية 100 كجم..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">الفرع المخصص:</label>
                  <select
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="">المصنع المركزي</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr || b.branch_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الرقم التسلسلي S/N:</label>
                  <input
                    type="text"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    placeholder="SN-948172"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
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
                  {creating ? 'جاري الإضافة...' : 'حفظ الأصل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
