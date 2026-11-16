'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  Plus,
  Phone,
  User,
  Layers,
  Lock,
  Building,
  Radio,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  X,
  PhoneCall,
  Flame,
} from 'lucide-react';
import Link from 'next/link';

interface ComplaintItem {
  id: string;
  ticket_number: string;
  customer_id: string;
  sales_order_id?: string;
  batch_id?: string;
  category: string;
  severity: string;
  description: string;
  investigation_result: string;
  batch_other_buyers_count: number;
  batch_other_complaints_count: number;
  status: string;
  ams_task_id?: string;
  resolution_notes?: string;
  created_at: string;
  customers?: {
    customer_name: string;
    phone: string;
    trust_score: number;
    complaints_count: number;
  };
  sales_orders?: {
    order_number: string;
  };
  inventory_batches?: {
    batch_number: string;
    is_frozen: boolean;
    freeze_reason?: string;
  };
}

interface OtherBuyer {
  customerId: string | null;
  customerName: string;
  phone: string;
  trustScore: number;
  branchName: string;
  orderNumber: string;
  orderDate: string;
  quantity: number;
  unitPrice: number;
  isCurrentComplainant: boolean;
}

interface BranchStock {
  batchId: string;
  warehouseId: string;
  warehouseName: string;
  branchName: string;
  currentQuantity: number;
  initialQuantity: number;
  isFrozen: boolean;
  freezeReason?: string;
  status: string;
}

interface RadarData {
  batchId: string | null;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  isFrozen: boolean;
  freezeReason?: string;
  totalProduced: number;
  totalSold: number;
  totalRemaining: number;
  otherBuyersCount: number;
  otherComplaintsCount: number;
  otherBuyers: OtherBuyer[];
  branchStock: BranchStock[];
  complainantProfile?: {
    customerId: string;
    customerName: string;
    phone: string;
    trustScore: number;
    complaintsCount: number;
    preferencesNotes?: string;
  };
  radarDiagnosis: {
    suggestion: 'GENUINE_BATCH_DEFECT' | 'ISOLATED_INCIDENT' | 'MALICIOUS_SUSPECTED' | 'UNDER_INVESTIGATION';
    confidencePercent: number;
    reason: string;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ComplaintsTraceabilityPage() {
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Radar State
  const [activeRadarComplaint, setActiveRadarComplaint] = useState<ComplaintItem | null>(null);
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [radarLoading, setRadarLoading] = useState(false);

  // New Complaint Modal
  const [showNewComplaintModal, setShowNewComplaintModal] = useState(false);
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any>(null);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [complaintCategory, setComplaintCategory] = useState<'QUALITY' | 'DELAY' | 'MISSING_ITEM' | 'PACKAGING'>('QUALITY');
  const [complaintSeverity, setComplaintSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // Survey Call Modal
  const [surveyBuyer, setSurveyBuyer] = useState<OtherBuyer | null>(null);
  const [surveyStatus, setSurveyStatus] = useState<'FULLY_SATISFIED' | 'TASTE_ISSUE' | 'DEFECTIVE' | 'UNREACHABLE'>('FULLY_SATISFIED');
  const [surveyNotes, setSurveyNotes] = useState('');
  const [submittingSurvey, setSubmittingSurvey] = useState(false);

  // Freeze Modal / Action
  const [freezeReason, setFreezeReason] = useState('إيقاف فوري للتشغيلة بناء على شكوى جودة كول سنتر');
  const [freezing, setFreezing] = useState(false);
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);

  // Resolution loading
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/call-center/complaints`);
      if (res.data?.success) {
        setComplaints(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open Batch Traceability Radar
  const handleOpenRadar = async (complaint: ComplaintItem) => {
    setActiveRadarComplaint(complaint);
    setRadarLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE}/call-center/complaints/analyze-batch?batchId=${complaint.batch_id || ''}&orderId=${
          complaint.sales_order_id || ''
        }&customerId=${complaint.customer_id || ''}`
      );
      if (res.data?.success) {
        setRadarData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching radar analysis:', err);
    } finally {
      setRadarLoading(false);
    }
  };

  // Customer search for new complaint
  const handleSearchCustomer = async () => {
    if (!customerPhoneInput.trim()) return;
    setSearchingCustomer(true);
    try {
      const res = await axios.get(
        `${API_BASE}/call-center/customer/lookup?phone=${encodeURIComponent(customerPhoneInput.trim())}`
      );
      if (res.data?.success && res.data.data.isFound) {
        setFoundCustomer(res.data.data);
        if (res.data.data.recentOrders?.length > 0) {
          const firstOrd = res.data.data.recentOrders[0];
          setSelectedOrderId(firstOrd.id);
          if (firstOrd.items?.[0]?.batchId) {
            setSelectedBatchId(firstOrd.items[0].batchId);
          }
        }
      } else {
        alert('لم يتم العثور على عميل بهذا الهاتف');
        setFoundCustomer(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingCustomer(false);
    }
  };

  // Submit New Complaint
  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundCustomer?.customer?.id || !complaintDesc.trim()) return;

    setSubmittingComplaint(true);
    try {
      const res = await axios.post(`${API_BASE}/call-center/complaints`, {
        customerId: foundCustomer.customer.id,
        salesOrderId: selectedOrderId || undefined,
        batchId: selectedBatchId || undefined,
        category: complaintCategory,
        severity: complaintSeverity,
        description: complaintDesc,
      });

      if (res.data?.success) {
        setShowNewComplaintModal(false);
        setComplaintDesc('');
        setFoundCustomer(null);
        setCustomerPhoneInput('');
        fetchComplaints();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر تسجيل الشكوى');
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Freeze Batch Across Branches
  const handleFreezeBatch = async () => {
    if (!radarData?.batchId) return;

    setFreezing(true);
    try {
      const res = await axios.post(`${API_BASE}/call-center/complaints/freeze-batch`, {
        batchId: radarData.batchId,
        reason: freezeReason,
        complaintId: activeRadarComplaint?.id,
      });

      if (res.data?.success) {
        setShowFreezeConfirm(false);
        alert(res.data.message);
        // Refresh radar and list
        if (activeRadarComplaint) {
          handleOpenRadar(activeRadarComplaint);
        }
        fetchComplaints();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر تجميد التشغيلة');
    } finally {
      setFreezing(false);
    }
  };

  // Submit Survey Call
  const handleSubmitSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyBuyer || !radarData?.batchId) return;

    setSubmittingSurvey(true);
    try {
      const res = await axios.post(`${API_BASE}/call-center/complaints/survey-buyer`, {
        batchId: radarData.batchId,
        targetCustomerId: surveyBuyer.customerId,
        targetCustomerName: surveyBuyer.customerName,
        phone: surveyBuyer.phone,
        satisfactionStatus: surveyStatus,
        notes: surveyNotes,
      });

      if (res.data?.success) {
        setSurveyBuyer(null);
        setSurveyNotes('');
        alert('تم تسجيل نتيجة الاستبيان بنجاح');
      }
    } catch (err) {
      console.error(err);
      alert('تعذر تسجيل الاستبيان');
    } finally {
      setSubmittingSurvey(false);
    }
  };

  // Resolve Complaint (Anti-Fraud penalty or Genuine defect escalation)
  const handleResolveComplaint = async (
    investigationResult: 'GENUINE_BATCH_DEFECT' | 'ISOLATED_INCIDENT' | 'MALICIOUS_SUSPECTED',
    status: 'RESOLVED' | 'REJECTED' | 'ESCALATED_AMS',
    notes: string,
    delta: number
  ) => {
    if (!activeRadarComplaint) return;

    setResolving(true);
    try {
      const res = await axios.patch(
        `${API_BASE}/call-center/complaints/${activeRadarComplaint.id}/resolve`,
        {
          investigationResult,
          status,
          resolutionNotes: notes,
          trustScoreDelta: delta,
        }
      );

      if (res.data?.success) {
        alert(res.data.message);
        if (activeRadarComplaint) {
          handleOpenRadar(activeRadarComplaint);
        }
        fetchComplaints();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر البت في الشكوى');
    } finally {
      setResolving(false);
    }
  };

  // Metric stats
  const totalComplaints = complaints.length;
  const openComplaints = complaints.filter((c) => c.status === 'OPEN').length;
  const defectBatchCount = complaints.filter((c) => c.investigation_result === 'GENUINE_BATCH_DEFECT').length;
  const maliciousCount = complaints.filter((c) => c.investigation_result === 'MALICIOUS_SUSPECTED').length;
  const frozenCount = complaints.filter((c) => c.inventory_batches?.is_frozen).length;

  const filteredComplaints = complaints.filter((c) => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      c.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customers?.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customers?.phone?.includes(searchQuery) ||
      c.inventory_batches?.batch_number?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12" dir="rtl">
      {/* 1. Header Toolbar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-rose-600 to-red-600 rounded-xl shadow-sm">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              رادار فحص الشكاوى والتتبع الأمامي للتشغيلات (Anti-Fraud Engine)
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Forward Traceability
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              كشف الشكاوى الكيدية آلياً، استرجاع كافة المشترين لنفس التشغيلة، وتجميد الأرصدة المشبوهة بالفروع فوراً
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/call-center/workspace"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            ← شباك الكول سنتر الموحد
          </Link>
          <button
            onClick={() => setShowNewComplaintModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            تسجيل شكوى جديدة
          </button>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* 2. Top Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">إجمالي الشكاوى</span>
              <span className="text-lg font-black text-white font-mono">{totalComplaints}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-900/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">شكاوى قيد الفحص</span>
              <span className="text-lg font-black text-amber-400 font-mono">{openComplaints}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-red-900/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-red-600/20 text-red-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">عيوب تشغيلة حقيقية</span>
              <span className="text-lg font-black text-red-400 font-mono">{defectBatchCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-purple-900/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">شكاوى كيدية مرصودة</span>
              <span className="text-lg font-black text-purple-400 font-mono">{maliciousCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-rose-900/40 p-3.5 rounded-2xl flex items-center gap-3 shadow-sm">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">تشغيلات مجمدة بالفروع</span>
              <span className="text-lg font-black text-rose-400 font-mono">{frozenCount}</span>
            </div>
          </div>
        </div>

        {/* 3. Filter & Search */}
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">الحالة:</span>
            <div className="flex items-center gap-1.5 text-xs">
              {[
                { key: 'ALL', label: 'كافة الشكاوى' },
                { key: 'OPEN', label: 'مفتوحة (قيد التدقيق)' },
                { key: 'ESCALATED_AMS', label: 'محولة لـ AMS' },
                { key: 'RESOLVED', label: 'تم البت فيها' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    statusFilter === tab.key
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-80">
            <input
              type="text"
              placeholder="بحث برقم التذكرة، التشغيلة، الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
          </div>
        </div>

        {/* 4. Active Complaints Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
              سجل الشكاوى المستلمة وقرارات الفحص
            </h3>
            <button
              onClick={fetchComplaints}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> تحديث السجل
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">رقم التذكرة</th>
                  <th className="p-3">العميل والمحمول</th>
                  <th className="p-3">رقم التشغيلة</th>
                  <th className="p-3">التصنيف والشدة</th>
                  <th className="p-3">فحص المصداقية (Radar)</th>
                  <th className="p-3">الحالة الحالية</th>
                  <th className="p-3 text-center">إجراءات الرادار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      جاري استرجاع بيانات الشكاوى والتشغيلات...
                    </td>
                  </tr>
                ) : filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      لا توجد شكاوى مسجلة تطابق التصفية
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => {
                    const isFrozen = c.inventory_batches?.is_frozen;
                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-bold text-indigo-300">{c.ticket_number}</td>
                        <td className="p-3">
                          <span className="font-semibold block text-white">{c.customers?.customer_name || 'عميل نقدي'}</span>
                          <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
                            {c.customers?.phone}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-mono text-amber-300 font-bold block">
                            {c.inventory_batches?.batch_number || 'غير محدد'}
                          </span>
                          {isFrozen && (
                            <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> مجمدة بالفروع
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] font-bold">
                            {c.category}
                          </span>
                          <span
                            className={`mr-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.severity === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {c.severity}
                          </span>
                        </td>
                        <td className="p-3">
                          {c.investigation_result === 'GENUINE_BATCH_DEFECT' && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 font-bold">
                              عيب تشغيلة مؤكد
                            </span>
                          )}
                          {c.investigation_result === 'MALICIOUS_SUSPECTED' && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-bold">
                              شبهة كيدية
                            </span>
                          )}
                          {c.investigation_result === 'ISOLATED_INCIDENT' && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-bold">
                              حادث تخزين فردي
                            </span>
                          )}
                          {c.investigation_result === 'UNDER_INVESTIGATION' && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold">
                              قيد التحليل
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="text-xs font-semibold text-slate-300">{c.status}</span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleOpenRadar(c)}
                            className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 mx-auto"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            فتح رادار التشغيلة
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

      {/* ======================================================== */}
      {/* DRAWER / MODAL: BATCH TRACEABILITY RADAR */}
      {/* ======================================================== */}
      {activeRadarComplaint && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-600/20 text-rose-400 rounded-xl">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    الرادار التشغيلي للتشغيلة (Batch Traceability Radar)
                    <span className="font-mono text-indigo-400 font-bold">
                      #{radarData?.batchNumber || '...'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    تذكرة الشكوى: {activeRadarComplaint.ticket_number} • العميل: {activeRadarComplaint.customers?.customer_name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveRadarComplaint(null);
                  setRadarData(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Radar Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-xs">
              {radarLoading ? (
                <div className="py-24 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-400" />
                  جاري تحليل شبكة الصرف وسجلات المشترين وفحص المصداقية...
                </div>
              ) : radarData ? (
                <>
                  {/* Frozen Batch Alert Banner */}
                  {radarData.isFrozen && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-between text-rose-300">
                      <div className="flex items-center gap-2">
                        <Lock className="w-5 h-5 text-rose-400" />
                        <div>
                          <strong className="block text-rose-300">تنبيه حظر فوري: التشغيلة مجمدة ومسحوبة من كافة الفروع</strong>
                          <span className="text-[11px] text-rose-400/80">السبب: {radarData.freezeReason}</span>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold">
                        تذكرة AMS مفعلة
                      </span>
                    </div>
                  )}

                  {/* 1. Quick Stats Header */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">إجمالي الكمية المنتجة</span>
                      <span className="text-base font-black text-white font-mono">{radarData.totalProduced} قطعة</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">إجمالي المباع للعملاء</span>
                      <span className="text-base font-black text-amber-400 font-mono">{radarData.totalSold} قطعة</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">المتبقي بثلاجات الفروع</span>
                      <span className="text-base font-black text-emerald-400 font-mono">{radarData.totalRemaining} قطعة</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">عدد المشترين الآخرين</span>
                      <span className="text-base font-black text-indigo-400 font-mono">{radarData.otherBuyersCount} عملاء</span>
                    </div>
                  </div>

                  {/* 2. Anti-Fraud Diagnosis Card */}
                  <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-900/40 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        قرار المحرك الذكي لكشف المصداقية (Anti-Fraud Algorithm):
                      </span>
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                        درجة الثقة: {radarData.radarDiagnosis.confidencePercent}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {radarData.radarDiagnosis.suggestion === 'GENUINE_BATCH_DEFECT' && (
                        <div className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-300 border border-red-500/40 font-bold text-xs flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          عيب تشغيلة تصنيعي حقيقي مؤكد
                        </div>
                      )}
                      {radarData.radarDiagnosis.suggestion === 'MALICIOUS_SUSPECTED' && (
                        <div className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold text-xs flex items-center gap-1.5">
                          <ShieldAlert className="w-4 h-4 text-purple-400" />
                          شبهة شكوى كيدية (تكرار شكاوى مع رضا باقي المشترين)
                        </div>
                      )}
                      {radarData.radarDiagnosis.suggestion === 'ISOLATED_INCIDENT' && (
                        <div className="px-3 py-1.5 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          حادث فردي (ظروف حفظ أو نقل لدى العميل)
                        </div>
                      )}
                      {radarData.radarDiagnosis.suggestion === 'UNDER_INVESTIGATION' && (
                        <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-400" />
                          بيانات غير كافية • قيد التدقيق الاستباقي
                        </div>
                      )}
                      <p className="text-slate-300 text-xs flex-1">{radarData.radarDiagnosis.reason}</p>
                    </div>
                  </div>

                  {/* 3. Forward Traceability Table (Other Buyers) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <User className="w-4 h-4 text-indigo-400" />
                        التتبع الأمامي: كافة العملاء الآخرين الذين اشتروا من نفس التشغيلة ({radarData.otherBuyers.length})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        اضغط لتسجيل نتيجة استبيان الجودة عبر الهاتف
                      </span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                          <tr>
                            <th className="p-2.5">اسم العميل</th>
                            <th className="p-2.5">رقم المحمول</th>
                            <th className="p-2.5">الفرع المغطّي</th>
                            <th className="p-2.5">رقم الطلب</th>
                            <th className="p-2.5">الكمية المستهلكة</th>
                            <th className="p-2.5 text-center">استبيان الرضا الهاتفي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {radarData.otherBuyers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="p-6 text-center text-slate-500">
                                لا يوجد مشترون آخرون مسجلون لهذه التشغيلة
                              </td>
                            </tr>
                          ) : (
                            radarData.otherBuyers.map((b, idx) => (
                              <tr key={idx} className={b.isCurrentComplainant ? 'bg-rose-950/20' : 'hover:bg-slate-900/50'}>
                                <td className="p-2.5 font-semibold text-white">
                                  {b.customerName}
                                  {b.isCurrentComplainant && (
                                    <span className="mr-2 text-[10px] text-rose-400 font-bold">(المشتكي الحالي)</span>
                                  )}
                                </td>
                                <td className="p-2.5 font-mono text-slate-400" dir="ltr">{b.phone}</td>
                                <td className="p-2.5">{b.branchName}</td>
                                <td className="p-2.5 font-mono text-indigo-300">{b.orderNumber}</td>
                                <td className="p-2.5 font-bold text-amber-400">{b.quantity} قطعة</td>
                                <td className="p-2.5 text-center">
                                  {!b.isCurrentComplainant && b.customerId && (
                                    <button
                                      onClick={() => setSurveyBuyer(b)}
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 rounded-lg text-[11px] font-medium transition flex items-center gap-1 mx-auto"
                                    >
                                      <PhoneCall className="w-3 h-3" />
                                      تسجيل نتيجة اتصال جودة
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 4. Branch Stock Table */}
                  <div className="space-y-2">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-emerald-400" />
                      الرصيد المتبقي من التشغيلة بثلاجات الفروع ومواقعها ({radarData.branchStock.length})
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {radarData.branchStock.map((stk) => (
                        <div
                          key={stk.batchId}
                          className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold block text-white">{stk.branchName}</span>
                            <span className="text-[10px] text-slate-400">{stk.warehouseName}</span>
                          </div>
                          <div className="text-left">
                            <span className="font-mono text-base font-bold text-emerald-400">
                              {stk.currentQuantity} ق
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              من {stk.initialQuantity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. Emergency Executive Actions Toolbar */}
                  <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-2xl">
                    <div className="flex items-center gap-2">
                      {/* Freeze Button */}
                      {!radarData.isFrozen && (
                        <button
                          onClick={() => setShowFreezeConfirm(true)}
                          className="px-3.5 py-2 bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
                        >
                          <Lock className="w-4 h-4" />
                          تجميد التشغيلة بكافة الفروع ورفع مهمة AMS
                        </button>
                      )}

                      {/* Flag Malicious */}
                      <button
                        onClick={() =>
                          handleResolveComplaint(
                            'MALICIOUS_SUSPECTED',
                            'REJECTED',
                            'تم إثبات الشكوى الكيدية بعد فحص المشترين ورصيد العميل',
                            25
                          )
                        }
                        disabled={resolving}
                        className="px-3.5 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                      >
                        <TrendingDown className="w-4 h-4 text-purple-400" />
                        إثبات شكوى كيدية وتخفيض مصداقية العميل (-25%)
                      </button>

                      {/* Confirm Defect */}
                      <button
                        onClick={() =>
                          handleResolveComplaint(
                            'GENUINE_BATCH_DEFECT',
                            'RESOLVED',
                            'تم تأكيد العيب المصنعي وتعويض العميل ومكافأة مؤشر الثقة',
                            5
                          )
                        }
                        disabled={resolving}
                        className="px-3.5 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                      >
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        إثبات عيب مصنعي وتعويض العميل (+5%)
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Freeze Confirmation */}
      {/* ======================================================== */}
      {showFreezeConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/30">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-white text-base">تأكيد تجميد التشغيلة بكافة الفروع</h3>
              <p className="text-xs text-slate-400 mt-1">
                سيتم إيقاف بيع وصرف التشغيلة (<strong className="text-amber-400 font-mono">{radarData?.batchNumber}</strong>) في جميع معارض وحلواني أبو عادل فوراً وفتح مهمة تدقيق عاجلة لمدير الجودة بـ AMS.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-slate-300 block">سبب التجميد الإلزامي:</label>
              <textarea
                rows={2}
                value={freezeReason}
                onChange={(e) => setFreezeReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowFreezeConfirm(false)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={handleFreezeBatch}
                disabled={freezing}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                {freezing ? 'جاري التجميد...' : 'تأكيد الحظر الفوري'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Quality Survey Call */}
      {/* ======================================================== */}
      {surveyBuyer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-indigo-400" />
                تسجيل استبيان جودة مع مشترٍ آخر
              </h3>
              <button onClick={() => setSurveyBuyer(null)} className="text-slate-500 hover:text-white text-xs">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleSubmitSurvey} className="space-y-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300">
                <div>العميل: <strong className="text-white">{surveyBuyer.customerName}</strong></div>
                <div>الهاتف: <strong className="text-indigo-400 font-mono" dir="ltr">{surveyBuyer.phone}</strong></div>
                <div>الكمية المشتراة: <strong className="text-amber-400 font-bold">{surveyBuyer.quantity} قطعة</strong></div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">نتيجة الاتصال والرضا عن المذاق:</label>
                <div className="space-y-1.5">
                  {[
                    { key: 'FULLY_SATISFIED', label: 'راضٍ تماماً والمنتج طازج وممتاز' },
                    { key: 'TASTE_ISSUE', label: 'ملاحظة خفيفة على المذاق / السكر' },
                    { key: 'DEFECTIVE', label: 'أكد وجود عيب مماثل بالتشغيلة' },
                    { key: 'UNREACHABLE', label: 'الهاتف مغلق / لم يرد' },
                  ].map((opt) => (
                    <label
                      key={opt.key}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                        surveyStatus === opt.key
                          ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="surveyOpt"
                        checked={surveyStatus === opt.key}
                        onChange={() => setSurveyStatus(opt.key as any)}
                        className="accent-indigo-500"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ملاحظات العميل:</label>
                <textarea
                  rows={2}
                  value={surveyNotes}
                  onChange={(e) => setSurveyNotes(e.target.value)}
                  placeholder="ملاحظات العميل الحرفية أثناء المكالمة..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSurveyBuyer(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingSurvey}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
                >
                  {submittingSurvey ? 'جاري الحفظ...' : 'حفظ نتيجة المكالمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: New Complaint Registration */}
      {/* ======================================================== */}
      {showNewComplaintModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-400" />
                تسجيل شكوى عميل جديدة وربطها بالتشغيلة
              </h3>
              <button onClick={() => setShowNewComplaintModal(false)} className="text-slate-500 hover:text-white text-xs">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-3 text-xs">
              {/* Phone search */}
              <div>
                <label className="block text-slate-300 mb-1">ابحث عن العميل برقم الهاتف:</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="010..."
                    value={customerPhoneInput}
                    onChange={(e) => setCustomerPhoneInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleSearchCustomer}
                    disabled={searchingCustomer}
                    className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold"
                  >
                    {searchingCustomer ? 'جاري البحث...' : 'بحث'}
                  </button>
                </div>
              </div>

              {foundCustomer && (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{foundCustomer.customer?.customerName}</span>
                    <span className="text-indigo-400 font-mono text-[11px]">{foundCustomer.customer?.phone}</span>
                  </div>

                  {foundCustomer.recentOrders?.length > 0 && (
                    <div>
                      <label className="block text-slate-400 mb-1">اختر الطلب / الفاتورة المرتبطة بالشكوى:</label>
                      <select
                        value={selectedOrderId}
                        onChange={(e) => {
                          setSelectedOrderId(e.target.value);
                          const ord = foundCustomer.recentOrders.find((o: any) => o.id === e.target.value);
                          if (ord?.items?.[0]?.batchId) {
                            setSelectedBatchId(ord.items[0].batchId);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        {foundCustomer.recentOrders.map((ord: any) => (
                          <option key={ord.id} value={ord.id}>
                            طلب #{ord.orderNumber} - {ord.totalAmount} ج.م ({ord.items?.length || 0} أصناف)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">تصنيف الشكوى:</label>
                  <select
                    value={complaintCategory}
                    onChange={(e) => setComplaintCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="QUALITY">جودة ومذاق (QUALITY)</option>
                    <option value="DELAY">تأخير توصيل (DELAY)</option>
                    <option value="MISSING_ITEM">صنف ناقص (MISSING_ITEM)</option>
                    <option value="PACKAGING">تغليف وعلب (PACKAGING)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">درجة الخطورة:</label>
                  <select
                    value={complaintSeverity}
                    onChange={(e) => setComplaintSeverity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="LOW">منخفضة (LOW)</option>
                    <option value="MEDIUM">متوسطة (MEDIUM)</option>
                    <option value="HIGH">عالية (HIGH)</option>
                    <option value="CRITICAL">حرجة / سحب تشغيلة (CRITICAL)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">تفاصيل الشكوى الحرفية:</label>
                <textarea
                  rows={3}
                  required
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  placeholder="وصف المشكلة، ملاحظة الطعم، الوقت، أو مظهر المنتج..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewComplaintModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingComplaint || !foundCustomer}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {submittingComplaint ? 'جاري التسجيل...' : 'تسجيل الشكوى وفتح التذكرة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
