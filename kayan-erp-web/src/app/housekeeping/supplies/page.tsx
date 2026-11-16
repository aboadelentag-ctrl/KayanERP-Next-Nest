'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HousekeepingHeader from '../components/HousekeepingHeader';
import {
  Droplets,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowDownRight,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HousekeepingSuppliesPage() {
  const [activeTab, setActiveTab] = useState<'supplies' | 'issuances' | 'hygiene'>('supplies');
  const [supplies, setSupplies] = useState<any[]>([]);
  const [issuances, setIssuances] = useState<any[]>([]);
  const [hygieneChecks, setHygieneChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal Supply
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [supplyCode, setSupplyCode] = useState('');
  const [supplyName, setSupplyName] = useState('');
  const [category, setCategory] = useState('FOOD_GRADE_SANITIZER');
  const [colorCode, setColorCode] = useState('BLUE_PRODUCTION');
  const [unit, setUnit] = useState('جركن 20 لتر');
  const [currentStock, setCurrentStock] = useState('10');
  const [minStockLevel, setMinStockLevel] = useState('5');
  const [unitCost, setUnitCost] = useState('150');

  // Modal Issue
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedSupplyId, setSelectedSupplyId] = useState('');
  const [issueQuantity, setIssueQuantity] = useState('1');
  const [issuedToType, setIssuedToType] = useState('SUPERVISOR');
  const [issuedToName, setIssuedToName] = useState('م. تامر الجوهري (مشرف صالة التورت)');
  const [issueNotes, setIssueNotes] = useState('');

  // Modal Hygiene
  const [showHygieneModal, setShowHygieneModal] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('صالة التورت');
  const [uniformClean, setUniformClean] = useState(true);
  const [hairNetWorn, setHairNetWorn] = useState(true);
  const [nailsTrimmed, setNailsTrimmed] = useState(true);
  const [noOpenWounds, setNoOpenWounds] = useState(true);
  const [hygieneNotes, setHygieneNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [suppRes, issRes, hygRes] = await Promise.all([
        axios.get(`${API_BASE}/housekeeping/supplies`),
        axios.get(`${API_BASE}/housekeeping/supplies/issuances`),
        axios.get(`${API_BASE}/housekeeping/hygiene`),
      ]);

      setSupplies(suppRes.data.data || []);
      setIssuances(issRes.data.data || []);
      setHygieneChecks(hygRes.data.data || []);
    } catch (err: any) {
      console.error('Error fetching supplies data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddSupply = () => {
    setSupplyCode(`SUP-${String(supplies.length + 1).padStart(3, '0')}`);
    setSupplyName('');
    setCategory('FOOD_GRADE_SANITIZER');
    setColorCode('BLUE_PRODUCTION');
    setUnit('جركن 20 لتر');
    setCurrentStock('10');
    setMinStockLevel('5');
    setUnitCost('150');
    setErrorMsg(null);
    setShowSupplyModal(true);
  };

  const handleSaveSupply = async () => {
    if (!supplyCode.trim() || !supplyName.trim()) {
      setErrorMsg('يرجى إدخال كود الصنف واسمه');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await axios.post(`${API_BASE}/housekeeping/supplies`, {
        code: supplyCode,
        name: supplyName,
        category,
        colorCode,
        unit,
        currentStock: Number(currentStock),
        minStockLevel: Number(minStockLevel),
        unitCost: Number(unitCost),
      });

      setShowSupplyModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Save supply error:', err);
      setErrorMsg(err.response?.data?.message || 'فشل حفظ الصنف بالمخزن');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenIssueModal = (sup?: any) => {
    if (sup) {
      setSelectedSupplyId(sup.id.toString());
    } else if (supplies.length > 0) {
      setSelectedSupplyId(supplies[0].id.toString());
    }
    setIssueQuantity('1');
    setIssuedToType('SUPERVISOR');
    setIssuedToName('م. تامر الجوهري (مشرف صالة التورت)');
    setIssueNotes('');
    setErrorMsg(null);
    setShowIssueModal(true);
  };

  const handleSaveIssue = async () => {
    if (!selectedSupplyId || Number(issueQuantity) <= 0) {
      setErrorMsg('يرجى اختيار الصنف وتحديد كمية صالحة');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await axios.post(`${API_BASE}/housekeeping/supplies/issue`, {
        supplyId: selectedSupplyId,
        quantity: Number(issueQuantity),
        issuedToType,
        issuedToName,
        notes: issueNotes,
      });

      setShowIssueModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Issue error:', err);
      setErrorMsg(err.response?.data?.message || 'فشل تسجيل إذن الصرف');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveHygieneCheck = async () => {
    if (!employeeName.trim() || !employeeCode.trim()) {
      setErrorMsg('يرجى إدخال اسم وكود العامل/الموظف');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await axios.post(`${API_BASE}/housekeeping/hygiene`, {
        workerOrEmployeeName: employeeName,
        employeeCode,
        department,
        uniformClean,
        hairNetWorn,
        nailsTrimmed,
        noOpenWounds,
        notes: hygieneNotes,
      });

      setShowHygieneModal(false);
      fetchData();
    } catch (err: any) {
      console.error('Hygiene error:', err);
      setErrorMsg(err.response?.data?.message || 'فشل حفظ فحص النظافة');
    } finally {
      setSubmitting(false);
    }
  };

  // Color badge helper
  const getColorBadge = (code: string) => {
    switch (code) {
      case 'RED_BATHROOM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700/60 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            أحمر (حمامات ودورات مياه)
          </span>
        );
      case 'BLUE_PRODUCTION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700/60 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            أزرق (صالات إنتاج وتصنيع)
          </span>
        );
      case 'GREEN_RETAIL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            أخضر (معارض وصالات بيع)
          </span>
        );
      case 'YELLOW_GENERAL':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            أصفر (مكاتب وعام ومكافحة آفات)
          </span>
        );
    }
  };

  const filteredSupplies = supplies.filter((s) => {
    const matchesColor = colorFilter === 'ALL' || s.color_code === colorFilter;
    const matchesCategory = categoryFilter === 'ALL' || s.category === categoryFilter;
    const matchesSearch =
      !search.trim() ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.name.includes(search);
    return matchesColor && matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      <HousekeepingHeader
        title="مخزن المنظفات والأدوات الملونة والنظافة الشخصية"
        subtitle="إدارة الكيماويات الغذائية، ضبط الأكواد اللونية لمنع التلوث العكسي، ومتابعة أذونات الصرف والاستهلاك"
        entityName="supplies"
        exportData={activeTab === 'supplies' ? filteredSupplies : activeTab === 'issuances' ? issuances : hygieneChecks}
        exportFileName={
          activeTab === 'supplies'
            ? 'مخزن_المنظفات_والأدوات'
            : activeTab === 'issuances'
            ? 'أذونات_صرف_المنظفات'
            : 'سجلات_النظافة_الشخصية'
        }
        onImportSuccess={fetchData}
        primaryAction={{
          label: 'إضافة صنف/منظف جديد',
          onClick: handleOpenAddSupply,
          icon: Plus,
        }}
        secondaryAction={{
          label: 'إذن صرف خامات',
          onClick: () => handleOpenIssueModal(),
          icon: ArrowDownRight,
        }}
      />

      <div className="p-3 max-w-7xl mx-auto w-full space-y-4">
        {/* التبويبات الداخلية */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
          <button
            onClick={() => setActiveTab('supplies')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'supplies'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>أرصدة مخزن المنظفات والأدوات الملونة ({supplies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('issuances')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'issuances'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>سجل أذونات الصرف والاستهلاك ({issuances.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('hygiene')}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'hygiene'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>تفتيش النظافة الشخصية للعمالة ({hygieneChecks.length})</span>
          </button>
        </div>

        {/* ===================== التبويب 1: المخزن ===================== */}
        {activeTab === 'supplies' && (
          <div className="space-y-4">
            {/* الفلاتر والبحث */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> الفلاتر:
                </span>

                <select
                  value={colorFilter}
                  onChange={(e) => setColorFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
                >
                  <option value="ALL">كافة الأكواد اللونية</option>
                  <option value="BLUE_PRODUCTION">الكود الأزرق (صالات الإنتاج)</option>
                  <option value="RED_BATHROOM">الكود الأحمر (دورات المياه)</option>
                  <option value="GREEN_RETAIL">الكود الأخضر (المعارض)</option>
                  <option value="YELLOW_GENERAL">الكود الأصفر (عام ومكاتب)</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
                >
                  <option value="ALL">كافة التصنيفات</option>
                  <option value="FOOD_GRADE_SANITIZER">مطهرات غذائية معتمدة</option>
                  <option value="GENERAL_DETERGENT">منظفات عامة وصابون صناعي</option>
                  <option value="COLOR_CODED_TOOL">أدوات ملونة (مساحات/فرش)</option>
                  <option value="PEST_CONTROL">مستلزمات مكافحة آفات</option>
                </select>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بكود أو اسم المنظف..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              </div>
            </div>

            {/* جدول أرصدة الأصناف */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-bold">
                    <tr>
                      <th className="p-3">كود الصنف</th>
                      <th className="p-3">اسم المنظف / الأداة</th>
                      <th className="p-3">التصنيف</th>
                      <th className="p-3">الكود اللوني لمنع التلوث العكسي</th>
                      <th className="p-3">الوحدة</th>
                      <th className="p-3">الرصيد المتاح</th>
                      <th className="p-3">حد الطلب الأدنى</th>
                      <th className="p-3">تكلفة الوحدة</th>
                      <th className="p-3 text-center">إجراء سريع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
                          جاري تحميل أرصدة المخزن...
                        </td>
                      </tr>
                    ) : filteredSupplies.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          لا توجد أصناف تطابق معايير البحث
                        </td>
                      </tr>
                    ) : (
                      filteredSupplies.map((s) => {
                        const stock = Number(s.current_stock || 0);
                        const min = Number(s.min_stock_level || 5);
                        const isLow = stock <= min;

                        return (
                          <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-mono font-bold text-teal-300">{s.code}</td>

                            <td className="p-3 font-semibold text-slate-100 flex items-center gap-2">
                              <Droplets className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{s.name}</span>
                            </td>

                            <td className="p-3 text-slate-300">
                              {s.category === 'FOOD_GRADE_SANITIZER'
                                ? 'مطهر غذائي'
                                : s.category === 'GENERAL_DETERGENT'
                                ? 'صابون صناعي'
                                : s.category === 'COLOR_CODED_TOOL'
                                ? 'أداة كودية'
                                : 'مكافحة آفات'}
                            </td>

                            <td className="p-3">{getColorBadge(s.color_code)}</td>

                            <td className="p-3 text-slate-300">{s.unit}</td>

                            <td className="p-3">
                              <span
                                className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                  isLow
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {stock} {s.unit}
                              </span>
                            </td>

                            <td className="p-3 text-slate-400 font-mono">{min} {s.unit}</td>

                            <td className="p-3 font-mono text-slate-200">
                              {Number(s.unit_cost || 0)} ج.م
                            </td>

                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleOpenIssueModal(s)}
                                className="px-2.5 py-1 rounded bg-teal-600/30 hover:bg-teal-600 text-teal-300 hover:text-white font-bold border border-teal-500/40 text-[11px] transition-colors"
                              >
                                صرف للمشرف
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
        )}

        {/* ===================== التبويب 2: أذونات الصرف ===================== */}
        {activeTab === 'issuances' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-bold">
                  <tr>
                    <th className="p-3">تاريخ ووقت الصرف</th>
                    <th className="p-3">الصنف المصروف</th>
                    <th className="p-3">الكمية المصروفة</th>
                    <th className="p-3">المستلم / الجهة</th>
                    <th className="p-3">مشرف الاستلام</th>
                    <th className="p-3">التكلفة الإجمالية</th>
                    <th className="p-3">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {issuances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        لا توجد أذونات صرف مسجلة حتى الآن
                      </td>
                    </tr>
                  ) : (
                    issuances.map((iss) => (
                      <tr key={iss.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {new Date(iss.issued_at).toLocaleString('ar-EG')}
                        </td>
                        <td className="p-3 font-bold text-slate-200">
                          {iss.sanitation_supplies?.name || 'غير محدد'} ({iss.sanitation_supplies?.code})
                        </td>
                        <td className="p-3 font-bold text-teal-300">
                          {Number(iss.quantity)} {iss.sanitation_supplies?.unit}
                        </td>
                        <td className="p-3 text-slate-300">{iss.issued_to_name || 'عام'}</td>
                        <td className="p-3 text-slate-300">{iss.supervisor_name || 'عام'}</td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          {Number(iss.total_cost || 0)} ج.م
                        </td>
                        <td className="p-3 text-slate-400 text-[11px]">{iss.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== التبويب 3: النظافة الشخصية ===================== */}
        {activeTab === 'hygiene' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">
                سجل تفتيش التزام عمال الإنتاج والإشراف الداخلي باشتراطات النظافة الشخصية والزي المعتمد
              </span>
              <button
                onClick={() => setShowHygieneModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل فحص نظافة شخصية جديد</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700 font-bold">
                    <tr>
                      <th className="p-3">تاريخ الفحص</th>
                      <th className="p-3">اسم العامل / الموظف</th>
                      <th className="p-3">كود الموظف</th>
                      <th className="p-3">القسم / الصالة</th>
                      <th className="p-3 text-center">نظافة الزي</th>
                      <th className="p-3 text-center">غطاء الرأس</th>
                      <th className="p-3 text-center">تقليم الأظافر</th>
                      <th className="p-3 text-center">خلو الجروح</th>
                      <th className="p-3">النتيجة</th>
                      <th className="p-3">المشرف الفاحص</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {hygieneChecks.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500">
                          لا توجد سجلات فحص نظافة شخصية مسجلة
                        </td>
                      </tr>
                    ) : (
                      hygieneChecks.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-slate-400 font-mono text-[11px]">
                            {new Date(h.checked_at).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="p-3 font-semibold text-slate-200">{h.worker_or_employee_name}</td>
                          <td className="p-3 font-mono text-teal-400 font-bold">{h.employee_code}</td>
                          <td className="p-3 text-slate-300">{h.department}</td>

                          <td className="p-3 text-center">
                            {h.uniform_clean ? (
                              <span className="text-emerald-400 font-bold">✓</span>
                            ) : (
                              <span className="text-rose-400 font-bold">✗</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {h.hair_net_worn ? (
                              <span className="text-emerald-400 font-bold">✓</span>
                            ) : (
                              <span className="text-rose-400 font-bold">✗</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {h.nails_trimmed ? (
                              <span className="text-emerald-400 font-bold">✓</span>
                            ) : (
                              <span className="text-rose-400 font-bold">✗</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {h.no_open_wounds ? (
                              <span className="text-emerald-400 font-bold">✓</span>
                            ) : (
                              <span className="text-rose-400 font-bold">✗</span>
                            )}
                          </td>

                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                h.passed
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {h.passed ? 'مطابق ومجتاز' : 'غير مطابق'}
                            </span>
                          </td>

                          <td className="p-3 text-slate-400">{h.supervisor_name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* مودال إضافة صنف مخزن جديد */}
      {showSupplyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-sm font-bold text-teal-400 flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>إضافة صنف منظف / أداة جديدة بالمخزن</span>
              </div>
              <button
                onClick={() => setShowSupplyModal(false)}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">كود الصنف:</label>
                  <input
                    type="text"
                    value={supplyCode}
                    onChange={(e) => setSupplyCode(e.target.value)}
                    placeholder="مثال: SUP-008"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الوحدة:</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="مثال: جركن 20 لتر / قطعة"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اسم المنظف / الأداة:</label>
                <input
                  type="text"
                  value={supplyName}
                  onChange={(e) => setSupplyName(e.target.value)}
                  placeholder="مثال: صابون سائل صناعي لإذابة دهون الشوكولاتة"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">الكود اللوني لمنع التلوث العكسي:</label>
                <select
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-bold"
                >
                  <option value="BLUE_PRODUCTION">🔵 أزرق - مخصص لخطوط وصالات الإنتاج فقط</option>
                  <option value="RED_BATHROOM">🔴 أحمر - مخصص للحمامات ودورات المياه فقط</option>
                  <option value="GREEN_RETAIL">🟢 أخضر - مخصص لمعارض وصالات بيع الحلواني</option>
                  <option value="YELLOW_GENERAL">🟡 أصفر - عام / مكاتب / مكافحة آفات</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">التصنيف الوظيفي:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                >
                  <option value="FOOD_GRADE_SANITIZER">مطهر غذائي معتمد (Food-Grade)</option>
                  <option value="GENERAL_DETERGENT">منظف صناعي ومزيل دهون</option>
                  <option value="COLOR_CODED_TOOL">أداة ملونة كودية (مساحة/فرشاة/جردل)</option>
                  <option value="PEST_CONTROL">أدوات مكافحة آفات وأشرطة لاصقة</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الرصيد المتاح:</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">حد الطلب الأدنى:</label>
                  <input
                    type="number"
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">تكلفة الوحدة:</label>
                  <input
                    type="number"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowSupplyModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveSupply}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ في المخزن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال إذن صرف خامات */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4" />
                <span>إذن صرف منظفات وأدوات كودية</span>
              </div>
              <button
                onClick={() => setShowIssueModal(false)}
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
                <label className="block text-slate-300 mb-1 font-semibold">الصنف المطلوب صرفه:</label>
                <select
                  value={selectedSupplyId}
                  onChange={(e) => setSelectedSupplyId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-medium"
                >
                  {supplies.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name} (المتاح: {Number(s.current_stock)} {s.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الكمية المصروفة:</label>
                  <input
                    type="number"
                    value={issueQuantity}
                    onChange={(e) => setIssueQuantity(e.target.value)}
                    min={1}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">جهة الصرف:</label>
                  <select
                    value={issuedToType}
                    onChange={(e) => setIssuedToType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                  >
                    <option value="SUPERVISOR">عهدة مشرف صالة</option>
                    <option value="BRANCH">عهدة فرع ومعرض</option>
                    <option value="ZONE">صالة إنتاج محددة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">المستلم / المشرف المسند إليه:</label>
                <input
                  type="text"
                  value={issuedToName}
                  onChange={(e) => setIssuedToName(e.target.value)}
                  placeholder="اسم المشرف أو الفرع..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">ملاحظات وأسباب الصرف:</label>
                <input
                  type="text"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="مثال: صرف أسبوعي لصالة التورت..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveIssue}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>تأكيد الصرف وخصم الرصيد</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال فحص النظافة الشخصية */}
      {showHygieneModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-sm font-bold text-teal-400 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                <span>تسجيل فحص النظافة الشخصية والزي المعتمد</span>
              </div>
              <button
                onClick={() => setShowHygieneModal(false)}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">اسم العامل/الموظف:</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="الاسم..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">كود الموظف:</label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="مثال: EMP-104"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">القسم / الصالة:</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="صالة التورت / قسم العجن..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>

              {/* الشروط الأربعة */}
              <div className="space-y-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uniformClean}
                    onChange={(e) => setUniformClean(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 rounded"
                  />
                  <span className="text-slate-200 font-medium">الزي الأبيض المعتمد نظيف ومكوي</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hairNetWorn}
                    onChange={(e) => setHairNetWorn(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 rounded"
                  />
                  <span className="text-slate-200 font-medium">غطاء الرأس والكمامة مثبتان بالكامل</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nailsTrimmed}
                    onChange={(e) => setNailsTrimmed(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 rounded"
                  />
                  <span className="text-slate-200 font-medium">الأظافر مقلمة ونظيفة وخالية من الطلاء/الساعات</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noOpenWounds}
                    onChange={(e) => setNoOpenWounds(e.target.checked)}
                    className="w-4 h-4 accent-teal-500 rounded"
                  />
                  <span className="text-slate-200 font-medium">خلو الأيدي والوجه من الجروح المفتوحة أو الدمامل</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">ملاحظات الفاحص:</label>
                <input
                  type="text"
                  value={hygieneNotes}
                  onChange={(e) => setHygieneNotes(e.target.value)}
                  placeholder="أية ملاحظات صحية..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowHygieneModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveHygieneCheck}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ التفتيش الصحي</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
