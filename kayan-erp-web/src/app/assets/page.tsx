'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Factory,
  Search,
  PlusCircle,
  ArrowLeftRight,
  History,
  Printer,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Truck,
  Building2,
  Calendar,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  X,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface AssetHistoryLog {
  id: string;
  date: string;
  eventType: string;
  description: string;
  performedByName: string;
  costImpact: string;
}

interface FixedAsset {
  id: string;
  assetCode: string;
  name: string;
  department: string;
  category?: string;
  brandModel?: string;
  serialNumber?: string;
  custodianCode?: string;
  custodianName?: string;
  installationDate: string;
  status: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'SCRAPPED';
  historyLogs?: AssetHistoryLog[];
}

export default function AssetsManagementPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // نوافذ المودال
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  // فورم إضافة أصل جديد
  const [newAssetCode, setNewAssetCode] = useState<string>('');
  const [newAssetName, setNewAssetName] = useState<string>('');
  const [newAssetDept, setNewAssetDept] = useState<string>('صالة الحلويات الشرقية');
  const [newAssetCategory, setNewAssetCategory] = useState<string>('أفران وخطوط خبز');
  const [newAssetBrand, setNewAssetBrand] = useState<string>('');
  const [newAssetSerial, setNewAssetSerial] = useState<string>('');
  const [newAssetCustodian, setNewAssetCustodian] = useState<string>('');
  const [newAssetDate, setNewAssetDate] = useState<string>('2026-10-31');

  // فورم نقل العهدة
  const [transferTargetDept, setTransferTargetDept] = useState<string>('');
  const [transferTargetCustodian, setTransferTargetCustodian] = useState<string>('');
  const [transferReason, setTransferReason] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadAssets();

    if (socket) {
      socket.on('asset_updated', (updated: FixedAsset) => {
        setFeedback({ msg: `تم تحديث الأصل الرأسمالي: [${updated.assetCode}] ${updated.name}`, success: true });
        loadAssets();
      });

      socket.on('asset_deleted', () => {
        loadAssets();
      });

      return () => {
        socket.off('asset_updated');
        socket.off('asset_deleted');
      };
    }
  }, [socket]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/assets');
      if (res.data?.success && res.data.data) {
        setAssets(res.data.data);
      } else {
        setAssets([]);
      }
    } catch (err) {
      console.warn('Failed to fetch fixed assets from database:', err);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // الإحصائيات العلوية
  const kpis = useMemo(() => {
    const total = assets.length;
    const operational = assets.filter((a) => a.status === 'OPERATIONAL').length;
    const maintenance = assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length;
    const scrapped = assets.filter((a) => a.status === 'SCRAPPED').length;
    return { total, operational, maintenance, scrapped };
  }, [assets]);

  // التصفية
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchesDept = selectedDept === 'ALL' || a.department === selectedDept;
      const matchesStatus = selectedStatus === 'ALL' || a.status === selectedStatus;
      const s = searchTerm.toLowerCase().trim();
      const matchesSearch =
        s === '' ||
        a.assetCode.toLowerCase().includes(s) ||
        a.name.toLowerCase().includes(s) ||
        (a.custodianName && a.custodianName.toLowerCase().includes(s)) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(s));
      return matchesDept && matchesStatus && matchesSearch;
    });
  }, [assets, selectedDept, selectedStatus, searchTerm]);

  // قيد أصل جديد
  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await axios.post('http://localhost:3000/assets', {
        assetCode: newAssetCode.trim(),
        name: newAssetName.trim(),
        department: newAssetDept,
        category: newAssetCategory,
        brandModel: newAssetBrand.trim(),
        serialNumber: newAssetSerial.trim(),
        custodianName: newAssetCustodian.trim(),
        installationDate: newAssetDate,
      });

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setShowAddModal(false);
        // تصفير الحقول
        setNewAssetCode('');
        setNewAssetName('');
        setNewAssetBrand('');
        setNewAssetSerial('');
        setNewAssetCustodian('');
        loadAssets();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر قيد الأصل الرأسمالي', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح نافذة نقل العهدة
  const openTransferModal = (asset: FixedAsset) => {
    setSelectedAsset(asset);
    setTransferTargetDept(asset.department);
    setTransferTargetCustodian(asset.custodianName || '');
    setTransferReason('');
    setShowTransferModal(true);
  };

  // تأكيد نقل العهدة
  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      const res = await axios.put(`http://localhost:3000/assets/${selectedAsset.id}`, {
        department: transferTargetDept,
        custodianName: transferTargetCustodian,
      });

      if (res.data?.success) {
        setFeedback({ msg: `تم نقل عهدة الماكينة [${selectedAsset.assetCode}] بنجاح`, success: true });
        setShowTransferModal(false);
        loadAssets();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر نقل عهدة الماكينة', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // فتح سجل العمليات
  const openHistoryModal = (asset: FixedAsset) => {
    setSelectedAsset(asset);
    setShowHistoryModal(true);
  };

  // تغيير الحالة التشغيلية مباشرة
  const handleChangeStatus = async (asset: FixedAsset, nextStatus: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'SCRAPPED') => {
    try {
      const res = await axios.put(`http://localhost:3000/assets/${asset.id}`, {
        status: nextStatus,
      });
      if (res.data?.success) {
        setFeedback({ msg: `تم تغيير الحالة التشغيلية لـ [${asset.assetCode}] إلى [${nextStatus}]`, success: true });
        loadAssets();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تغيير الحالة', success: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 transition-colors duration-200" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* الترويسة العليا */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-200 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer">
                <ArrowRight className="w-5 h-5 text-indigo-600" />
              </Link>
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                <Factory className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black">حوكمة الأصول الرأسمالية والماكينات</h1>
                <p className="text-xs erp-muted">
                  مصانع وحلواني أبو عادل | إدارة خطوط الإنتاج، أفران الخبز، أسطول النقل المبرد ونقل العهدة
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>قيد ماكينة / أصل جديد</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف العهدة A4</span>
            </button>

            <button
              onClick={loadAssets}
              disabled={loading}
              className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
              title="تحديث البيانات"
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
          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-indigo-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">إجمالي الماكينات والأصول</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono">{kpis.total}</span>
              <span className="text-[11px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md">أصل مثبت</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-emerald-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">تعمل بكفاءة تشغيلية</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-emerald-600">{kpis.operational}</span>
              <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">جاهزة 100%</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-amber-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">قيد الصيانة والعمرة</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-amber-500">{kpis.maintenance}</span>
              <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">تحت الإصلاح</span>
            </div>
          </div>

          <div className="erp-card p-4 rounded-2xl shadow-sm border border-l-4 border-l-rose-500 flex flex-col justify-between">
            <span className="text-xs erp-muted font-bold">خارج الخدمة / كهنة</span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-black font-mono text-rose-500">{kpis.scrapped}</span>
              <span className="text-[11px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">مستبعد</span>
            </div>
          </div>
        </div>

        {/* شريط الفلاتر والبحث */}
        <div className="erp-card p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-3 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* فلتر الأقسام */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="p-2 rounded-xl border erp-sub outline-none font-bold"
            >
              <option value="ALL">كافة الصالات والمواقع</option>
              <option value="صالة الحلويات الشرقية">صالة الحلويات الشرقية</option>
              <option value="صالة المعجنات والمخبوزات">صالة المعجنات والمخبوزات</option>
              <option value="صالة الحلويات الغربية والجاتوه">صالة الحلويات الغربية والجاتوه</option>
              <option value="صالة التعبئة والتغليف">صالة التعبئة والتغليف</option>
              <option value="أسطول النقل والشحن المبرد">أسطول النقل والشحن المبرد</option>
              <option value="مخزن بضاعة تامة وحلويات جاهزة">مخزن بضاعة تامة</option>
            </select>

            {/* فلتر الحالة */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-2 rounded-xl border erp-sub outline-none font-bold"
            >
              <option value="ALL">كافة الحالات التشغيلية</option>
              <option value="OPERATIONAL">تعمل بكفاءة (Operational)</option>
              <option value="UNDER_MAINTENANCE">قيد الصيانة (Maintenance)</option>
              <option value="SCRAPPED">خارج الخدمة (Scrapped)</option>
            </select>
          </div>

          {/* مربع البحث */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
            <input
              type="text"
              placeholder="بحث بالكود، الاسم، أمين العهدة أو السيريال..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border erp-sub outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>
        </div>

        {/* ترويسة الطباعة الرسمية A4 */}
        <div className="hidden print:block border-b-2 border-black pb-3 mb-4 text-center">
          <h2 className="text-xl font-black">مصانع وحلواني أبو عادل</h2>
          <p className="text-xs text-gray-700">الإدارة الهندسية وحوكمة الأصول الرأسمالية والماكينات</p>
          <div className="flex justify-between items-center text-xs mt-2 px-4 font-bold">
            <span>تقرير حصر العهدة الميدانية للأصول الثابتة</span>
            <span>تاريخ الطباعة: {displayDate}</span>
          </div>
        </div>

        {/* جدول الأصول والماكينات */}
        <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="erp-sub border-b text-[11px]">
                <tr>
                  <th className="p-3.5 font-bold">كود الأصل</th>
                  <th className="p-3.5 font-bold">اسم الماكينة والموديل</th>
                  <th className="p-3.5 font-bold">الموقع / الصالة</th>
                  <th className="p-3.5 font-bold">أمين العهدة المسؤول</th>
                  <th className="p-3.5 font-bold font-mono">الرقم التسلسلي</th>
                  <th className="p-3.5 font-bold">تاريخ التثبيت</th>
                  <th className="p-3.5 font-bold text-center">الحالة التشغيلية</th>
                  <th className="p-3.5 font-bold text-center print:hidden">إجراءات الحوكمة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center erp-muted">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري تحميل سجل الأصول الرأسمالية...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center erp-muted">
                      لا توجد أصول أو ماكينات مطابقة لمعايير البحث الحالية.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-gray-500/5 transition">
                      <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {asset.assetCode}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold">{asset.name}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          {asset.brandModel || asset.category || '-'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-lg bg-gray-500/10 font-medium">
                          {asset.department}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-gray-800 dark:text-gray-200">
                        {asset.custodianName || 'غير محدد'}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-gray-500">
                        {asset.serialNumber || '-'}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-gray-500">
                        {asset.installationDate}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            asset.status === 'OPERATIONAL'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : asset.status === 'UNDER_MAINTENANCE'
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}
                        >
                          {asset.status === 'OPERATIONAL'
                            ? 'تعمل بكفاءة'
                            : asset.status === 'UNDER_MAINTENANCE'
                            ? 'تحت الصيانة'
                            : 'كهنة / مستبعد'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center print:hidden">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openTransferModal(asset)}
                            title="نقل عهدة الأصل لموقع أو مسؤول آخر"
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 cursor-pointer transition"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => openHistoryModal(asset)}
                            title="عرض سجل تاريخ الأصل والصيانة"
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 cursor-pointer transition"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {asset.status === 'OPERATIONAL' ? (
                            <button
                              onClick={() => handleChangeStatus(asset, 'UNDER_MAINTENANCE')}
                              title="تحويل الماكينة للصيانة"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 cursor-pointer transition"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleChangeStatus(asset, 'OPERATIONAL')}
                              title="اعتماد اكتمال الصيانة وتشغيل الماكينة"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 cursor-pointer transition"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* توقيعات محضر الجرد عند الطباعة الرسمية */}
        <div className="hidden print:grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-gray-300 text-xs text-center font-bold">
          <div>
            <p>أمين العهدة ومسؤول الموقع</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>مدير الصيانة الهندسية</p>
            <div className="mt-8">......................................</div>
          </div>
          <div>
            <p>المشرف العام لمصانع أبو عادل</p>
            <div className="mt-8">......................................</div>
          </div>
        </div>

      </div>

      {/* مودال 1: قيد أصل / ماكينة جديدة */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">قيد ماكينة أو أصل رأسمالي جديد</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">كود الأصل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: AST-1007"
                    value={newAssetCode}
                    onChange={(e) => setNewAssetCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">اسم الماكينة / المعدة *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ماكينة لف وتشكيل المعمول"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">الصالة / القسم *</label>
                  <select
                    value={newAssetDept}
                    onChange={(e) => setNewAssetDept(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  >
                    <option value="صالة الحلويات الشرقية">صالة الحلويات الشرقية</option>
                    <option value="صالة المعجنات والمخبوزات">صالة المعجنات والمخبوزات</option>
                    <option value="صالة الحلويات الغربية والجاتوه">صالة الحلويات الغربية والجاتوه</option>
                    <option value="صالة التعبئة والتغليف">صالة التعبئة والتغليف</option>
                    <option value="أسطول النقل والشحن المبرد">أسطول النقل والشحن المبرد</option>
                    <option value="مخزن بضاعة تامة وحلويات جاهزة">مخزن بضاعة تامة وحلويات جاهزة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">التصنيف الفني</label>
                  <input
                    type="text"
                    placeholder="أفران، عجانات، خطوط تغليف..."
                    value={newAssetCategory}
                    onChange={(e) => setNewAssetCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">الشركة المصنعة والموديل</label>
                  <input
                    type="text"
                    placeholder="مثال: Polin Italy 2025"
                    value={newAssetBrand}
                    onChange={(e) => setNewAssetBrand(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">الرقم التسلسلي (Serial Number)</label>
                  <input
                    type="text"
                    placeholder="رقم الشاسيه أو السيريال"
                    value={newAssetSerial}
                    onChange={(e) => setNewAssetSerial(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">أمين العهدة المسؤول</label>
                  <input
                    type="text"
                    placeholder="اسم المشرف المستلم للعهدة"
                    value={newAssetCustodian}
                    onChange={(e) => setNewAssetCustodian(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">تاريخ الشراء والتثبيت</label>
                  <input
                    type="date"
                    value={newAssetDate}
                    onChange={(e) => setNewAssetDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t erp-card pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  <span>حفظ الأصل وقيد العهدة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال 2: نقل عهدة الماكينة الرأسمالية */}
      {showTransferModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base">نقل عهدة ماكينة / أصل رأسمالي</h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs space-y-1">
              <div className="font-bold">الأصل: [{selectedAsset.assetCode}] {selectedAsset.name}</div>
              <div>الموقع الحالي: {selectedAsset.department} | بعهدة: {selectedAsset.custodianName}</div>
            </div>

            <form onSubmit={handleConfirmTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">الموقع أو الصالة الجديدة *</label>
                <select
                  value={transferTargetDept}
                  onChange={(e) => setTransferTargetDept(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                >
                  <option value="صالة الحلويات الشرقية">صالة الحلويات الشرقية</option>
                  <option value="صالة المعجنات والمخبوزات">صالة المعجنات والمخبوزات</option>
                  <option value="صالة الحلويات الغربية والجاتوه">صالة الحلويات الغربية والجاتوه</option>
                  <option value="صالة التعبئة والتغليف">صالة التعبئة والتغليف</option>
                  <option value="أسطول النقل والشحن المبرد">أسطول النقل والشحن المبرد</option>
                  <option value="مخزن بضاعة تامة وحلويات جاهزة">مخزن بضاعة تامة وحلويات جاهزة</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">أمين العهدة الجديد المستلم *</label>
                <input
                  type="text"
                  required
                  placeholder="اسم المشرف أو السائق المستلم..."
                  value={transferTargetCustodian}
                  onChange={(e) => setTransferTargetCustodian(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">سبب ومبرر نقل العهدة</label>
                <textarea
                  rows={2}
                  placeholder="مثال: زيادة ضغط الطلبيات على صالة المعجنات وتوسعة خط الإنتاج..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                  <span>تأكيد نقل العهدة والموقع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال 3: سجل العمليات والصيانة التاريخي */}
      {showHistoryModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">سجل وتاريخ الأصل: [{selectedAsset.assetCode}]</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-xl text-xs space-y-1">
              <div className="font-bold text-amber-700 dark:text-amber-400">{selectedAsset.name}</div>
              <div className="text-gray-600 dark:text-gray-300">
                الموقع الحالي: {selectedAsset.department} | أمين العهدة: {selectedAsset.custodianName}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-xs text-gray-700 dark:text-gray-300">محاضر الحركة والصيانة المثبتة:</h4>
              {(!selectedAsset.historyLogs || selectedAsset.historyLogs.length === 0) ? (
                <p className="text-center p-6 erp-muted text-xs">لا توجد حركات مسجلة بعد لهذا الأصل.</p>
              ) : (
                <div className="relative border-r-2 border-amber-500/30 pr-4 space-y-4 text-xs">
                  {selectedAsset.historyLogs.map((log) => (
                    <div key={log.id} className="relative space-y-1">
                      <span className="absolute -right-[23px] top-1 w-3 h-3 rounded-full bg-amber-500"></span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-600 dark:text-amber-400">{log.eventType}</span>
                        <span className="font-mono text-[11px] text-gray-500">{log.date}</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200">{log.description}</p>
                      <div className="text-[10px] text-gray-500 flex items-center gap-3">
                        <span>المنفذ: {log.performedByName}</span>
                        <span>الأثر المالي: {log.costImpact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end border-t erp-card pt-3">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
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
