'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Layers,
  Plus,
  Boxes,
  Building,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  User,
  Wrench,
  Hammer,
} from 'lucide-react';
import EngineeringHeader from '../components/EngineeringHeader';

interface Workshop {
  id: string;
  code: string;
  name: string;
  specialtyType: string;
  supervisorName: string;
  staffCount: number;
  maintenanceRoutesCount: number;
  fabricationRoutesCount: number;
  activeOrdersCount: number;
  activeTicketsCount: number;
  maintenanceRoutes: any[];
  fabricationRoutes: any[];
}

interface FabricationOrder {
  id: string;
  order_number: string;
  item_name: string;
  quantity: number;
  status: string;
  current_step_name?: string;
  labor_hours: number;
  materials_cost: number;
  labor_cost: number;
  total_actual_cost: number;
  notes?: string;
  created_at: string;
  engineering_workshops?: {
    id: string;
    name: string;
  };
  branches?: {
    id: string;
    branch_name: string;
  };
}

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  current_stock: number;
  unit_cost: number;
}

interface Branch {
  id: string;
  nameAr?: string;
  branch_name?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function WorkshopsFabricationPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [orders, setOrders] = useState<FabricationOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('ALL');

  // Modal: New Workshop
  const [showNewWorkshopModal, setShowNewWorkshopModal] = useState(false);
  const [wsCode, setWsCode] = useState('');
  const [wsName, setWsName] = useState('');
  const [wsSpecialty, setWsSpecialty] = useState('WELDING_FABRICATION');
  const [wsSupervisor, setWsSupervisor] = useState('');
  const [creatingWs, setCreatingWs] = useState(false);

  // Modal: New Fabrication Order
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [orderWorkshopId, setOrderWorkshopId] = useState('');
  const [orderItemName, setOrderItemName] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [orderBranchId, setOrderBranchId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Modal: Issue Material / Remnants
  const [selectedOrderForMaterial, setSelectedOrderForMaterial] = useState<FabricationOrder | null>(null);
  const [selectedMatId, setSelectedMatId] = useState('');
  const [matQty, setMatQty] = useState(1);
  const [isRemnantReturn, setIsRemnantReturn] = useState(false);
  const [matNotes, setMatNotes] = useState('');
  const [issuingMat, setIssuingMat] = useState(false);

  // Modal: Capitalize Order
  const [selectedOrderForCap, setSelectedOrderForCap] = useState<FabricationOrder | null>(null);
  const [capLaborHours, setCapLaborHours] = useState(12);
  const [capNotes, setCapNotes] = useState('');
  const [capitalizing, setCapitalizing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wsRes, ordRes, matRes, brRes] = await Promise.all([
        axios.get(`${API_BASE}/engineering/workshops`),
        axios.get(`${API_BASE}/engineering/fabrication/orders`),
        axios.get(`${API_BASE}/engineering/materials`),
        axios.get(`${API_BASE}/branches`),
      ]);

      if (wsRes.data?.success) setWorkshops(wsRes.data.data);
      if (ordRes.data?.success) setOrders(ordRes.data.data);
      if (matRes.data?.success) setMaterials(matRes.data.data);
      if (brRes.data?.success) setBranches(brRes.data.data);
    } catch (err) {
      console.error('Failed to load workshops data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create Workshop
  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsCode.trim() || !wsName.trim()) return;

    setCreatingWs(true);
    try {
      const res = await axios.post(`${API_BASE}/engineering/workshops`, {
        code: wsCode,
        name: wsName,
        specialtyType: wsSpecialty,
        supervisorName: wsSupervisor,
      });

      if (res.data?.success) {
        setShowNewWorkshopModal(false);
        setWsCode('');
        setWsName('');
        setWsSupervisor('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر إنشاء الورشة');
    } finally {
      setCreatingWs(false);
    }
  };

  // Create Fabrication Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderWorkshopId || !orderItemName.trim()) return;

    setCreatingOrder(true);
    try {
      const res = await axios.post(`${API_BASE}/engineering/fabrication/orders`, {
        workshopId: orderWorkshopId,
        itemName: orderItemName,
        quantity: Number(orderQty),
        targetBranchId: orderBranchId || undefined,
        notes: orderNotes,
      });

      if (res.data?.success) {
        setShowNewOrderModal(false);
        setOrderItemName('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر إنشاء أمر التصنيع');
    } finally {
      setCreatingOrder(false);
    }
  };

  // Issue Material / Return Remnants
  const handleIssueMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForMaterial || !selectedMatId) return;

    setIssuingMat(true);
    try {
      const res = await axios.post(`${API_BASE}/engineering/fabrication/orders/issue-material`, {
        fabricationOrderId: selectedOrderForMaterial.id,
        materialId: selectedMatId,
        quantity: Number(matQty),
        isRemnantReturn,
        notes: matNotes,
      });

      if (res.data?.success) {
        setSelectedOrderForMaterial(null);
        alert(res.data.message);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر تنفيذ حركة الخامات');
    } finally {
      setIssuingMat(false);
    }
  };

  // Complete and Capitalize to Assets
  const handleCapitalize = async () => {
    if (!selectedOrderForCap) return;

    setCapitalizing(true);
    try {
      const res = await axios.post(
        `${API_BASE}/engineering/fabrication/orders/${selectedOrderForCap.id}/capitalize`,
        {
          laborHours: Number(capLaborHours),
          notes: capNotes,
        }
      );

      if (res.data?.success) {
        setSelectedOrderForCap(null);
        alert(res.data.message);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر إغلاق ورسملة أمر التصنيع');
    } finally {
      setCapitalizing(false);
    }
  };

  // Excel Export preparation
  const exportRows = orders.map((o) => ({
    'رقم أمر التصنيع': o.order_number,
    'المنتج': o.item_name,
    'الكمية': o.quantity,
    'الورشة': o.engineering_workshops?.name || 'عام',
    'الفرع المستلم': o.branches?.branch_name || 'عام',
    'تكلفة الخامات (ج.م)': o.materials_cost,
    'ساعات العمل': o.labor_hours,
    'تكلفة العمالة (ج.م)': o.labor_cost,
    'إجمالي التكلفة': o.total_actual_cost,
    'الحالة': o.status,
    'المرحلة': o.current_step_name,
  }));

  const filteredOrders = orders.filter((o) => {
    if (selectedWorkshopId === 'ALL') return true;
    return o.engineering_workshops?.id === selectedWorkshopId;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12" dir="rtl">
      {/* 1. Header with Excel Import/Export */}
      <EngineeringHeader
        title="إدارة الورش والتصنيع الداخلي للمعدات والأثاث (Internal Fabrication & Workshops)"
        subtitle="تصنيع التروليات والترابيزات الاستانلس، المكاتب، صرف الخامات، والرسملة الآلية بسجل الأصول"
        entityName="fabrication-orders"
        exportData={exportRows}
        exportFileName="أوامر_التصنيع_الداخلي.xlsx"
        onImportSuccess={fetchData}
        secondaryAction={{
          label: 'إنشاء ورشة جديدة / مسار ورشة',
          onClick: () => setShowNewWorkshopModal(true),
          icon: Sparkles,
        }}
        primaryAction={{
          label: 'إصدار أمر تصنيع داخلي جديد',
          onClick: () => setShowNewOrderModal(true),
          icon: Plus,
        }}
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* 2. Workshops Cards Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              الورش الهندسية وخطوط التصنيع المعتمدة ({workshops.length})
            </h2>
            <button
              onClick={() => setSelectedWorkshopId('ALL')}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition ${
                selectedWorkshopId === 'ALL'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              عرض كافة الورش
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {workshops.map((w) => {
              const isSelected = selectedWorkshopId === w.id;
              return (
                <div
                  key={w.id}
                  onClick={() => setSelectedWorkshopId(isSelected ? 'ALL' : w.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition shadow-sm space-y-2 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 shadow-amber-500/10'
                      : 'bg-slate-900/80 hover:bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-amber-400 font-bold">[{w.code}]</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                      {w.staffCount} فني
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-xs leading-snug">{w.name}</h3>

                  <p className="text-[11px] text-slate-400 truncate">
                    إشراف: <span className="text-slate-200">{w.supervisorName}</span>
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex justify-between text-[11px] text-slate-400">
                    <span>أوامر جارية: <strong className="text-amber-400 font-mono">{w.activeOrdersCount}</strong></span>
                    <span>بلاغات: <strong className="text-indigo-400 font-mono">{w.activeTicketsCount}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Fabrication Orders Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Hammer className="w-4 h-4 text-amber-400" />
                سجل أوامر تصنيع المعدات والأثاث والرسملة
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                حساب تكلفة الخامات المستهلكة وساعات العمل، مع إمكانية تحويل المنتجات تلقائياً إلى أصول مسجلة بسجل الأصول
              </p>
            </div>
            <button
              onClick={fetchData}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تحديث السجل
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">رقم الأمر</th>
                  <th className="p-3">المنتج المطلوب</th>
                  <th className="p-3">الورشة المنفذة</th>
                  <th className="p-3">الفرع المستلم</th>
                  <th className="p-3">الخامات والعمالة</th>
                  <th className="p-3">إجمالي التكلفة الفعلية</th>
                  <th className="p-3">الحالة والمسار</th>
                  <th className="p-3 text-center">إجراءات الورشة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      جاري استرجاع أوامر التصنيع الداخلي...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      لا توجد أوامر تصنيع حالية للورش المحددة
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => {
                    const isCapitalized = ord.status === 'COMPLETED_CAPITALIZED';

                    return (
                      <tr key={ord.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-amber-400">{ord.order_number}</td>
                        <td className="p-3">
                          <strong className="block text-white text-xs">{ord.item_name}</strong>
                          <span className="text-[10px] text-slate-400">الكمية: {ord.quantity} وحدة</span>
                        </td>
                        <td className="p-3">{ord.engineering_workshops?.name || 'ورشة التصنيع'}</td>
                        <td className="p-3">{ord.branches?.branch_name || 'عام'}</td>
                        <td className="p-3">
                          <div className="space-y-0.5 text-[11px]">
                            <span>خامات: {ord.materials_cost} ج.م</span>
                            <span className="block text-slate-400">عمالة: {ord.labor_hours} س ({ord.labor_cost} ج.م)</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-300 text-sm">
                          {ord.total_actual_cost} ج.م
                        </td>
                        <td className="p-3">
                          {isCapitalized ? (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              مرسمل بسجل الأصول
                            </span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" />
                              {ord.current_step_name || 'قيد التصنيع'}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!isCapitalized ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedOrderForMaterial(ord)}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 rounded-lg text-[11px] font-medium transition flex items-center gap-1"
                              >
                                <Boxes className="w-3 h-3" />
                                صرف خامات / بواقي
                              </button>
                              <button
                                onClick={() => setSelectedOrderForCap(ord)}
                                className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                إغلاق وترحيل للأصول
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px] font-semibold">مغلق ومسجل بالعهدة</span>
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
      </div>

      {/* ======================================================== */}
      {/* MODAL: Create Workshop */}
      {/* ======================================================== */}
      {showNewWorkshopModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                إنشاء ورشة عمل هندسية جديدة ديناميكياً
              </h3>
              <button onClick={() => setShowNewWorkshopModal(false)} className="text-slate-500 hover:text-white text-xs">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateWorkshop} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">كود الورشة:</label>
                  <input
                    type="text"
                    required
                    value={wsCode}
                    onChange={(e) => setWsCode(e.target.value.toUpperCase())}
                    placeholder="WS-CUSTOM"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">التخصص الفني:</label>
                  <select
                    value={wsSpecialty}
                    onChange={(e) => setWsSpecialty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="WELDING_FABRICATION">تشكيل ولحام استانلس وحديد</option>
                    <option value="CARPENTRY">نجارة وأثاث وديكور</option>
                    <option value="HVAC_COOLING">تبريد وتكييف وثلاجات</option>
                    <option value="ELECTRICAL">كهرباء وتحكم آلي PLC</option>
                    <option value="PLUMBING">سباكة ومضخات وصرف</option>
                    <option value="GENERAL">صيانة ميكانيكية عامة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اسم الورشة بالكامل:</label>
                <input
                  type="text"
                  required
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  placeholder="ورشة التشكيل بالليزر والتجهيز المعرضي..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">المهندس / المشرف المسؤول:</label>
                <input
                  type="text"
                  value={wsSupervisor}
                  onChange={(e) => setWsSupervisor(e.target.value)}
                  placeholder="م. أحمد صبحي (رئيس قسم التجهيزات)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewWorkshopModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingWs}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
                >
                  {creatingWs ? 'جاري الإنشاء...' : 'حفظ وإنشاء الورشة ومسارها'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Create Fabrication Order */}
      {/* ======================================================== */}
      {showNewOrderModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                إصدار أمر تصنيع داخلي بالورش
              </h3>
              <button onClick={() => setShowNewOrderModal(false)} className="text-slate-500 hover:text-white text-xs">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">الورشة المنفذة:</label>
                <select
                  required
                  value={orderWorkshopId}
                  onChange={(e) => setOrderWorkshopId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">اختر الورشة...</option>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">المنتج المطلوب تصنيعه:</label>
                <input
                  type="text"
                  required
                  value={orderItemName}
                  onChange={(e) => setOrderItemName(e.target.value)}
                  placeholder="ترولي صاج 15 دور استانلس 304، ترابيزة تشغيل عجين..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الكمية المطلوبة:</label>
                  <input
                    type="number"
                    min={1}
                    value={orderQty}
                    onChange={(e) => setOrderQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الفرع المستلم للأصل:</label>
                  <select
                    value={orderBranchId}
                    onChange={(e) => setOrderBranchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="">اختر الفرع...</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameAr || b.branch_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ملاحظات ومواصفات المقايسة:</label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="سمك الصاج، نوع العجل الحراري، الأبعاد بدقة..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="px-5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold rounded-xl"
                >
                  {creatingOrder ? 'جاري الإصدار...' : 'إصدار أمر التصنيع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Issue Material / Remnant Return */}
      {/* ======================================================== */}
      {selectedOrderForMaterial && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-400" />
                صرف خامات أو إعادة فضلات لأمر التصنيع ({selectedOrderForMaterial.order_number})
              </h3>
              <button onClick={() => setSelectedOrderForMaterial(null)} className="text-slate-500 hover:text-white text-xs">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleIssueMaterial} className="space-y-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between">
                <span>المنتج: <strong className="text-white">{selectedOrderForMaterial.item_name}</strong></span>
                <span>تكلفة الخامات الحالية: <strong className="text-amber-400 font-mono">{selectedOrderForMaterial.materials_cost} ج.م</strong></span>
              </div>

              {/* Toggle: Issue vs Remnant return */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRemnantReturn(false)}
                  className={`py-1.5 rounded-lg font-bold transition ${
                    !isRemnantReturn ? 'bg-indigo-600 text-white' : 'text-slate-400'
                  }`}
                >
                  صرف خامة من المخزن
                </button>
                <button
                  type="button"
                  onClick={() => setIsRemnantReturn(true)}
                  className={`py-1.5 rounded-lg font-bold transition ${
                    isRemnantReturn ? 'bg-emerald-600 text-white' : 'text-slate-400'
                  }`}
                >
                  إعادة فضلات / بواقي قص
                </button>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اختر الخامة / قطعة الغيار:</label>
                <select
                  required
                  value={selectedMatId}
                  onChange={(e) => setSelectedMatId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                >
                  <option value="">اختر الخامة...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} [{m.code}] - الرصيد: {m.current_stock} {m.unit} ({m.unit_cost} ج.م)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">الكمية المصروفة أو المرتجعة:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  value={matQty}
                  onChange={(e) => setMatQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ملاحظات الصرف وأبعاد البواقي:</label>
                <input
                  type="text"
                  value={matNotes}
                  onChange={(e) => setMatNotes(e.target.value)}
                  placeholder="لوح 80*120 سم استانلس 304..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForMaterial(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={issuingMat}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
                >
                  {issuingMat ? 'جاري التنفيذ...' : isRemnantReturn ? 'تأكيد إعادة الفضلات' : 'تأكيد صرف الخامات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Capitalize Order to Assets */}
      {/* ======================================================== */}
      {selectedOrderForCap && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                إغلاق وترحيل لسجل الأصول ({selectedOrderForCap.order_number})
              </h3>
              <button onClick={() => setSelectedOrderForCap(null)} className="text-slate-500 hover:text-white text-xs">
                إلغاء
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-1">
                <div>المنتج المصنّع: <strong className="text-white">{selectedOrderForCap.item_name}</strong></div>
                <div>الكمية: <strong className="text-amber-400 font-mono font-bold">{selectedOrderForCap.quantity} أصل جديد</strong></div>
                <div>تكلفة الخامات المسجلة: <strong className="text-slate-200 font-mono">{selectedOrderForCap.materials_cost} ج.م</strong></div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">إجمالي ساعات عمل الفنيين (Labor Hours):</label>
                <input
                  type="number"
                  value={capLaborHours}
                  onChange={(e) => setCapLaborHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  يتم احتساب أجر الساعة بـ 75 ج.م/ساعة وتضاف للتكلفة الرأسمالية للأصل.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ملاحظات التسليم والتثبيت بالمعرض:</label>
                <textarea
                  rows={2}
                  value={capNotes}
                  onChange={(e) => setCapNotes(e.target.value)}
                  placeholder="تم فحص نعومة اللحام وتركيب العجلات وتسليمها لعهدة الفرع..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrderForCap(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleCapitalize}
                  disabled={capitalizing}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl"
                >
                  {capitalizing ? 'جاري الرسملة...' : 'تأكيد الرسملة وإدخال سجل الأصول'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
