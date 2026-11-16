'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import UnifiedWorkOrderModal from '../components/UnifiedWorkOrderModal';
import { 
  Factory, 
  Layers, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Printer, 
  Sun, 
  Moon, 
  Search, 
  Play, 
  Check, 
  PackageCheck,
  X,
  RefreshCw,
  Sparkles,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Timer,
  FileSpreadsheet
} from 'lucide-react';

interface ProductionItem {
  id: string;
  code: string;
  itemCode?: string;
  name: string;
  itemName?: string;
  unit: string;
  currentBalance: number;
  availableBalance?: number;
  currentStock?: number;
  departmentId?: string | null;
  departmentName?: string;
  category?: string;
}

interface ProductionLine {
  id: string;
  name: string;
  lineName?: string;
  code?: string;
}

interface OrderDetailInput {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  currentBalance: number;
  quantity: number;
}

export default function ProductionOperationsPage() {
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'ORDERS' | 'KPIS' | 'PRODUCTIVITY'>('ORDERS');

  const [items, setItems] = useState<ProductionItem[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // KPIs & Productivity States
  const [kpiData, setKpiData] = useState<any>(null);
  const [productivityWorkers, setProductivityWorkers] = useState<any[]>([]);
  const [selectedProductivityDept, setSelectedProductivityDept] = useState<string>('الكل');
  
  // نافذة إصدار أمر جديد موحد
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [itemsRes, linesRes, ordersRes] = await Promise.all([
        axios.get('http://localhost:3000/manufacturing/items').catch(() => ({ data: [] })),
        axios.get('http://localhost:3000/manufacturing/lines').catch(() => ({ data: [] })),
        axios.get('http://localhost:3000/manufacturing/orders').catch(() => ({ data: [] })),
      ]);

      const loadedItems: ProductionItem[] = (itemsRes.data || []).map((itm: any) => ({
        id: String(itm.id),
        code: itm.code || itm.itemCode || '',
        itemCode: itm.itemCode || itm.code || '',
        name: itm.name || itm.itemName || 'صنف',
        itemName: itm.itemName || itm.name || 'صنف',
        unit: itm.unit || 'قطعة',
        currentBalance: Number(itm.currentBalance ?? itm.availableBalance ?? 0),
        availableBalance: Number(itm.availableBalance ?? itm.currentBalance ?? 0),
        currentStock: Number(itm.currentStock ?? itm.currentBalance ?? 0),
        departmentId: itm.departmentId ? String(itm.departmentId) : null,
        departmentName: itm.departmentName || '',
        category: itm.category || itm.categoryName || '',
      }));

      setItems(loadedItems);
      setProductionLines(linesRes.data || []);
      setOrders(ordersRes.data || []);

      // Load KPIs & Productivity in background
      loadKpis();
      loadProductivity();
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadKpis = async () => {
    try {
      const res = await axios.get('http://localhost:3000/manufacturing/reports/efficiency');
      if (res.data?.success) {
        setKpiData(res.data);
      }
    } catch (e) {
      console.warn('Failed to load efficiency KPIs:', e);
    }
  };

  const loadProductivity = async () => {
    try {
      const res = await axios.get('http://localhost:3000/manufacturing/productivity');
      if (res.data?.success) {
        setProductivityWorkers(res.data.data || []);
      }
    } catch (e) {
      console.warn('Failed to load productivity data:', e);
    }
  };

  const openNewOrderModal = () => {
    setIsModalOpen(true);
  };

  return (
    <div className={`min-h-screen p-3 sm:p-5 text-right transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} dir="rtl">
      <div className="w-full space-y-4">

        {/* الترويسة الرئيسية عالية التباين والكثافة */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-3 p-4 rounded-xl border shadow-sm print:hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-md">
              <Factory className="w-5 h-5 font-black" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black flex items-center gap-2 text-amber-700 dark:text-amber-400">
                صالة عمليات الإنتاج والتشغيل المركزية
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
                  حلواني أبو عادل
                </span>
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                إصدار أوامر تشغيل متعددة الأصناف مربوطة بالمخازن، مراقبة كفاءة الصالات وهالك التشغيل، وإنتاجية العمال
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={`erp-btn-compact border transition flex items-center gap-1.5 font-bold text-xs cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
            </button>

            <button
              type="button"
              onClick={openNewOrderModal}
              className="btn-gold erp-btn-compact px-4 text-slate-950 font-black rounded-lg shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-105 transition"
            >
              <Plus className="w-4 h-4 font-bold" />
              <span>إصدار أمر تشغيل جديد</span>
            </button>
          </div>
        </div>

        {/* شريط التبويبات الموحد لصالة الإنتاج (Enterprise Production Hub Tabs) */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto print:hidden">
          {[
            { id: 'ORDERS', label: 'أوامر التشغيل الميدانية', icon: Factory },
            { id: 'KPIS', label: 'مؤشرات كفاءة الصالات وهالك التشغيل', icon: BarChart3 },
            { id: 'PRODUCTIVITY', label: 'إنتاجية العمال والورديات بالساعة', icon: Timer },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`erp-btn-compact px-4 text-xs font-bold transition-all rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  isSel
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : isDarkMode 
                      ? 'bg-slate-900/60 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                      : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 shadow-sm'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs font-bold border flex items-center justify-between shadow-sm ${
              feedback.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-400'
                : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/20 dark:border-rose-800/40 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{feedback.msg}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 1. تبويب أوامر التشغيل الميدانية */}
        {activeTab === 'ORDERS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {orders.map((ord) => (
              <div 
                key={ord.id} 
                className={`p-4 rounded-xl border space-y-3 shadow-sm transition-all hover:shadow-md ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex justify-between items-center border-b pb-2.5 border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="font-bold text-sm text-amber-700 dark:text-amber-400 font-mono">{ord.orderNumber}</h3>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{ord.lineName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintingOrder(ord);
                      setTimeout(() => window.print(), 200);
                    }}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition ${
                      isDarkMode 
                        ? 'text-slate-300 border-slate-700 hover:bg-slate-800' 
                        : 'text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Printer className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-bold">طباعة إذن A4</span>
                  </button>
                </div>

                {/* المراحل اللحظية */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400">المراحل التنفيذية:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ord.stages?.map((st: any) => (
                      <div
                        key={st.id}
                        className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                          st.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-400'
                            : st.status === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/30 dark:text-slate-400'
                        }`}
                      >
                        <div className="font-bold text-[11px] truncate">{st.name}</div>
                        <div className="text-[9px] mt-1 font-mono font-semibold">
                          {st.status === 'COMPLETED' ? 'مكتملة ✓' : st.status === 'IN_PROGRESS' ? 'قيد التنفيذ...' : 'في الانتظار'}
                        </div>
                      </div>
                    )) || (
                      <div className="col-span-2 text-[11px] text-slate-500 italic py-1">
                        المراحل: العجن والتجهيز ➔ الخَبز والتسوية ➔ السيرب والتزيين ➔ التعبئة
                      </div>
                    )}
                  </div>
                </div>

                {/* تفاصيل الأصناف */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2.5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-400 block mb-1">الأصناف المجدولة:</span>
                  <div className="space-y-1">
                    {ord.details?.map((d: any, idx: number) => (
                      <div 
                        key={idx} 
                        className={`flex justify-between items-center text-xs px-2.5 py-1.5 rounded border ${
                          isDarkMode 
                            ? 'bg-slate-950/60 border-slate-800/60 text-slate-200' 
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="font-bold">{d.itemName}</span>
                        <span className="font-mono text-amber-700 dark:text-amber-400 font-black">
                          {d.plannedQuantity} {d.unit || 'قطعة'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. تبويب مؤشرات كفاءة الصالات وهالك التشغيل */}
        {activeTab === 'KPIS' && (
          <div className="space-y-3">
            {kpiData?.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="erp-card rounded-xl p-3 border shadow-sm">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>أوامر التشغيل المنجزة</span>
                    <PackageCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="mt-1 text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    {kpiData.summary.totalCompletedOrders} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">أمر</span>
                  </div>
                </div>

                <div className="erp-card rounded-xl p-3 border shadow-sm">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>إجمالي المخطط</span>
                    <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  </div>
                  <div className="mt-1 text-lg font-black text-sky-700 dark:text-sky-400 font-mono">
                    {kpiData.summary.totalPlanned.toLocaleString()} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">كجم</span>
                  </div>
                </div>

                <div className="erp-card rounded-xl p-3 border shadow-sm">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>إجمالي الهالك الميداني</span>
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="mt-1 text-lg font-black text-rose-700 dark:text-rose-400 font-mono">
                    {kpiData.summary.totalWaste.toLocaleString()} <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">كجم</span>
                  </div>
                </div>

                <div className="erp-card rounded-xl p-3 border shadow-sm">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>متوسط كفاءة الصالات</span>
                    <BarChart3 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="mt-1 text-lg font-black text-amber-700 dark:text-amber-400 font-mono">
                    {kpiData.summary.averageEfficiency}%
                  </div>
                </div>
              </div>
            )}

            <div className="erp-card rounded-xl border overflow-hidden shadow-sm">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100">تحليل كفاءة ونسب الهالك لكل صالة وخط إنتاج</h3>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">بيانات حية مباشرة من استعلامات Neon DB</span>
              </div>
              <table className="erp-table-compact w-full text-right">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-slate-800 dark:text-slate-300 font-bold">
                    <th>الصالة / خط الإنتاج</th>
                    <th>كود الخط</th>
                    <th>المستهدف (كجم)</th>
                    <th>الإنتاج الفعلي (كجم)</th>
                    <th>الهالك الحرفي (كجم)</th>
                    <th>نسبة الكفاءة</th>
                    <th>مستوى الأداء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {kpiData?.departmentEfficiencies?.map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-100 dark:hover:bg-slate-800/40">
                      <td className="font-bold text-slate-900 dark:text-slate-200">{d.departmentName}</td>
                      <td className="font-mono text-slate-600 dark:text-slate-400 text-xs">{d.departmentCode}</td>
                      <td className="font-mono font-bold text-sky-700 dark:text-sky-400">{d.totalPlanned.toLocaleString()}</td>
                      <td className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{d.totalProduced.toLocaleString()}</td>
                      <td className="font-mono font-bold text-rose-700 dark:text-rose-400">{d.totalWaste.toLocaleString()}</td>
                      <td className="font-mono font-bold text-amber-700 dark:text-amber-400">{d.efficiencyPercentage}%</td>
                      <td>
                        {d.efficiencyPercentage >= 92 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">ممتاز</span>
                        ) : d.efficiencyPercentage >= 85 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">جيد جداً</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30">يحتاج ضبط</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. تبويب إنتاجية العمال والورديات بالساعة */}
        {activeTab === 'PRODUCTIVITY' && (
          <div className="space-y-3">
            <div className="erp-card rounded-xl border overflow-hidden shadow-sm">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100">سجل إنتاجية العمال بالساعة ومتابعة وردية الصالة</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">تصفية بالقسم:</span>
                  <select
                    value={selectedProductivityDept}
                    onChange={(e) => setSelectedProductivityDept(e.target.value)}
                    className="erp-input-compact text-xs cursor-pointer"
                  >
                    <option value="الكل">كافة الأقسام</option>
                    <option value="الشرقى">قسم الشرقي</option>
                    <option value="الجاتوه">قسم الجاتوه</option>
                    <option value="المخبوزات">قسم المخبوزات</option>
                    <option value="التورت">قسم التورت</option>
                  </select>
                </div>
              </div>
              <table className="erp-table-compact w-full text-right">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-slate-800 dark:text-slate-300 font-bold">
                    <th>كود العامل</th>
                    <th>اسم العامل / الفني</th>
                    <th>القسم / الصالة</th>
                    <th>المسمى الوظيفي</th>
                    <th>مستهدف الساعة</th>
                    <th>المنجز بالساعة</th>
                    <th>معدل الكفاءة</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {productivityWorkers
                    .filter((w) => selectedProductivityDept === 'الكل' || w.department.includes(selectedProductivityDept))
                    .map((w) => (
                      <tr key={w.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/40">
                        <td className="font-mono text-slate-600 dark:text-slate-400 text-xs">{w.employeeCode}</td>
                        <td className="font-bold text-slate-900 dark:text-slate-200">{w.workerName}</td>
                        <td className="text-slate-700 dark:text-slate-300 text-xs">{w.department}</td>
                        <td className="text-slate-600 dark:text-slate-400 text-xs">{w.jobTitle}</td>
                        <td className="font-mono font-bold text-sky-700 dark:text-sky-400">{w.targetPerHour} وحدة</td>
                        <td className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{w.actualPerHour} وحدة</td>
                        <td className="font-mono font-bold text-amber-700 dark:text-amber-400">{w.efficiency}%</td>
                        <td>
                          {w.status === 'EXCELLENT' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">فائق الإنتاج</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">منتظم</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: أمر التشغيل الصناعي الموحد */}
        <UnifiedWorkOrderModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadInitialData}
        />

        {/* Printable Official A4 Work Order Traveler for Selected Order */}
        {printingOrder && (
          <div className="hidden print:block print-only bg-white text-black p-6 text-right font-sans" dir="rtl" id="specific-order-print-sheet">
            <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-black mb-1">مصانع وحلواني أبو عادل</h1>
                <h2 className="text-base font-bold text-slate-800">بطاقة إذن وتشغيلة أمر إنتاج صناعي معتمد (Route Card)</h2>
                <p className="text-xs text-slate-600 mt-1">المركز الرئيسي - المنصورة | نظام كيان للإنتاج الصناعي ERP/MES</p>
              </div>
              <div className="text-left border border-black p-2 rounded">
                <div className="text-xs font-bold">رقم أمر التشغيل:</div>
                <div className="text-base font-mono font-black">{printingOrder.orderNumber}</div>
                <div className="text-xs font-bold mt-1">الحالة:</div>
                <div className="text-sm font-bold">{printingOrder.status}</div>
              </div>
            </div>

            <table className="w-full text-xs border border-black mb-4 border-collapse">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-2 font-bold bg-slate-100 w-1/6 border-l border-black">خط الإنتاج / الصالة:</td>
                  <td className="p-2 font-black w-2/6 border-l border-black">{printingOrder.lineName}</td>
                  <td className="p-2 font-bold bg-slate-100 w-1/6 border-l border-black">تاريخ الإصدار:</td>
                  <td className="p-2 font-mono">{new Date(printingOrder.createdAt || Date.now()).toLocaleDateString('ar-EG')}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="font-bold text-sm mb-2 text-black">أولاً: بنود الأصناف المجدولة بالأمر:</h3>
            <table className="w-full text-xs border border-black mb-6 border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-black text-center font-bold">
                  <th className="p-2 border-l border-black w-10">#</th>
                  <th className="p-2 border-l border-black w-28">كود الصنف</th>
                  <th className="p-2 border-l border-black">اسم الصنف والتركيبة</th>
                  <th className="p-2 border-l border-black w-28">الكمية المخططة</th>
                  <th className="p-2 border-l border-black w-20">الوحدة</th>
                  <th className="p-2 border-l border-black w-28">الإنتاج الفعلي</th>
                  <th className="p-2 border-l border-black w-24">الهالك</th>
                  <th className="p-2 w-24">اعتماد الجودة</th>
                </tr>
              </thead>
              <tbody>
                {printingOrder.details?.map((d: any, index: number) => (
                  <tr key={index} className="border-b border-black text-center">
                    <td className="p-2 border-l border-black font-mono">{index + 1}</td>
                    <td className="p-2 border-l border-black font-mono">{d.itemCode || '-'}</td>
                    <td className="p-2 border-l border-black text-right font-bold">{d.itemName}</td>
                    <td className="p-2 border-l border-black font-mono font-bold text-sm">{d.plannedQuantity}</td>
                    <td className="p-2 border-l border-black">{d.unit || 'قطعة'}</td>
                    <td className="p-2 border-l border-black"></td>
                    <td className="p-2 border-l border-black"></td>
                    <td className="p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-bold text-sm mb-2 text-black">ثانياً: مسارات ومراحل التشغيل الميدانية:</h3>
            <table className="w-full text-xs border border-black mb-6 border-collapse">
              <thead>
                <tr className="bg-slate-200 border-b border-black text-center font-bold">
                  <th className="p-2 border-l border-black w-10">المرحلة</th>
                  <th className="p-2 border-l border-black">اسم المرحلة الصناعية</th>
                  <th className="p-2 border-l border-black w-36">المشغل المسؤول</th>
                  <th className="p-2 border-l border-black w-24">وقت البدء</th>
                  <th className="p-2 border-l border-black w-24">وقت الانتهاء</th>
                  <th className="p-2 w-32">توقيع المشرف</th>
                </tr>
              </thead>
              <tbody>
                {printingOrder.stages?.map((st: any, idx: number) => (
                  <tr key={idx} className="border-b border-black">
                    <td className="p-2 border-l border-black text-center font-mono font-bold">{idx + 1}</td>
                    <td className="p-2 border-l border-black font-bold">{st.name}</td>
                    <td className="p-2 border-l border-black"></td>
                    <td className="p-2 border-l border-black"></td>
                    <td className="p-2 border-l border-black"></td>
                    <td className="p-2"></td>
                  </tr>
                )) || (
                  <tr className="border-b border-black">
                    <td colSpan={6} className="p-2 text-center text-slate-500">مراحل قياسية: عجن ➔ خبيز ➔ تبريد ➔ تغليف</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-black text-center text-xs font-bold">
              <div>
                <p className="mb-8">مشرف خط الإنتاج والصالة</p>
                <p>التوقيع: .......................................</p>
              </div>
              <div>
                <p className="mb-8">أمين مستودع الخامات</p>
                <p>التوقيع: .......................................</p>
              </div>
              <div>
                <p className="mb-8">مدير إدارة الجودة والرقابة</p>
                <p>التوقيع: .......................................</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
