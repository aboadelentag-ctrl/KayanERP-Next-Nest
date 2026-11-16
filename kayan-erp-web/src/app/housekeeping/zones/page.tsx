'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import HousekeepingHeader from '../components/HousekeepingHeader';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Printer,
  CheckSquare,
  Clock,
  Sparkles,
  RefreshCw,
  Building,
  Truck,
  Trash2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HousekeepingZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [envFilter, setEnvFilter] = useState('ALL');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [zoneCode, setZoneCode] = useState('');
  const [name, setName] = useState('');
  const [environmentType, setEnvironmentType] = useState('PRODUCTION_SSOP');
  const [frequencyType, setFrequencyType] = useState('DAILY');
  const [checklistItems, setChecklistItems] = useState<{ id: number; text: string; required: boolean }[]>([
    { id: 1, text: 'تطهير أسطح الاستانلس والمعدات بمطهر معتمد', required: true },
    { id: 2, text: 'كنس وغسيل الأرضية وتجفيفها تماماً', required: true },
  ]);
  const [newItemText, setNewItemText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // QR Modal State
  const [selectedZoneQr, setSelectedZoneQr] = useState<any | null>(null);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/housekeeping/zones`);
      setZones(res.data.data || []);
    } catch (err: any) {
      console.error('Error fetching zones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleOpenAddModal = () => {
    setZoneCode(`ZN-${String(zones.length + 1).padStart(3, '0')}`);
    setName('');
    setEnvironmentType('PRODUCTION_SSOP');
    setFrequencyType('DAILY');
    setChecklistItems([
      { id: 1, text: 'تطهير أسطح الاستانلس والمعدات بمطهر معتمد', required: true },
      { id: 2, text: 'كنس وغسيل الأرضية وتجفيفها تماماً', required: true },
    ]);
    setNewItemText('');
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleAddChecklistItem = () => {
    if (!newItemText.trim()) return;
    setChecklistItems((prev) => [
      ...prev,
      { id: prev.length + 1, text: newItemText.trim(), required: true },
    ]);
    setNewItemText('');
  };

  const handleRemoveChecklistItem = (id: number) => {
    setChecklistItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveZone = async () => {
    if (!zoneCode.trim() || !name.trim()) {
      setErrorMsg('يرجى إدخال كود المنطقة واسمها');
      return;
    }
    if (checklistItems.length === 0) {
      setErrorMsg('يجب إضافة بند واحد على الأقل في قائمة فحص النظافة');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await axios.post(`${API_BASE}/housekeeping/zones`, {
        zoneCode,
        name,
        environmentType,
        frequencyType,
        checklistItemsJson: checklistItems,
      });

      setShowModal(false);
      fetchZones();
    } catch (err: any) {
      console.error('Save zone error:', err);
      setErrorMsg(err.response?.data?.message || 'فشل حفظ المنطقة');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredZones = zones.filter((z) => {
    const matchesEnv = envFilter === 'ALL' || z.environment_type === envFilter;
    const matchesSearch =
      !search.trim() ||
      z.zone_code.toLowerCase().includes(search.toLowerCase()) ||
      z.name.includes(search);
    return matchesEnv && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-12">
      <HousekeepingHeader
        title="خريطة مناطق النظافة وبروتوكولات الـ SSOP"
        subtitle="تحديد نقاط التفتيش، دوريات التطهير، بناء قوائم الفحص الديناميكية، وطباعة بطاقات الـ QR الميدانية"
        entityName="zones"
        exportData={filteredZones}
        exportFileName="خريطة_مناطق_النظافة"
        onImportSuccess={fetchZones}
        primaryAction={{
          label: 'إضافة منطقة تفتيش جديدة',
          onClick: handleOpenAddModal,
          icon: Plus,
        }}
      />

      <div className="p-3 max-w-7xl mx-auto w-full space-y-4">
        {/* شريط الفلاتر والبحث */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> تصفية حسب البيئة:
            </span>
            <select
              value={envFilter}
              onChange={(e) => setEnvFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="ALL">كافة البيئات</option>
              <option value="PRODUCTION_SSOP">صالات الإنتاج والمصانع (SSOP)</option>
              <option value="RETAIL_SHOWROOM">معارض وفروع الحلواني</option>
              <option value="WAREHOUSE">المستودعات وثلاجات التجميد</option>
              <option value="FLEET_VEHICLE">شاحنات وسيارات التوزيع</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بكود أو اسم المنطقة..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
          </div>
        </div>

        {/* شبكة كروت المناطق */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-400" />
            جاري تحميل خريطة المناطق...
          </div>
        ) : filteredZones.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
            لا توجد مناطق تطابق معايير البحث
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredZones.map((z) => {
              const checklist = Array.isArray(z.checklist_items_json) ? z.checklist_items_json : [];
              const lastTask = z.sanitation_task_logs?.[0];

              return (
                <div
                  key={z.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between shadow-lg space-y-3 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800/60">
                        {z.zone_code}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {z.frequency_type === 'EVERY_2_HOURS'
                          ? 'كل ساعتين'
                          : z.frequency_type === 'DAILY'
                          ? 'يومي'
                          : z.frequency_type === 'WEEKLY'
                          ? 'أسبوعي'
                          : 'عند الطلب'}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5 mb-1">
                      <MapPin className="w-4 h-4 text-teal-400 shrink-0" />
                      <span>{z.name}</span>
                    </h3>

                    <span className="text-[11px] text-slate-400 block mb-3">
                      البيئة: <strong className="text-slate-300">{z.environment_type}</strong>
                    </span>

                    {/* بنود قائمة الفحص */}
                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                      <span className="font-semibold text-slate-300 block mb-1 text-[11px]">
                        بنود قائمة فحص النظافة والتطهير ({checklist.length}):
                      </span>
                      {checklist.slice(0, 3).map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                          <CheckSquare className="w-3 h-3 text-teal-400 shrink-0" />
                          <span className="truncate">{item.text}</span>
                        </div>
                      ))}
                      {checklist.length > 3 && (
                        <span className="text-[10px] text-teal-400 font-bold block mt-1">
                          + {checklist.length - 3} بنود أخرى
                        </span>
                      )}
                    </div>
                  </div>

                  {/* الجزء السفلي: آخر عملية تطهير وأزرار الإجراءات */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      {lastTask ? (
                        <span className="text-[10px] text-slate-400 block">
                          آخر تطهير: <strong className="text-slate-200">{lastTask.worker_name_snapshot}</strong> ({Number(lastTask.compliance_score || 100)}%)
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">لم تسجل مهام بعد</span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedZoneQr(z)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 font-bold text-[11px] transition-colors"
                      title="عرض وطباعة كود QR للمنطقة"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>بطاقة QR</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* مودال إنشاء منطقة جديدة */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-sm font-bold text-teal-400 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>إضافة منطقة تفتيش ونظافة جديدة (SSOP Zone)</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-100 font-bold"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-2 rounded bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">كود المنطقة:</label>
                  <input
                    type="text"
                    value={zoneCode}
                    onChange={(e) => setZoneCode(e.target.value)}
                    placeholder="مثال: ZN-PROD-PACK"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">دورية التنظيف والتفتيش:</label>
                  <select
                    value={frequencyType}
                    onChange={(e) => setFrequencyType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                  >
                    <option value="EVERY_2_HOURS">كل ساعتين (دورات مياه / صالات حساسة)</option>
                    <option value="DAILY">يومي (روتين إغلاق وتشغيل الصالة)</option>
                    <option value="WEEKLY">أسبوعي (نظافة عميقة وجدران وأسقف)</option>
                    <option value="MONTHLY">شهري (صيانة تطهير شاملة)</option>
                    <option value="ON_DEMAND">عند الطلب أو بعد الصيانة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اسم المنطقة / الصالة:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: قسم التعبئة والتغليف النهائي - خط التورت"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-semibold">نوع البيئة والتصنيف:</label>
                <select
                  value={environmentType}
                  onChange={(e) => setEnvironmentType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                >
                  <option value="PRODUCTION_SSOP">صالة إنتاج غذائي وتصنيع (SSOP Food-Contact)</option>
                  <option value="RETAIL_SHOWROOM">معرض وصالة بيع واستقبال عملاء</option>
                  <option value="WAREHOUSE">مستودع تخزين خامات أو ثلاجة تجميد</option>
                  <option value="FLEET_VEHICLE">شاحنة أو سيارة نقل مبردة</option>
                </select>
              </div>

              {/* منشئ بنود قائمة الفحص */}
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">
                  بنود قائمة فحص النظافة والتطهير (Checklist):
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="اكتب بند فحص جديد (مثال: تطهير شفرات التقطيع)..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold"
                  >
                    إضافة
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-950 p-2 rounded-lg border border-slate-800">
                  {checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 text-[11px]"
                    >
                      <span className="text-slate-200">{item.text}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveChecklistItem(item.id)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveZone}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>حفظ المنطقة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال بطاقة QR Code للمنطقة */}
      {selectedZoneQr && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-sm w-full p-4 space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-teal-400">بطاقة التفتيش الميداني (QR Sticker)</span>
              <button
                onClick={() => setSelectedZoneQr(null)}
                className="text-slate-400 hover:text-slate-100 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-xl inline-block shadow-inner mx-auto">
              {/* محاكاة بطاقة QR عالية الدقة */}
              <div className="w-40 h-40 bg-slate-900 rounded-lg p-2 flex flex-col items-center justify-center text-white relative">
                <QrCode className="w-32 h-32 text-teal-400" />
                <span className="text-[10px] font-mono text-teal-200 mt-1 font-bold">
                  {selectedZoneQr.zone_code}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-100">{selectedZoneQr.name}</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                البيئة: {selectedZoneQr.environment_type} | دورية التطهير: {selectedZoneQr.frequency_type}
              </p>
              <span className="text-[10px] text-teal-400 block mt-2">
                * يتم إلصاق هذا الباركود بمدخل الصالة/الماكينة لمسحه مباشرة بجوال المشرف
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة بطاقة التفتيش</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
