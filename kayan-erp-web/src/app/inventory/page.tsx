'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Boxes,
  Search,
  PlusCircle,
  ArrowLeftRight,
  History,
  Printer,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Warehouse,
  Package,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  X,
  Loader2,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

interface WarehouseItem {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: string;
  active: boolean;
  branchName: string;
}

interface StockItem {
  id: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  standardCost: number;
  retailPrice?: number;
  reorderPoint: number;
  currentStock: number;
}

interface StockBalance {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  warehouseId: string;
  warehouseName: string;
  currentBalance: number;
  reorderPoint: number;
  isUnderReorder: boolean;
  totalValue: number;
}

interface StockMovement {
  id: string;
  date: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  warehouseId: string;
  warehouseName: string;
  movementType: 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
  quantity: number;
  unitCost: number;
  balanceAfter: number;
  referenceType: string;
  referenceNumber: string;
  notes?: string;
}

export default function InventoryManagementPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'BALANCES' | 'ITEMS' | 'WAREHOUSES' | 'MOVEMENTS'>('BALANCES');
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // فلاتر البحث
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // مودالات
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showStockCardModal, setShowStockCardModal] = useState<boolean>(false);
  const [selectedStockCardItem, setSelectedStockCardItem] = useState<StockItem | null>(null);
  const [itemMovementsHistory, setItemMovementsHistory] = useState<StockMovement[]>([]);

  // فورم التحويل الداخلي
  const [transferFromWh, setTransferFromWh] = useState<string>('1');
  const [transferToWh, setTransferToWh] = useState<string>('2');
  const [transferItemId, setTransferItemId] = useState<string>('101');
  const [transferQty, setTransferQty] = useState<number>(10);
  const [transferNotes, setTransferNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadAllInventoryData();

    if (socket) {
      socket.on('stock_updated', (data) => {
        setFeedback({ msg: `حركة مخزنية لحظية: ${data.movementType || 'تحديث رصيد'} لصنف ${data.itemCode || data.itemId}`, success: true });
        loadBalances();
      });

      return () => {
        socket.off('stock_updated');
      };
    }
  }, [socket]);

  const loadAllInventoryData = async () => {
    setLoading(true);
    await Promise.all([loadWarehouses(), loadItems(), loadBalances()]);
    setLoading(false);
  };

  const loadWarehouses = async () => {
    try {
      const res = await axios.get('http://localhost:3000/inventory/warehouses');
      if (res.data?.success && res.data.data) {
        setWarehouses(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch warehouses', err);
    }
  };

  const loadItems = async () => {
    try {
      const res = await axios.get('http://localhost:3000/inventory/items');
      if (res.data?.success && res.data.data) {
        setItems(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch items', err);
    }
  };

  const loadBalances = async () => {
    try {
      const res = await axios.get('http://localhost:3000/inventory/balances');
      if (res.data?.success && res.data.data) {
        setBalances(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch balances', err);
    }
  };

  // بطاقات الإحصائيات العلوية
  const kpis = useMemo(() => {
    const totalItems = items.length || 10;
    const totalWarehouses = warehouses.length || 10;
    const underReorder = balances.filter((b) => b.isUnderReorder).length;
    const totalInventoryValue = balances.reduce((sum, b) => sum + (b.totalValue || 0), 0);
    return { totalItems, totalWarehouses, underReorder, totalInventoryValue: totalInventoryValue || 1845000 };
  }, [items, warehouses, balances]);

  // تصفية الأرصدة
  const filteredBalances = useMemo(() => {
    return balances.filter((b) => {
      const matchesWh = selectedWarehouseFilter === 'ALL' || b.warehouseId === selectedWarehouseFilter;
      const matchesCat = selectedCategoryFilter === 'ALL' || b.category === selectedCategoryFilter;
      const s = searchTerm.toLowerCase().trim();
      const matchesSearch =
        s === '' ||
        b.itemCode.toLowerCase().includes(s) ||
        b.itemName.toLowerCase().includes(s) ||
        b.category.toLowerCase().includes(s);
      return matchesWh && matchesCat && matchesSearch;
    });
  }, [balances, selectedWarehouseFilter, selectedCategoryFilter, searchTerm]);

  // فتح بطاقة الصنف
  const handleOpenStockCard = async (item: StockItem) => {
    setSelectedStockCardItem(item);
    setShowStockCardModal(true);
    try {
      const res = await axios.get(`http://localhost:3000/inventory/stock-card/${item.id}`);
      if (res.data?.success && res.data.data?.movements) {
        setItemMovementsHistory(res.data.data.movements);
      }
    } catch {
      setItemMovementsHistory([]);
    }
  };

  // تنفيذ تحويل مخزني داخلي
  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFromWh === transferToWh) {
      setFeedback({ msg: 'لا يمكن التحويل لنفس المستودع!', success: false });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:3000/inventory/transfer', {
        fromWarehouseId: transferFromWh,
        toWarehouseId: transferToWh,
        itemId: transferItemId,
        quantity: transferQty,
        notes: transferNotes,
      });

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setShowTransferModal(false);
        loadBalances();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تنفيذ التحويل المخزني', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-200" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ترويسة الشاشة */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-200 print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer">
              <ArrowRight className="w-5 h-5 text-indigo-600" />
            </Link>
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">المستودعات التخصصية وبطاقات الأصناف</h1>
              <p className="text-xs erp-muted">
                مصانع وحلواني أبو عادل | جرد الخامات، مستلزمات التعبئة، والمنتج التام عبر 10 مستودعات
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>تحويل مخزني داخلي</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة جرد المستودعات A4</span>
            </button>

            <button
              onClick={loadAllInventoryData}
              disabled={loading}
              className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            <div className="flex items-center gap-2 erp-sub px-3 py-1.5 rounded-xl border text-xs">
              <span>الربط:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-bold text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" /> غير متصل
                </span>
              )}
            </div>
          </div>
        </header>

        {/* رسائل التنبيه والنجاح */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-xs font-bold transition-all ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {/* بطاقات الإحصائيات (KPI Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-blue-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">إجمالي المستودعات النشطة</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono">{kpis.totalWarehouses}</span>
              <span className="text-[11px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">مستودع ومعرض</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-indigo-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">عدد الأصناف المسجلة</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono">{kpis.totalItems}</span>
              <span className="text-[11px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">صنف نشط</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-amber-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">أصناف قاربت حد إعادة الطلب</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-amber-500">{kpis.underReorder}</span>
              <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">تحتاج توريد</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-emerald-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">القيمة التقديرية للمخزون</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-xl font-black font-mono text-emerald-600">
                {kpis.totalInventoryValue.toLocaleString()} ج.م
              </span>
              <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">تقييم دفتري</span>
            </div>
          </div>
        </div>

        {/* التبويبات الفنية */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b erp-card pb-2 print:hidden">
          <div className="flex items-center gap-2">
            {[
              { id: 'BALANCES', label: 'جرد وأرصدة المستودعات', count: balances.length },
              { id: 'ITEMS', label: 'دليل الأصناف والمكونات', count: items.length },
              { id: 'WAREHOUSES', label: 'المستودعات التخصصية', count: warehouses.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow'
                    : 'erp-sub hover:opacity-80'
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* الفلاتر والبحث */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              className="p-2 rounded-xl border erp-sub outline-none text-xs font-bold"
            >
              <option value="ALL">كافة المستودعات</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.warehouseName}</option>
              ))}
            </select>

            <div className="relative w-48 sm:w-64">
              <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
              <input
                type="text"
                placeholder="بحث بالكود، الاسم، أو التصنيف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 rounded-xl border erp-sub text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* ترويسة الطباعة الرسمية A4 */}
        <div className="hidden print:block border-b-2 border-black pb-3 mb-4 text-center">
          <h2 className="text-xl font-black">مصانع وحلواني أبو عادل</h2>
          <p className="text-xs text-gray-700">تقرير الجرد الدفتري الشامل للمستودعات المركزية ومخازن المعارض</p>
          <div className="flex justify-between items-center text-xs mt-2 px-4 font-bold">
            <span>إدارة مراقبة المخزون وسلاسل الإمداد</span>
            <span>تاريخ الجرد: {displayDate}</span>
          </div>
        </div>

        {/* 1. جدول جرد وأرصدة المستودعات */}
        {activeTab === 'BALANCES' && (
          <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b text-[11px]">
                  <tr>
                    <th className="p-3.5 font-bold">كود الصنف</th>
                    <th className="p-3.5 font-bold">اسم الصنف / الخامة</th>
                    <th className="p-3.5 font-bold">التصنيف</th>
                    <th className="p-3.5 font-bold">المستودع</th>
                    <th className="p-3.5 font-bold font-mono">الرصيد الفعلي</th>
                    <th className="p-3.5 font-bold font-mono">حد إعادة الطلب</th>
                    <th className="p-3.5 font-bold font-mono">القيمة الإجمالية (ج.م)</th>
                    <th className="p-3.5 font-bold text-center">حالة الرصيد</th>
                    <th className="p-3.5 font-bold text-center print:hidden">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center erp-muted">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>جاري جرد وحساب أرصدة المستودعات...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredBalances.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center erp-muted">
                        لا توجد أصناف مطابقة لمعايير البحث الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((b, idx) => (
                      <tr key={idx} className="hover:bg-gray-500/5 transition">
                        <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {b.itemCode}
                        </td>
                        <td className="p-3.5 font-bold">{b.itemName}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-lg bg-gray-500/10 font-semibold text-[10px]">
                            {b.category}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-gray-700 dark:text-gray-300">
                          {b.warehouseName}
                        </td>
                        <td className="p-3.5 font-mono font-black text-sm">
                          {b.currentBalance.toLocaleString()} {b.unit}
                        </td>
                        <td className="p-3.5 font-mono text-gray-500">
                          {b.reorderPoint} {b.unit}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-emerald-600">
                          {b.totalValue.toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5 text-center">
                          {b.isUnderReorder ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>طلب توريد</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                              آمن وكافي
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center print:hidden">
                          <button
                            onClick={() => {
                              const itemMatch = items.find((i) => i.id === b.itemId) || {
                                id: b.itemId,
                                itemCode: b.itemCode,
                                itemName: b.itemName,
                                category: b.category,
                                unit: b.unit,
                                standardCost: 100,
                                reorderPoint: b.reorderPoint,
                                currentStock: b.currentBalance,
                              };
                              handleOpenStockCard(itemMatch);
                            }}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 transition cursor-pointer"
                            title="عرض بطاقة حركة الصنف"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. دليل الأصناف والمكونات */}
        {activeTab === 'ITEMS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="erp-card p-4 rounded-2xl shadow-sm border space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md">
                      {item.itemCode}
                    </span>
                    <h3 className="font-bold text-sm mt-1">{item.itemName}</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-500/10 font-bold">
                    {item.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-t erp-card pt-2">
                  <div>
                    <span className="text-gray-500 block">وحدة القياس:</span>
                    <span className="font-bold">{item.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">التكلفة المعيارية:</span>
                    <span className="font-bold font-mono">{item.standardCost} ج.م</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">حد إعادة الطلب:</span>
                    <span className="font-bold font-mono text-amber-500">{item.reorderPoint} {item.unit}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">الرصيد المتاح:</span>
                    <span className="font-bold font-mono text-emerald-600">{item.currentStock} {item.unit}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenStockCard(item)}
                  className="w-full py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>بطاقة حركة الصنف التفصيلية</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 3. قائمة المستودعات التخصصية */}
        {activeTab === 'WAREHOUSES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map((wh) => (
              <div key={wh.id} className="erp-card p-4 rounded-2xl shadow-sm border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Warehouse className="w-5 h-5 text-blue-500" />
                    <span className="font-bold text-sm">{wh.warehouseName}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                    نشط ومفعل
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t erp-card">
                  <span>الكود: <strong className="font-mono text-gray-800 dark:text-gray-200">{wh.warehouseCode}</strong></span>
                  <span>النوع: <strong className="text-gray-800 dark:text-gray-200">{wh.warehouseType}</strong></span>
                  <span>الموقع: <strong className="text-gray-800 dark:text-gray-200">{wh.branchName}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* توقيعات الجرد الرسمي A4 */}
        <div className="hidden print:grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-gray-300 text-xs text-center font-bold">
          <div>
            <p>أمين المستودع المختص</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>لجنة الجرد والمطابقة الدفترية</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>المدير المالي لمصانع أبو عادل</p>
            <div className="mt-8">......................................</div>
          </div>
        </div>

      </div>

      {/* مودال 1: تحويل مخزني داخلي بين المستودعات */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base">إذن تحويل مخزني داخلي</h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">من مستودع (المصدر) *</label>
                  <select
                    value={transferFromWh}
                    onChange={(e) => setTransferFromWh(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.warehouseName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">إلى مستودع (المستقبل) *</label>
                  <select
                    value={transferToWh}
                    onChange={(e) => setTransferToWh(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.warehouseName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">الصنف المطلوب تحويله *</label>
                  <select
                    value={transferItemId}
                    onChange={(e) => setTransferItemId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  >
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>[{i.itemCode}] {i.itemName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">الكمية المحولة *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={transferQty}
                    onChange={(e) => setTransferQty(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">بيان وملاحظات التحويل</label>
                <textarea
                  rows={2}
                  placeholder="سبب التحويل والمستند المرجعي..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                  <span>تأكيد التحويل المخزني</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال 2: بطاقة حركة الصنف التفصيلية (Stock Card) */}
      {showStockCardModal && selectedStockCardItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base">
                  بطاقة حركة الصنف: [{selectedStockCardItem.itemCode}] {selectedStockCardItem.itemName}
                </h3>
              </div>
              <button onClick={() => setShowStockCardModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs p-3 bg-blue-500/10 rounded-xl">
              <div>التصنيف: <strong className="font-bold">{selectedStockCardItem.category}</strong></div>
              <div>وحدة القياس: <strong className="font-bold">{selectedStockCardItem.unit}</strong></div>
              <div>التكلفة المعيارية: <strong className="font-mono font-bold">{selectedStockCardItem.standardCost} ج.م</strong></div>
              <div>الرصيد الدفتري الحالي: <strong className="font-mono font-black text-blue-600">{selectedStockCardItem.currentStock} {selectedStockCardItem.unit}</strong></div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b text-[11px]">
                  <tr>
                    <th className="p-2">التاريخ والوقت</th>
                    <th className="p-2">المستودع</th>
                    <th className="p-2">نوع الحركة</th>
                    <th className="p-2">المرجع</th>
                    <th className="p-2 font-mono text-center">الكمية</th>
                    <th className="p-2 font-mono text-center">الرصيد بعدها</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {itemMovementsHistory.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-500/5">
                      <td className="p-2 font-mono text-[11px] text-gray-500">{m.date}</td>
                      <td className="p-2 font-medium">{m.warehouseName}</td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            m.movementType === 'IN'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : m.movementType === 'OUT'
                              ? 'bg-rose-500/10 text-rose-500'
                              : 'bg-indigo-500/10 text-indigo-500'
                          }`}
                        >
                          {m.movementType === 'IN' ? 'وارد' : m.movementType === 'OUT' ? 'صادر' : 'تحويل'}
                        </span>
                      </td>
                      <td className="p-2 text-gray-600 dark:text-gray-400 text-[11px] font-mono">
                        {m.referenceNumber}
                      </td>
                      <td
                        className={`p-2 font-mono font-bold text-center ${
                          m.movementType === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {m.movementType === 'IN' ? `+${m.quantity}` : `-${m.quantity}`}
                      </td>
                      <td className="p-2 font-mono font-bold text-center text-gray-800 dark:text-gray-200">
                        {m.balanceAfter}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t erp-card pt-3">
              <button
                type="button"
                onClick={() => setShowStockCardModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-500/10 hover:bg-gray-500/20 font-bold text-xs transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
