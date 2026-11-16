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
  PackagePlus,
  Building2,
  Factory,
  Tag,
  Barcode,
  Check,
  FolderPlus,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  DollarSign,
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
  categoryId?: string;
  itemType?: string;
  departmentName?: string;
  departmentId?: string;
  unit: string;
  standardCost: number;
  retailPrice?: number;
  reorderPoint: number;
  currentStock: number;
  barcode?: string;
  isVariant?: boolean;
  isMerged?: boolean;
  isContainer?: boolean;
  multiUom?: boolean;
  hideDetailPrint?: boolean;
  variants?: Array<{ id: string; variantName: string; price: number; barcode: string }>;
  units?: Array<{ id: string; unitName: string; factor: number; price: number; barcode: string }>;
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

interface DepartmentItem {
  id: string;
  departmentCode: string;
  departmentName: string;
  description: string;
  active: boolean;
}

interface CategoryItem {
  id: string;
  categoryCode: string;
  categoryName: string;
  itemType: string;
}

interface BranchItem {
  id: string;
  branchCode: string;
  branchName: string;
}

interface VariantItem {
  id: string;
  name: string;
}

interface UnitItem {
  id: string;
  name: string;
  factor: number;
  isDefault: boolean;
}

export default function InventoryManagementPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'BALANCES' | 'ITEMS' | 'WAREHOUSES' | 'DEPARTMENTS'>('BALANCES');
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // فلاتر البحث
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // مودالات العرض
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showStockCardModal, setShowStockCardModal] = useState<boolean>(false);
  const [selectedStockCardItem, setSelectedStockCardItem] = useState<StockItem | null>(null);
  const [itemMovementsHistory, setItemMovementsHistory] = useState<StockMovement[]>([]);

  // مودالات الإضافة والإنشاء
  const [showAddItemModal, setShowAddItemModal] = useState<boolean>(false);
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState<boolean>(false);
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState<boolean>(false);

  // فورم التحويل الداخلي
  const [transferFromWh, setTransferFromWh] = useState<string>('1');
  const [transferToWh, setTransferToWh] = useState<string>('2');
  const [transferItemId, setTransferItemId] = useState<string>('101');
  const [transferQty, setTransferQty] = useState<number>(10);
  const [transferNotes, setTransferNotes] = useState<string>('');

  // --- نموذج إضافة صنف متقدم متعدد الأنواع والوحدات (مطابق تماماً للصورة 1) ---
  const [itemBasic, setItemBasic] = useState({
    itemCode: '308096',
    itemName: '',
    departmentId: '',
    categoryId: '1',
    itemType: 'منتج تام',
    // Checkboxes (خيارات الصنف)
    stopItem: false, // إيقاف الصنف
    isMerged: true, // مدمج
    isContainer: false, // صنف حاوية
    isVariant: true, // متنوع
    multiUom: true, // متعدد الوحدات
    hideDetailPrint: false, // بدون طباعة تفاصيل
  });

  // أنواع الصنف (Variants)
  const [variantsList, setVariantsList] = useState<VariantItem[]>([
    { id: '1', name: 'نوع جديد 1' },
  ]);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState<number>(0);

  // وحدات الصنف (Units)
  const [unitsList, setUnitsList] = useState<UnitItem[]>([
    { id: '1', name: 'قطعه', factor: 1, isDefault: true },
  ]);

  // جدول الأسعار والباركود: priceMatrix[variantName][unitName] = { price, barcode }
  const [priceMatrix, setPriceMatrix] = useState<Record<string, Record<string, { price: number; barcode: string }>>>({
    'نوع جديد 1': {
      'قطعه': { price: 0, barcode: '308096' },
    },
  });

  // فورم إضافة مستودع جديد
  const [newWarehouse, setNewWarehouse] = useState({
    warehouseCode: '',
    warehouseName: '',
    warehouseType: 'خامات',
    branchId: '1',
    description: '',
  });

  // فورم إضافة قسم / إدارة جديدة
  const [newDepartment, setNewDepartment] = useState({
    departmentCode: '',
    departmentName: '',
    description: '',
  });

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

      socket.on('item_created', (data) => {
        setFeedback({ msg: `تم إضافة صنف جديد لحظياً: [${data.itemCode}] ${data.itemName}`, success: true });
        loadItems();
        loadBalances();
      });

      socket.on('warehouse_created', (data) => {
        setFeedback({ msg: `تم إنشاء مستودع جديد لحظياً: ${data.warehouseName}`, success: true });
        loadWarehouses();
      });

      socket.on('department_created', (data) => {
        setFeedback({ msg: `تم إضافة قسم / خط إنتاج لحظياً: ${data.departmentName}`, success: true });
        loadDepartments();
      });

      return () => {
        socket.off('stock_updated');
        socket.off('item_created');
        socket.off('warehouse_created');
        socket.off('department_created');
      };
    }
  }, [socket]);

  const loadAllInventoryData = async () => {
    setLoading(true);
    await Promise.all([
      loadWarehouses(),
      loadItems(),
      loadBalances(),
      loadDepartments(),
      loadCategories(),
      loadBranches(),
    ]);
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

  const loadDepartments = async () => {
    try {
      const res = await axios.get('http://localhost:3000/inventory/departments');
      if (res.data?.success && res.data.data) {
        setDepartments(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch departments', err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await axios.get('http://localhost:3000/inventory/categories');
      if (res.data?.success && res.data.data) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch categories', err);
    }
  };

  const loadBranches = async () => {
    try {
      const res = await axios.get('http://localhost:3000/inventory/branches');
      if (res.data?.success && res.data.data) {
        setBranches(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch branches', err);
    }
  };

  // بطاقات الإحصائيات العلوية
  const kpis = useMemo(() => {
    const totalItems = items.length || 0;
    const totalWarehouses = warehouses.length || 0;
    const totalDepartments = departments.length || 0;
    const underReorder = balances.filter((b) => b.isUnderReorder).length;
    const totalInventoryValue = balances.reduce((sum, b) => sum + (b.totalValue || 0), 0);
    return { totalItems, totalWarehouses, totalDepartments, underReorder, totalInventoryValue };
  }, [items, warehouses, departments, balances]);

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

  // تصفية الأصناف
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCat = selectedCategoryFilter === 'ALL' || item.category === selectedCategoryFilter;
      const s = searchTerm.toLowerCase().trim();
      const matchesSearch =
        s === '' ||
        item.itemCode.toLowerCase().includes(s) ||
        item.itemName.toLowerCase().includes(s) ||
        item.category.toLowerCase().includes(s) ||
        (item.departmentName && item.departmentName.toLowerCase().includes(s));
      return matchesCat && matchesSearch;
    });
  }, [items, selectedCategoryFilter, searchTerm]);

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

  // فتح نافذة إضافة الصنف وتجهيز النموذج المتقدم المطابق للصورة 1
  const handleOpenAddItem = () => {
    const maxCode = items.reduce((max, it) => {
      const num = parseInt(it.itemCode, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 308095);
    const suggestedCode = String(maxCode + 1);

    setItemBasic({
      itemCode: suggestedCode,
      itemName: '',
      departmentId: departments[0]?.id || '',
      categoryId: categories[0]?.id || '1',
      itemType: 'منتج تام',
      stopItem: false,
      isMerged: true,
      isContainer: false,
      isVariant: true,
      multiUom: true,
      hideDetailPrint: false,
    });

    const initVariants = [{ id: '1', name: 'نوع جديد 1' }];
    const initUnits = [{ id: '1', name: 'قطعه', factor: 1, isDefault: true }];

    setVariantsList(initVariants);
    setSelectedVariantIdx(0);
    setUnitsList(initUnits);

    setPriceMatrix({
      'نوع جديد 1': {
        'قطعه': { price: 0, barcode: suggestedCode },
      },
    });

    setShowAddItemModal(true);
  };

  // إضافة نوع جديد
  const handleAddVariant = () => {
    const nextIdx = variantsList.length + 1;
    const newVarName = `نوع جديد ${nextIdx}`;
    const updated = [...variantsList, { id: String(Date.now()), name: newVarName }];
    setVariantsList(updated);
    setSelectedVariantIdx(updated.length - 1);

    // تهيئة مصفوفة الأسعار للنوع الجديد
    setPriceMatrix((prev) => {
      const clone = { ...prev };
      clone[newVarName] = clone[newVarName] || {};
      unitsList.forEach((u, uIdx) => {
        clone[newVarName][u.name] = {
          price: 0,
          barcode: `${itemBasic.itemCode}${nextIdx < 10 ? '0' + nextIdx : nextIdx}${uIdx + 1}`,
        };
      });
      return clone;
    });
  };

  // حذف نوع
  const handleRemoveVariant = (idxToRemove: number) => {
    if (variantsList.length <= 1) return;
    const removedName = variantsList[idxToRemove]?.name;
    const updated = variantsList.filter((_, idx) => idx !== idxToRemove);
    setVariantsList(updated);
    setSelectedVariantIdx(Math.max(0, idxToRemove - 1));

    if (removedName) {
      setPriceMatrix((prev) => {
        const clone = { ...prev };
        delete clone[removedName];
        return clone;
      });
    }
  };

  // تعديل اسم النوع
  const handleUpdateVariantName = (idx: number, newName: string) => {
    const oldName = variantsList[idx].name;
    const updated = [...variantsList];
    updated[idx].name = newName;
    setVariantsList(updated);

    setPriceMatrix((prev) => {
      const clone = { ...prev };
      if (oldName !== newName && clone[oldName]) {
        clone[newName] = clone[oldName];
        delete clone[oldName];
      }
      return clone;
    });
  };

  // إضافة وحدة جديدة
  const handleAddUnit = () => {
    const unitNames = ['دستة', 'كرتونة', 'صينية', 'علبة', 'شيكارة', 'كجم'];
    const nextName = unitNames[unitsList.length % unitNames.length] || `وحدة ${unitsList.length + 1}`;
    const newFactor = unitsList.length === 1 ? 12 : unitsList.length * 10;
    const updated = [...unitsList, { id: String(Date.now()), name: nextName, factor: newFactor, isDefault: false }];
    setUnitsList(updated);

    // تهيئة مصفوفة الأسعار للوحدة الجديدة في كل الأنواع
    setPriceMatrix((prev) => {
      const clone = { ...prev };
      variantsList.forEach((v) => {
        clone[v.name] = clone[v.name] || {};
        clone[v.name][nextName] = {
          price: 0,
          barcode: `${itemBasic.itemCode}${unitsList.length + 1}`,
        };
      });
      return clone;
    });
  };

  // حذف وحدة
  const handleRemoveUnit = (idxToRemove: number) => {
    if (unitsList.length <= 1) return;
    const removedUnitName = unitsList[idxToRemove]?.name;
    const updated = unitsList.filter((_, idx) => idx !== idxToRemove);
    setUnitsList(updated);

    if (removedUnitName) {
      setPriceMatrix((prev) => {
        const clone = { ...prev };
        variantsList.forEach((v) => {
          if (clone[v.name]) {
            delete clone[v.name][removedUnitName];
          }
        });
        return clone;
      });
    }
  };

  // تعيين وحدة كافتراضية
  const handleSetDefaultUnit = (idx: number) => {
    const updated = unitsList.map((u, i) => ({
      ...u,
      isDefault: i === idx,
    }));
    setUnitsList(updated);
  };

  // تعديل السعر أو الباركود في مصفوفة الأسعار للنوع الحالي والوحدة المحددة
  const handleUpdatePriceOrBarcode = (unitName: string, field: 'price' | 'barcode', value: any) => {
    const currentVarName = variantsList[selectedVariantIdx]?.name || 'نوع جديد 1';
    setPriceMatrix((prev) => {
      const clone = { ...prev };
      clone[currentVarName] = clone[currentVarName] || {};
      clone[currentVarName][unitName] = clone[currentVarName][unitName] || { price: 0, barcode: itemBasic.itemCode };
      clone[currentVarName][unitName] = {
        ...clone[currentVarName][unitName],
        [field]: value,
      };
      return clone;
    });
  };

  // فتح نافذة إضافة مستودع مع كود مقترح
  const handleOpenAddWarehouse = () => {
    const suggestedCode = `WH-0${warehouses.length + 1}`;
    setNewWarehouse({
      warehouseCode: suggestedCode,
      warehouseName: '',
      warehouseType: 'خامات',
      branchId: branches[0]?.id || '1',
      description: '',
    });
    setShowAddWarehouseModal(true);
  };

  // فتح نافذة إضافة إدارة / قسم مع كود مقترح
  const handleOpenAddDepartment = () => {
    const suggestedCode = `DEP-${departments.length + 100}`;
    setNewDepartment({
      departmentCode: suggestedCode,
      departmentName: '',
      description: '',
    });
    setShowAddDepartmentModal(true);
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

  // حفظ وإدراج الصنف الجديد مع الأنواع والوحدات المتعددة ومصفوفة الأسعار (مطابق للصورة 1)
  const handleSaveItemWithVariants = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemBasic.itemCode.trim() || !itemBasic.itemName.trim()) {
      setFeedback({ msg: 'يرجى إدخال كود واسم الصنف', success: false });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        itemCode: itemBasic.itemCode.trim(),
        itemName: itemBasic.itemName.trim(),
        departmentId: itemBasic.departmentId || null,
        categoryId: itemBasic.categoryId || '1',
        itemType: itemBasic.itemType || 'منتج تام',
        active: !itemBasic.stopItem,
        isVariant: itemBasic.isVariant,
        isMerged: itemBasic.isMerged,
        isContainer: itemBasic.isContainer,
        multiUom: itemBasic.multiUom,
        hideDetailPrint: itemBasic.hideDetailPrint,
        unit: unitsList.find((u) => u.isDefault)?.name || unitsList[0]?.name || 'قطعة',
        variants: variantsList.map((v, vIdx) => {
          const currentUnit = unitsList[0]?.name || 'قطعة';
          const pData = priceMatrix[v.name]?.[currentUnit];
          return {
            name: v.name,
            code: `${itemBasic.itemCode}-V${vIdx + 1}`,
            price: pData?.price || 0,
            barcode: pData?.barcode || `${itemBasic.itemCode}0${vIdx + 1}`,
          };
        }),
        units: unitsList.map((u) => ({
          name: u.name,
          factor: u.factor,
          isDefault: u.isDefault,
        })),
        prices: priceMatrix,
      };

      const res = await axios.post('http://localhost:3000/inventory/items', payload);
      if (res.data?.success) {
        setFeedback({ msg: res.data.message || 'تمت إضافة الصنف بنجاح', success: true });
        setShowAddItemModal(false);
        await Promise.all([loadItems(), loadBalances()]);
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'فشل في حفظ الصنف وتفريعاته', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // حفظ وإدراج مستودع جديد
  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouse.warehouseCode.trim() || !newWarehouse.warehouseName.trim()) {
      setFeedback({ msg: 'يرجى إدخال كود واسم المستودع', success: false });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:3000/inventory/warehouses', newWarehouse);
      if (res.data?.success) {
        setFeedback({ msg: res.data.message || 'تم إنشاء المستودع بنجاح', success: true });
        setShowAddWarehouseModal(false);
        await loadWarehouses();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'فشل في إنشاء المستودع', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // حفظ وإدراج إدارة / قسم جديد
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDepartment.departmentCode.trim() || !newDepartment.departmentName.trim()) {
      setFeedback({ msg: 'يرجى إدخال كود واسم الإدارة أو القسم', success: false });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:3000/inventory/departments', newDepartment);
      if (res.data?.success) {
        setFeedback({ msg: res.data.message || 'تمت إضافة الإدارة / القسم بنجاح', success: true });
        setShowAddDepartmentModal(false);
        await loadDepartments();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'فشل في إضافة الإدارة', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // الاسم الحالي للنوع المختار لعرضه في قسم الأسعار والباركود
  const currentSelectedVariantName = variantsList[selectedVariantIdx]?.name || 'نوع جديد 1';

  return (
    <div className="min-h-screen p-2 md:p-3 transition-colors duration-200" dir="rtl">
      <div className="w-full space-y-2.5">

        {/* ترويسة الشاشة المدمجة عالي الكثافة (Compact Header) */}
        <header className="erp-card p-3 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-2 transition-colors duration-200 print:hidden">
          <div className="flex items-center gap-2.5">
            <Link href="/" className="p-1.5 rounded-lg border erp-sub hover:opacity-80 transition cursor-pointer">
              <ArrowRight className="w-4 h-4 text-indigo-600" />
            </Link>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black">المستودعات وبطاقات الأصناف والأقسام</h1>
              <p className="text-[11px] erp-muted">
                مصانع وحلواني أبو عادل | تعريف الأصناف بالأنواع والوحدات المتعددة، المستودعات، وهيكلة الأقسام
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* زر إضافة صنف جديد (المتطور) */}
            <button
              onClick={handleOpenAddItem}
              className="erp-btn-compact bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition cursor-pointer"
              title="إضافة صنف بأنواع ووحدات متعددة (مطابق للشاشة)"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>+ إضافة صنف جديد</span>
            </button>

            {/* رابط مباشر للتقرير الموجز خاص بالمخازن (الصورة 2) */}
            <Link
              href="/reports"
              className="erp-btn-compact bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-1.5"
              title="فتح التقرير الموجز الخاص بالمخازن وتفريعات العملاء"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>التقرير الموجز (مخازن)</span>
            </Link>

            {/* زر إضافة مستودع جديد */}
            <button
              onClick={handleOpenAddWarehouse}
              className="erp-btn-compact erp-sub border hover:opacity-80 font-bold text-xs shadow transition cursor-pointer"
            >
              <Warehouse className="w-3.5 h-3.5 text-blue-500" />
              <span>+ مستودع</span>
            </button>

            {/* زر إضافة قسم / صالة */}
            <button
              onClick={handleOpenAddDepartment}
              className="erp-btn-compact erp-sub border hover:opacity-80 font-bold text-xs shadow transition cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-purple-500" />
              <span>+ قسم / صالة</span>
            </button>

            <button
              onClick={() => setShowTransferModal(true)}
              className="erp-btn-compact erp-sub border hover:opacity-80 font-bold text-xs shadow transition cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
              <span>تحويل مخزني</span>
            </button>

            <button
              onClick={loadAllInventoryData}
              disabled={loading}
              className="erp-btn-compact erp-sub border hover:opacity-80 transition cursor-pointer"
              title="تحديث البيانات"
            >
              <RotateCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
              <span>تحديث</span>
            </button>

            <div className="flex items-center gap-1.5 erp-sub px-2 py-1 rounded-lg border text-xs">
              <span className="erp-muted text-[10px]">الربط:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-bold text-emerald-500 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-rose-500 text-[11px]">
                  <AlertCircle className="w-3 h-3" /> غير متصل
                </span>
              )}
            </div>
          </div>
        </header>

        {/* رسائل التنبيه والنجاح */}
        {feedback && (
          <div
            className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* بطاقات الإحصائيات المدمجة عالي الكثافة (Compact KPI Strip) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 print:hidden">
          <div className="erp-card p-2.5 px-3 rounded-xl shadow-sm border border-l-4 border-l-blue-500 flex items-center justify-between">
            <div>
              <span className="text-[11px] erp-muted font-bold block">إجمالي المستودعات النشطة</span>
              <div className="text-lg font-black font-mono mt-0.5">{kpis.totalWarehouses} مستودع</div>
            </div>
            <button
              onClick={handleOpenAddWarehouse}
              className="text-[10px] font-bold text-blue-500 bg-blue-500/10 hover:bg-blue-500 hover:text-white px-2 py-1 rounded transition cursor-pointer"
            >
              + إضافة مستودع
            </button>
          </div>

          <div className="erp-card p-2.5 px-3 rounded-xl shadow-sm border border-l-4 border-l-emerald-500 flex items-center justify-between">
            <div>
              <span className="text-[11px] erp-muted font-bold block">عدد الأصناف المسجلة</span>
              <div className="text-lg font-black font-mono mt-0.5">{kpis.totalItems} صنف</div>
            </div>
            <button
              onClick={handleOpenAddItem}
              className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white px-2 py-1 rounded transition cursor-pointer"
            >
              + إضافة صنف جديد
            </button>
          </div>

          <div className="erp-card p-2.5 px-3 rounded-xl shadow-sm border border-l-4 border-l-purple-500 flex items-center justify-between">
            <div>
              <span className="text-[11px] erp-muted font-bold block">الأقسام وصالات الإنتاج</span>
              <div className="text-lg font-black font-mono mt-0.5">{kpis.totalDepartments} قسم / صالة</div>
            </div>
            <button
              onClick={handleOpenAddDepartment}
              className="text-[10px] font-bold text-purple-500 bg-purple-500/10 hover:bg-purple-500 hover:text-white px-2 py-1 rounded transition cursor-pointer"
            >
              + إضافة قسم
            </button>
          </div>

          <div className="erp-card p-2.5 px-3 rounded-xl shadow-sm border border-l-4 border-l-amber-500 flex items-center justify-between">
            <div>
              <span className="text-[11px] erp-muted font-bold block">أصناف قاربت حد الطلب</span>
              <div className="text-lg font-black font-mono text-amber-500 mt-0.5">{kpis.underReorder} صنف</div>
            </div>
            <Link
              href="/reports"
              className="text-[10px] font-bold text-blue-500 bg-blue-500/10 hover:bg-blue-500 hover:text-white px-2 py-1 rounded transition cursor-pointer flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>تقرير المخازن</span>
            </Link>
          </div>
        </div>

        {/* التبويبات الفنية وشريط البحث المدمج */}
        <div className="erp-card p-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'BALANCES', label: 'جرد وأرصدة المستودعات', count: balances.length },
              { id: 'ITEMS', label: 'دليل الأصناف والمكونات', count: items.length },
              { id: 'WAREHOUSES', label: 'المستودعات التخصصية', count: warehouses.length },
              { id: 'DEPARTMENTS', label: 'الأقسام وخطوط الإنتاج', count: departments.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`erp-btn-compact ${
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
          <div className="flex items-center gap-2">
            {activeTab === 'BALANCES' && (
              <select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                className="erp-input-compact border erp-sub outline-none text-xs font-bold"
              >
                <option value="ALL">كافة المستودعات</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.warehouseName}</option>
                ))}
              </select>
            )}

            {(activeTab === 'BALANCES' || activeTab === 'ITEMS') && (
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="erp-input-compact border erp-sub outline-none text-xs font-bold"
              >
                <option value="ALL">كافة التصنيفات</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.categoryName}>{c.categoryName}</option>
                ))}
              </select>
            )}

            <div className="relative w-44 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 erp-muted" />
              <input
                type="text"
                placeholder="بحث بالكود، الاسم، أو القسم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full erp-input-compact pr-8 border erp-sub text-xs outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
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
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p>لا توجد أصناف مطابقة لمعايير البحث الحالية.</p>
                          <button
                            onClick={handleOpenAddItem}
                            className="erp-btn-compact bg-emerald-600 text-white font-bold text-xs"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>إضافة صنف جديد الآن</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredBalances.map((b, idx) => (
                      <tr key={idx} className="hover:bg-gray-500/5 transition">
                        <td className="p-3 font-mono font-bold text-blue-500">{b.itemCode}</td>
                        <td className="p-3 font-bold">{b.itemName}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-500/10">
                            {b.category}
                          </span>
                        </td>
                        <td className="p-3 erp-muted">{b.warehouseName}</td>
                        <td className="p-3 font-mono font-black text-sm">
                          {b.currentBalance} <span className="text-[10px] erp-muted font-normal">{b.unit}</span>
                        </td>
                        <td className="p-3 font-mono erp-muted">
                          {b.reorderPoint} {b.unit}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-600">
                          {b.totalValue ? `${b.totalValue.toLocaleString()} ج.م` : '0 ج.م'}
                        </td>
                        <td className="p-3 text-center">
                          {b.isUnderReorder ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3" /> طلب توريد
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                              آمن وكافي
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center print:hidden">
                          <button
                            onClick={() => {
                              const itemMatch: StockItem = {
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
          <div className="space-y-3">
            <div className="erp-card p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="font-bold text-sm">دليل وبطاقات الأصناف والخامات والأنواع</h3>
                  <p className="text-[11px] erp-muted">
                    عرض جميع الأصناف، الأنواع المرتبطة بها (Variants)، والوحدات المتعددة
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAddItem}
                  className="erp-btn-compact bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition cursor-pointer"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>+ إضافة صنف جديد (بأنواع ووحدات)</span>
                </button>
                <Link
                  href="/reports"
                  className="erp-btn-compact bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>تقرير موجز المخازن</span>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="erp-card p-3.5 rounded-2xl shadow-sm border space-y-2.5 hover:border-emerald-500/40 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          {item.itemCode}
                        </span>
                        {item.itemType && (
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                            {item.itemType}
                          </span>
                        )}
                        {item.isVariant && (
                          <span className="text-[10px] font-bold text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded-md">
                            متنوع ({item.variants?.length || 0})
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm mt-1">{item.itemName}</h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-lg bg-gray-500/10 font-bold">
                      {item.category}
                    </span>
                  </div>

                  {item.departmentName && (
                    <div className="text-[11px] text-purple-600 font-semibold flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      <span>القسم: {item.departmentName}</span>
                    </div>
                  )}

                  {/* تفريعات الصنف إذا وجدت */}
                  {item.variants && item.variants.length > 0 && (
                    <div className="p-2 bg-purple-500/5 rounded-lg border border-purple-500/20 text-[11px] space-y-1">
                      <span className="font-bold text-purple-600 block">الأنواع والتفريعات:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.variants.map((v: any, vIdx: number) => (
                          <span key={v.id || vIdx} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-medium">
                            {v.variantName || v.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-xs border-t erp-card pt-2">
                    <div>
                      <span className="text-gray-500 block">وحدة القياس:</span>
                      <span className="font-bold">{item.unit}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">السعر الأساسي:</span>
                      <span className="font-bold font-mono">{item.standardCost} ج.م</span>
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
          </div>
        )}

        {/* 3. قائمة المستودعات التخصصية */}
        {activeTab === 'WAREHOUSES' && (
          <div className="space-y-3">
            <div className="erp-card p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-bold text-sm">المستودعات المركزية ومخازن التشغيل والفروع</h3>
                  <p className="text-[11px] erp-muted">
                    إدارة المستودعات التخصصية (خامات، منتج تام، صالات تشغيل، ومخازن المعارض)
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddWarehouse}
                className="erp-btn-compact bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                <Warehouse className="w-3.5 h-3.5" />
                <span>+ إضافة مستودع جديد</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {warehouses.map((wh) => (
                <div key={wh.id} className="erp-card p-3.5 rounded-2xl shadow-sm border space-y-2 hover:border-blue-500/40 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                        <Warehouse className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm">{wh.warehouseName}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                      نشط ومفعل
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2 border-t erp-card gap-1">
                    <span>الكود: <strong className="font-mono text-gray-800 dark:text-gray-200">{wh.warehouseCode}</strong></span>
                    <span>النوع: <strong className="text-gray-800 dark:text-gray-200">{wh.warehouseType}</strong></span>
                    <span>الفرع: <strong className="text-gray-800 dark:text-gray-200">{wh.branchName}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. الأقسام والإدارات وخطوط الإنتاج (DEPARTMENTS) */}
        {activeTab === 'DEPARTMENTS' && (
          <div className="space-y-3">
            <div className="erp-card p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-500" />
                <div>
                  <h3 className="font-bold text-sm">دليل الإدارات والأقسام وصالات خطوط الإنتاج</h3>
                  <p className="text-[11px] erp-muted">
                    الهيكل التنظيمي لمصانع أبو عادل: صالات التشغيل (الشرقي، الجاتوه، المخبوزات، الفرنساوي) والإدارات الداعمة
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAddDepartment}
                className="erp-btn-compact bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>+ إضافة إدارة / صالة إنتاج جديدة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {departments.map((dept) => (
                <div key={dept.id} className="erp-card p-3.5 rounded-2xl shadow-sm border space-y-2 hover:border-purple-500/40 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-md">
                      كود: {dept.departmentCode}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      dept.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {dept.active ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 text-purple-600 rounded-lg">
                      <Factory className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-sm">{dept.departmentName}</h4>
                  </div>
                  <p className="text-[11px] erp-muted line-clamp-2">
                    {dept.description || 'إدارة / صالة تشغيل وإنتاج مسجلة بالمنظومة'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* مودال إضافة صنف جديد (مطابق تماماً للتصميم والآلية في الصورة 1)           */}
      {/* ========================================================================= */}
      {showAddItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-4xl w-full p-4 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">

            {/* ترويسة المودال */}
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 font-bold text-sm">
                  +
                </span>
                <h3 className="font-bold text-base text-gray-100">إضافة صنف جديد</h3>
              </div>
              <button
                onClick={() => setShowAddItemModal(false)}
                className="text-gray-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemWithVariants} className="space-y-4 text-xs">

              {/* 1. قسم البيانات الأساسية */}
              <fieldset className="border border-gray-700/80 rounded-xl p-3.5 space-y-3 relative">
                <legend className="px-2 text-blue-400 font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>البيانات الأساسية</span>
                </legend>

                {/* الحقول الأساسية: كود الصنف، اسم الصنف، القسم */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  {/* كود الصنف */}
                  <div className="sm:col-span-3">
                    <label className="block text-gray-400 font-bold mb-1">كود الصنف</label>
                    <input
                      type="text"
                      required
                      value={itemBasic.itemCode}
                      onChange={(e) => setItemBasic({ ...itemBasic, itemCode: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-gray-900/60 border border-gray-700 text-center font-mono font-bold text-sm text-gray-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* اسم الصنف (عربي) */}
                  <div className="sm:col-span-5">
                    <label className="block text-gray-400 font-bold mb-1">اسم الصنف (عربي)</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: تورته صغيره / بسبوسة ساده..."
                      value={itemBasic.itemName}
                      onChange={(e) => setItemBasic({ ...itemBasic, itemName: e.target.value })}
                      className="w-full p-2.5 rounded-lg bg-gray-900/60 border border-gray-700 font-bold text-sm text-gray-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* القسم (F6) مع زر الإضافة السريعة */}
                  <div className="sm:col-span-4">
                    <label className="block text-gray-400 font-bold mb-1">القسم (F6)</label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={itemBasic.departmentId}
                        onChange={(e) => setItemBasic({ ...itemBasic, departmentId: e.target.value })}
                        className="w-full p-2.5 rounded-lg bg-gray-900/60 border border-gray-700 font-bold text-xs text-gray-200 outline-none focus:border-blue-500"
                      >
                        <option value="">-- اختر قسم --</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.departmentName}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddDepartmentModal(true)}
                        className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer"
                        title="إضافة قسم جديد على الفور"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* مربعات الاختيار الستة (الخيارات الخاصة بالصنف - مطابقة تماماً للصورة 1) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-800">
                  {/* إيقاف الصنف */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800 cursor-pointer hover:border-gray-700">
                    <span className="text-gray-300 font-medium">إيقاف الصنف</span>
                    <input
                      type="checkbox"
                      checked={itemBasic.stopItem}
                      onChange={(e) => setItemBasic({ ...itemBasic, stopItem: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {/* مدمج */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800 cursor-pointer hover:border-gray-700">
                    <span className="text-gray-300 font-medium">مدمج</span>
                    <input
                      type="checkbox"
                      checked={itemBasic.isMerged}
                      onChange={(e) => setItemBasic({ ...itemBasic, isMerged: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {/* بدون طباعة تفاصيل */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800 cursor-pointer hover:border-gray-700">
                    <span className="text-gray-300 font-medium">بدون طباعة تفاصيل</span>
                    <input
                      type="checkbox"
                      checked={itemBasic.hideDetailPrint}
                      onChange={(e) => setItemBasic({ ...itemBasic, hideDetailPrint: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {/* صنف حاوية */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800 cursor-pointer hover:border-gray-700">
                    <span className="text-gray-300 font-medium">صنف حاوية</span>
                    <input
                      type="checkbox"
                      checked={itemBasic.isContainer}
                      onChange={(e) => setItemBasic({ ...itemBasic, isContainer: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {/* متنوع */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800 cursor-pointer hover:border-gray-700">
                    <span className="text-gray-300 font-medium">متنوع</span>
                    <input
                      type="checkbox"
                      checked={itemBasic.isVariant}
                      onChange={(e) => setItemBasic({ ...itemBasic, isVariant: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>

                  {/* متعدد الوحدات */}
                  <label className="flex items-center justify-between p-2 rounded-lg bg-gray-900/40 border border-gray-800 cursor-pointer hover:border-gray-700">
                    <span className="text-gray-300 font-medium">متعدد الوحدات</span>
                    <input
                      type="checkbox"
                      checked={itemBasic.multiUom}
                      onChange={(e) => setItemBasic({ ...itemBasic, multiUom: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </fieldset>

              {/* 2. قسم عمودين متجاورين: أنواع الصنف (يمين) + وحدات الصنف (يسار) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

                {/* العمود الأيمن: أنواع الصنف (Variants) */}
                <fieldset className="border border-gray-700/80 rounded-xl p-3 space-y-2.5 relative">
                  <legend className="px-2 text-emerald-400 font-bold text-xs flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>أنواع الصنف</span>
                    </div>
                  </legend>

                  {/* زر إضافة نوع */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="px-3 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-emerald-600/40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ إضافة نوع</span>
                    </button>
                  </div>

                  {/* قائمة الأنواع */}
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {variantsList.map((variant, idx) => (
                      <div
                        key={variant.id || idx}
                        onClick={() => setSelectedVariantIdx(idx)}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer ${
                          selectedVariantIdx === idx
                            ? 'bg-purple-950/40 border-purple-500 text-purple-200 shadow-sm ring-1 ring-purple-500'
                            : 'bg-gray-900/50 border-gray-700/70 hover:border-gray-600 text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="font-mono text-gray-400 font-bold text-xs">{idx + 1}.</span>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => handleUpdateVariantName(idx, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border-none outline-none font-bold text-xs w-full text-gray-100"
                            placeholder="اسم النوع (مثال: نص شوكولاته ونص فاكهه)"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveVariant(idx);
                          }}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                          title="حذف هذا النوع"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </fieldset>

                {/* العمود الأيسر: وحدات الصنف (Units) */}
                <fieldset className="border border-gray-700/80 rounded-xl p-3 space-y-2.5 relative">
                  <legend className="px-2 text-purple-400 font-bold text-xs flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      <span>وحدات الصنف</span>
                    </div>
                  </legend>

                  {/* أزرار إضافة وحدة */}
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddUnit}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-blue-600/40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>جديد للقائمة</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddUnit}
                      className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-400 hover:text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-purple-600/40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ إضافة وحدة</span>
                    </button>
                  </div>

                  {/* قائمة الوحدات */}
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {unitsList.map((unit, idx) => (
                      <div
                        key={unit.id || idx}
                        className="p-2 rounded-xl bg-gray-900/50 border border-gray-700/70 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5 flex-1">
                          <span className="font-mono text-gray-400 font-bold text-xs">{idx + 1}.</span>
                          <input
                            type="text"
                            value={unit.name}
                            onChange={(e) => {
                              const updated = [...unitsList];
                              updated[idx].name = e.target.value;
                              setUnitsList(updated);
                            }}
                            className="p-1 rounded bg-gray-800 border border-gray-700 text-xs font-bold text-gray-100 w-24 text-center"
                          />
                          <input
                            type="number"
                            min={1}
                            value={unit.factor}
                            onChange={(e) => {
                              const updated = [...unitsList];
                              updated[idx].factor = Number(e.target.value);
                              setUnitsList(updated);
                            }}
                            className="p-1 rounded bg-gray-800 border border-gray-700 text-xs font-mono font-bold text-gray-100 w-14 text-center"
                            title="معامل التحويل (مثال: 1 للقطعة، 12 للدستة)"
                          />
                          <label className="flex items-center gap-1 text-[11px] font-bold text-gray-300 cursor-pointer mr-1">
                            <input
                              type="radio"
                              name="defaultUnitRadio"
                              checked={unit.isDefault}
                              onChange={() => handleSetDefaultUnit(idx)}
                              className="text-purple-600 focus:ring-0"
                            />
                            <span>افتراضي</span>
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveUnit(idx)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                          title="حذف هذه الوحدة"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              {/* 3. قسم أسعار البيع والباركود (مطابق تماماً لأسفل الصورة 1) */}
              <fieldset className="border border-gray-700/80 rounded-xl p-3.5 space-y-3 relative">
                <legend className="px-2 text-rose-400 font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>أسعار البيع والباركود</span>
                </legend>

                {/* شريط اختيار النوع المعروض */}
                <div className="p-2 rounded-lg bg-gray-900/60 border border-gray-800 flex items-center justify-between text-xs">
                  <span className="text-gray-400 text-[11px]">اضغط على نوع لعرض أسعاره:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedVariantIdx((prev) => Math.max(0, prev - 1))}
                      disabled={selectedVariantIdx === 0}
                      className="p-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <span className="font-bold text-purple-300 px-3 py-1 rounded bg-purple-950/40 border border-purple-800">
                      &lt; أسعار النوع: {currentSelectedVariantName} &gt;
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedVariantIdx((prev) => Math.min(variantsList.length - 1, prev + 1))}
                      disabled={selectedVariantIdx === variantsList.length - 1}
                      className="p-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* جدول الأسعار والباركود لوحدات هذا النوع */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-gray-900/80 text-gray-400 text-[11px] border-b border-gray-800">
                      <tr>
                        <th className="p-2.5 font-bold w-1/3">الوحدة</th>
                        <th className="p-2.5 font-bold w-1/3 text-center">السعر</th>
                        <th className="p-2.5 font-bold w-1/3 text-center">الباركود</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {unitsList.map((unit) => {
                        const cellData = priceMatrix[currentSelectedVariantName]?.[unit.name] || {
                          price: 0,
                          barcode: itemBasic.itemCode,
                        };

                        return (
                          <tr key={unit.id} className="hover:bg-gray-900/30">
                            {/* الوحدة */}
                            <td className="p-2.5 font-bold text-gray-200">
                              {unit.name} {unit.isDefault && <span className="text-[10px] text-purple-400 font-normal">(افتراضي)</span>}
                            </td>

                            {/* السعر */}
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={cellData.price}
                                onChange={(e) => handleUpdatePriceOrBarcode(unit.name, 'price', Number(e.target.value))}
                                className="w-32 p-1.5 rounded bg-gray-900 border border-gray-700 text-center font-mono font-bold text-xs text-gray-100 outline-none focus:border-purple-500"
                              />
                            </td>

                            {/* الباركود */}
                            <td className="p-2.5 text-center">
                              <input
                                type="text"
                                value={cellData.barcode}
                                onChange={(e) => handleUpdatePriceOrBarcode(unit.name, 'barcode', e.target.value)}
                                className="w-40 p-1.5 rounded bg-gray-900 border border-gray-700 text-center font-mono font-bold text-xs text-blue-400 outline-none focus:border-blue-500"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </fieldset>

              {/* أزرار الحفظ والإلغاء (مطابقة لأسفل الصورة 1) */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-7 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>حفظ</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* مودال 2: إضافة مستودع جديد (Add Warehouse Modal) */}
      {showAddWarehouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-lg w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <Warehouse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">إضافة مستودع تخصصي جديد</h3>
                  <p className="text-[11px] erp-muted">تعريف مستودع جديد في المنظومة وربطه بالفرع</p>
                </div>
              </div>
              <button onClick={() => setShowAddWarehouseModal(false)} className="p-1.5 rounded-lg hover:bg-gray-500/10 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">كود المستودع *</label>
                  <input
                    type="text"
                    required
                    value={newWarehouse.warehouseCode}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, warehouseCode: e.target.value })}
                    placeholder="مثال: WH-RAW-02"
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">اسم المستودع *</label>
                  <input
                    type="text"
                    required
                    value={newWarehouse.warehouseName}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, warehouseName: e.target.value })}
                    placeholder="مثال: مخزن خامات الفرع الجديد"
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">نوع المستودع *</label>
                  <select
                    value={newWarehouse.warehouseType}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, warehouseType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  >
                    <option value="خامات">مستودع خامات ومكونات</option>
                    <option value="منتج تام">مستودع منتج تام للتوزيع</option>
                    <option value="صالة تشغيل">مخزن صالة تشغيل وإنتاج</option>
                    <option value="معرض">مخزن معرض / نقطة بيع</option>
                    <option value="تالف">مستودع هوالك وتوالف</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">الفرع التابع له *</label>
                  <select
                    value={newWarehouse.branchId}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, branchId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.branchName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">وصف المستودع والموقع</label>
                <textarea
                  rows={2}
                  value={newWarehouse.description}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, description: e.target.value })}
                  placeholder="ملاحظات موقع المستودع أو الغرض التشغيلي..."
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddWarehouseModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Warehouse className="w-4 h-4" />}
                  <span>حفظ وإنشاء المستودع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال 3: إضافة إدارة / قسم / خط إنتاج (Add Department Modal) */}
      {showAddDepartmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-lg w-full p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">إضافة إدارة / صالة إنتاج جديدة</h3>
                  <p className="text-[11px] erp-muted">تعريف صالة خط إنتاج أو إدارة بالهيكل التنظيمي</p>
                </div>
              </div>
              <button onClick={() => setShowAddDepartmentModal(false)} className="p-1.5 rounded-lg hover:bg-gray-500/10 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">كود الإدارة / القسم *</label>
                  <input
                    type="text"
                    required
                    value={newDepartment.departmentCode}
                    onChange={(e) => setNewDepartment({ ...newDepartment, departmentCode: e.target.value })}
                    placeholder="مثال: DEP-600"
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">اسم الإدارة / صالة الإنتاج *</label>
                  <input
                    type="text"
                    required
                    value={newDepartment.departmentName}
                    onChange={(e) => setNewDepartment({ ...newDepartment, departmentName: e.target.value })}
                    placeholder="مثال: صالة تصنيع المعجنات والباتيه"
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">طبيعة النشاط والوصف</label>
                <textarea
                  rows={2}
                  value={newDepartment.description}
                  onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                  placeholder="وصف اختصاصات الإدارة أو صالة التشغيل..."
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDepartmentModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
                  <span>حفظ وإدراج القسم</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال 4: تحويل مخزني داخلي بين المستودعات */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
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

      {/* مودال 5: بطاقة حركة الصنف التفصيلية (Stock Card) */}
      {showStockCardModal && selectedStockCardItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
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
