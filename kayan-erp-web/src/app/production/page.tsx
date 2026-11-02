'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
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
  Sparkles
} from 'lucide-react';

interface ProductionItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  currentBalance: number;
}

interface ProductionLine {
  id: string;
  name: string;
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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // نافذة إصدار أمر جديد
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [selectedDetails, setSelectedDetails] = useState<OrderDetailInput[]>([]);
  
  // حالة البحث داخل القوائم
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

      setItems(itemsRes.data || []);
      setProductionLines(linesRes.data || []);
      setOrders(ordersRes.data || []);

      if (linesRes.data && linesRes.data.length > 0) {
        setSelectedLine(linesRes.data[0].name);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openNewOrderModal = () => {
    const randomCode = `PO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    setOrderNumber(randomCode);
    setSelectedDetails([
      { itemId: '', itemCode: '', itemName: '', unit: 'قطعة', currentBalance: 0, quantity: 50 },
    ]);
    setSearchQueries({});
    setOpenDropdownIdx(null);
    setFeedback(null);
    setIsModalOpen(true);
  };

  const addDetailRow = () => {
    setSelectedDetails((prev) => [
      ...prev,
      { itemId: '', itemCode: '', itemName: '', unit: 'قطعة', currentBalance: 0, quantity: 20 },
    ]);
  };

  const removeDetailRow = (index: number) => {
    setSelectedDetails((prev) => prev.filter((_, i) => i !== index));
  };

  const selectItemForDetail = (index: number, item: ProductionItem) => {
    setSelectedDetails((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        unit: item.unit,
        currentBalance: item.currentBalance,
      };
      return updated;
    });
    setOpenDropdownIdx(null);
  };

  const updateQuantity = (index: number, delta: number) => {
    setSelectedDetails((prev) => {
      const updated = [...prev];
      const newQty = Math.max(1, (updated[index].quantity || 0) + delta);
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const setManualQuantity = (index: number, value: string) => {
    const qty = parseInt(value, 10) || 0;
    setSelectedDetails((prev) => {
      const updated = [...prev];
      updated[index].quantity = qty;
      return updated;
    });
  };

  const handleCreateOrder = async () => {
    const validDetails = selectedDetails.filter((d) => d.itemId);
    if (validDetails.length === 0) {
      setFeedback({ msg: 'يرجى اختيار صنف واحد على الأقل داخل أمر التشغيل', success: false });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        orderNumber,
        lineName: selectedLine,
        details: validDetails,
      };

      const res = await axios.post('http://localhost:3000/manufacturing/orders', payload);
      if (res.data?.success) {
        setFeedback({ msg: '✅ تم تعميم أمر التشغيل وحجز الخامات بنجاح!', success: true });
        setIsModalOpen(false);
        loadInitialData();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إصدار أمر التشغيل', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 text-right transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* الترويسة الرئيسية */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl border shadow-sm print:hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-amber-500">
              <Factory className="w-7 h-7" />
              صالة عمليات الإنتاج والتشغيل
            </h1>
            <p className="text-sm text-slate-400 mt-1">إصدار أوامر تشغيل متعددة الأصناف، مطابقة معادلات الخامات، ومتابعة الخطوط لحظياً</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold transition"
            >
              الرئيسية
            </Link>

            <Link
              href="/transfers"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow"
            >
              تحويلات الفروع
            </Link>

            <Link
              href="/crates"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow"
            >
              تتبع الصناديق
            </Link>

            <Link
              href="/forms"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow"
            >
              النماذج الذكية
            </Link>
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-xl border transition flex items-center gap-2 font-bold text-xs cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            </button>

            <button
              type="button"
              onClick={openNewOrderModal}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إصدار أمر تشغيل جديد
            </button>
          </div>
        </div>

        {/* شاشة متابعة الأوامر الميدانية */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map((ord) => (
            <div key={ord.id} className={`p-5 rounded-2xl border space-y-4 shadow-sm ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex justify-between items-center border-b pb-3 border-slate-800">
                <div>
                  <h3 className="font-bold text-base text-amber-400">{ord.orderNumber}</h3>
                  <span className="text-xs text-slate-400">{ord.lineName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-lg border text-xs flex items-center gap-1 text-slate-300 border-slate-700 hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  طباعة البطاقة
                </button>
              </div>

              {/* المراحل اللحظية */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400">مراحل خط الإنتاج الحالية:</span>
                <div className="grid grid-cols-2 gap-2">
                  {ord.stages?.map((st: any) => (
                    <div key={st.id} className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${st.status === 'COMPLETED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : st.status === 'IN_PROGRESS' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-950/40 border-slate-800 text-slate-400'}`}>
                      <span className="truncate">{st.name}</span>
                      {st.status === 'COMPLETED' && <Check className="w-3.5 h-3.5" />}
                      {st.status === 'IN_PROGRESS' && <Clock className="w-3.5 h-3.5 animate-spin" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* نافذة إصدار أمر التشغيل (Modal) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-xl p-6 space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-black'}`}>
              
              <div className="flex justify-between items-center border-b pb-3 border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-lg text-amber-500">إصدار أمر تشغيل وتصنيع جديد</h3>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {feedback && (
                <div className={`p-3 rounded-xl border text-xs font-bold ${feedback.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                  {feedback.msg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-400">رقم أمر التشغيل</label>
                  <input
                    type="text"
                    value={orderNumber}
                    readOnly
                    className={`w-full p-2.5 rounded-xl border font-mono text-xs font-bold ${isDarkMode ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-300 text-amber-600'}`}
                  />
                </div>

                {/* قائمة منسدلة لصالات وخطوط الإنتاج */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-400">صالة / خط الإنتاج المستهدف</label>
                  <select
                    value={selectedLine}
                    onChange={(e) => setSelectedLine(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:ring-2 focus:ring-amber-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
                  >
                    {productionLines.map((line) => (
                      <option key={line.id} value={line.name}>{line.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* قائمة الأصناف المتعددة داخل الأمر */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b pb-2 border-slate-800">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-slate-300">
                    <Layers className="w-4 h-4 text-amber-500" />
                    الأصناف المطلوب تشغيلها داخل الأمر ({selectedDetails.length})
                  </span>
                  <button
                    type="button"
                    onClick={addDetailRow}
                    className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold hover:bg-amber-500 hover:text-white transition cursor-pointer"
                  >
                    + إضافة صنف إضافي
                  </button>
                </div>

                {selectedDetails.map((detail, idx) => {
                  const query = (searchQueries[idx] ?? '').toLowerCase();
                  const filteredItems = items.filter(
                    (it) => it.name.toLowerCase().includes(query) || it.code.toLowerCase().includes(query)
                  );

                  return (
                    <div key={idx} className={`p-3.5 rounded-xl border space-y-3 relative ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-400">بند الصنف ({idx + 1})</span>
                        {selectedDetails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDetailRow(idx)}
                            className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* القائمة المنسدلة الذكية للبحث عن الصنف */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenDropdownIdx(openDropdownIdx === idx ? null : idx)}
                          className={`w-full p-2.5 rounded-xl border text-xs font-bold flex justify-between items-center cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`}
                        >
                          <span>{detail.itemName ? `${detail.itemName} (${detail.itemCode})` : '-- اضغط للبحث واختيار الصنف --'}</span>
                          <span className="text-slate-500">▼</span>
                        </button>

                        {/* القائمة المنبثقة للبحث */}
                        {openDropdownIdx === idx && (
                          <div className={`absolute top-full right-0 left-0 mt-1 z-50 rounded-xl border shadow-xl p-2 space-y-2 max-h-56 overflow-y-auto ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`}>
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="اكتب اسم الصنف أو كوده..."
                                value={searchQueries[idx] || ''}
                                onChange={(e) => setSearchQueries({ ...searchQueries, [idx]: e.target.value })}
                                className={`w-full pr-8 pl-3 py-1.5 rounded-lg border text-xs ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'}`}
                                autoFocus
                              />
                            </div>

                            <div className="space-y-1">
                              {filteredItems.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => selectItemForDetail(idx, item)}
                                  className={`w-full text-right p-2 rounded-lg text-xs flex justify-between items-center transition cursor-pointer ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                >
                                  <div>
                                    <span className="font-bold block">{item.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">كود: {item.code}</span>
                                  </div>
                                  <div className="text-left">
                                    <span className="text-[11px] font-bold text-emerald-400 block">رصيد: {item.currentBalance} {item.unit}</span>
                                    <span className="text-[10px] text-slate-400">الوحدة: {item.unit}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* شريط معلومات الصنف والكمية المطلوبة والعدادات اللمسية */}
                      {detail.itemId && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800">
                          <div className="flex items-center gap-3 text-xs">
                            <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                              الرصيد الفعلي الحالي: {detail.currentBalance} {detail.unit}
                            </span>
                            <span className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px]">
                              الوحدة: {detail.unit}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-400 ml-1">الكمية:</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, -10)}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                            >
                              -10
                            </button>
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, -1)}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                            >
                              -1
                            </button>
                            <input
                              type="number"
                              value={detail.quantity}
                              onChange={(e) => setManualQuantity(idx, e.target.value)}
                              className={`w-16 p-1 text-center rounded border font-mono font-bold text-xs ${isDarkMode ? 'bg-slate-900 border-slate-700 text-amber-400' : 'bg-white border-slate-300 text-amber-600'}`}
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, 1)}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => updateQuantity(idx, 10)}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  إصدار وتعميم أمر التشغيل للصالة
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}