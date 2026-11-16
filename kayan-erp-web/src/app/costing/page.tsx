'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  DollarSign,
  Printer,
  RefreshCw,
  Search,
  Sliders,
  X,
  Factory,
  Truck,
  Boxes,
  FileText,
  Sun,
  Moon,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';

interface ProductCostItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  rawMaterialsCost: number;
  overheadsCost: number;
  totalCostPerKg: number;
  wholesalePrice: number;
  retailPrice: number;
  targetMarginPct: number;
  currentMarginPct: number;
  monthlyVolumeKg: number;
  profitStatus: 'EXCELLENT' | 'HEALTHY' | 'LOW_MARGIN';
}

interface CostingSummary {
  totalProductsCount: number;
  averageCostPerKg: number;
  averageRetailPrice: number;
  overallGrossMarginPct: number;
  highMarginCount: number;
  lowMarginAlertCount: number;
}

interface RecipeIngredient {
  lineId: string;
  componentCode: string;
  componentName: string;
  quantity: number;
  unit: string;
  wastePercentage: number;
  unitPrice: number;
  directCost: number;
  effectiveCost: number;
}

interface RecipeBreakdown {
  recipeId: string;
  recipeCode: string;
  recipeName: string;
  productName: string;
  batchQuantity: number;
  yieldQuantity: number;
  yieldUnit: string;
  piecesPerBatch: number;
  wastePercentage: number;
  costSummary: {
    totalDirectMaterialsCost: number;
    industrialLaborCost: number;
    energyAndFuelCost: number;
    packagingCost: number;
    factoryOverheads: number;
    totalBatchCost: number;
    costPerKg: number;
    costPerPiece: number | null;
    wholesalePrice: number;
    retailPrice: number;
    grossProfitPerKg: number;
    grossMarginPercent: number;
    profitHealth: string;
  };
  ingredients: RecipeIngredient[];
}

export default function CostingAndPricingPage() {
  const { isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [products, setProducts] = useState<ProductCostItem[]>([]);
  const [summary, setSummary] = useState<CostingSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reportDate, setReportDate] = useState<string>('2026-10-30');

  // نافذة محاكي التكلفة والتسعير (Cost Simulator Modal)
  const [showSimulator, setShowSimulator] = useState<boolean>(false);
  const [selectedRawMaterial, setSelectedRawMaterial] = useState<string>('سمن بلدي');
  const [priceChangePercent, setPriceChangePercent] = useState<number>(15);
  const [targetMarginInput, setTargetMarginInput] = useState<number>(35);
  const [simulationResults, setSimulationResults] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // نافذة تحليل شجرة تكلفة معادلة صنف (Recipe Breakdown Modal)
  const [selectedRecipeBreakdown, setSelectedRecipeBreakdown] = useState<RecipeBreakdown | null>(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState<boolean>(false);

  useEffect(() => {
    setReportDate(new Date().toLocaleDateString('ar-EG'));
    fetchMarginsData();
  }, []);

  const fetchMarginsData = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/costing/margins-overview');
      if (res.data?.success) {
        setProducts(res.data.products || []);
        setSummary(res.data.summary || null);
      }
    } catch (e) {
      console.warn('Costing API offline');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMarginsData();
    setIsRefreshing(false);
  };

  // فتح تفاصيل شجرة التكلفة لمعادلة معينة
  const openRecipeBreakdown = async (productId: string) => {
    setIsLoadingBreakdown(true);
    try {
      const res = await axios.get(`http://localhost:3000/costing/recipes/${productId}/breakdown`);
      if (res.data?.success) {
        setSelectedRecipeBreakdown(res.data);
      }
    } catch (e) {
      console.warn('Recipe breakdown offline');
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  // تشغيل المحاكي
  const runSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await axios.post('http://localhost:3000/costing/pricing-lists/simulate', {
        rawMaterialName: selectedRawMaterial,
        priceChangePercent: Number(priceChangePercent),
        targetMarginPercent: Number(targetMarginInput),
      });
      if (res.data?.success) {
        setSimulationResults(res.data);
      }
    } catch (e) {
      console.warn('Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  // تصفية المنتجات
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || p.profitStatus === statusFilter;
      const matchesSearch =
        searchQuery === '' ||
        p.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.itemCode.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesStatus && matchesSearch;
    });
  }, [products, categoryFilter, statusFilter, searchQuery]);

  return (
    <div
      className={`min-h-screen text-right transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir="rtl"
    >
      <div className="erp-container-fluid space-y-4">

        {/* 1. الترويسة الرئيسية وأزرار التنقل */}
        <header
          className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 md:p-6 rounded-2xl border shadow-sm ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                تكاليف الإنتاج والتسعير وهوامش الربح
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono">
                  Costing & Margins
                </span>
              </h1>
              <p className="text-sm erp-muted mt-0.5">
                حساب التكلفة المعيارية والفعلية ومصاريف التشغيل الصناعية لمصانع وحلواني «أبو عادل»
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <Link
              href="/"
              className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5"
            >
              الرئيسية
            </Link>

            <Link
              href="/production"
              className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Factory className="w-4 h-4" />
              صالة الإنتاج
            </Link>

            <Link
              href="/transfers"
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Truck className="w-4 h-4" />
              تحويلات المعارض
            </Link>

            <Link
              href="/crates"
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Boxes className="w-4 h-4" />
              الصناديق
            </Link>

            <button
              type="button"
              onClick={() => {
                setShowSimulator(true);
                runSimulation();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              محاكي التكلفة والتسعير
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-slate-300"
              title="طباعة تقرير التكاليف"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </header>

        {/* 2. بطاقات إحصائية علوية (KPI Summary Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">متوسط تكلفة الكيلو (خامات ومصاريف)</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <PieChart className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-blue-400">
              {summary ? `${summary.averageCostPerKg} ج.م` : '114.6 ج.م'}
            </div>
            <p className="text-[11px] erp-muted">شامل الخامات الفعلية والعمالة والطاقة والهالك</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">متوسط سعر البيع بمعارض التجزئة</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-indigo-400">
              {summary ? `${summary.averageRetailPrice} ج.م` : '187.5 ج.م'}
            </div>
            <p className="text-[11px] erp-muted">متوسط سعر كيلو الحلويات الشرقية والغربية</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">إجمالي هامش الربح الصناعي</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400 flex items-center gap-1">
              <span>{summary ? `${summary.overallGrossMarginPct}%` : '38.8%'}</span>
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-[11px] erp-muted">هامش أمان ممتاز أعلى من المستهدف (35%)</p>
          </div>

          <div
            className={`p-5 rounded-2xl border shadow-sm space-y-2 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold erp-muted">تنبيهات الهوامش الحرجة</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-rose-400 flex items-center gap-2">
              <span>{summary ? summary.lowMarginAlertCount : 1}</span>
              <span className="text-xs font-normal text-rose-500/80">صنف بحاجة لتعديل سعر</span>
            </div>
            <p className="text-[11px] erp-muted">أصناف انخفض هامشها عن الحد الأدنى (25%)</p>
          </div>
        </div>

        {/* 3. شريط التصفية والبحث */}
        <div
          className={`p-4 rounded-2xl border shadow-sm flex flex-col md:flex-row justify-between items-center gap-3 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {['ALL', 'حلويات شرقية', 'حلويات غربية', 'نواعم وموسميات'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  categoryFilter === cat
                    ? 'bg-amber-600 text-white border-amber-600 shadow'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-amber-500'
                }`}
              >
                {cat === 'ALL' ? 'كافة التصنيفات' : cat}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-700 mx-1 hidden md:block" />

            {['ALL', 'EXCELLENT', 'HEALTHY', 'LOW_MARGIN'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer border ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-800/40 text-slate-400 border-slate-700/60 hover:text-white'
                }`}
              >
                {st === 'ALL' ? 'كافة الهوامش' : st === 'EXCELLENT' ? 'ممتاز (>40%)' : st === 'HEALTHY' ? 'صحي (25-40%)' : '⚠️ منخفض (<25%)'}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="بحث بالصنف أو الكود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pr-9 pl-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                theme === 'dark' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'
              }`}
            />
          </div>
        </div>

        {/* 4. جدول تكاليف الأصناف وهوامش الربح */}
        <div
          className={`rounded-2xl border shadow-sm overflow-hidden ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="p-4 border-b flex justify-between items-center erp-card">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                جدول تكلفة إنتاج أصناف حلويات «أبو عادل» وهوامش الربح
              </h2>
              <p className="text-xs erp-muted">مقارنة التكلفة المباشرة والصناعية بأسعار الجملة والتجزئة المعتمدة</p>
            </div>
            <span className="text-xs font-mono erp-muted">{filteredProducts.length} صنف مسجل</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className={theme === 'dark' ? 'bg-slate-950/80 text-slate-300 border-b border-slate-800' : 'bg-slate-100 text-slate-700'}>
                <tr>
                  <th className="p-3.5 font-bold">كود الصنف</th>
                  <th className="p-3.5 font-bold">اسم صنف الحلويات</th>
                  <th className="p-3.5 font-bold">التصنيف</th>
                  <th className="p-3.5 font-bold text-center">تكلفة الخامات</th>
                  <th className="p-3.5 font-bold text-center">المصاريف (Overheads)</th>
                  <th className="p-3.5 font-bold text-center">إجمالي التكلفة / كجم</th>
                  <th className="p-3.5 font-bold text-center">سعر الجملة</th>
                  <th className="p-3.5 font-bold text-center">سعر المعرض (تجزئة)</th>
                  <th className="p-3.5 font-bold text-center">هامش الربح (%)</th>
                  <th className="p-3.5 font-bold text-center">حالة الربحية</th>
                  <th className="p-3.5 font-bold text-center">شجرة التكلفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono">
                {filteredProducts.map((p) => {
                  const isLow = p.profitStatus === 'LOW_MARGIN';
                  const isExcellent = p.profitStatus === 'EXCELLENT';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-blue-500/5 transition ${
                        isLow ? 'bg-rose-500/5' : ''
                      }`}
                    >
                      <td className="p-3.5 font-bold text-slate-300">{p.itemCode}</td>
                      <td className="p-3.5 font-sans font-bold text-sm text-slate-100">{p.itemName}</td>
                      <td className="p-3.5 font-sans text-xs erp-muted">{p.category}</td>
                      <td className="p-3.5 text-center text-slate-300">{p.rawMaterialsCost.toFixed(2)} ج.م</td>
                      <td className="p-3.5 text-center text-amber-400">{p.overheadsCost.toFixed(2)} ج.م</td>
                      <td className="p-3.5 text-center font-bold text-blue-400 text-sm">
                        {p.totalCostPerKg.toFixed(2)} ج.م
                      </td>
                      <td className="p-3.5 text-center text-slate-300">{p.wholesalePrice.toFixed(2)} ج.م</td>
                      <td className="p-3.5 text-center font-bold text-emerald-400 text-sm">
                        {p.retailPrice.toFixed(2)} ج.م
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            isLow
                              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              : isExcellent
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {p.currentMarginPct}%
                        </span>
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        {isLow ? (
                          <span className="text-[11px] text-rose-400 font-bold flex items-center justify-center gap-1">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            هامش ضعيف
                          </span>
                        ) : isExcellent ? (
                          <span className="text-[11px] text-emerald-400 font-bold">ربحية ممتازة</span>
                        ) : (
                          <span className="text-[11px] text-blue-400 font-bold">هامش صحي</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-sans">
                        <button
                          type="button"
                          onClick={() => openRecipeBreakdown(p.id)}
                          className="px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <PieChart className="w-3.5 h-3.5" />
                          التحليل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. نافذة محاكي التكلفة والتسعير التفاعلي (Cost & Pricing Simulator Modal) */}
        {showSimulator && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div
              className={`w-full max-w-4xl p-6 rounded-3xl border shadow-2xl space-y-6 my-8 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 erp-card">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Sliders className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">محاكي تكاليف الخامات والتسعير الاستراتيجي</h3>
                    <p className="text-xs erp-muted">
                      اختبار أثر زيادة أو انخفاض أسعار الخامات الأساسية (السمن البلدي، السكر، المكسرات) على ربحية الأصناف
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSimulator(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* عناصر التحكم في المحاكاة */}
              <div className="p-4 rounded-2xl border erp-sub grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">المادة الخام المستهدفة</label>
                  <select
                    value={selectedRawMaterial}
                    onChange={(e) => setSelectedRawMaterial(e.target.value)}
                    className="w-full p-2.5 rounded-xl border bg-slate-950 border-slate-700 text-xs font-bold text-amber-400"
                  >
                    <option value="سمن بلدي">سمن بلدي فلاحي (جاموسي/بقري)</option>
                    <option value="سكر">سكر أبيض مكرر</option>
                    <option value="مكسرات وفستق">مكسرات فاخرة (فستق وبندق وكاجو)</option>
                    <option value="شوكولاتة وكريمة">شوكولاتة خام وكريمة حلواني</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold">نسبة التغير في سعر الخام</label>
                    <span className="text-xs font-mono font-bold text-amber-400">+{priceChangePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="50"
                    step="5"
                    value={priceChangePercent}
                    onChange={(e) => setPriceChangePercent(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>-30% (انخفاض)</span>
                    <span>0% (ثابت)</span>
                    <span>+50% (غلاء)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold">هامش الربح المستهدف للتسعير</label>
                    <span className="text-xs font-mono font-bold text-emerald-400">{targetMarginInput}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="50"
                    step="5"
                    value={targetMarginInput}
                    onChange={(e) => setTargetMarginInput(Number(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                    <span>20% (اقتصادي)</span>
                    <span>35% (معياري)</span>
                    <span>50% (متميز)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={runSimulation}
                  disabled={isSimulating}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  إعادة حساب الأثر المالي
                </button>
              </div>

              {/* نتائج المحاكاة وجدول الأسعار المقترحة */}
              {simulationResults && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20 text-xs">
                      <span className="erp-muted">الأصناف المتأثرة:</span>
                      <p className="text-lg font-bold font-mono text-amber-400">
                        {simulationResults.impactSummary?.affectedProductsCount} أصناف
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/20 text-xs">
                      <span className="erp-muted">متوسط زيادة تكلفة الكيلو:</span>
                      <p className="text-lg font-bold font-mono text-blue-400">
                        +{simulationResults.impactSummary?.averageCostIncreasePercent}%
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border bg-rose-500/10 border-rose-500/20 text-xs">
                      <span className="erp-muted">أصناف سينكمش هامشها:</span>
                      <p className="text-lg font-bold font-mono text-rose-400">
                        {simulationResults.impactSummary?.criticalMarginAlerts} أصناف
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border overflow-hidden max-h-72 overflow-y-auto erp-card">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-300 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2.5 font-bold">الصنف</th>
                          <th className="p-2.5 text-center">التكلفة السابقة</th>
                          <th className="p-2.5 text-center">التكلفة بعد الزيادة</th>
                          <th className="p-2.5 text-center">السعر الحالي</th>
                          <th className="p-2.5 text-center">الهامش بالسعر الحالي</th>
                          <th className="p-2.5 text-center text-emerald-400">السعر المقترح الجديد</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono">
                        {simulationResults.simulatedProducts?.map((sp: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-800/40">
                            <td className="p-2.5 font-sans font-bold text-slate-200">{sp.itemName}</td>
                            <td className="p-2.5 text-center text-slate-400">{sp.originalCost} ج.م</td>
                            <td className="p-2.5 text-center text-rose-400 font-bold">
                              {sp.newCost} ج.م (+{sp.costDeltaPercent}%)
                            </td>
                            <td className="p-2.5 text-center text-slate-300">{sp.currentRetailPrice} ج.م</td>
                            <td className="p-2.5 text-center font-bold">
                              <span
                                className={
                                  sp.newMarginWithCurrentPrice < 25
                                    ? 'text-rose-400 underline'
                                    : 'text-amber-400'
                                }
                              >
                                {sp.newMarginWithCurrentPrice}%
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-bold text-emerald-400 text-sm">
                              {sp.suggestedRetailPrice} ج.م
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t erp-card">
                <button
                  type="button"
                  onClick={() => setShowSimulator(false)}
                  className="px-5 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer hover:bg-slate-800"
                >
                  إغلاق المحاكي
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. نافذة تفاصيل شجرة تكلفة معادلة صنف حلويات (Recipe Breakdown Modal) */}
        {selectedRecipeBreakdown && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div
              className={`w-full max-w-3xl p-6 rounded-3xl border shadow-2xl space-y-5 my-8 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-4 erp-card">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-amber-500" />
                    تحليل شجرة التكلفة: {selectedRecipeBreakdown.productName}
                  </h3>
                  <p className="text-xs text-amber-400 font-mono">{selectedRecipeBreakdown.recipeCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecipeBreakdown(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ملخص أرقام الدفعة */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl border erp-sub text-center font-mono">
                <div>
                  <span className="text-[11px] erp-muted">وزن الدفعة (العجنة):</span>
                  <p className="font-bold text-sm text-slate-200">{selectedRecipeBreakdown.batchQuantity} كجم</p>
                </div>
                <div>
                  <span className="text-[11px] erp-muted">الإنتاج التام الصافي:</span>
                  <p className="font-bold text-sm text-emerald-400">{selectedRecipeBreakdown.yieldQuantity} كجم</p>
                </div>
                <div>
                  <span className="text-[11px] erp-muted">تكلفة كيلو الإنتاج التام:</span>
                  <p className="font-bold text-base text-blue-400">{selectedRecipeBreakdown.costSummary.costPerKg} ج.م</p>
                </div>
                <div>
                  <span className="text-[11px] erp-muted">سعر البيع المقترح:</span>
                  <p className="font-bold text-base text-emerald-400">{selectedRecipeBreakdown.costSummary.retailPrice} ج.م</p>
                </div>
              </div>

              {/* جدول مكونات الخامات */}
              <div>
                <h4 className="text-xs font-bold mb-2 text-slate-300">مكونات الخامات المباشرة ونسب الهالك:</h4>
                <div className="rounded-xl border overflow-hidden erp-card">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-950 text-slate-300 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">المادة الخام</th>
                        <th className="p-2.5 text-center">الكمية</th>
                        <th className="p-2.5 text-center">سعر الكيلو</th>
                        <th className="p-2.5 text-center">نسبة الهالك</th>
                        <th className="p-2.5 text-center text-blue-400">التكلفة الفعلية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {selectedRecipeBreakdown.ingredients.map((ing) => (
                        <tr key={ing.lineId} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-sans font-bold text-slate-200">{ing.componentName}</td>
                          <td className="p-2.5 text-center">{ing.quantity} {ing.unit}</td>
                          <td className="p-2.5 text-center">{ing.unitPrice} ج.م</td>
                          <td className="p-2.5 text-center text-amber-400">{ing.wastePercentage}%</td>
                          <td className="p-2.5 text-center font-bold text-slate-100">{ing.effectiveCost} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* تفاصيل المصاريف غير المباشرة */}
              <div className="p-3 rounded-xl border erp-sub text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="erp-muted">إجمالي الخامات المباشرة:</span>
                  <span className="font-bold text-slate-200">{selectedRecipeBreakdown.costSummary.totalDirectMaterialsCost} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="erp-muted">عمالة التصنيع المباشرة (12%):</span>
                  <span className="font-bold text-amber-400">{selectedRecipeBreakdown.costSummary.industrialLaborCost} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="erp-muted">طاقة وغاز وتبريد (8%):</span>
                  <span className="font-bold text-amber-400">{selectedRecipeBreakdown.costSummary.energyAndFuelCost} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="erp-muted">مواد تغليف وكراتين وأطباق:</span>
                  <span className="font-bold text-amber-400">{selectedRecipeBreakdown.costSummary.packagingCost} ج.م</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-700 text-sm">
                  <span className="font-bold text-slate-200 font-sans">إجمالي تكلفة الدفعة الصناعية:</span>
                  <span className="font-bold text-blue-400">{selectedRecipeBreakdown.costSummary.totalBatchCost} ج.م</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecipeBreakdown(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 7. نسق الطباعة الرسمي المخصص (A4 Costing Audit Report) */}
        <div className="hidden print:block p-6 space-y-6 bg-white text-black font-sans" dir="rtl">
          <div className="border-b-2 border-black pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black">مصانع ومنافذ «أبو عادل» للحلويات</h1>
              <h2 className="text-lg font-bold text-slate-800">تقرير تكاليف الإنتاج وهوامش الربحية الصناعية</h2>
              <p className="text-xs text-slate-600 mt-1">نظام كيان ERP - إدارة التكاليف الصناعية والتسعير المعتمد</p>
            </div>
            <div className="text-left font-mono text-xs border border-black p-2 rounded">
              <p>تاريخ التقرير: {reportDate}</p>
              <p>عدد الأصناف: {products.length}</p>
              <p>الهامش الإجمالي: {summary?.overallGrossMarginPct || 38.8}%</p>
            </div>
          </div>

          <table className="w-full text-right text-xs border-collapse border border-black">
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-black p-2">كود الصنف</th>
                <th className="border border-black p-2">اسم الصنف</th>
                <th className="border border-black p-2 text-center">تكلفة الخامات</th>
                <th className="border border-black p-2 text-center">المصاريف الصناعية</th>
                <th className="border border-black p-2 text-center">إجمالي التكلفة</th>
                <th className="border border-black p-2 text-center">سعر التجزئة</th>
                <th className="border border-black p-2 text-center">سعر الجملة</th>
                <th className="border border-black p-2 text-center">هامش الربح (%)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="border border-black p-2 font-mono">{p.itemCode}</td>
                  <td className="border border-black p-2 font-bold">{p.itemName}</td>
                  <td className="border border-black p-2 text-center">{p.rawMaterialsCost} ج.م</td>
                  <td className="border border-black p-2 text-center">{p.overheadsCost} ج.م</td>
                  <td className="border border-black p-2 text-center font-bold">{p.totalCostPerKg} ج.م</td>
                  <td className="border border-black p-2 text-center font-bold">{p.retailPrice} ج.م</td>
                  <td className="border border-black p-2 text-center">{p.wholesalePrice} ج.م</td>
                  <td className="border border-black p-2 text-center font-bold">{p.currentMarginPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pt-8 grid grid-cols-3 gap-4 text-center text-xs border-t-2 border-black">
            <div>
              <p className="font-bold">مدير حسابات التكاليف</p>
              <p className="mt-8">....................................</p>
            </div>
            <div>
              <p className="font-bold">مدير الإنتاج والتشغيل</p>
              <p className="mt-8">....................................</p>
            </div>
            <div>
              <p className="font-bold">المدير المالي والاعتماد</p>
              <p className="mt-8">....................................</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
