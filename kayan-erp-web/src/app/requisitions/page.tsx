'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  FileText,
  Search,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCw,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  X,
  Loader2,
  AlertTriangle,
  Scale,
  ShieldCheck,
  PackageCheck,
  Send,
} from 'lucide-react';

interface RequisitionLine {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  requestedQuantity: number;
  dispatchedQuantity: number;
  receivedQuantity: number;
  unit: string;
  batchNumber?: string | null;
  expiryDate?: string | null;
  status: 'PENDING' | 'DISPATCHED' | 'RECEIVED' | 'DISPUTED' | 'RESOLVED';
  discrepancyReason?: string;
}

interface MaterialRequisition {
  id: string;
  requisitionNumber: string;
  date: string;
  department: string;
  targetWarehouseName: string;
  priority: 'NORMAL' | 'URGENT' | 'EMERGENCY';
  status: 'PENDING' | 'DISPATCHED' | 'RECEIVED' | 'DISPUTED' | 'RESOLVED';
  requestedBy: string;
  dispatchedBy?: string | null;
  notes?: string;
  lines: RequisitionLine[];
}

export default function MaterialRequisitionsPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [requisitions, setRequisitions] = useState<MaterialRequisition[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // مودالات
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDispatchModal, setShowDispatchModal] = useState<boolean>(false);
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false);
  const [selectedReq, setSelectedReq] = useState<MaterialRequisition | null>(null);

  // فورم طلب صرف جديد
  const [newDept, setNewDept] = useState<string>('صالة الحلويات الشرقية (البسبوسة والكنافة)');
  const [newPriority, setNewPriority] = useState<'NORMAL' | 'URGENT' | 'EMERGENCY'>('NORMAL');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newLines, setNewLines] = useState<{ itemId: string; itemName: string; requestedQuantity: number; unit: string }[]>([
    { itemId: '101', itemName: 'سمن بلدي طبيعي ممتاز (نيوزيلندي)', requestedQuantity: 50, unit: 'كجم' },
    { itemId: '103', itemName: 'سكر أبيض ناعم مكرر', requestedQuantity: 100, unit: 'كجم' },
  ]);

  // فورم الصرف وصرف اللوطات FEFO
  const [dispatchLots, setDispatchLots] = useState<{ [lineId: string]: { batchNumber: string; expiryDate: string; quantity: number } }>({});

  // فورم الاستلام والمطابقة
  const [receiveData, setReceiveData] = useState<{ [lineId: string]: { qty: number; isAccepted: boolean; reason: string } }>({});

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadRequisitions();

    if (socket) {
      socket.on('requisition_updated', () => {
        loadRequisitions();
      });

      return () => {
        socket.off('requisition_updated');
      };
    }
  }, [socket]);

  const loadRequisitions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/requisitions');
      if (res.data?.success && res.data.data) {
        setRequisitions(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch requisitions', err);
    } finally {
      setLoading(false);
    }
  };

  // تصفية أذونات الصرف
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
      const s = searchTerm.toLowerCase().trim();
      const matchesSearch =
        s === '' ||
        r.requisitionNumber.toLowerCase().includes(s) ||
        r.department.toLowerCase().includes(s) ||
        r.requestedBy.toLowerCase().includes(s);
      return matchesStatus && matchesSearch;
    });
  }, [requisitions, statusFilter, searchTerm]);

  // إرسال طلب صرف جديد
  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:3000/requisitions', {
        department: newDept,
        targetWarehouseId: '1',
        priority: newPriority,
        notes: newNotes,
        lines: newLines,
      });

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setShowCreateModal(false);
        loadRequisitions();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إنشاء طلب الصرف', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح مودال صرف المستودع
  const openDispatchModal = (req: MaterialRequisition) => {
    setSelectedReq(req);
    const lots: any = {};
    req.lines.forEach((l) => {
      lots[l.id] = {
        batchNumber: `LOT-2026-${Math.floor(100 + Math.random() * 900)}`,
        expiryDate: '2027-06-30',
        quantity: l.requestedQuantity,
      };
    });
    setDispatchLots(lots);
    setShowDispatchModal(true);
  };

  // تأكيد صرف المستودع
  const handleConfirmDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    setIsSubmitting(true);
    try {
      const lineBatches = Object.entries(dispatchLots).map(([lineId, data]) => ({
        lineId,
        batchNumber: data.batchNumber,
        expiryDate: data.expiryDate,
        dispatchedQuantity: data.quantity,
      }));

      const res = await axios.post('http://localhost:3000/requisitions/dispatch', {
        requisitionId: selectedReq.id,
        dispatchedBy: 'أمين مخزن الخامات',
        lineBatches,
      });

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setShowDispatchModal(false);
        loadRequisitions();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر صرف الشحنة', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح مودال استلام الصالة والمطابقة المزدوجة
  const openReceiveModal = (req: MaterialRequisition) => {
    setSelectedReq(req);
    const recData: any = {};
    req.lines.forEach((l) => {
      recData[l.id] = {
        qty: l.dispatchedQuantity || l.requestedQuantity,
        isAccepted: true,
        reason: '',
      };
    });
    setReceiveData(recData);
    setShowReceiveModal(true);
  };

  // تأكيد استلام سطر
  const handleConfirmReceiveLine = async (lineId: string) => {
    if (!selectedReq) return;
    const itemData = receiveData[lineId];
    try {
      const res = await axios.post('http://localhost:3000/requisitions/receive-line', {
        requisitionId: selectedReq.id,
        lineId,
        receivedQuantity: itemData.qty,
        receivedBy: 'مشرف الصالة المستلم',
        isAccepted: itemData.isAccepted,
        discrepancyReason: itemData.reason,
      });

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        loadRequisitions();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تسجيل الاستلام', success: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-200" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* الترويسة */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-200 print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer">
              <ArrowRight className="w-5 h-5 text-indigo-600" />
            </Link>
            <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">طلبات وأذونات صرف الخامات (Requisitions)</h1>
              <p className="text-xs erp-muted">
                مصانع وحلواني أبو عادل | دورة صرف الخامات بنظام FEFO والمطابقة المزدوجة بين الصالة والمستودع
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>طلب صرف خامات جديد</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة إذن الصرف A4</span>
            </button>

            <button
              onClick={loadRequisitions}
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

        {/* شريط الفلاتر والبحث */}
        <div className="erp-card p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'كافة الطلبات' },
              { id: 'PENDING', label: 'بانتظار الصرف' },
              { id: 'DISPATCHED', label: 'تم الصرف (قيد النقل)' },
              { id: 'RECEIVED', label: 'مستلم ومعتمد' },
              { id: 'DISPUTED', label: 'نزاع وعجز مخزني' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-purple-600 text-white shadow'
                    : 'erp-sub hover:opacity-80'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
            <input
              type="text"
              placeholder="بحث برقم الإذن، الصالة أو المشرف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border erp-sub outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>
        </div>

        {/* ترويسة الطباعة الرسمية A4 */}
        <div className="hidden print:block border-b-2 border-black pb-3 mb-4 text-center">
          <h2 className="text-xl font-black">مصانع وحلواني أبو عادل</h2>
          <p className="text-xs text-gray-700">إذن صرف وتغذية خطوط الإنتاج بالخامات الغذائية (Material Issue Slip)</p>
          <div className="flex justify-between items-center text-xs mt-2 px-4 font-bold">
            <span>إدارة مراقبة المخزون وصالات التصنيع</span>
            <span>تاريخ الإصدار: {displayDate}</span>
          </div>
        </div>

        {/* بطاقات أذونات الصرف */}
        <div className="space-y-4">
          {loading ? (
            <div className="erp-card p-8 text-center erp-muted text-xs">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              <span>جاري تحميل طلبات صرف الخامات...</span>
            </div>
          ) : filteredRequisitions.length === 0 ? (
            <div className="erp-card p-8 text-center erp-muted text-xs">
              لا توجد طلبات صرف مطابقة لمعايير البحث.
            </div>
          ) : (
            filteredRequisitions.map((req) => (
              <div key={req.id} className="erp-card p-5 rounded-2xl shadow-sm border space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b erp-card pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-purple-600 text-base">{req.requisitionNumber}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{req.department}</span>
                    <span className="text-[11px] text-gray-500">{req.date}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        req.priority === 'EMERGENCY'
                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          : req.priority === 'URGENT'
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}
                    >
                      {req.priority === 'EMERGENCY' ? 'طارئ جداً' : req.priority === 'URGENT' ? 'عاجل' : 'عادي'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        req.status === 'RECEIVED'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : req.status === 'DISPATCHED'
                          ? 'bg-blue-500/10 text-blue-500'
                          : req.status === 'DISPUTED'
                          ? 'bg-rose-500/10 text-rose-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {req.status === 'RECEIVED'
                        ? 'مستلم ومعتمد'
                        : req.status === 'DISPATCHED'
                        ? 'مصروف من المخزن'
                        : req.status === 'DISPUTED'
                        ? 'نزاع مخزني'
                        : 'بانتظار الصرف'}
                    </span>

                    {/* أزرار الإجراءات السريعة */}
                    <div className="flex items-center gap-1.5 print:hidden mr-2">
                      {req.status === 'PENDING' && (
                        <button
                          onClick={() => openDispatchModal(req)}
                          className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>صرف من المخزن</span>
                        </button>
                      )}

                      {req.status === 'DISPATCHED' && (
                        <button
                          onClick={() => openReceiveModal(req)}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>استلام ومطابقة الصالة</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* بنود الخامات في الإذن */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="erp-sub border-b text-[11px]">
                      <tr>
                        <th className="p-2">كود الخامة</th>
                        <th className="p-2">اسم الخامة والمستلزم</th>
                        <th className="p-2 font-mono text-center">الكمية المطلوبة</th>
                        <th className="p-2 font-mono text-center">الكمية المصروفة</th>
                        <th className="p-2 font-mono text-center">الكمية المستلمة</th>
                        <th className="p-2">رقم التشغيلة (Batch)</th>
                        <th className="p-2">تاريخ الصلاحية</th>
                        <th className="p-2 text-center">حالة السطر</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {req.lines.map((line) => (
                        <tr key={line.id} className="hover:bg-gray-500/5">
                          <td className="p-2 font-mono font-bold text-purple-600">{line.itemCode}</td>
                          <td className="p-2 font-bold">{line.itemName}</td>
                          <td className="p-2 font-mono text-center">{line.requestedQuantity} {line.unit}</td>
                          <td className="p-2 font-mono text-center font-bold text-blue-600">
                            {line.dispatchedQuantity > 0 ? `${line.dispatchedQuantity} ${line.unit}` : '-'}
                          </td>
                          <td className="p-2 font-mono text-center font-bold text-emerald-600">
                            {line.receivedQuantity > 0 ? `${line.receivedQuantity} ${line.unit}` : '-'}
                          </td>
                          <td className="p-2 font-mono text-xs text-gray-500">{line.batchNumber || '-'}</td>
                          <td className="p-2 font-mono text-xs text-gray-500">{line.expiryDate || '-'}</td>
                          <td className="p-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                line.status === 'RECEIVED'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : line.status === 'DISPUTED'
                                  ? 'bg-rose-500/10 text-rose-500'
                                  : 'bg-gray-500/10 text-gray-500'
                              }`}
                            >
                              {line.status === 'RECEIVED' ? 'مستلم' : line.status === 'DISPUTED' ? 'عجز' : 'قيد الصرف'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {req.notes && (
                  <p className="text-[11px] text-gray-500 border-t erp-card pt-2">
                    <strong>ملاحظات:</strong> {req.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* توقيعات إذن الصرف A4 */}
        <div className="hidden print:grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-gray-300 text-xs text-center font-bold">
          <div>
            <p>مشرف الصالة (الطالب)</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>أمين مخزن الخامات (الصارف)</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>مراقبة الجودة والتكاليف</p>
            <div className="mt-8">......................................</div>
          </div>
        </div>

      </div>

      {/* مودال 1: طلب صرف خامات جديد */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-base">إنشاء طلب صرف خامات ومستلزمات تشغيل</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">الصالة الطالبة *</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                >
                  <option value="صالة الحلويات الشرقية (البسبوسة والكنافة)">صالة الحلويات الشرقية (البسبوسة والكنافة)</option>
                  <option value="صالة المعجنات والمخبوزات الآلية">صالة المعجنات والمخبوزات الآلية</option>
                  <option value="صالة الحلويات الغربية والجاتوه">صالة الحلويات الغربية والجاتوه</option>
                  <option value="صالة التعبئة والتغليف الفاخر">صالة التعبئة والتغليف الفاخر</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">أولوية الصرف</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                >
                  <option value="NORMAL">عادي</option>
                  <option value="URGENT">عاجل (أمر تشغيل متوقف)</option>
                  <option value="EMERGENCY">طارئ جداً</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">الخامات المطلوبة</label>
                <div className="space-y-2 p-3 bg-purple-500/5 rounded-xl border">
                  {newLines.map((l, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="font-bold w-48 truncate">{l.itemName}</span>
                      <input
                        type="number"
                        min={1}
                        value={l.requestedQuantity}
                        onChange={(e) => {
                          const updated = [...newLines];
                          updated[idx].requestedQuantity = Number(e.target.value);
                          setNewLines(updated);
                        }}
                        className="w-24 p-1.5 rounded-lg border erp-sub font-mono font-bold text-center"
                      />
                      <span>{l.unit}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">ملاحظات الطلب</label>
                <textarea
                  rows={2}
                  placeholder="سبب الصرف ورقم أمر التشغيل المرتبط..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>إرسال الطلب للمستودع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال 2: صرف المستودع وتخصيص اللوطات FEFO */}
      {showDispatchModal && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-base">صرف خامات الإذن: [{selectedReq.requisitionNumber}]</h3>
              </div>
              <button onClick={() => setShowDispatchModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-3 text-xs">
              <div className="p-3 bg-blue-500/10 rounded-xl space-y-1">
                <div className="font-bold">الصالة الطالبة: {selectedReq.department}</div>
                <div>تخصيص اللوطات والتشغيلات بنظام FEFO (الأقرب انتهاءً أولاً):</div>
              </div>

              <div className="space-y-3">
                {selectedReq.lines.map((line) => (
                  <div key={line.id} className="p-3 border rounded-xl erp-sub space-y-2">
                    <div className="flex justify-between font-bold">
                      <span>{line.itemName}</span>
                      <span className="font-mono text-blue-600">المطلوب: {line.requestedQuantity} {line.unit}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block">الكمية المصروفة:</label>
                        <input
                          type="number"
                          value={dispatchLots[line.id]?.quantity || line.requestedQuantity}
                          onChange={(e) => {
                            const updated = { ...dispatchLots };
                            updated[line.id].quantity = Number(e.target.value);
                            setDispatchLots(updated);
                          }}
                          className="w-full p-1.5 rounded-lg border erp-card font-mono text-center font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block">رقم التشغيلة (Batch):</label>
                        <input
                          type="text"
                          value={dispatchLots[line.id]?.batchNumber || ''}
                          onChange={(e) => {
                            const updated = { ...dispatchLots };
                            updated[line.id].batchNumber = e.target.value;
                            setDispatchLots(updated);
                          }}
                          className="w-full p-1.5 rounded-lg border erp-card font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block">تاريخ الانتهاء:</label>
                        <input
                          type="date"
                          value={dispatchLots[line.id]?.expiryDate || '2027-06-30'}
                          onChange={(e) => {
                            const updated = { ...dispatchLots };
                            updated[line.id].expiryDate = e.target.value;
                            setDispatchLots(updated);
                          }}
                          className="w-full p-1.5 rounded-lg border erp-card text-center"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                  <span>تأكيد الصرف وخروج الشحنة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال 3: استلام الصالة والمطابقة المزدوجة صنفاً بصنف */}
      {showReceiveModal && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base">استلام وفحص الصالة: [{selectedReq.requisitionNumber}]</h3>
              </div>
              <button onClick={() => setShowReceiveModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {selectedReq.lines.map((line) => (
                <div key={line.id} className="p-3 border rounded-xl erp-sub space-y-2">
                  <div className="flex justify-between font-bold">
                    <span>{line.itemName}</span>
                    <span className="font-mono text-emerald-600">المصروف: {line.dispatchedQuantity} {line.unit}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-500 block">الكمية المستلمة فعلياً:</label>
                      <input
                        type="number"
                        value={receiveData[line.id]?.qty || line.dispatchedQuantity}
                        onChange={(e) => {
                          const updated = { ...receiveData };
                          updated[line.id].qty = Number(e.target.value);
                          setReceiveData(updated);
                        }}
                        className="w-full p-1.5 rounded-lg border erp-card font-mono text-center font-bold"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => handleConfirmReceiveLine(line.id)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مطابقة واعتماد السطر</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t erp-card pt-3">
              <button
                type="button"
                onClick={() => setShowReceiveModal(false)}
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
