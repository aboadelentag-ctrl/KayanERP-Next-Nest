'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  Store,
  User,
  Plus,
  Trash2,
  Printer,
  Barcode,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Scale,
  Sparkles,
  ArrowRight,
  Loader2,
  X,
  CreditCard,
  Building,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  pricePerKg: number;
  unit: string;
  popular?: boolean;
}

interface SlipLineItem {
  itemId: string;
  itemName: string;
  quantity: number;
  weight: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

export default function SalesmanPosPage() {
  // Salesman details
  const [selectedSalesman, setSelectedSalesman] = useState({
    code: 'SLM-01',
    name: 'أحمد مصطفى (بائع صالة)',
  });

  const salesmenList = [
    { code: 'SLM-01', name: 'أحمد مصطفى (بائع صالة)' },
    { code: 'SLM-02', name: 'محمود السعيد (بائع صالة)' },
    { code: 'SLM-03', name: 'كريم عادل (بائع صالة)' },
    { code: 'SLM-04', name: 'إسلام حسني (بائع صالة)' },
  ];

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Dynamic Categories from Neon DB
  const [categories, setCategories] = useState<string[]>(['الكل']);
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');

  // Dynamic Catalog Items from Neon DB
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Active basket
  const [basket, setBasket] = useState<SlipLineItem[]>([]);
  const [selectedWeight, setSelectedWeight] = useState<number>(1.0);
  const [itemNotes, setItemNotes] = useState('');

  // Slip Submission & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdSlip, setCreatedSlip] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Weight Presets
  const weightPresets = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0];

  // 1. Fetch Categories & Products from Neon PostgreSQL on load
  const loadData = async () => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const [catRes, prodRes] = await Promise.all([
        axios.get('http://localhost:3000/sales/categories'),
        axios.get('http://localhost:3000/sales/products'),
      ]);

      if (catRes.data?.success && Array.isArray(catRes.data.data)) {
        const catNames = catRes.data.data.map((c: any) => c.name);
        setCategories(['الكل', ...catNames]);
      }

      if (prodRes.data?.success && Array.isArray(prodRes.data.data)) {
        const loadedItems = prodRes.data.data.map((it: any) => ({
          id: String(it.id),
          name: it.name || it.itemName,
          category: it.category || 'عام',
          pricePerKg: Number(it.pricePerKg || it.unitPrice || 0),
          unit: it.unit || 'كجم',
          popular: it.popular ?? false,
        }));
        setCatalog(loadedItems);
      }
    } catch (err: any) {
      console.error('Failed to fetch showroom products:', err);
      setCatalogError('تعذر جلب أصناف الحلويات من قاعدة البيانات. يرجى التأكد من تشغيل خادم النظام.');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddItem = (item: CatalogItem) => {
    const isPerPiece = item.unit === 'قطعة' || item.unit === 'طبق' || item.unit === 'علبة' || item.unit === 'دستة';
    const effectiveWeight = isPerPiece ? 1 : selectedWeight;
    const lineTotal = item.pricePerKg * effectiveWeight;

    setBasket((prev) => [
      ...prev,
      {
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        weight: effectiveWeight,
        unitPrice: item.pricePerKg,
        totalPrice: lineTotal,
        notes: itemNotes.trim(),
      },
    ]);
    setItemNotes('');
  };

  const handleRemoveLine = (idx: number) => {
    setBasket((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = basket.reduce((acc, curr) => acc + curr.totalPrice, 0);

  // Submit Real Slip directly to PostgreSQL
  const handleCreateSlip = async () => {
    if (basket.length === 0) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      salesmanCode: selectedSalesman.code,
      salesmanName: selectedSalesman.name,
      branchId: '1',
      branchName: 'الفرع الرئيسي - إدارة المصنع والمعرض',
      customerName: customerName.trim() || 'عميل صالة نقدي',
      customerPhone: customerPhone.trim(),
      items: basket,
      totalAmount: subtotal,
      notes: 'بوليصة تجهيز صالة البيع',
    };

    try {
      const res = await axios.post('http://localhost:3000/sales/slips', payload);
      if (res.data?.success && res.data.data) {
        setCreatedSlip(res.data.data);
        setBasket([]);
        setCustomerName('');
        setCustomerPhone('');
      } else {
        setSubmitError('تعذر تأكيد حفظ البوليصة من الخادم');
      }
    } catch (err: any) {
      console.error('API create slip error:', err);
      setSubmitError(err.response?.data?.message || 'فشل الاتصال بقاعدة البيانات لإنشاء البوليصة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCatalog = catalog.filter((item) => {
    const matchesCategory = activeCategory === 'الكل' || item.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div dir="rtl" className="min-h-screen p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. ترويسة شاشة البائع داخل الصالة */}
      <div className="erp-card p-5 rounded-3xl border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
              صالة البيع والحلويات
            </span>
            <span className="text-xs erp-muted">حلواني ومصانع أبو عادل - المنصورة</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-amber-500" />
            <span>نظام البائع وصالة التجهيز (Salesman Slip Portal)</span>
          </h1>
        </div>

        {/* اختيار البائع والتنقل السريع */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl erp-sub border">
            <User className="w-4 h-4 text-amber-500" />
            <select
              value={selectedSalesman.code}
              onChange={(e) => {
                const found = salesmenList.find((s) => s.code === e.target.value);
                if (found) setSelectedSalesman(found);
              }}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            >
              {salesmenList.map((s) => (
                <option key={s.code} value={s.code} className="bg-slate-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={loadData}
            title="تحديث قائمة الأصناف من قاعدة البيانات"
            className="p-2 rounded-2xl erp-sub border hover:bg-amber-500/10 text-amber-500 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            href="/pos/cashier"
            className="px-3.5 py-2 rounded-2xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>شاشة الكاشير</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* تحذير الخطأ إن وجد */}
      {catalogError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-between text-xs font-bold print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{catalogError}</span>
          </div>
          <button onClick={loadData} className="underline hover:text-white cursor-pointer">إعادة المحاولة</button>
        </div>
      )}

      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-2 text-xs font-bold print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* 2. جسم الشاشة: الكتالوج والأوزان (يمين) وسلة البوليصة (يسار) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:hidden">
        
        {/* العمود الأيمن: كتالوج الأصناف وأوزان الميزان (7 أعمدة) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* شريط الأوزان السريعة */}
          <div className="erp-card p-4 rounded-2xl border shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Scale className="w-4 h-4" />
                <span>الوزن المحدد حالياً للإضافة:</span>
              </span>
              <span className="font-mono text-base font-black text-white">{selectedWeight} كجم</span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {weightPresets.map((w) => (
                <button
                  key={w}
                  onClick={() => setSelectedWeight(w)}
                  className={`py-2 rounded-xl text-xs font-mono font-black transition cursor-pointer border ${
                    selectedWeight === w
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                      : 'erp-sub hover:opacity-80'
                  }`}
                >
                  {w} كجم
                </button>
              ))}
            </div>
          </div>

          {/* تصنيفات الأصناف والبحث المسترجعة من Neon */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer border ${
                    activeCategory === c
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow'
                      : 'erp-sub hover:opacity-80'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* شريط البحث السريع */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الصنف في قاعدة البيانات (بسبوسة، كنافة، تورتة، جاتوه...)..."
                className="w-full pl-4 pr-10 py-2.5 rounded-2xl erp-sub border text-xs font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* شبكة بطاقات الأصناف الفعلية */}
          {isLoadingCatalog ? (
            <div className="erp-card p-12 rounded-3xl border text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-xs font-bold erp-muted">جاري تحميل كتالوج الأصناف المعتمد من Neon DB...</p>
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div className="erp-card p-12 rounded-3xl border text-center space-y-2">
              <p className="text-sm font-bold text-white">لا توجد أصناف مطابقة للبحث أو التصنيف</p>
              <p className="text-xs erp-muted">يرجى اختيار تصنيف آخر أو مسح كلمة البحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredCatalog.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className="erp-card p-3 rounded-2xl border text-right transition group hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10 flex flex-col justify-between cursor-pointer space-y-2"
                >
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md erp-sub border erp-muted">
                        {item.category}
                      </span>
                      {item.popular && (
                        <span className="text-[10px] text-amber-400 font-bold flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> مميز
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-xs text-white mt-1.5 line-clamp-2 leading-relaxed">
                      {item.name}
                    </h3>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t mt-1">
                    <span className="font-mono text-xs font-black text-amber-400">
                      {item.pricePerKg} ج / {item.unit}
                    </span>
                    <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                      +
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* العمود الأيسر: سلة البائع وتجهيز البوليصة (5 أعمدة) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="erp-card p-5 rounded-3xl border shadow-sm space-y-4">
            
            {/* عنوان السلة */}
            <div className="flex justify-between items-center pb-3 border-b">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-amber-500" />
                <h2 className="font-black text-sm text-white">بوليصة التجهيز الحالية</h2>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full erp-sub border">
                {basket.length} بنود
              </span>
            </div>

            {/* بيانات العميل الاختيارية */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold erp-muted mb-1">اسم العميل</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="عميل صالة نقدي"
                  className="w-full px-3 py-2 rounded-xl erp-sub border font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold erp-muted mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full px-3 py-2 rounded-xl erp-sub border font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* قائمة البنود في السلة */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {basket.length === 0 ? (
                <div className="text-center py-10 erp-muted space-y-2">
                  <Store className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs font-bold">السلة فارغة، اختر الأصناف لتجهيز البوليصة</p>
                </div>
              ) : (
                basket.map((item, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-2xl erp-sub border flex justify-between items-center gap-2 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{item.itemName}</p>
                      <p className="text-[11px] font-mono erp-muted">
                        {item.weight} كجم × {item.unitPrice} ج
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-400">
                        {item.totalPrice.toFixed(2)} ج
                      </span>
                      <button
                        onClick={() => handleRemoveLine(index)}
                        className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* الإجمالي وزر الحفظ */}
            <div className="pt-3 border-t space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold erp-muted">إجمالي التجهيز التقديري:</span>
                <span className="font-mono text-xl font-black text-amber-400">
                  {subtotal.toFixed(2)} ج.م
                </span>
              </div>

              <button
                onClick={handleCreateSlip}
                disabled={basket.length === 0 || isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ البوليصة بقاعدة البيانات...</span>
                  </>
                ) : (
                  <>
                    <Barcode className="w-4 h-4" />
                    <span>إصدار بوليصة الحجز والباركود (Slip-First)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. نافذة منبثقة لبوليصة التجهيز الحرارية (80mm Thermal Slip Preview) */}
      {createdSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="erp-card w-full max-w-sm rounded-3xl border shadow-2xl p-6 space-y-4 text-center">
            
            <div className="flex justify-between items-center print:hidden border-b pb-3">
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم الحفظ في قاعدة البيانات بنجاح</span>
              </span>
              <button
                onClick={() => setCreatedSlip(null)}
                className="p-1 rounded-xl erp-sub hover:bg-rose-500/10 text-rose-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* معاينة الإيصال 80mm */}
            <div className="border border-dashed border-amber-500/40 p-4 rounded-2xl bg-slate-900/60 text-right space-y-3 text-xs">
              <div className="text-center space-y-1 border-b pb-2">
                <h2 className="font-black text-sm text-amber-400">حلواني ومصانع أبو عادل</h2>
                <p className="text-[10px] erp-muted">بوليصة حجز وتجهيز صالة</p>
                <div className="font-mono text-sm font-black tracking-widest text-white mt-1 bg-amber-500/10 py-1 rounded-lg border border-amber-500/20">
                  {createdSlip.slipNumber}
                </div>
              </div>

              <div className="space-y-1 text-[11px] erp-muted border-b pb-2">
                <div className="flex justify-between">
                  <span>البائع:</span>
                  <span className="font-bold text-white">{createdSlip.salesmanName}</span>
                </div>
                <div className="flex justify-between">
                  <span>العميل:</span>
                  <span className="font-bold text-white">{createdSlip.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span>التاريخ والوقت:</span>
                  <span className="font-mono">{new Date(createdSlip.createdAt).toLocaleTimeString('ar-EG')}</span>
                </div>
                <div className="flex justify-between">
                  <span>حالة البوليصة:</span>
                  <span className="font-bold text-amber-400">بانتظار السداد بالخزينة</span>
                </div>
              </div>

              {/* جدول البنود */}
              <div className="space-y-1">
                {createdSlip.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-[11px]">
                    <span className="text-white font-bold">{it.itemName} ({it.weight} كجم)</span>
                    <span className="font-mono font-bold text-amber-400">{Number(it.totalPrice).toFixed(2)} ج</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 flex justify-between items-center text-sm font-black text-white">
                <span>الإجمالي المطلوب سداده:</span>
                <span className="font-mono text-amber-400">{Number(createdSlip.totalAmount).toFixed(2)} ج</span>
              </div>
            </div>

            <p className="text-[11px] erp-muted">
              توجّه بهذا الكود أو الباركود إلى الخزينة لسداد القيمة واستلام الفاتورة الرسمية.
            </p>

            <div className="flex gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة البوليصة (80mm)</span>
              </button>
              <button
                onClick={() => setCreatedSlip(null)}
                className="px-4 py-2.5 rounded-xl erp-sub border hover:bg-slate-800 text-xs font-bold text-white"
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
