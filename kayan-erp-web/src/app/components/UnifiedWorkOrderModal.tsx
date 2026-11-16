'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useTheme } from '../context/ThemeContext';
import {
  Factory,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  X,
  AlertTriangle,
  Building2,
  Boxes,
  Scale,
  Filter,
  Warehouse,
  Flame,
  FileText,
  Printer,
  FileSpreadsheet,
  Download,
  Upload,
  FileDown,
  Sparkles,
  Check
} from 'lucide-react';

export interface UnifiedWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultLine?: string;
  defaultWarehouseId?: string;
}

interface ItemOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  departmentId?: string | null;
  departmentName?: string;
  currentBalance: number;
}

interface OrderDetailRow {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  currentBalance: number;
  quantity: number;
}

export default function UnifiedWorkOrderModal({
  isOpen,
  onClose,
  onSuccess,
  defaultLine,
  defaultWarehouseId,
}: UnifiedWorkOrderModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Form Fields
  const [orderNumber, setOrderNumber] = useState('');
  const [batchId, setBatchId] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [notes, setNotes] = useState('تشغيلة صالة حلواني أبو عادل اليومية');
  const [filterByLineOnly, setFilterByLineOnly] = useState<boolean>(true);

  // Lists from DB
  const [productionLines, setProductionLines] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<ItemOption[]>([]);

  // Rows of items
  const [details, setDetails] = useState<OrderDetailRow[]>([]);
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownIdx(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize data on opening
  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      const code = Math.floor(100 + Math.random() * 900);
      const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
      setOrderNumber(`WO-${todayStr}-${code}`);
      setBatchId(`BATCH-PROD-${code}`);
      setErrorMsg(null);
      setSuccessMsg(null);
      setOpenDropdownIdx(null);
      setIsPrintMode(false);
    }
  }, [isOpen]);

  // دالة ذكية للربط التلقائي بين صالة/خط الإنتاج ومستودع الاستلام والخامات
  const getMatchingWarehouseForLine = (lineName: string, whList: any[]) => {
    if (!lineName || !whList || whList.length === 0) return '';
    const l = lineName.toLowerCase();

    // 1. بحث دقيق عن مستودع الصالة المرتبط مباشرة بالقسم
    const floorMatch = whList.find((w: any) => {
      const name = (w.warehouseName || w.warehouse_name || '').toLowerCase();
      const code = (w.warehouseCode || w.warehouse_code || '').toLowerCase();

      if (l.includes('شرق') && (name.includes('شرق') || code.includes('300'))) return true;
      if ((l.includes('جاتوه') || l.includes('تورت') || l.includes('غرب') || l.includes('فرنساو')) &&
          (name.includes('جاتوه') || name.includes('تورت') || name.includes('غرب') || code.includes('400') || code.includes('900'))) return true;
      if (l.includes('مخبوز') && (name.includes('مخبوز') || code.includes('500'))) return true;
      if (l.includes('انتاج') && (name.includes('انتاج') || code.includes('wh-flr-2'))) return true;
      return false;
    });

    if (floorMatch) return String(floorMatch.id);

    // 2. إذا لم يكن هناك مخزن صالة فرعي، يتم التحويل تلقائياً لمخزن الخامات الرئيسي
    const rawWh = whList.find((w: any) => {
      const name = (w.warehouseName || w.warehouse_name || '').toLowerCase();
      return name.includes('خامات') && (name.includes('رئيس') || name.includes('100'));
    });
    if (rawWh) return String(rawWh.id);

    // 3. مستودع المنتج التام أو أول مستودع متاح
    return String(whList[0]?.id || '1');
  };

  const loadDependencies = async () => {
    try {
      const [linesRes, whRes, itemsRes] = await Promise.all([
        axios.get('http://localhost:3000/manufacturing/lines').catch(() => ({ data: [] })),
        axios.get('http://localhost:3000/inventory/warehouses').catch(() => ({ data: { data: [] } })),
        axios.get('http://localhost:3000/manufacturing/items').catch(() => ({ data: [] })),
      ]);

      const lines = linesRes.data || [];
      const whList = whRes.data?.data || whRes.data || [];
      const itemsRaw = itemsRes.data || [];

      setProductionLines(lines);
      setWarehouses(whList);

      const mappedItems: ItemOption[] = itemsRaw.map((it: any) => ({
        id: String(it.id),
        code: it.code || it.itemCode || '',
        name: it.name || it.itemName || 'صنف',
        unit: it.unit || 'قطعة',
        category: it.category || it.categoryName || '',
        departmentId: it.departmentId ? String(it.departmentId) : null,
        departmentName: it.departmentName || '',
        currentBalance: Number(it.currentBalance ?? it.availableBalance ?? 0),
      }));

      setAllItems(mappedItems);

      // تحديد الصالة الافتراضية
      const initialLine = defaultLine || lines.find((l: any) => (l.name || l.lineName)?.includes('الشرقى'))?.name || lines[0]?.name || 'قسم الشرقى';
      setSelectedLine(initialLine);

      // الربط التلقائي الإلزامي مع مستودع الاستلام والخامات
      const autoWhId = defaultWarehouseId || getMatchingWarehouseForLine(initialLine, whList);
      setSelectedWarehouseId(String(autoWhId));

      // صنف افتراضي مبدئي
      const firstItem = mappedItems[0];
      if (firstItem) {
        setDetails([
          {
            itemId: firstItem.id,
            itemCode: firstItem.code,
            itemName: firstItem.name,
            unit: firstItem.unit || 'قطعة',
            currentBalance: firstItem.currentBalance,
            quantity: 50,
          },
        ]);
        setSearchQueries({ 0: firstItem.name });
      } else {
        setDetails([
          { itemId: '', itemCode: '', itemName: '', unit: 'قطعة', currentBalance: 0, quantity: 50 },
        ]);
        setSearchQueries({});
      }
    } catch (e) {
      console.error('Error loading work order dependencies:', e);
    }
  };

  // عند تغيير خط الإنتاج / الصالة: يتم التحديث والربط التلقائي للمستودع فوراً
  const handleLineChange = (newLine: string) => {
    setSelectedLine(newLine);
    const autoWhId = getMatchingWarehouseForLine(newLine, warehouses);
    if (autoWhId) {
      setSelectedWarehouseId(autoWhId);
    }
  };

  const getFilteredItems = (searchQuery: string = '') => {
    const q = searchQuery.trim().toLowerCase();

    return allItems.filter((itm) => {
      const name = itm.name.toLowerCase();
      const code = itm.code.toLowerCase();
      const cat = itm.category.toLowerCase();
      const dept = (itm.departmentName || '').toLowerCase();

      const matchesSearch = !q || name.includes(q) || code.includes(q);
      if (!matchesSearch) return false;

      if (!filterByLineOnly || !selectedLine || selectedLine === 'الكل' || selectedLine === 'ادارة الانتاج') {
        return true;
      }

      const l = selectedLine.toLowerCase();
      if (dept && (dept.includes(l) || l.includes(dept))) return true;

      if (l.includes('شرق')) {
        return cat.includes('شرق') || name.includes('كنافة') || name.includes('بسبوسة') || 
               name.includes('هريسة') || name.includes('بلح الشام') || name.includes('أصابع زينب') || 
               name.includes('بقلاوة') || name.includes('رموش');
      }
      if (l.includes('تورت') || l.includes('جاتوه') || l.includes('غرب') || l.includes('فرنساو') || l.includes('اسبونش')) {
        return cat.includes('غرب') || name.includes('تورت') || name.includes('جاتوه') || 
               name.includes('ميلفيه') || name.includes('إكلير') || name.includes('شوكولاتة') || 
               name.includes('كريمه');
      }
      if (l.includes('مخبوز') || l.includes('نواعم')) {
        return cat.includes('مخبوز') || cat.includes('نواعم') || name.includes('كعك') || 
               name.includes('معمول') || name.includes('بسكويت') || name.includes('غريبة') || 
               name.includes('بتيفور');
      }

      return false;
    });
  };

  const handleSelectItem = (idx: number, itm: ItemOption) => {
    const updated = [...details];
    updated[idx] = {
      ...updated[idx],
      itemId: itm.id,
      itemCode: itm.code,
      itemName: itm.name,
      unit: itm.unit || 'قطعة',
      currentBalance: itm.currentBalance,
    };
    setDetails(updated);
    setSearchQueries((prev) => ({ ...prev, [idx]: itm.name }));
    setOpenDropdownIdx(null);
  };

  const handleQuantityChange = (idx: number, qty: number) => {
    const updated = [...details];
    updated[idx].quantity = qty;
    setDetails(updated);
  };

  const handleUnitChange = (idx: number, unit: string) => {
    const updated = [...details];
    updated[idx].unit = unit;
    setDetails(updated);
  };

  const addDetailRow = () => {
    const nextIdx = details.length;
    setDetails([
      ...details,
      { itemId: '', itemCode: '', itemName: '', unit: 'قطعة', currentBalance: 0, quantity: 20 },
    ]);
    setSearchQueries((prev) => ({ ...prev, [nextIdx]: '' }));
    setOpenDropdownIdx(nextIdx);
  };

  const removeDetailRow = (idx: number) => {
    if (details.length === 1) return;
    setDetails(details.filter((_, i) => i !== idx));
    const newQueries = { ...searchQueries };
    delete newQueries[idx];
    setSearchQueries(newQueries);
  };

  // ==========================================
  // تصدير أمر التشغيل إلى ملف إكسل (Excel Export)
  // ==========================================
  const handleExportExcel = () => {
    try {
      const selectedWhName = warehouses.find((w) => String(w.id) === String(selectedWarehouseId))?.warehouseName || 'المستودع الرئيسي';

      // ورقة عمل معلومات أمر التشغيل
      const orderSummaryData = [
        {
          'رقم أمر التشغيل': orderNumber,
          'رقم التشغيلة (Batch ID)': batchId,
          'خط الإنتاج / صالة التصنيع': selectedLine,
          'مستودع الاستلام والخامات': selectedWhName,
          'درجة الأولوية': priority === 'URGENT' ? 'حرجة وعاجلة' : priority === 'HIGH' ? 'عالية' : 'متوسطة',
          'تاريخ الإصدار': new Date().toLocaleDateString('ar-EG'),
          'وقت الإصدار': new Date().toLocaleTimeString('ar-EG'),
          'ملاحظات التشغيل والوصفة': notes,
        },
      ];

      // ورقة عمل بنود الأصناف المجدولة
      const itemsData = details.map((d, index) => ({
        'م': index + 1,
        'كود الصنف': d.itemCode,
        'اسم الصنف والتركيبة': d.itemName,
        'الرصيد السابق بالمخزن': d.currentBalance,
        'الكمية المخططة': d.quantity,
        'الوحدة': d.unit,
      }));

      const wb = XLSX.utils.book_new();

      const wsOrder = XLSX.utils.json_to_sheet(orderSummaryData);
      XLSX.utils.book_append_sheet(wb, wsOrder, 'بيانات أمر التشغيل');

      const wsItems = XLSX.utils.json_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(wb, wsItems, 'أصناف التشغيل');

      XLSX.writeFile(wb, `أمر_تشغيل_${orderNumber}_${batchId}.xlsx`);
      setSuccessMsg('تم تصدير ملف الإكسل بنجاح ✓');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg('تعذر تصدير ملف الإكسل: ' + err.message);
    }
  };

  // ==========================================
  // تحميل نموذج إكسل فارغ للاستيراد (Download Template)
  // ==========================================
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'كود الصنف': '301001',
        'اسم الصنف': 'بسبوسه ساده',
        'الكمية': 30,
        'الوحدة': 'كجم',
      },
      {
        'كود الصنف': 'EAS-005',
        'اسم الصنف': 'أصابع زينب بالسمن البلدي',
        'الكمية': 25,
        'الوحدة': 'كجم',
      },
      {
        'كود الصنف': '302021',
        'اسم الصنف': '30 * 30 تورتة',
        'الكمية': 10,
        'الوحدة': 'قطعة',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'بنود أمر التشغيل');
    XLSX.writeFile(wb, 'نموذج_استيراد_أمر_تشغيل_أبو_عادل.xlsx');
  };

  // ==========================================
  // استيراد بنود أمر التشغيل من إكسل (Excel Import)
  // ==========================================
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // استخدام ورقة العمل التي تحتوي على الأصناف
        const sheetName = workbook.SheetNames.find((s) => s.includes('أصناف') || s.includes('بنود')) || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!rows || rows.length === 0) {
          setErrorMsg('الملف المرفوع فارغ أو لا يحتوي على صفوف بيانات صالحة');
          return;
        }

        const importedRows: OrderDetailRow[] = [];
        const newSearchQueries: Record<number, string> = {};

        rows.forEach((r: any, idx: number) => {
          const code = String(r['كود الصنف'] || r['كود'] || r['ItemCode'] || r['code'] || '').trim();
          const name = String(r['اسم الصنف والتركيبة'] || r['اسم الصنف'] || r['الصنف'] || r['ItemName'] || r['name'] || '').trim();
          const qty = Number(r['الكمية المخططة'] || r['الكمية'] || r['كمية'] || r['Quantity'] || r['qty'] || 10);
          const unit = String(r['الوحدة'] || r['وحدة'] || r['Unit'] || 'قطعة').trim();

          // مطابقة الصنف مع قاعدة بيانات Neon DB
          const matchedItem = allItems.find(
            (it) => (code && it.code.toLowerCase() === code.toLowerCase()) || 
                    (name && it.name.toLowerCase() === name.toLowerCase()) ||
                    (name && it.name.includes(name))
          );

          if (matchedItem) {
            importedRows.push({
              itemId: matchedItem.id,
              itemCode: matchedItem.code,
              itemName: matchedItem.name,
              unit: unit || matchedItem.unit || 'قطعة',
              currentBalance: matchedItem.currentBalance,
              quantity: qty > 0 ? qty : 10,
            });
            newSearchQueries[idx] = matchedItem.name;
          } else if (name || code) {
            importedRows.push({
              itemId: allItems[0]?.id || '1',
              itemCode: code || allItems[0]?.code || '',
              itemName: name || allItems[0]?.name || 'صنف مستورد',
              unit: unit || 'قطعة',
              currentBalance: 0,
              quantity: qty > 0 ? qty : 10,
            });
            newSearchQueries[idx] = name || code;
          }
        });

        if (importedRows.length > 0) {
          setDetails(importedRows);
          setSearchQueries(newSearchQueries);
          setSuccessMsg(`تم استيراد ${importedRows.length} أصناف بنجاح من ملف الإكسل وتحديث الجدول ✓`);
          setTimeout(() => setSuccessMsg(null), 5000);
        } else {
          setErrorMsg('لم يتم التعرف على بنود متوافقة في ملف الإكسل');
        }
      } catch (err: any) {
        console.error('Excel Import Error:', err);
        setErrorMsg('حدث خطأ أثناء قراءة ملف الإكسل: ' + err.message);
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ==========================================
  // طباعة أمر التشغيل الصناعي الرسمي A4
  // ==========================================
  const handlePrintWorkOrder = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!orderNumber || !batchId || !selectedLine || details.some((d) => !d.itemId || d.quantity <= 0)) {
      setErrorMsg('يرجى استيفاء كافة البيانات واختيار صنف وكمية صالحة لكافة البنود');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        orderNumber,
        batchId,
        lineName: selectedLine,
        warehouseId: selectedWarehouseId,
        priority,
        notes,
        details: details.map((d) => ({
          itemId: d.itemId,
          itemCode: d.itemCode,
          itemName: d.itemName,
          plannedQuantity: Number(d.quantity),
          unit: d.unit,
        })),
      };

      await axios.post('http://localhost:3000/manufacturing/orders', payload);

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Unified work order submit error:', err);
      setErrorMsg(err.response?.data?.message || 'تعذر تسجيل وإطلاق أمر التشغيل الموحد');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentWhName = warehouses.find((w) => String(w.id) === String(selectedWarehouseId))?.warehouseName || 'مخزن الخامات الرئيسي';

  return (
    <>
      {/* 1. Modal Display (Screen Mode) */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto print:hidden" dir="rtl">
        <div
          ref={dropdownRef}
          className={`border rounded-2xl w-full max-w-5xl shadow-2xl p-5 sm:p-7 space-y-4 my-auto max-h-[94vh] flex flex-col ${
            isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3.5 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center shadow-md">
                <Factory className="w-5 h-5 font-black" />
              </div>
              <div>
                <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <span>إصدار وتأكيد أمر تشغيل صناعي موحد</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-slate-800 text-amber-900 dark:text-amber-400 border border-amber-300 dark:border-slate-700">
                    {orderNumber}
                  </span>
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  حلواني أبو عادل - ربط تلقائي بين الصالة والمستودع، مع دعم الاستيراد/التصدير والطباعة A4
                </p>
              </div>
            </div>

            {/* أزرار الإجراءات العلوية: طباعة + إكسل + إغلاق */}
            <div className="flex items-center gap-2 mr-auto">
              {/* زر طباعة أمر التشغيل */}
              <button
                type="button"
                onClick={handlePrintWorkOrder}
                title="طباعة بطاقة أمر التشغيل الصناعي الرسمية A4"
                className="erp-btn-compact px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>طباعة A4</span>
              </button>

              {/* زر تصدير إكسل */}
              <button
                type="button"
                onClick={handleExportExcel}
                title="تصدير أمر التشغيل وبنوده إلى ملف إكسل XLSX"
                className="erp-btn-compact px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>تصدير إكسل</span>
              </button>

              {/* زر استيراد إكسل */}
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleImportExcel}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="استيراد بنود الأصناف والكميات من ملف إكسل"
                className="erp-btn-compact px-3 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>استيراد إكسل</span>
              </button>

              {/* إغلاق */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* تنبيهات النجاح والخطأ */}
          {errorMsg && (
            <div className="p-3 rounded-lg text-xs font-bold border border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:border-rose-800/40 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg text-xs font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/40 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-visible text-xs">
            
            {/* Top Attributes Grid */}
            <div className={`p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 ${
              isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              {/* 1. رقم أمر التشغيل */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>رقم أمر التشغيل</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderNumber || ''}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full erp-input-compact font-mono font-bold text-amber-700 dark:text-amber-400"
                />
              </div>

              {/* 2. رقم التشغيلة / الباتش */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>رقم التشغيلة (Batch ID)</span>
                </label>
                <input
                  type="text"
                  required
                  value={batchId || ''}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="w-full erp-input-compact font-mono font-bold text-sky-700 dark:text-sky-400"
                />
              </div>

              {/* 3. خط الإنتاج / الصالة (مع الربط التلقائي بالمستودع) */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>خط الإنتاج / صالة التصنيع</span>
                </label>
                <select
                  value={selectedLine}
                  onChange={(e) => handleLineChange(e.target.value)}
                  className="w-full erp-input-compact font-bold"
                >
                  {productionLines.map((l: any) => (
                    <option key={l.id} value={l.name || l.lineName}>
                      {l.name || l.lineName}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. مستودع الإنتاج والاستلام (مرتبط تلقائياً) */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Warehouse className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>مستودع الاستلام والخامات</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950/40 px-1 rounded">
                    ربط آلي ✓
                  </span>
                </label>
                <select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  className="w-full erp-input-compact font-bold"
                >
                  {warehouses.map((wh: any) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.warehouseName || wh.warehouse_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. درجة الأولوية */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الأولوية</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full erp-input-compact font-bold"
                >
                  <option value="URGENT">حرجة وعاجلة (Urgent)</option>
                  <option value="HIGH">عالية (High)</option>
                  <option value="MEDIUM">متوسطة / عادية (Normal)</option>
                </select>
              </div>

              {/* 6. نطاق تصفية الأصناف */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>نطاق الأصناف</span>
                </label>
                <button
                  type="button"
                  onClick={() => setFilterByLineOnly(!filterByLineOnly)}
                  className={`erp-btn-compact w-full border font-bold transition flex items-center justify-between px-2.5 cursor-pointer ${
                    filterByLineOnly
                      ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400'
                      : 'bg-slate-200 border-slate-300 text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{filterByLineOnly ? `أصناف (${selectedLine})` : 'كافة الأصناف'}</span>
                  <span className="text-[10px] underline font-normal">تبديل</span>
                </button>
              </div>

              {/* 7. ملاحظات التشغيل والوصفة */}
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>ملاحظات التشغيل والوصفة</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>تحميل نموذج إكسل فارغ</span>
                  </button>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تعليمات خاصة بالتشغيلة، وردية العمل، أو تركيبة الصنف..."
                  className="w-full erp-input-compact"
                />
              </div>
            </div>

            {/* Items Table Section */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                    بنود الأصناف المجدولة للتشغيل والتصنيع:
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                    {details.length} أصناف
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addDetailRow}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 font-bold" />
                    <span>إضافة صنف جديد للأمر</span>
                  </button>
                </div>
              </div>

              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-900/90 text-xs font-black text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-5">اسم الصنف والتركيبة (Neon DB)</div>
                <div className="col-span-2 text-center">الرصيد السابق بالمخزن</div>
                <div className="col-span-2 text-center">الكمية المخططة</div>
                <div className="col-span-1 text-center">الوحدة</div>
                <div className="col-span-1 text-center">حذف</div>
              </div>

              {/* Rows */}
              <div className="space-y-2">
                {details.map((detail, idx) => {
                  const filtered = getFilteredItems(searchQueries[idx] ?? '');

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center relative transition ${
                        isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      {/* Index */}
                      <div className="hidden md:flex col-span-1 justify-center items-center">
                        <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center">
                          {idx + 1}
                        </span>
                      </div>

                      {/* Item Search & Select */}
                      <div className="col-span-1 md:col-span-5 relative">
                        <label className="md:hidden text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          الصنف المختار:
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="ابحث باسم الصنف أو كوده..."
                            value={searchQueries[idx] ?? detail.itemName ?? ''}
                            onFocus={() => setOpenDropdownIdx(idx)}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSearchQueries((prev) => ({ ...prev, [idx]: val }));
                              setOpenDropdownIdx(idx);
                            }}
                            className="w-full erp-input-compact font-bold pr-8"
                          />
                          <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>

                        {/* Dropdown Results */}
                        {openDropdownIdx === idx && (
                          <div className={`absolute top-full right-0 left-0 mt-1 max-h-56 overflow-y-auto rounded-xl shadow-2xl z-50 border p-1 ${
                            isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300 shadow-xl'
                          }`}>
                            <div className="p-1.5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500 font-bold">
                              <span>نتائج البحث ({filtered.length} صنف)</span>
                              <button
                                type="button"
                                onClick={() => setFilterByLineOnly(!filterByLineOnly)}
                                className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                {filterByLineOnly ? 'عرض كافة الأصناف' : `تصفية لـ ${selectedLine}`}
                              </button>
                            </div>

                            {filtered.length === 0 ? (
                              <div className="p-4 text-center text-xs text-slate-500">
                                لا توجد أصناف مطابقة.
                                <button
                                  type="button"
                                  onClick={() => setFilterByLineOnly(false)}
                                  className="block mx-auto mt-1 text-amber-600 font-bold underline"
                                >
                                  عرض أصناف المصنع بالكامل
                                </button>
                              </div>
                            ) : (
                              filtered.map((itm) => (
                                <div
                                  key={itm.id}
                                  onClick={() => handleSelectItem(idx, itm)}
                                  className={`p-2 hover:bg-amber-500/10 cursor-pointer rounded-lg flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 transition ${
                                    detail.itemId === itm.id ? 'bg-amber-500/15 font-black' : ''
                                  }`}
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 dark:text-white">
                                        {itm.name}
                                      </span>
                                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        {itm.code}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                      {itm.category && <span>{itm.category}</span>}
                                      {itm.departmentName && <span>• {itm.departmentName}</span>}
                                    </div>
                                  </div>

                                  <div className="text-left flex flex-col items-end">
                                    <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                                      itm.currentBalance > 0
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                      رصيد: {itm.currentBalance} {itm.unit}
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Stock Balance */}
                      <div className="col-span-1 md:col-span-2">
                        <label className="md:hidden text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          الرصيد السابق بالمخزن:
                        </label>
                        <div className={`h-9 px-2.5 rounded-lg border font-mono font-bold text-xs flex items-center justify-center gap-1 shadow-inner ${
                          detail.currentBalance > 0
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-400'
                            : 'bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                        }`}>
                          <Scale className="w-3.5 h-3.5 text-slate-400" />
                          <span>{detail.currentBalance.toLocaleString()}</span>
                          <span className="text-[10px] font-normal">{detail.unit || 'قطعة'}</span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-1 md:col-span-2">
                        <label className="md:hidden text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          الكمية المخططة:
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={detail.quantity ?? ''}
                          onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                          placeholder="الكمية"
                          className="w-full erp-input-compact font-mono text-center text-amber-700 dark:text-amber-400 font-black text-sm"
                        />
                      </div>

                      {/* Unit */}
                      <div className="col-span-1 md:col-span-1">
                        <label className="md:hidden text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                          الوحدة:
                        </label>
                        <select
                          value={detail.unit || 'قطعة'}
                          onChange={(e) => handleUnitChange(idx, e.target.value)}
                          className="w-full erp-input-compact font-bold text-center p-1"
                        >
                          <option value="كجم">كجم</option>
                          <option value="قطعة">قطعة</option>
                          <option value="صينية">صينية</option>
                          <option value="علبة">علبة</option>
                          <option value="كرتونة">كرتونة</option>
                        </select>
                      </div>

                      {/* Delete */}
                      <div className="col-span-1 md:col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => removeDetailRow(idx)}
                          disabled={details.length === 1}
                          title="حذف هذا الصنف"
                          className="p-2 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-300 dark:hover:border-rose-500/30 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unified Routing Steps Preview */}
            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-2 ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800/80 text-slate-300' : 'bg-slate-100/60 border-slate-200 text-slate-700'
            }`}>
              <span className="font-bold text-[11px] flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <Layers className="w-3.5 h-3.5" />
                المسارات الصناعية التلقائية:
              </span>
              <div className="text-[10px] font-mono flex flex-wrap items-center gap-1.5 font-bold">
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">1. صرف الخامات</span>
                <span>➔</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">2. العجن والخلط</span>
                <span>➔</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">3. الخبيز والتسوية</span>
                <span>➔</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">4. التبريد و QC</span>
                <span>➔</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">5. التعبئة والتغليف</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-500 hidden sm:block">
                * مستودع الاستلام مرتبط آلياً بصالة {selectedLine} ويتم الحفظ مباشرة في قاعدة بيانات Neon
              </div>

              <div className="flex items-center gap-2 mr-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="erp-btn-compact px-4 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-gold erp-btn-compact px-6 text-slate-950 font-black rounded-lg shadow-md hover:scale-105 transition cursor-pointer"
                >
                  {isSubmitting ? <span>جاري الحفظ في Neon...</span> : <span>تأكيد وإطلاق أمر التشغيل الموحد ✓</span>}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 2. Official Industrial Work Order Print Traveler (A4 Print Layout) */}
      <div className="hidden print:block print-only bg-white text-black p-6 text-right font-sans" dir="rtl" id="work-order-print-sheet">
        {/* Printable Header */}
        <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black mb-1">مصانع وحلواني أبو عادل</h1>
            <h2 className="text-lg font-bold text-slate-800">بطاقة إذن وتشغيلة أمر إنتاج ميداني (Shop Floor Route Card)</h2>
            <p className="text-xs text-slate-600 mt-1">المركز الرئيسي - المنصورة | نظام كيان لإدارة الموارد والإنتاج الصناعي ERP/MES</p>
          </div>
          <div className="text-left border border-black p-2 rounded">
            <div className="text-xs font-bold">رقم أمر التشغيل:</div>
            <div className="text-base font-mono font-black">{orderNumber}</div>
            <div className="text-xs font-bold mt-1">رقم الباتش:</div>
            <div className="text-sm font-mono font-bold">{batchId}</div>
          </div>
        </div>

        {/* Order Details Metadata Table */}
        <table className="w-full text-xs border border-black mb-4 border-collapse">
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2 font-bold bg-slate-100 w-1/6 border-l border-black">خط الإنتاج / الصالة:</td>
              <td className="p-2 font-black w-2/6 border-l border-black">{selectedLine}</td>
              <td className="p-2 font-bold bg-slate-100 w-1/6 border-l border-black">مستودع الاستلام:</td>
              <td className="p-2 font-black w-2/6">{currentWhName}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 font-bold bg-slate-100 border-l border-black">درجة الأولوية:</td>
              <td className="p-2 font-bold border-l border-black">
                {priority === 'URGENT' ? 'حرجة وعاجلة (Urgent)' : priority === 'HIGH' ? 'عالية (High)' : 'عادية (Normal)'}
              </td>
              <td className="p-2 font-bold bg-slate-100 border-l border-black">تاريخ وتوقيت الإصدار:</td>
              <td className="p-2 font-mono">{new Date().toLocaleDateString('ar-EG')} - {new Date().toLocaleTimeString('ar-EG')}</td>
            </tr>
            <tr>
              <td className="p-2 font-bold bg-slate-100 border-l border-black">ملاحظات التشغيل:</td>
              <td colSpan={3} className="p-2">{notes || 'لا توجد ملاحظات إضافية'}</td>
            </tr>
          </tbody>
        </table>

        {/* Scheduled Items Table */}
        <h3 className="font-bold text-sm mb-2 text-black">أولاً: بنود الأصناف المجدولة للتشغيل والمستهدف:</h3>
        <table className="w-full text-xs border border-black mb-6 border-collapse">
          <thead>
            <tr className="bg-slate-200 border-b border-black text-center font-bold">
              <th className="p-2 border-l border-black w-10">#</th>
              <th className="p-2 border-l border-black w-24">كود الصنف</th>
              <th className="p-2 border-l border-black">اسم الصنف والتركيبة</th>
              <th className="p-2 border-l border-black w-28">الرصيد السابق بالمخزن</th>
              <th className="p-2 border-l border-black w-28">الكمية المخططة</th>
              <th className="p-2 border-l border-black w-16">الوحدة</th>
              <th className="p-2 border-l border-black w-28">الإنتاج الفعلي</th>
              <th className="p-2 border-l border-black w-24">الهالك الميداني</th>
              <th className="p-2 w-24">اعتماد الجودة</th>
            </tr>
          </thead>
          <tbody>
            {details.map((d, index) => (
              <tr key={index} className="border-b border-black text-center">
                <td className="p-2 border-l border-black font-mono">{index + 1}</td>
                <td className="p-2 border-l border-black font-mono">{d.itemCode}</td>
                <td className="p-2 border-l border-black text-right font-bold">{d.itemName}</td>
                <td className="p-2 border-l border-black font-mono">{d.currentBalance} {d.unit}</td>
                <td className="p-2 border-l border-black font-mono font-bold text-sm">{d.quantity}</td>
                <td className="p-2 border-l border-black">{d.unit}</td>
                <td className="p-2 border-l border-black"></td>
                <td className="p-2 border-l border-black"></td>
                <td className="p-2"></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Routing Steps Traveler Card */}
        <h3 className="font-bold text-sm mb-2 text-black">ثانياً: مسارات ومراحل التشغيل الميدانية (Routing Traveler):</h3>
        <table className="w-full text-xs border border-black mb-6 border-collapse">
          <thead>
            <tr className="bg-slate-200 border-b border-black text-center font-bold">
              <th className="p-2 border-l border-black w-10">المرحلة</th>
              <th className="p-2 border-l border-black">اسم المرحلة الصناعية</th>
              <th className="p-2 border-l border-black w-36">المشغل المسؤول</th>
              <th className="p-2 border-l border-black w-24">وقت البدء</th>
              <th className="p-2 border-l border-black w-24">وقت الانتهاء</th>
              <th className="p-2 border-l border-black w-32">المخرجات الفعلية</th>
              <th className="p-2 w-32">توقيع المشرف</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2 border-l border-black text-center font-mono font-bold">1</td>
              <td className="p-2 border-l border-black font-bold">صرف ومطابقة الخامات والمكونات</td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2"></td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-l border-black text-center font-mono font-bold">2</td>
              <td className="p-2 border-l border-black font-bold">العجن والخلط الميكانيكي والأساسات</td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2"></td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-l border-black text-center font-mono font-bold">3</td>
              <td className="p-2 border-l border-black font-bold">الخبيز والتسوية بالأفران الصناعية</td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2"></td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-l border-black text-center font-mono font-bold">4</td>
              <td className="p-2 border-l border-black font-bold">التبريد ومراقبة جودة المنتج (QC)</td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2"></td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-l border-black text-center font-mono font-bold">5</td>
              <td className="p-2 border-l border-black font-bold">التعبئة والتغليف النهائي والتسليم</td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2 border-l border-black"></td>
              <td className="p-2"></td>
            </tr>
          </tbody>
        </table>

        {/* Signatures Footer */}
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

        <div className="mt-8 pt-2 border-t border-slate-300 text-[10px] text-center text-slate-500">
          تمت طباعة هذه الوثيقة من نظام «كيان ERP» - مؤسسة حلواني أبو عادل | وثيقة تشغيل معتمدة
        </div>
      </div>
    </>
  );
}
