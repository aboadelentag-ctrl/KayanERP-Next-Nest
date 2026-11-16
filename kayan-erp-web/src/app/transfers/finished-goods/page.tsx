'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  PackageCheck,
  Scale,
  ShieldCheck,
  Building2,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  Search,
  AlertCircle,
  CheckCircle2,
  Gavel,
  Factory,
  Warehouse,
  Flame,
  ArrowRightLeft,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Upload,
  Download,
  Check,
  Clock,
  Layers,
  FileText,
  AlertTriangle,
  ClipboardList,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import ActiveDisputesView from './components/ActiveDisputesView';
import FloorReworkView from './components/FloorReworkView';
import ScrapLabReportView from './components/ScrapLabReportView';
import PrintScrapReportModal from './components/PrintScrapReportModal';

export interface WarehouseLookup {
  id: string;
  warehouse_name: string;
  warehouse_code: string;
  warehouse_type: string;
  department_id?: string | null;
}

export interface ItemLookup {
  id: string;
  item_code: string;
  item_name: string;
  item_type: string;
  unit: string;
  department_id?: string | null;
  shelf_life_days?: number | null;
}

interface ProductionOrderItemLookup {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  unit: string;
  shelfLifeDays?: number;
  batchNumber?: string;
  plannedQuantity: number;
  deliveredQuantity: number;
  remainingQuantity: number;
}

interface ProductionOrderLookup {
  id: string;
  orderNumber: string;
  orderDate: string | null;
  status: string;
  warehouseId: string;
  warehouseName: string;
  items: ProductionOrderItemLookup[];
}

export interface TransferLineItem {
  id?: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  itemUnit?: string;
  batchNumber: string;
  expiryDate: string;
  dispatchedQty: number;
  dispatchedCount: number;
  workOrderTargetQty?: number | null;
  workOrderDeliveredQty?: number | null;
  workOrderRemainingQty?: number | null;
  costingActualQty?: number | null;
  costingActualCount?: number | null;
  qcApprovedQty?: number;
  qcSampleQty?: number;
  qcReworkQty?: number;
  qcScrapQty?: number;
  receivedActualQty?: number | null;
  receivedActualCount?: number | null;
  notes?: string;

  // Local form state
  tempAuditWeight?: number;
  tempAuditCount?: number;
  tempQcSample?: number;
  tempQcRework?: number;
  tempQcScrap?: number;
  tempControlQty?: number;
  tempControlCount?: number;
}

export interface FinishedGoodsTransfer {
  id: string;
  transferNumber: string;
  transferDate: string;
  productionOrderId?: string | null;
  productionOrderNumber?: string | null;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  itemUnit: string;
  batchNumber: string;
  expiryDate: string | null;
  prodDispatchedQty: number;
  prodDispatchedCount: number;
  itemsCount: number;
  items: TransferLineItem[];
  prodNotes?: string | null;
  prodSubmittedBy?: string | null;
  costingActualQty: number | null;
  costingActualCount: number | null;
  costingWeightDiff: number;
  costingCountDiff: number;
  costingDiscrepancyFlag: boolean;
  costingAuditor?: string | null;
  costingAuditedAt?: string | null;
  costingNotes?: string | null;
  costingDisputeStatus: string;
  costingDisputeReason?: string | null;
  costingDisputeChargeTo?: string | null;
  costingDisputeNotes?: string | null;
  costingDisputeResolvedBy?: string | null;
  costingDisputeResolvedAt?: string | null;
  qcApprovedQty: number;
  qcSampleQty: number;
  qcReworkQty: number;
  qcScrapQty: number;
  qcInspector?: string | null;
  qcInspectedAt?: string | null;
  qcNotes?: string | null;
  receivedActualQty: number | null;
  receivedActualCount: number | null;
  controlReceiverName?: string | null;
  controlReceivedAt?: string | null;
  controlNotes?: string | null;
  hasDispute: boolean;
  disputeReason?: string | null;
  disputeStatus: string;
  disputeResolutionNotes?: string | null;
  disputeResolvedBy?: string | null;
  disputeResolvedAt?: string | null;
  controlDisputeChargeTo?: string | null;
  status: string;
  createdAt?: string;

  // Local temporary form states for multi-item editing
  tempItems?: TransferLineItem[];
  tempCostingNotes?: string;
  tempQcNotes?: string;
  tempControlNotes?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function FinishedGoodsTransferPage({ initialTab = 'list' }: { initialTab?: string } = {}) {
  const [transfers, setTransfers] = useState<FinishedGoodsTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseLookup[]>([]);
  const [allItems, setAllItems] = useState<ItemLookup[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrderLookup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceWarehouseFilter, setSourceWarehouseFilter] = useState('');

  // URL Query Sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const validTabs = ['list', 'new', 'costing', 'qc', 'control', 'disputes', 'rework', 'reports'];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      } else if (initialTab && validTabs.includes(initialTab)) {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab]);

  // New Transfer Multi-Item State
  const [selectedProductionOrderId, setSelectedProductionOrderId] = useState<string>('');
  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('');
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<string>('');
  const [transferGeneralNotes, setTransferGeneralNotes] = useState<string>('');
  const [dispatchedItems, setDispatchedItems] = useState<TransferLineItem[]>([]);

  // Modals
  const [selectedCostingDispute, setSelectedCostingDispute] = useState<FinishedGoodsTransfer | null>(null);
  const [costingDisputeFinalWeight, setCostingDisputeFinalWeight] = useState<number>(0);
  const [costingDisputeFinalCount, setCostingDisputeFinalCount] = useState<number>(0);
  const [costingDisputeChargeTo, setCostingDisputeChargeTo] = useState('عجز تصنيع يُحمّل على تقرير وردية الصالة');
  const [costingDisputeNotes, setCostingDisputeNotes] = useState('');

  const [selectedControlDispute, setSelectedControlDispute] = useState<FinishedGoodsTransfer | null>(null);
  const [controlDisputeFinalQty, setControlDisputeFinalQty] = useState<number>(0);
  const [controlDisputeChargeTo, setControlDisputeChargeTo] = useState('عهدة سائق وعامل النقل الداخلي');
  const [controlDisputeNotes, setControlDisputeNotes] = useState('');

  const [printTransfer, setPrintTransfer] = useState<FinishedGoodsTransfer | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);

  // 1. Fetch Lookups & Transfers
  const loadData = async () => {
    try {
      setLoading(true);
      const [transRes, lookupsRes] = await Promise.all([
        axios.get(`${API_BASE}/finished-goods-transfers`),
        axios.get(`${API_BASE}/finished-goods-transfers/lookups`),
      ]);

      const transList: FinishedGoodsTransfer[] = (transRes.data?.data || []).map((t: FinishedGoodsTransfer) => {
        const lines: TransferLineItem[] = (t.items || []).map((it) => ({
          ...it,
          tempAuditWeight: it.costingActualQty ?? it.dispatchedQty,
          tempAuditCount: it.costingActualCount ?? it.dispatchedCount,
          tempQcSample: it.qcSampleQty || 0,
          tempQcRework: it.qcReworkQty || 0,
          tempQcScrap: it.qcScrapQty || 0,
          tempControlQty: it.receivedActualQty ?? it.qcApprovedQty ?? it.dispatchedQty,
          tempControlCount: it.receivedActualCount ?? it.costingActualCount ?? it.dispatchedCount,
        }));

        return {
          ...t,
          items: lines,
          tempItems: lines,
          tempCostingNotes: t.costingNotes || '',
          tempQcNotes: t.qcNotes || '',
          tempControlNotes: t.controlNotes || '',
        };
      });

      setTransfers(transList);
      setWarehouses(lookupsRes.data?.data?.warehouses || []);
      setAllItems(lookupsRes.data?.data?.finishedItems || []);
      setProductionOrders(lookupsRes.data?.data?.productionOrders || []);
    } catch (err: any) {
      console.error('Failed to load finished goods transfers:', err);
      showAlert('error', 'تعذر تحميل بيانات أذونات تحويل المنتج التام والمخازن');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 6000);
  };

  // Station counts
  const CostingList = useMemo(
    () => transfers.filter((t) => t.status === 'PENDING_COSTING' || t.status === 'DISPUTE_COSTING'),
    [transfers]
  );
  const PendingQcList = useMemo(() => transfers.filter((t) => t.status === 'PENDING_QC'), [transfers]);
  const ControlList = useMemo(
    () => transfers.filter((t) => t.status === 'PENDING_RECEIPT' || t.status === 'IN_DISPUTE'),
    [transfers]
  );
  const ReworkList = useMemo(
    () => transfers.filter((t) => t.status === 'REWORK_IN_PRODUCTION' || t.status === 'QC_REWORK'),
    [transfers]
  );
  const ActiveDisputesList = useMemo(() => {
    return transfers.filter(
      (t) =>
        t.status === 'DISPUTE_COSTING' ||
        t.status === 'IN_DISPUTE' ||
        ((t.hasDispute || t.costingDisputeStatus === 'OPEN' || t.disputeStatus === 'OPEN') && t.status !== 'COMPLETED')
    );
  }, [transfers]);
  const totalScrapAll = useMemo(() => {
    return transfers.reduce((acc, t) => acc + Number(t.qcScrapQty || 0), 0);
  }, [transfers]);

  // Source Warehouses (Floor stock / صالات التشغيل)
  const sourceWarehouses = useMemo(() => {
    return warehouses.filter(
      (w) =>
        w.warehouse_type === 'صالة تشغيل' ||
        w.warehouse_type === 'FLOOR_STOCK' ||
        w.warehouse_name.includes('صالة') ||
        w.warehouse_name.includes('قسم')
    );
  }, [warehouses]);

  // Destination Warehouses (Finished Goods / الكنترول)
  const destinationWarehouses = useMemo(() => {
    return warehouses.filter(
      (w) =>
        w.warehouse_type === 'منتج تام' ||
        w.warehouse_type === 'FINISHED_GOODS' ||
        w.warehouse_name.includes('كنترول') ||
        w.warehouse_code === '1000' ||
        w.warehouse_code === 'WH-FG-01'
    );
  }, [warehouses]);

  // Handler: When Production Order is selected in Form
  const handleSelectProductionOrder = (poId: string) => {
    setSelectedProductionOrderId(poId);
    if (!poId) return;

    const po = productionOrders.find((p) => p.id === poId);
    if (po) {
      if (po.warehouseId && !sourceWarehouseId) {
        setSourceWarehouseId(po.warehouseId);
      }
      if (destinationWarehouses.length > 0 && !destinationWarehouseId) {
        setDestinationWarehouseId(destinationWarehouses[0].id);
      }

      // Auto load items from this production order with their Work Order balance
      const mappedItems: TransferLineItem[] = po.items.map((pi) => {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const autoBatch = pi.batchNumber || `LOT-PRD-${today}-${pi.itemCode || pi.itemId}-1`;
        const shelfDays = pi.shelfLifeDays || 3;
        const autoExp = new Date(Date.now() + shelfDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        return {
          itemId: pi.itemId,
          itemName: pi.itemName,
          itemCode: pi.itemCode,
          itemUnit: pi.unit,
          batchNumber: autoBatch,
          expiryDate: autoExp,
          workOrderTargetQty: pi.plannedQuantity,
          workOrderDeliveredQty: pi.deliveredQuantity,
          workOrderRemainingQty: pi.remainingQuantity,
          dispatchedQty: pi.remainingQuantity > 0 ? pi.remainingQuantity : pi.plannedQuantity,
          dispatchedCount: 1,
          notes: '',
        };
      });

      setDispatchedItems(mappedItems);
    }
  };

  // Add a new empty row to items table
  const handleAddNewItemRow = () => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const defaultItem = allItems[0];
    const autoBatch = `LOT-PRD-${today}-${defaultItem ? defaultItem.item_code : '1'}-1`;
    const shelfDays = defaultItem?.shelf_life_days || 3;
    const autoExp = new Date(Date.now() + shelfDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const newItem: TransferLineItem = {
      itemId: defaultItem ? defaultItem.id : '',
      itemName: defaultItem ? defaultItem.item_name : '',
      itemCode: defaultItem ? defaultItem.item_code : '',
      itemUnit: defaultItem ? defaultItem.unit : 'كجم',
      batchNumber: autoBatch,
      expiryDate: autoExp,
      workOrderTargetQty: null,
      workOrderDeliveredQty: null,
      workOrderRemainingQty: null,
      dispatchedQty: 10,
      dispatchedCount: 1,
      notes: '',
    };

    setDispatchedItems((prev) => [...prev, newItem]);
  };

  // Change selected item in a row
  const handleItemRowChange = (index: number, itemId: string) => {
    const itm = allItems.find((i) => i.id === itemId);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const autoBatch = `LOT-PRD-${today}-${itm ? itm.item_code : itemId}-1`;
    const shelfDays = itm?.shelf_life_days || 3;
    const autoExp = new Date(Date.now() + shelfDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Check if this item exists in the selected Production Order to fetch its balance
    let woTarget: number | null = null;
    let woDelivered: number | null = null;
    let woRemaining: number | null = null;

    if (selectedProductionOrderId) {
      const po = productionOrders.find((p) => p.id === selectedProductionOrderId);
      const match = po?.items.find((x) => x.itemId === itemId);
      if (match) {
        woTarget = match.plannedQuantity;
        woDelivered = match.deliveredQuantity;
        woRemaining = match.remainingQuantity;
      }
    }

    setDispatchedItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        itemId,
        itemName: itm?.item_name || '',
        itemCode: itm?.item_code || '',
        itemUnit: itm?.unit || 'كجم',
        batchNumber: autoBatch,
        expiryDate: autoExp,
        workOrderTargetQty: woTarget,
        workOrderDeliveredQty: woDelivered,
        workOrderRemainingQty: woRemaining,
        dispatchedQty: woRemaining !== null && woRemaining > 0 ? woRemaining : updated[index].dispatchedQty,
      };
      return updated;
    });
  };

  // Update specific field in row
  const handleUpdateRowField = (index: number, field: keyof TransferLineItem, value: any) => {
    setDispatchedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Remove item row
  const handleRemoveItemRow = (index: number) => {
    setDispatchedItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Multi-Item Transfer (Station 1)
  const handleSubmitMultiItemTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceWarehouseId || !destinationWarehouseId) {
      showAlert('error', 'يرجى اختيار صالة التشغيل المصدر ومخزن الكنترول الوجهة');
      return;
    }

    if (dispatchedItems.length === 0) {
      showAlert('error', 'يرجى إضافة صنف واحد على الأقل من أصناف المنتج التام المسلّمة');
      return;
    }

    // Verify all rows have qty > 0
    for (let i = 0; i < dispatchedItems.length; i++) {
      if (!dispatchedItems[i].itemId || dispatchedItems[i].dispatchedQty <= 0) {
        showAlert('error', `يرجى تحديد الصنف والكمية المسلمة بشكل صحيح في البند رقم (${i + 1})`);
        return;
      }
    }

    try {
      setIsProcessing(true);
      const payload = {
        sourceWarehouseId,
        destinationWarehouseId,
        productionOrderId: selectedProductionOrderId || undefined,
        notes: transferGeneralNotes,
        submittedBy: 'مشرف صالة التشغيل المعتمد',
        items: dispatchedItems.map((it) => ({
          itemId: it.itemId,
          itemName: it.itemName,
          itemCode: it.itemCode,
          itemUnit: it.itemUnit,
          batchNumber: it.batchNumber,
          expiryDate: it.expiryDate,
          dispatchedQty: Number(it.dispatchedQty),
          dispatchedCount: Number(it.dispatchedCount || 0),
          workOrderTargetQty: it.workOrderTargetQty !== null ? Number(it.workOrderTargetQty) : undefined,
          workOrderDeliveredQty: it.workOrderDeliveredQty !== null ? Number(it.workOrderDeliveredQty) : undefined,
          workOrderRemainingQty: it.workOrderRemainingQty !== null ? Number(it.workOrderRemainingQty) : undefined,
          notes: it.notes,
        })),
      };

      const res = await axios.post(`${API_BASE}/finished-goods-transfers`, payload);
      if (res.data?.success) {
        showAlert(
          'success',
          `✓ تم إصدار إذن تسليم المنتج التام بعدد (${dispatchedItems.length}) أصناف وتمريره لميزان التكاليف بنجاح`
        );
        // Reset form
        setSelectedProductionOrderId('');
        setSourceWarehouseId('');
        setDestinationWarehouseId('');
        setTransferGeneralNotes('');
        setDispatchedItems([]);
        setActiveTab('costing');
        await loadData();
      }
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.response?.data?.message || 'فشل إصدار إذن التسليم');
    } finally {
      setIsProcessing(false);
    }
  };// Submit Costing Audit (Station 2)
  const handleSubmitCosting = async (trf: FinishedGoodsTransfer, escalateDispute: boolean) => {
    const currentItems = trf.tempItems || trf.items || [];
    const totalActualWeight = currentItems.reduce(
      (acc, it) => acc + Number(it.tempAuditWeight !== undefined ? it.tempAuditWeight : it.dispatchedQty),
      0
    );
    const totalActualCount = currentItems.reduce(
      (acc, it) => acc + Number(it.tempAuditCount !== undefined ? it.tempAuditCount : it.dispatchedCount),
      0
    );

    if (totalActualWeight <= 0) {
      showAlert('error', 'يرجى تسجيل الوزن الفعلي بالميزان قبل الاعتماد');
      return;
    }

    try {
      setIsProcessing(true);
      const payload = {
        transferId: trf.id,
        actualWeight: totalActualWeight,
        actualCount: totalActualCount,
        notes: trf.tempCostingNotes,
        escalateDispute,
        auditorName: 'مراجع التكاليف والميزان المعتمد',
        items: currentItems.map((it) => ({
          ...it,
          costingActualQty: it.tempAuditWeight !== undefined ? Number(it.tempAuditWeight) : it.dispatchedQty,
          costingActualCount: it.tempAuditCount !== undefined ? Number(it.tempAuditCount) : it.dispatchedCount,
        })),
      };

      const res = await axios.post(`${API_BASE}/finished-goods-transfers/audit-costing`, payload);
      if (res.data?.success) {
        if (escalateDispute) {
          showAlert('error', '🚨 تم تصعيد الإذن إلى «لجنة الإنتاج والتكاليف» لتسوية تضارب الأوزان');
        } else {
          showAlert('success', 'تم اعتماد ميزان التكاليف لكافة الأصناف وتمرير الإذن لمحطة توكيد الجودة بنجاح');
          setActiveTab('qc');
        }
        await loadData();
      }
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.response?.data?.message || 'فشل تسجيل ميزان التكاليف');
    } finally {
      setIsProcessing(false);
    }
  };// Resolve Costing Dispute Modal Submit
  const handleResolveCostingDispute = async () => {
    if (!selectedCostingDispute || !costingDisputeFinalWeight || !costingDisputeNotes) {
      showAlert('error', 'يرجى استيفاء الوزن النهائي وقرار ومحضر اللجنة');
      return;
    }

    try {
      setIsProcessing(true);
      const payload = {
        transferId: selectedCostingDispute.id,
        finalAcceptedWeight: Number(costingDisputeFinalWeight),
        finalAcceptedCount: Number(costingDisputeFinalCount || 0),
        chargeTo: costingDisputeChargeTo,
        resolutionNotes: costingDisputeNotes,
        resolvedBy: 'لجنة الإنتاج والتكاليف المشتركة',
      };

      const res = await axios.post(`${API_BASE}/finished-goods-transfers/resolve-costing-dispute`, payload);
      if (res.data?.success) {
        showAlert('success', 'تم فض نزاع الإنتاج والتكاليف وتمرير الإذن لمحطة الجودة');
        setSelectedCostingDispute(null);
        setActiveTab('qc');
        await loadData();
      }
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.response?.data?.message || 'فشل فض النزاع');
    } finally {
      setIsProcessing(false);
    }
  };// Submit QC Inspection (Station 3)
  const handleSubmitQc = async (trf: FinishedGoodsTransfer) => {
    const currentItems = trf.tempItems || trf.items || [];
    let totalApproved = 0;
    let totalSample = 0;
    let totalRework = 0;
    let totalScrap = 0;
    let hasInvalid = false;

    const inspectedItems = currentItems.map((it) => {
      const baseWeight = it.costingActualQty ?? it.dispatchedQty;
      const sample = Number(it.tempQcSample || 0);
      const rework = Number(it.tempQcRework || 0);
      const scrap = Number(it.tempQcScrap || 0);
      const netApproved = baseWeight - (sample + rework + scrap);

      if (netApproved < 0) hasInvalid = true;

      totalApproved += netApproved;
      totalSample += sample;
      totalRework += rework;
      totalScrap += scrap;

      return {
        ...it,
        qcApprovedQty: netApproved,
        qcSampleQty: sample,
        qcReworkQty: rework,
        qcScrapQty: scrap,
      };
    });

    if (hasInvalid || totalApproved < 0) {
      showAlert('error', 'مجموع الخصومات (عينات + مرتجع + تالف) يتجاوز وزن التكاليف في أحد الأصناف!');
      return;
    }

    try {
      setIsProcessing(true);
      const payload = {
        transferId: trf.id,
        approvedQty: totalApproved,
        sampleQty: totalSample,
        reworkQty: totalRework,
        scrapQty: totalScrap,
        notes: trf.tempQcNotes,
        inspectorName: 'أخصائي توكيد الجودة والسلامة',
        items: inspectedItems,
      };

      const res = await axios.post(`${API_BASE}/finished-goods-transfers/inspect-qc`, payload);
      if (res.data?.success) {
        showAlert(
          'success',
          `تم إفراج الجودة بصافي (${totalApproved.toFixed(2)} كجم) للكنترول ${
            totalRework > 0 ? `وتوجيه (${totalRework.toFixed(2)} كجم) للمرتجعات بالصالة` : ''
          }`
        );
        setActiveTab('control');
        await loadData();
      }
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.response?.data?.message || 'فشل إتمام فحص الجودة');
    } finally {
      setIsProcessing(false);
    }
  };// Submit Control Warehouse Receipt (Station 4)
  const handleSubmitControlReceipt = async (trf: FinishedGoodsTransfer) => {
    const currentItems = trf.tempItems || trf.items || [];
    let totalReceived = 0;
    let totalCount = 0;
    let totalApprovedQc = 0;

    const receivedItems = currentItems.map((it) => {
      const rcvQty = Number(it.tempControlQty !== undefined ? it.tempControlQty : it.qcApprovedQty || it.dispatchedQty);
      const rcvCnt = Number(it.tempControlCount !== undefined ? it.tempControlCount : it.costingActualCount || it.dispatchedCount);
      const appQc = Number(it.qcApprovedQty || it.costingActualQty || it.dispatchedQty);

      totalReceived += rcvQty;
      totalCount += rcvCnt;
      totalApprovedQc += appQc;

      return {
        ...it,
        receivedActualQty: rcvQty,
        receivedActualCount: rcvCnt,
      };
    });

    if (totalReceived <= 0) {
      showAlert('error', 'يرجى تسجيل الكميات المستلمة فعلياً بمخزن الكنترول');
      return;
    }

    const hasDeficit = totalReceived < totalApprovedQc - 0.05;

    try {
      setIsProcessing(true);
      const payload = {
        transferId: trf.id,
        receivedQty: totalReceived,
        receivedCount: totalCount,
        notes: trf.tempControlNotes,
        receiverName: 'أمين مخزن الكنترول والتسليم التام',
        items: receivedItems,
      };

      const res = await axios.post(`${API_BASE}/finished-goods-transfers/receive-control`, payload);
      if (res.data?.success) {
        if (hasDeficit) {
          showAlert('error', '🚨 تم إحالة الإذن إلى «لجنة فض المنازعات» لوجود عجز غير مبرر في الاستلام');
        } else {
          showAlert('success', '✓ تم استلام جميع الأصناف وترصيدها في كروت الأصناف بمخزن الكنترول بنجاح');
          setActiveTab('list');
        }
        await loadData();
      }
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.response?.data?.message || 'فشل تسجيل استلام الكنترول');
    } finally {
      setIsProcessing(false);
    }
  };// Resolve Control Dispute Modal Submit
  const handleResolveControlDispute = async () => {
    if (!selectedControlDispute || !controlDisputeFinalQty || !controlDisputeNotes) {
      showAlert('error', 'يرجى تحديد الكمية المعتمدة نهائياً ومحضر وتوجيه العجز');
      return;
    }

    try {
      setIsProcessing(true);
      const payload = {
        transferId: selectedControlDispute.id,
        finalAcceptedQty: Number(controlDisputeFinalQty),
        chargeTo: controlDisputeChargeTo,
        resolutionNotes: controlDisputeNotes,
        resolvedBy: 'لجنة فض المنازعات المشتركة',
      };

      const res = await axios.post(`${API_BASE}/finished-goods-transfers/resolve-dispute`, payload);
      if (res.data?.success) {
        showAlert('success', 'تم فض النزاع واعتماد التسوية وترصيد الكمية المعتمدة بالكنترول بنجاح');
        setSelectedControlDispute(null);
        await loadData();
      }
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.response?.data?.message || 'فشل فض النزاع');
    } finally {
      setIsProcessing(false);
    }
  };

  // Resubmit adjusted rework batch to costing & QC
  const handleResubmitRework = async (
    transferId: string,
    adjustedQty: number,
    adjustedCount: number,
    notes?: string
  ) => {
    setIsProcessing(true);
    try {
      await axios.post(`${API_BASE}/finished-goods-transfers/resubmit-rework`, {
        transferId,
        adjustedQty,
        adjustedCount,
        notes: notes || 'تم إنهاء التعديل بالصالة وإعادة الإرسال',
      });
      showAlert('success', '✓ تم إعادة إرسال الدفعة المعدلة بنجاح إلى محطة ميزان التكاليف وتوكيد الجودة');
      await loadData();
      setActiveTab('costing');
    } catch (err: any) {
      console.error(err);
      showAlert('error', err.response?.data?.message || 'فشل إعادة إرسال الدفعة المعدلة');
    } finally {
      setIsProcessing(false);
    }
  };// Export Transfers to Excel/CSV with UTF-8 BOM
  const handleExportCsv = () => {
    if (transfers.length === 0) {
      showAlert('error', 'لا توجد بيانات أذونات للتصدير');
      return;
    }

    const headers = [
      'رقم الإذن',
      'التاريخ',
      'أمر التشغيل',
      'عدد الأصناف',
      'الأصناف المشمولة',
      'صالة المصدر',
      'مخزن الكنترول',
      'إجمالي وزن الصالة',
      'إجمالي الصاجات',
      'وزن ميزان التكاليف',
      'صافي مقبول الجودة',
      'مستلم الكنترول',
      'الحالة الرقابية',
      'ملاحظات التشغيل',
    ];

    const rows = filteredTransfers.map((t) => [
      t.transferNumber,
      t.transferDate || '',
      t.productionOrderNumber || '',
      t.itemsCount || t.items?.length || 1,
      `"${(t.items || []).map((x) => `${x.itemName} (${x.dispatchedQty})`).join(' | ')}"`,
      `"${t.sourceWarehouseName}"`,
      `"${t.destinationWarehouseName}"`,
      t.prodDispatchedQty,
      t.prodDispatchedCount,
      t.costingActualQty ?? '',
      t.qcApprovedQty,
      t.receivedActualQty ?? '',
      `"${getStatusBadge(t.status).label}"`,
      `"${(t.prodNotes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `سجل_أذونات_استلام_وتسليم_المنتج_التام_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('success', `تم تصدير سجل (${filteredTransfers.length}) إذن تحويل إلى Excel بنجاح`);
  };

  // Status badge config
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_COSTING':
        return { label: '1. بانتظار ميزان التكاليف', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' };
      case 'DISPUTE_COSTING':
        return { label: '🚨 نزاع: إنتاج وتكاليف', color: 'bg-rose-500/15 text-rose-500 border-rose-500/30' };
      case 'PENDING_QC':
        return { label: '2. بانتظار فحص الجودة', color: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30' };
      case 'PENDING_RECEIPT':
        return { label: '3. بانتظار استلام الكنترول', color: 'bg-blue-500/15 text-blue-500 border-blue-500/30' };
      case 'IN_DISPUTE':
        return { label: '🚨 نزاع: جودة وكنترول', color: 'bg-red-500/20 text-red-500 border-red-500/40' };
      case 'REWORK_IN_PRODUCTION':
      case 'QC_REWORK':
        return { label: '🔄 قيد التعديل بالصالة', color: 'bg-purple-500/15 text-purple-500 border-purple-500/30' };
      case 'COMPLETED':
        return { label: '✓ تم الاستلام والترصيد', color: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' };
      default:
        return { label: status, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }
  };

  // Filtered transfers for Tab 1
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      const matchSearch =
        !searchTerm ||
        t.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.productionOrderNumber && t.productionOrderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.items && t.items.some((it) => it.itemName?.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchStatus = !statusFilter || t.status === statusFilter;
      const matchSource = !sourceWarehouseFilter || t.sourceWarehouseId === sourceWarehouseFilter;

      return matchSearch && matchStatus && matchSource;
    });
  }, [transfers, searchTerm, statusFilter, sourceWarehouseFilter]);

  // Totals for Multi-Item Form
  const totalDispatchedQty = useMemo(() => {
    return dispatchedItems.reduce((acc, it) => acc + Number(it.dispatchedQty || 0), 0);
  }, [dispatchedItems]);

  const totalDispatchedCount = useMemo(() => {
    return dispatchedItems.reduce((acc, it) => acc + Number(it.dispatchedCount || 0), 0);
  }, [dispatchedItems]);

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-5" dir="rtl">
      {/* 1. Header & Universal Toolbar */}
      <div className="erp-sub border rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
                <span>استلام وتسليم المنتج التام</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold">
                  متعدد الأصناف • مرتبط بأوامر التشغيل
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                تسليم إنتاج الصالة ⇦ ميزان التكاليف ⇦ فحص وتصنيف الجودة ⇦ استلام الكنترول ⇦ تدوير المرتجعات للتعديل
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar: Excel Import / Export / Refresh & Quick Views */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 rounded-xl border erp-sub hover:opacity-80 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="تحديث البيانات اللحظية"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={transfers.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeTab === 'reports'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/30 text-cyan-400'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>تقرير الهالك والمعمل</span>
          </button>

          <button
            onClick={() => setActiveTab('disputes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeTab === 'disputes'
                ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-400'
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>لجان النزاعات ({ActiveDisputesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rework')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              activeTab === 'rework'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/20'
                : 'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-300'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مرتجعات بالصالة ({ReworkList.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('new');
              if (dispatchedItems.length === 0) handleAddNewItemRow();
            }}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>إصدار إذن تسليم متعدد الأصناف</span>
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow-sm transition-all ${
            alert.type === 'success'
              ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-500 border-rose-500/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="cursor-pointer text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div
          onClick={() => {
            setActiveTab('list');
            setStatusFilter('');
          }}
          className={`erp-sub border rounded-xl p-3 cursor-pointer transition-all ${
            activeTab === 'list' ? 'border-amber-500 ring-2 ring-amber-500/30' : 'hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>إجمالي الإذونات</span>
            <FileText className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black">{transfers.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('costing')}
          className={`erp-sub border rounded-xl p-3 cursor-pointer transition-all ${
            activeTab === 'costing' ? 'border-amber-500 ring-2 ring-amber-500/30' : 'hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-500 mb-1">
            <span>ميزان التكاليف</span>
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-amber-500">{CostingList.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('qc')}
          className={`erp-sub border rounded-xl p-3 cursor-pointer transition-all ${
            activeTab === 'qc' ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'hover:border-cyan-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-cyan-500 mb-1">
            <span>فحص الجودة</span>
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-cyan-500">{PendingQcList.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('control')}
          className={`erp-sub border rounded-xl p-3 cursor-pointer transition-all ${
            activeTab === 'control' ? 'border-blue-500 ring-2 ring-blue-500/30' : 'hover:border-blue-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-500 mb-1">
            <span>استلام الكنترول</span>
            <Warehouse className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-blue-500">{ControlList.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('disputes')}
          className={`erp-sub border rounded-xl p-3 cursor-pointer transition-all ${
            activeTab === 'disputes' ? 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/5' : 'hover:border-rose-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-500 mb-1">
            <span>نزاعات نشطة</span>
            <Gavel className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-rose-500">{ActiveDisputesList.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('rework')}
          className={`erp-sub border rounded-xl p-3 cursor-pointer transition-all ${
            activeTab === 'rework' ? 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/5' : 'hover:border-purple-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-purple-500 mb-1">
            <span>مرتجعات بالصالة</span>
            <RotateCcw className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-purple-500">{ReworkList.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('reports')}
          className={`erp-sub border rounded-xl p-3 cursor-pointer transition-all ${
            activeTab === 'reports' ? 'border-cyan-500 ring-2 ring-cyan-500/30 bg-cyan-500/5' : 'hover:border-cyan-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-cyan-400 mb-1">
            <span>الهالك والمعمل</span>
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black text-cyan-400 font-mono">
            {totalScrapAll.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">كجم</span>
          </div>
        </div>
      </div>

      {/* 3. Seven Stations & Governance Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 erp-sub border rounded-2xl p-1.5">
        <button
          onClick={() => setActiveTab('list')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'list'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>سجل الإذونات والمتابعة ({transfers.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('new');
            if (dispatchedItems.length === 0) handleAddNewItemRow();
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'new'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>1. تسليم إنتاج الصالة (متعدد الأصناف)</span>
        </button>

        <button
          onClick={() => setActiveTab('costing')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'costing'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>2. ميزان وتدقيق التكاليف</span>
          {CostingList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
              {CostingList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('qc')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'qc'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>3. فحص وتصنيف الجودة</span>
          {PendingQcList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-black">
              {PendingQcList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('control')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'control'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              : 'hover:bg-slate-500/10 text-slate-300'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>4. استلام الكنترول</span>
          {ControlList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-blue-500 text-white text-[10px] font-black">
              {ControlList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'disputes'
              ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/20'
              : 'hover:bg-slate-500/10 text-rose-400'
          }`}
        >
          <Gavel className="w-3.5 h-3.5" />
          <span>⚖️ لجان النزاعات النشطة</span>
          {ActiveDisputesList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse">
              {ActiveDisputesList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rework')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'rework'
              ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/20'
              : 'hover:bg-slate-500/10 text-purple-300'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>🔄 5. مرتجعات بالصالة والتعديل</span>
          {ReworkList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-purple-500 text-white text-[10px] font-black">
              {ReworkList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
            activeTab === 'reports'
              ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
              : 'hover:bg-slate-500/10 text-cyan-300'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>📊 تقرير الهالك والفحص المعملي</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: سجل الإذونات والمتابعة الشاملة                                    */}
      {/* ========================================================================= */}
      {activeTab === 'list' && (
        <div className="erp-sub border rounded-2xl overflow-hidden shadow-sm space-y-3 p-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث برقم الإذن، أمر التشغيل، اللوط، الصنف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full erp-input-compact pr-9 pl-3 rounded-xl border erp-sub text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <select
                value={sourceWarehouseFilter}
                onChange={(e) => setSourceWarehouseFilter(e.target.value)}
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="">-- كل صالات التشغيل (المصدر) --</option>
                {sourceWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouse_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="">-- كل الحالات الرقابية --</option>
                <option value="PENDING_COSTING">1. بانتظار ميزان التكاليف</option>
                <option value="DISPUTE_COSTING">🚨 نزاع: إنتاج وتكاليف</option>
                <option value="PENDING_QC">2. بانتظار فحص الجودة</option>
                <option value="PENDING_RECEIPT">3. بانتظار استلام الكنترول</option>
                <option value="IN_DISPUTE">🚨 نزاع: جودة وكنترول</option>
                <option value="REWORK_IN_PRODUCTION">🔄 قيد التعديل بالصالة</option>
                <option value="COMPLETED">✓ تم الاستلام والترصيد</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-2">
              <span>المعروض: {filteredTransfers.length} إذن</span>
              {(searchTerm || statusFilter || sourceWarehouseFilter) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                    setSourceWarehouseFilter('');
                  }}
                  className="text-amber-500 hover:underline cursor-pointer"
                >
                  إلغاء الفلاتر
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-right text-xs">
              <thead className="erp-sub border-b text-slate-400 font-bold">
                <tr>
                  <th className="p-3">رقم الإذن</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">أمر التشغيل</th>
                  <th className="p-3">الأصناف المشمولة بالإذن</th>
                  <th className="p-3">الصالة المصدر ⇦ مخزن الكنترول</th>
                  <th className="p-3 text-center">إجمالي وزن الصالة</th>
                  <th className="p-3 text-center">ميزان التكاليف</th>
                  <th className="p-3 text-center">مقبول الجودة</th>
                  <th className="p-3 text-center">مستلم الكنترول</th>
                  <th className="p-3 text-center">الحالة الرقابية</th>
                  <th className="p-3 text-center">طباعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-500/10">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-slate-400 font-bold">
                      لا توجد أذونات تحويل مسجلة مطابقة لخيارات البحث.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((t) => {
                    const badge = getStatusBadge(t.status);
                    const items = t.items || [];

                    return (
                      <tr key={t.id} className="hover:bg-slate-500/5 transition-all">
                        <td className="p-3 font-mono font-black text-amber-500">{t.transferNumber}</td>
                        <td className="p-3 font-mono text-slate-300">{t.transferDate}</td>
                        <td className="p-3 font-mono">
                          {t.productionOrderNumber ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold text-[11px]">
                              {t.productionOrderNumber}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">تسليم مباشر</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            {items.length > 0 ? (
                              items.map((it, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 text-[11px]">
                                  <span className="font-bold text-slate-100">{it.itemName}</span>
                                  <span className="font-mono text-amber-500 font-bold">
                                    {it.dispatchedQty} {it.itemUnit || 'كجم'}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="font-bold text-slate-100">{t.itemName}</div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-300">{t.sourceWarehouseName}</div>
                          <div className="text-[11px] text-amber-500/80">⇦ {t.destinationWarehouseName}</div>
                        </td>
                        <td className="p-3 text-center font-mono">
                          <span className="font-black text-slate-200">{t.prodDispatchedQty} كجم</span>
                          <span className="block text-[10px] text-slate-400">({t.prodDispatchedCount} صاج)</span>
                        </td>
                        <td className="p-3 text-center font-mono">
                          {t.costingActualQty !== null ? (
                            <div>
                              <span
                                className={`font-black ${
                                  t.costingDiscrepancyFlag ? 'text-rose-500' : 'text-emerald-500'
                                }`}
                              >
                                {t.costingActualQty} كجم
                              </span>
                              <span className="block text-[10px] text-slate-400">({t.costingActualCount} صاج)</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {t.qcApprovedQty > 0 ? (
                            <div>
                              <span className="font-black text-cyan-500">{t.qcApprovedQty} كجم</span>
                              {t.qcReworkQty > 0 && (
                                <span className="block text-[10px] text-purple-400 font-bold">
                                  مرتجع: {t.qcReworkQty}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">
                          {t.receivedActualQty !== null ? (
                            <div>
                              <span className="font-black text-blue-500">{t.receivedActualQty} كجم</span>
                              <span className="block text-[10px] text-slate-400">({t.receivedActualCount} صاج)</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">معلق</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setPrintTransfer(t)}
                            className="p-1.5 rounded-lg border hover:bg-slate-500/10 text-slate-300 hover:text-amber-500 transition-all cursor-pointer"
                            title="طباعة إذن التسليم المعتمد"
                          >
                            <Printer className="w-3.5 h-3.5" />
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: المحطة 1 - تسليم إنتاج الصالة (متعدد الأصناف + رصيد أمر التشغيل)    */}
      {/* ========================================================================= */}
      {activeTab === 'new' && (
        <form onSubmit={handleSubmitMultiItemTransfer} className="erp-sub border rounded-2xl p-4 md:p-5 space-y-5 shadow-sm">
          {/* Header Title */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-3 border-b gap-3">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base font-black">1. تسليم إنتاج الصالة - إذن تسليم متعدد الأصناف</h2>
                <p className="text-xs text-slate-400">
                  ربط بأمر التشغيل مع إظهار الرصيد المتبقي لكل صنف وإمكانية إضافة أصناف متعددة في إذن تسليم واحد
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddNewItemRow}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-500 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ إضافة صنف إضافي</span>
              </button>
            </div>
          </div>

          {/* Master Info: Production Order & Warehouses */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-500/5 p-4 rounded-xl border border-slate-500/10">
            {/* 1. Production Order Link */}
            <div>
              <label className="block text-xs font-bold text-amber-500 mb-1.5 flex items-center justify-between">
                <span>أمر التشغيل المرتبط (اختياري / موصى به)</span>
                <span className="text-[10px] text-slate-400">جلب فوري للأرصدة</span>
              </label>
              <select
                value={selectedProductionOrderId}
                onChange={(e) => handleSelectProductionOrder(e.target.value)}
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs focus:ring-2 focus:ring-amber-500 outline-none font-bold"
              >
                <option value="">-- تسليم مباشر بدون أمر تشغيل --</option>
                {productionOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNumber} - {po.warehouseName} ({po.items.length} صنف) - {po.status}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Source Warehouse */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">مخزن صالة التشغيل (المصدر) *</label>
              <select
                value={sourceWarehouseId}
                onChange={(e) => setSourceWarehouseId(e.target.value)}
                required
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs focus:ring-2 focus:ring-amber-500 outline-none font-bold"
              >
                <option value="">-- اختر صالة التشغيل المصدر --</option>
                {sourceWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouse_name} ({w.warehouse_code})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Destination Warehouse */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">مخزن الكنترول (الوجهة) *</label>
              <select
                value={destinationWarehouseId}
                onChange={(e) => setDestinationWarehouseId(e.target.value)}
                required
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs focus:ring-2 focus:ring-amber-500 outline-none font-bold"
              >
                <option value="">-- اختر مخزن الكنترول / المنتج التام --</option>
                {destinationWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.warehouse_name} ({w.warehouse_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Multi-Item Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold px-1">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>أصناف المنتج التام المحددة للتسليم ({dispatchedItems.length} صنف)</span>
              </span>
              <span className="text-slate-400 text-[11px]">
                يظهر أمام كل صنف رصيد أمر التشغيل والكميات المسلمة سابقاً والمتبقية بدقة
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b text-slate-400 font-bold">
                  <tr>
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5 min-w-[200px]">المنتج التام (الصنف) *</th>
                    <th className="p-2.5 min-w-[170px] text-center bg-amber-500/5 text-amber-500">
                      رصيد أمر التشغيل (المستهدف / المسلّم / المتبقي)
                    </th>
                    <th className="p-2.5 min-w-[120px] text-center">الكمية المسلمة حالياً *</th>
                    <th className="p-2.5 w-20 text-center">الوحدة</th>
                    <th className="p-2.5 w-28 text-center">عدد الصواني/الصاجات</th>
                    <th className="p-2.5 min-w-[150px]">رقم التشغيلة / اللوط</th>
                    <th className="p-2.5 w-32">تاريخ الصلاحية</th>
                    <th className="p-2.5 min-w-[120px]">ملاحظات البند</th>
                    <th className="p-2.5 w-12 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-500/10">
                  {dispatchedItems.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400 font-bold">
                        لم يتم إضافة أي أصناف بعد. اضغط على «+ إضافة صنف إضافي» أو اختر أمر تشغيل لتحميل أصنافه تلقائياً.
                      </td>
                    </tr>
                  ) : (
                    dispatchedItems.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-500/5 transition-all">
                        {/* Index */}
                        <td className="p-2.5 text-center font-mono font-bold text-slate-400">{idx + 1}</td>

                        {/* Item Select */}
                        <td className="p-2.5">
                          <select
                            value={row.itemId}
                            onChange={(e) => handleItemRowChange(idx, e.target.value)}
                            required
                            className="w-full erp-input-compact rounded-lg border erp-sub text-xs focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                          >
                            <option value="">-- اختر صنف المنتج التام --</option>
                            {allItems.map((itm) => (
                              <option key={itm.id} value={itm.id}>
                                {itm.item_name} ({itm.item_code})
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Work Order Balance Column */}
                        <td className="p-2.5 text-center bg-amber-500/5">
                          {row.workOrderTargetQty !== null && row.workOrderTargetQty !== undefined ? (
                            <div className="space-y-1 font-mono text-[11px]">
                              <div className="flex items-center justify-between gap-1 text-slate-400">
                                <span>المستهدف:</span>
                                <span className="font-bold text-slate-200">{row.workOrderTargetQty} {row.itemUnit}</span>
                              </div>
                              <div className="flex items-center justify-between gap-1 text-slate-400">
                                <span>مسلّم سابقاً:</span>
                                <span className="font-bold text-slate-300">{row.workOrderDeliveredQty || 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-1 pt-0.5 border-t border-amber-500/20 font-bold">
                                <span className="text-amber-500">المتبقي للتسليم:</span>
                                <span className="text-emerald-500 font-black">
                                  {row.workOrderRemainingQty} {row.itemUnit}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">غير مرتبط بأمر تشغيل</span>
                          )}
                        </td>

                        {/* Dispatched Qty */}
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={row.dispatchedQty || ''}
                            onChange={(e) =>
                              handleUpdateRowField(idx, 'dispatchedQty', parseFloat(e.target.value) || 0)
                            }
                            required
                            placeholder="الكمية"
                            className="w-full erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-center text-amber-500 outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </td>

                        {/* Unit */}
                        <td className="p-2.5 text-center font-bold text-slate-300">{row.itemUnit || 'كجم'}</td>

                        {/* Dispatched Count */}
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={row.dispatchedCount || ''}
                            onChange={(e) =>
                              handleUpdateRowField(idx, 'dispatchedCount', parseInt(e.target.value) || 0)
                            }
                            placeholder="صاج"
                            className="w-full erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-center outline-none"
                          />
                        </td>

                        {/* Batch Number */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.batchNumber || ''}
                            onChange={(e) => handleUpdateRowField(idx, 'batchNumber', e.target.value)}
                            placeholder="رقم اللوط"
                            className="w-full erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-amber-500/90 outline-none"
                          />
                        </td>

                        {/* Expiry Date */}
                        <td className="p-2.5">
                          <input
                            type="date"
                            value={row.expiryDate || ''}
                            onChange={(e) => handleUpdateRowField(idx, 'expiryDate', e.target.value)}
                            className="w-full erp-input-compact rounded-lg border erp-sub text-xs font-mono outline-none"
                          />
                        </td>

                        {/* Item Notes */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.notes || ''}
                            onChange={(e) => handleUpdateRowField(idx, 'notes', e.target.value)}
                            placeholder="ملاحظات الصنف..."
                            className="w-full erp-input-compact rounded-lg border erp-sub text-xs outline-none"
                          />
                        </td>

                        {/* Remove Row */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-500 transition-all cursor-pointer"
                            title="حذف هذا الصنف من الإذن"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Row Button under table */}
            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddNewItemRow}
                className="px-3.5 py-1.5 rounded-xl border erp-sub hover:opacity-80 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>إضافة صنف آخر للإذن</span>
              </button>

              {/* Summary Totals */}
              <div className="flex items-center gap-4 text-xs font-mono bg-slate-500/10 px-4 py-2 rounded-xl border">
                <div>
                  <span className="text-slate-400 ml-1">إجمالي الأصناف:</span>
                  <span className="font-bold text-amber-500">{dispatchedItems.length}</span>
                </div>
                <div>
                  <span className="text-slate-400 ml-1">إجمالي الوزن:</span>
                  <span className="font-bold text-slate-100">{totalDispatchedQty.toFixed(2)} كجم</span>
                </div>
                <div>
                  <span className="text-slate-400 ml-1">إجمالي الصاجات:</span>
                  <span className="font-bold text-slate-100">{totalDispatchedCount} صاج</span>
                </div>
              </div>
            </div>
          </div>

          {/* General Notes & Dispatcher */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">ملاحظات التشغيل والتحويل العامة</label>
              <input
                type="text"
                value={transferGeneralNotes}
                onChange={(e) => setTransferGeneralNotes(e.target.value)}
                placeholder="مثال: تسليم تشغيل وردية صباحية صالة شرقي بالتروليات المعتمدة"
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">مشرف الصالة المسلّم</label>
              <input
                type="text"
                value="مشرف الصالة المعتمد (موثق تلقائياً ومحمي بالصلاحية)"
                readOnly
                disabled
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-bold text-slate-400 bg-slate-500/10 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isProcessing || dispatchedItems.length === 0}
              className="px-7 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>إصدار الإذن الموحد وتمريره لميزان التكاليف</span>
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: المحطة 2 - ميزان وتدقيق التكاليف                                  */}
      {/* ========================================================================= */}
      {activeTab === 'costing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between erp-sub border rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base font-black">2. محطة ميزان التكاليف وبوابة نزاع الإنتاج</h2>
                <p className="text-xs text-slate-400">تدقيق الأوزان الفعلية بالميزان ومطابقتها مع إقرار صالة التشغيل لكل صنف</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-500 font-bold border border-amber-500/30">
              {CostingList.length} إذن بانتظار الوزن
            </span>
          </div>

          {CostingList.length === 0 ? (
            <div className="erp-sub border rounded-2xl p-8 text-center text-slate-400 font-bold">
              لا توجد أذونات بانتظار وزن وتدقيق التكاليف حالياً.
            </div>
          ) : (
            CostingList.map((trf) => {
              const items = trf.tempItems || trf.items || [];
              const totalActualWeight = items.reduce(
                (acc, it) => acc + Number(it.tempAuditWeight !== undefined ? it.tempAuditWeight : it.dispatchedQty),
                0
              );
              const diffWeight = totalActualWeight - trf.prodDispatchedQty;
              const hasDiff = Math.abs(diffWeight) > 0.05;

              return (
                <div
                  key={trf.id}
                  className={`erp-sub border rounded-2xl p-4 space-y-3 transition-all ${
                    trf.status === 'DISPUTE_COSTING' ? 'border-rose-500/50 bg-rose-500/5' : ''
                  }`}
                >
                  {trf.status === 'DISPUTE_COSTING' && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-500 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>نزاع نشط بين الإنتاج والتكاليف: {trf.costingDisputeReason}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCostingDispute(trf);
                          setCostingDisputeFinalWeight(trf.costingActualQty ?? trf.prodDispatchedQty);
                          setCostingDisputeFinalCount(trf.costingActualCount ?? trf.prodDispatchedCount);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-black hover:bg-rose-600 transition-all cursor-pointer"
                      >
                        ⚖️ فض نزاع التكاليف
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2 border-b gap-2">
                    <div>
                      <span className="font-mono font-black text-amber-500 text-sm ml-2">{trf.transferNumber}</span>
                      {trf.productionOrderNumber && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-mono text-xs font-bold ml-2">
                          أمر: {trf.productionOrderNumber}
                        </span>
                      )}
                      <span className="text-xs text-slate-300 font-bold">
                        {trf.sourceWarehouseName} ⇦ {trf.destinationWarehouseName} ({items.length} صنف)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono font-bold">
                      <span className="text-slate-400">وزن الصالة المعلن: {trf.prodDispatchedQty} كجم</span>
                      <span className="text-amber-500">إجمالي الميزان: {totalActualWeight.toFixed(2)} كجم</span>
                      {hasDiff && (
                        <span className="text-rose-500">
                          الفارق: {diffWeight > 0 ? `+${diffWeight.toFixed(2)}` : diffWeight.toFixed(2)} كجم
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Multi-Item Breakdown Table */}
                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-right text-xs">
                      <thead className="erp-sub border-b text-slate-400 font-bold">
                        <tr>
                          <th className="p-2">الصنف</th>
                          <th className="p-2">اللوط</th>
                          <th className="p-2 text-center">تسليم الصالة (وزن)</th>
                          <th className="p-2 text-center">تسليم الصالة (صاج)</th>
                          <th className="p-2 text-center min-w-[130px] text-amber-500">الوزن الفعلي بالميزان *</th>
                          <th className="p-2 text-center w-28 text-slate-300">عدد الصاجات *</th>
                          <th className="p-2 text-center">الفارق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/10">
                        {items.map((it, idx) => {
                          const itemDiff = (it.tempAuditWeight || 0) - it.dispatchedQty;
                          return (
                            <tr key={idx} className="hover:bg-slate-500/5">
                              <td className="p-2 font-bold text-slate-100">{it.itemName}</td>
                              <td className="p-2 font-mono text-[11px] text-slate-400">{it.batchNumber}</td>
                              <td className="p-2 text-center font-mono font-bold">
                                {it.dispatchedQty} {it.itemUnit || 'كجم'}
                              </td>
                              <td className="p-2 text-center font-mono">{it.dispatchedCount}</td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={it.tempAuditWeight !== undefined ? it.tempAuditWeight : ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setTransfers((prev) =>
                                      prev.map((t) => {
                                        if (t.id === trf.id) {
                                          const updatedItems = [...(t.tempItems || t.items)];
                                          updatedItems[idx] = { ...updatedItems[idx], tempAuditWeight: val };
                                          return { ...t, tempItems: updatedItems };
                                        }
                                        return t;
                                      })
                                    );
                                  }}
                                  className="w-full erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-center text-amber-500 outline-none"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  value={it.tempAuditCount !== undefined ? it.tempAuditCount : ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setTransfers((prev) =>
                                      prev.map((t) => {
                                        if (t.id === trf.id) {
                                          const updatedItems = [...(t.tempItems || t.items)];
                                          updatedItems[idx] = { ...updatedItems[idx], tempAuditCount: val };
                                          return { ...t, tempItems: updatedItems };
                                        }
                                        return t;
                                      })
                                    );
                                  }}
                                  className="w-full erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-center outline-none"
                                />
                              </td>
                              <td className="p-2 text-center font-mono font-bold">
                                <span
                                  className={
                                    Math.abs(itemDiff) > 0.05
                                      ? itemDiff > 0
                                        ? 'text-emerald-400'
                                        : 'text-rose-500'
                                      : 'text-slate-400'
                                  }
                                >
                                  {itemDiff > 0 ? `+${itemDiff.toFixed(2)}` : itemDiff.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
                    <input
                      type="text"
                      placeholder="ملاحظات مراجع التكاليف والميزان..."
                      value={trf.tempCostingNotes || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTransfers((prev) =>
                          prev.map((item) => (item.id === trf.id ? { ...item, tempCostingNotes: val } : item))
                        );
                      }}
                      className="w-full md:w-1/2 erp-input-compact rounded-xl border erp-sub text-xs outline-none"
                    />

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {hasDiff && (
                        <button
                          onClick={() => handleSubmitCosting(trf, true)}
                          disabled={isProcessing}
                          className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>تصعيد نزاع للجنة</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleSubmitCosting(trf, false)}
                        disabled={isProcessing}
                        className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>اعتماد التكاليف وتمرير للجودة</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: المحطة 3 - فحص وتصنيف الجودة                                     */}
      {/* ========================================================================= */}
      {activeTab === 'qc' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between erp-sub border rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-500" />
              <div>
                <h2 className="text-base font-black">3. محطة توكيد الجودة (QC) - ميزان الخصم الصارم</h2>
                <p className="text-xs text-slate-400">
                  فحص سلامة كل صنف واقتطاع العينات المعملية والمرتجعات والهادر الفني
                </p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-500 font-bold border border-cyan-500/30">
              {PendingQcList.length} إذن بانتظار الفحص
            </span>
          </div>

          {PendingQcList.length === 0 ? (
            <div className="erp-sub border rounded-2xl p-8 text-center text-slate-400 font-bold">
              لا توجد أذونات بانتظار فحص وتوكيد الجودة حالياً.
            </div>
          ) : (
            PendingQcList.map((trf) => {
              const items = trf.tempItems || trf.items || [];
              let totalNetApproved = 0;

              return (
                <div key={trf.id} className="erp-sub border rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <span className="font-mono font-black text-amber-500 text-sm ml-2">{trf.transferNumber}</span>
                      {trf.productionOrderNumber && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-mono text-xs font-bold ml-2">
                          أمر: {trf.productionOrderNumber}
                        </span>
                      )}
                      <span className="text-xs text-slate-300 font-bold">({items.length} صنف)</span>
                    </div>

                    <div className="text-xs font-mono font-bold text-cyan-400">
                      وزن التكاليف المعتمد: {trf.costingActualQty ?? trf.prodDispatchedQty} كجم
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-right text-xs">
                      <thead className="erp-sub border-b text-slate-400 font-bold">
                        <tr>
                          <th className="p-2">الصنف</th>
                          <th className="p-2 text-center">وزن التكاليف</th>
                          <th className="p-2 text-center text-cyan-400">الصافي المقبول للكنترول</th>
                          <th className="p-2 text-center text-slate-300">عينة معملية</th>
                          <th className="p-2 text-center text-purple-400">مرتجع للصالة للتعديل</th>
                          <th className="p-2 text-center text-rose-500">إهلاك وتالف فني</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/10">
                        {items.map((it, idx) => {
                          const baseWeight = it.costingActualQty ?? it.dispatchedQty;
                          const sample = Number(it.tempQcSample || 0);
                          const rework = Number(it.tempQcRework || 0);
                          const scrap = Number(it.tempQcScrap || 0);
                          const netApproved = baseWeight - (sample + rework + scrap);
                          const isInvalid = netApproved < 0;
                          totalNetApproved += isInvalid ? 0 : netApproved;

                          return (
                            <tr key={idx} className="hover:bg-slate-500/5">
                              <td className="p-2 font-bold text-slate-100">{it.itemName}</td>
                              <td className="p-2 text-center font-mono font-bold">
                                {baseWeight} {it.itemUnit || 'كجم'}
                              </td>
                              <td className="p-2 text-center font-mono font-black text-cyan-400">
                                {isInvalid ? (
                                  <span className="text-rose-500">⚠️ خطأ بالأوزان!</span>
                                ) : (
                                  `${netApproved.toFixed(2)} ${it.itemUnit || 'كجم'}`
                                )}
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={it.tempQcSample !== undefined ? it.tempQcSample : ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setTransfers((prev) =>
                                      prev.map((t) => {
                                        if (t.id === trf.id) {
                                          const updatedItems = [...(t.tempItems || t.items)];
                                          updatedItems[idx] = { ...updatedItems[idx], tempQcSample: val };
                                          return { ...t, tempItems: updatedItems };
                                        }
                                        return t;
                                      })
                                    );
                                  }}
                                  className="w-24 erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-center outline-none"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={it.tempQcRework !== undefined ? it.tempQcRework : ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setTransfers((prev) =>
                                      prev.map((t) => {
                                        if (t.id === trf.id) {
                                          const updatedItems = [...(t.tempItems || t.items)];
                                          updatedItems[idx] = { ...updatedItems[idx], tempQcRework: val };
                                          return { ...t, tempItems: updatedItems };
                                        }
                                        return t;
                                      })
                                    );
                                  }}
                                  className="w-24 erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-center text-purple-400 outline-none"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={it.tempQcScrap !== undefined ? it.tempQcScrap : ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setTransfers((prev) =>
                                      prev.map((t) => {
                                        if (t.id === trf.id) {
                                          const updatedItems = [...(t.tempItems || t.items)];
                                          updatedItems[idx] = { ...updatedItems[idx], tempQcScrap: val };
                                          return { ...t, tempItems: updatedItems };
                                        }
                                        return t;
                                      })
                                    );
                                  }}
                                  className="w-24 erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-center text-rose-500 outline-none"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
                    <input
                      type="text"
                      placeholder="ملاحظات فحص وتوكيد الجودة والمعمل..."
                      value={trf.tempQcNotes || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTransfers((prev) =>
                          prev.map((item) => (item.id === trf.id ? { ...item, tempQcNotes: val } : item))
                        );
                      }}
                      className="w-full md:w-1/2 erp-input-compact rounded-xl border erp-sub text-xs outline-none"
                    />

                    <button
                      onClick={() => handleSubmitQc(trf)}
                      disabled={isProcessing}
                      className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      <span>إفراج وتوجيه لكافة الأصناف للكنترول ({totalNetApproved.toFixed(2)} كجم)</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: المحطة 4 - استلام الكنترول ولجنة النزاع                            */}
      {/* ========================================================================= */}
      {activeTab === 'control' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between erp-sub border rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-blue-500" />
              <div>
                <h2 className="text-base font-black">4. استلام مخزن الكنترول الفعلي وبوابة نزاع الكنترول</h2>
                <p className="text-xs text-slate-400">استلام الشحنة المفرج عنها، فحص الأوزان والأعداد، وترصيد المخزن</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-blue-500/15 text-blue-500 font-bold border border-blue-500/30">
              {ControlList.length} شحنة للاستلام
            </span>
          </div>

          {ControlList.length === 0 ? (
            <div className="erp-sub border rounded-2xl p-8 text-center text-slate-400 font-bold">
              لا توجد شحنات معلقة لاستلام الكنترول حالياً.
            </div>
          ) : (
            ControlList.map((trf) => {
              const items = trf.tempItems || trf.items || [];
              let totalApprovedQc = 0;
              let totalReceived = 0;

              return (
                <div
                  key={trf.id}
                  className={`erp-sub border rounded-2xl p-4 space-y-3 transition-all ${
                    trf.status === 'IN_DISPUTE' ? 'border-red-500/50 bg-red-500/5' : ''
                  }`}
                >
                  {trf.status === 'IN_DISPUTE' && (
                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2">
                        <Gavel className="w-4 h-4" />
                        <span>نزاع نشط بين الجودة والكنترول: {trf.disputeReason}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedControlDispute(trf);
                          setControlDisputeFinalQty(trf.receivedActualQty ?? trf.qcApprovedQty);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-black hover:bg-red-600 transition-all cursor-pointer"
                      >
                        ⚖️ فض نزاع الكنترول
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-2 border-b">
                    <div>
                      <span className="font-mono font-black text-amber-500 text-sm ml-2">{trf.transferNumber}</span>
                      {trf.productionOrderNumber && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-500 font-mono text-xs font-bold ml-2">
                          أمر: {trf.productionOrderNumber}
                        </span>
                      )}
                      <span className="text-xs text-slate-300 font-bold">({items.length} صنف)</span>
                    </div>

                    <div className="text-xs font-mono font-bold text-blue-400">
                      المفرج عنه الصافي من الجودة: {trf.qcApprovedQty} كجم
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-right text-xs">
                      <thead className="erp-sub border-b text-slate-400 font-bold">
                        <tr>
                          <th className="p-2">الصنف</th>
                          <th className="p-2 text-center text-cyan-400">المفرج عنه من الجودة</th>
                          <th className="p-2 text-center min-w-[130px] text-blue-500">الكمية المستلمة فعلياً *</th>
                          <th className="p-2 text-center w-28 text-slate-300">العدد الفعلي *</th>
                          <th className="p-2 text-center">عجز الاستلام</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-500/10">
                        {items.map((it, idx) => {
                          const appQc = Number(it.qcApprovedQty || it.costingActualQty || it.dispatchedQty);
                          const rcvQty = Number(
                            it.tempControlQty !== undefined ? it.tempControlQty : appQc
                          );
                          const deficit = appQc - rcvQty;
                          totalApprovedQc += appQc;
                          totalReceived += rcvQty;

                          return (
                            <tr key={idx} className="hover:bg-slate-500/5">
                              <td className="p-2 font-bold text-slate-100">{it.itemName}</td>
                              <td className="p-2 text-center font-mono font-bold text-cyan-400">
                                {appQc} {it.itemUnit || 'كجم'}
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={it.tempControlQty !== undefined ? it.tempControlQty : ''}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setTransfers((prev) =>
                                      prev.map((t) => {
                                        if (t.id === trf.id) {
                                          const updatedItems = [...(t.tempItems || t.items)];
                                          updatedItems[idx] = { ...updatedItems[idx], tempControlQty: val };
                                          return { ...t, tempItems: updatedItems };
                                        }
                                        return t;
                                      })
                                    );
                                  }}
                                  className="w-full erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-center text-blue-500 outline-none"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="number"
                                  value={it.tempControlCount !== undefined ? it.tempControlCount : ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setTransfers((prev) =>
                                      prev.map((t) => {
                                        if (t.id === trf.id) {
                                          const updatedItems = [...(t.tempItems || t.items)];
                                          updatedItems[idx] = { ...updatedItems[idx], tempControlCount: val };
                                          return { ...t, tempItems: updatedItems };
                                        }
                                        return t;
                                      })
                                    );
                                  }}
                                  className="w-full erp-input-compact rounded-lg border erp-sub text-xs font-mono font-bold text-center outline-none"
                                />
                              </td>
                              <td className="p-2 text-center font-mono font-bold">
                                {deficit > 0.05 ? (
                                  <span className="text-rose-500">عجز: {deficit.toFixed(2)}</span>
                                ) : (
                                  <span className="text-emerald-500">مطابق ✓</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
                    <input
                      type="text"
                      placeholder="ملاحظات أمين مخزن الكنترول..."
                      value={trf.tempControlNotes || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTransfers((prev) =>
                          prev.map((item) => (item.id === trf.id ? { ...item, tempControlNotes: val } : item))
                        );
                      }}
                      className="w-full md:w-1/2 erp-input-compact rounded-xl border erp-sub text-xs outline-none"
                    />

                    <div>
                      {trf.status !== 'IN_DISPUTE' ? (
                        <button
                          onClick={() => handleSubmitControlReceipt(trf)}
                          disabled={isProcessing}
                          className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          <span>
                            {totalReceived < totalApprovedQc - 0.05
                              ? 'إحالة للنزاع لوجود عجز كمي'
                              : 'تأكيد استلام وترصيد كافة الأصناف بالكنترول'}
                          </span>
                        </button>
                      ) : (
                        <span className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 font-bold text-xs border border-red-500/30">
                          مجمد بقرار نزاع
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: المحطة 5 - تشغيل وتعديل المرتجعات بالصالة                          */}
      {/* ========================================================================= */}
      {activeTab === 'rework' && (
        <FloorReworkView
          transfers={transfers}
          onResubmitRework={handleResubmitRework}
          isProcessing={isProcessing}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 7: لجان فض النزاعات الفنية والمخزنية النشطة                           */}
      {/* ========================================================================= */}
      {activeTab === 'disputes' && (
        <ActiveDisputesView
          transfers={transfers}
          onOpenCostingDispute={(trf) => {
            setSelectedCostingDispute(trf);
            setCostingDisputeFinalWeight(trf.costingActualQty ?? trf.prodDispatchedQty);
            setCostingDisputeFinalCount(trf.costingActualCount ?? trf.prodDispatchedCount);
          }}
          onOpenControlDispute={(trf) => {
            setSelectedControlDispute(trf);
            setControlDisputeFinalQty(trf.receivedActualQty ?? trf.qcApprovedQty);
          }}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 8: تقرير الهالك والتالف الفني والفحص المعملي                         */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <ScrapLabReportView
          transfers={transfers}
          warehouses={warehouses}
          items={allItems}
          onOpenPrintModal={() => setShowPrintReportModal(true)}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: فض نزاع التكاليف والإنتاج                                        */}
      {/* ========================================================================= */}
      {selectedCostingDispute && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="erp-sub border border-rose-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-rose-500/20 text-rose-500">
              <div className="flex items-center gap-2 font-black text-base">
                <Gavel className="w-5 h-5" />
                <span>اجتماع لجنة الإنتاج والتكاليف - حسم تضارب الأوزان</span>
              </div>
              <button
                onClick={() => setSelectedCostingDispute(null)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-500/10 text-xs space-y-1">
              <div>
                <span className="text-slate-400">الإذن: </span>
                <span className="font-mono font-bold text-amber-500">{selectedCostingDispute.transferNumber}</span>
              </div>
              <div>
                <span className="text-slate-400">الأصناف: </span>
                <span className="font-bold">{selectedCostingDispute.items?.length || 1} صنف</span>
              </div>
              <div>
                <span className="text-slate-400">تسليم الصالة: </span>
                <span className="font-mono font-bold text-slate-200">{selectedCostingDispute.prodDispatchedQty} كجم</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الوزن النهائي المعتمد *</label>
                <input
                  type="number"
                  step="0.01"
                  value={costingDisputeFinalWeight}
                  onChange={(e) => setCostingDisputeFinalWeight(parseFloat(e.target.value) || 0)}
                  className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-mono font-bold text-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">العدد النهائي المعتمد</label>
                <input
                  type="number"
                  value={costingDisputeFinalCount}
                  onChange={(e) => setCostingDisputeFinalCount(parseInt(e.target.value) || 0)}
                  className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-mono font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">تحميل فرق الوزن ومسؤولية الانحراف *</label>
              <select
                value={costingDisputeChargeTo}
                onChange={(e) => setCostingDisputeChargeTo(e.target.value)}
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-bold outline-none"
              >
                <option value="عجز تصنيع يُحمّل على تقرير وردية الصالة">عجز تصنيع يُحمّل على تقرير وردية الصالة</option>
                <option value="جفاف وفقد طبيعي أثناء التبريد والتكييف">جفاف وفقد طبيعي أثناء التبريد والتكييف</option>
                <option value="خطأ في قراءة وتصفير ميزان الصالة (تصحيح)">خطأ في قراءة وتصفير ميزان الصالة (تصحيح)</option>
                <option value="سقوط أو هدر أثناء النقل الداخلي">سقوط أو هدر أثناء النقل الداخلي</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">محضر وتفاصيل قرار اللجنة *</label>
              <textarea
                rows={3}
                value={costingDisputeNotes}
                onChange={(e) => setCostingDisputeNotes(e.target.value)}
                placeholder="أسباب القرار المشترك والتسوية..."
                className="w-full p-2.5 rounded-xl border erp-sub text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCostingDispute(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-500/10 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleResolveCostingDispute}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>اعتماد القرار وتمرير الإذن للجودة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: فض نزاع الكنترول والجودة                                         */}
      {/* ========================================================================= */}
      {selectedControlDispute && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="erp-sub border border-red-500/40 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-red-500/20 text-red-500">
              <div className="flex items-center gap-2 font-black text-base">
                <Gavel className="w-5 h-5" />
                <span>اجتماع لجنة فض المنازعات - تسوية عجز الكنترول</span>
              </div>
              <button
                onClick={() => setSelectedControlDispute(null)}
                className="cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-500/10 text-xs space-y-1">
              <div>
                <span className="text-slate-400">الإذن: </span>
                <span className="font-mono font-bold text-amber-500">{selectedControlDispute.transferNumber}</span>
              </div>
              <div>
                <span className="text-slate-400">المفرج عنه من الجودة: </span>
                <span className="font-mono font-bold text-cyan-400">{selectedControlDispute.qcApprovedQty} كجم</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                الكمية النهائية المعتمدة لدخول مخزن الكنترول *
              </label>
              <input
                type="number"
                step="0.01"
                value={controlDisputeFinalQty}
                onChange={(e) => setControlDisputeFinalQty(parseFloat(e.target.value) || 0)}
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-mono font-bold text-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">توجيه العجز وتحميل المسؤولية *</label>
              <select
                value={controlDisputeChargeTo}
                onChange={(e) => setControlDisputeChargeTo(e.target.value)}
                className="w-full erp-input-compact rounded-xl border erp-sub text-xs font-bold outline-none"
              >
                <option value="عهدة سائق وعامل النقل الداخلي">عهدة سائق وعامل النقل الداخلي</option>
                <option value="هدر وتلف أثناء النقل والتحميل">هدر وتلف أثناء النقل والتحميل</option>
                <option value="جفاف وفقد طبيعي أثناء التخزين">جفاف وفقد طبيعي أثناء التخزين</option>
                <option value="تسوية جردية دائنة / مدينة للمخزن">تسوية جردية دائنة / مدينة للمخزن</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">قرار ومحضر اللجنة المشتركة *</label>
              <textarea
                rows={3}
                value={controlDisputeNotes}
                onChange={(e) => setControlDisputeNotes(e.target.value)}
                placeholder="محضر اجتماع اللجنة وتبرير التسوية..."
                className="w-full p-2.5 rounded-xl border erp-sub text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedControlDispute(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-500/10 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleResolveControlDispute}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>اعتماد القرار وترصيد المخزن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: معاينة وطباعة إذن التسليم المعتمد متعدد الأصناف                   */}
      {/* ========================================================================= */}
      {printTransfer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border print:p-0 print:border-none print:shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">مؤسسة حلواني أبو عادل - نظام كيان ERP</h3>
                <p className="text-xs text-slate-500 font-bold">
                  إذن تسليم واستلام منتج تام معتمد متعدد الأصناف (حلقات رقابية)
                </p>
              </div>
              <div className="text-left font-mono">
                <div className="text-xs text-slate-500">رقم الإذن:</div>
                <div className="text-sm font-black text-amber-600">{printTransfer.transferNumber}</div>
                {printTransfer.productionOrderNumber && (
                  <div className="text-[11px] text-slate-500">أمر تشغيل: {printTransfer.productionOrderNumber}</div>
                )}
              </div>
            </div>

            {/* General Info */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div>
                  <span className="text-slate-500 font-bold">الصالة المصدر: </span>
                  <span className="font-bold">{printTransfer.sourceWarehouseName}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">مخزن الوجهة: </span>
                  <span className="font-bold">{printTransfer.destinationWarehouseName}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <div>
                  <span className="text-slate-500 font-bold">تاريخ الإذن: </span>
                  <span className="font-mono">{printTransfer.transferDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">الحالة الرقابية: </span>
                  <span className="font-bold text-emerald-700">{getStatusBadge(printTransfer.status).label}</span>
                </div>
              </div>
            </div>

            {/* Detailed Items Table */}
            <table className="w-full text-right text-xs border border-slate-300 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 border-b border-slate-300 font-black">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">اسم الصنف</th>
                  <th className="p-2.5">اللوط</th>
                  <th className="p-2.5 text-center">تسليم الصالة</th>
                  <th className="p-2.5 text-center">الصاجات</th>
                  <th className="p-2.5 text-center">ميزان التكاليف</th>
                  <th className="p-2.5 text-center">مقبول الجودة</th>
                  <th className="p-2.5 text-center">مستلم الكنترول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(printTransfer.items || []).map((it, i) => (
                  <tr key={i}>
                    <td className="p-2 text-center font-mono">{i + 1}</td>
                    <td className="p-2 font-bold">{it.itemName}</td>
                    <td className="p-2 font-mono text-[11px] text-slate-600">{it.batchNumber}</td>
                    <td className="p-2 text-center font-mono font-bold">
                      {it.dispatchedQty} {it.itemUnit || 'كجم'}
                    </td>
                    <td className="p-2 text-center font-mono">{it.dispatchedCount}</td>
                    <td className="p-2 text-center font-mono font-bold text-amber-700">
                      {it.costingActualQty ?? '-'}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-cyan-700">
                      {it.qcApprovedQty ?? '-'}
                    </td>
                    <td className="p-2 text-center font-mono font-bold text-blue-700">
                      {it.receivedActualQty ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-300 font-black font-mono">
                <tr>
                  <td colSpan={3} className="p-2.5">الإجمالي الكلي للإذن</td>
                  <td className="p-2.5 text-center">{printTransfer.prodDispatchedQty} كجم</td>
                  <td className="p-2.5 text-center">{printTransfer.prodDispatchedCount} صاج</td>
                  <td className="p-2.5 text-center text-amber-700">{printTransfer.costingActualQty ?? '-'}</td>
                  <td className="p-2.5 text-center text-cyan-700">{printTransfer.qcApprovedQty}</td>
                  <td className="p-2.5 text-center text-blue-700">{printTransfer.receivedActualQty ?? '-'}</td>
                </tr>
              </tfoot>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-4 gap-2 pt-4 border-t text-[11px] text-center text-slate-600 font-bold">
              <div className="space-y-6">
                <div>مشرف الصالة</div>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
              </div>
              <div className="space-y-6">
                <div>مراجع التكاليف</div>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
              </div>
              <div className="space-y-6">
                <div>أخصائي الجودة</div>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
              </div>
              <div className="space-y-6">
                <div>أمين مخزن الكنترول</div>
                <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-2 print:hidden">
              <button
                onClick={() => setPrintTransfer(null)}
                className="px-4 py-2 rounded-xl border text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الإذن المعتمد</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: معاينة وطباعة تقرير الهالك والفحص المعملي الرسمي                 */}
      {/* ========================================================================= */}
      {showPrintReportModal && (
        <PrintScrapReportModal
          transfers={transfers}
          onClose={() => setShowPrintReportModal(false)}
        />
      )}
    </div>
  );
}
