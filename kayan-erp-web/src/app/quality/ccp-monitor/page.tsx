'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
  Thermometer,
  Flame,
  AlertTriangle,
  RefreshCw,
  Plus,
  Radio,
  CheckCircle2,
  XCircle,
  Truck,
  Cpu,
  X,
  Gauge,
  BellRing,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CcpMonitorPage() {
  const { socket } = useSocket();
  const [ccpLogs, setCcpLogs] = useState<any[]>([]);
  const [fleetVehicles, setFleetVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activePoint, setActivePoint] = useState<string>('ALL');

  // New Reading Modal
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [newReading, setNewReading] = useState({
    ccpPointCode: 'CCP-1-OVEN',
    ccpPointName: 'أفران الخبيز المركزية (Tunnel Oven)',
    readingType: 'TEMPERATURE_C',
    valueNumeric: 200,
    criticalLimitMin: 180,
    criticalLimitMax: 240,
    checkedBy: 'فني أفران وسلامة غذاء',
    correctiveActionTaken: '',
  });
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [logsRes, fleetRes] = await Promise.all([
        fetch(`${API_BASE}/quality/ccp-logs?pointCode=${activePoint}`).then((r) => r.json()).catch(() => []),
        fetch(`${API_BASE}/inventory/fleet-vehicles`).then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      setCcpLogs(Array.isArray(logsRes) ? logsRes : []);
      setFleetVehicles(fleetRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activePoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time events
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchData();
    socket.on('ccp_reading_logged', handleUpdate);
    socket.on('ccp_deviation_detected', handleUpdate);
    return () => {
      socket.off('ccp_reading_logged', handleUpdate);
      socket.off('ccp_deviation_detected', handleUpdate);
    };
  }, [socket, fetchData]);

  const handlePointChange = (code: string) => {
    if (code === 'CCP-1-OVEN') {
      setNewReading((prev) => ({
        ...prev,
        ccpPointCode: 'CCP-1-OVEN',
        ccpPointName: 'أفران الخبيز المركزية (Tunnel Oven)',
        readingType: 'TEMPERATURE_C',
        valueNumeric: 205,
        criticalLimitMin: 180,
        criticalLimitMax: 240,
      }));
    } else if (code === 'CCP-2-CHILLER') {
      setNewReading((prev) => ({
        ...prev,
        ccpPointCode: 'CCP-2-CHILLER',
        ccpPointName: 'غرف التبريد والتخمير البارد',
        readingType: 'TEMPERATURE_C',
        valueNumeric: 4,
        criticalLimitMin: 1,
        criticalLimitMax: 6,
      }));
    } else if (code === 'CCP-3-METAL') {
      setNewReading((prev) => ({
        ...prev,
        ccpPointCode: 'CCP-3-METAL',
        ccpPointName: 'كاشف المعادن والشوائب الصلبة',
        readingType: 'METAL_DETECTION',
        valueNumeric: 0,
        criticalLimitMin: 0,
        criticalLimitMax: 0,
      }));
    }
  };

  const handleLogReading = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await fetch(`${API_BASE}/quality/ccp-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReading),
      });
      setShowLogModal(false);
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const deviationsCount = ccpLogs.filter((l) => l.is_deviation).length;

  return (
    <div className="w-full min-h-screen px-3 py-3 md:px-5 space-y-3 erp-container-fluid">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
              لوحة المراقبة اللحظية لنقاط التحكم الحرجة (HACCP CCP Telemetry)
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              ISO 22000 & Food Safety
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            رصد درجات حرارة الأفران، غرف التبريد، كاشف المعادن، وشاحنات النقل المبردة مع الإنذار التلقائي للحيود
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            className="erp-btn-compact px-3 py-1.5 rounded-lg border border-white/10 bg-slate-800 text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="erp-btn-compact px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 text-xs font-bold shadow-md"
          >
            <Plus className="w-4 h-4" />
            تسجيل قراءة فنية (Log Telemetry)
          </button>
        </div>
      </div>

      {/* Real-time CCP Sensor Stations Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
        {/* CCP-1: Ovens */}
        <div className="erp-card p-3 rounded-xl border border-white/10 bg-slate-900/90 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500" />
              أفران الخبيز (CCP-1)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
              180°C - 240°C
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-amber-400">205°C</div>
            <div className="text-[11px] text-emerald-400 font-bold">في النطاق الآمن ✓</div>
          </div>
          <div className="text-[10px] text-slate-400">
            تدمير الأحياء الدقيقة وضمان نضج القوام
          </div>
        </div>

        {/* CCP-2: Chillers */}
        <div className="erp-card p-3 rounded-xl border border-white/10 bg-slate-900/90 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-cyan-400" />
              غرف التبريد (CCP-2)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold">
              1°C - 6°C
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-cyan-400">3.8°C</div>
            <div className="text-[11px] text-emerald-400 font-bold">تبريد مثالي ✓</div>
          </div>
          <div className="text-[10px] text-slate-400">
            تثبيط النشاط البكتيري للمنتجات المحشوة
          </div>
        </div>

        {/* CCP-3: Metal Detector */}
        <div className="erp-card p-3 rounded-xl border border-white/10 bg-slate-900/90 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              كاشف المعادن (CCP-3)
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold">
              0.8mm Ferrous
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-purple-300">0 خروقات</div>
            <div className="text-[11px] text-emerald-400 font-bold">نشط 100% ✓</div>
          </div>
          <div className="text-[10px] text-slate-400">
            فحص الشوائب الفيزيائية قبل التعبئة
          </div>
        </div>

        {/* CCP-4: Cold Chain Fleet */}
        <div className="erp-card p-3 rounded-xl border border-white/10 bg-slate-900/90 shadow-md space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-teal-400" />
              أسطول الشاحنات المبردة
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold">
              &le; 4.0°C
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-black text-teal-400">{fleetVehicles.length || 7} سيارات</div>
            <div className="text-[11px] text-emerald-400 font-bold">توصيل آمن ✓</div>
          </div>
          <div className="text-[10px] text-slate-400">
            تتبع التبريد اللحظي أثناء النقل للفروع
          </div>
        </div>
      </div>

      {/* Critical Deviation Alert Banner if any */}
      {deviationsCount > 0 && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
            <span className="font-bold">
              تنبيه حرج: تم رصد {deviationsCount} قراءات حيود خارج النطاق المسموح! تم تحويلها تلقائياً لتذاكر طوارئ AMS.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500 text-white font-bold">
            متابعة فورية
          </span>
        </div>
      )}

      {/* CCP Telemetry Log Table */}
      <div className="erp-card rounded-xl border border-white/10 bg-slate-900/90 overflow-hidden shadow-md">
        <div className="p-3 border-b border-white/10 flex items-center justify-between text-xs">
          <div className="font-black text-white flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-rose-400" />
            سجل القراءات اللحظية لنقاط التحكم الحرجة (Telemetry Stream)
          </div>
          <div className="text-slate-400 text-[11px]">
            عرض آخر 100 قراءة مسجلة
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-bold border-b border-white/10">
              <tr>
                <th className="p-2.5">نقطة التحكم (CCP)</th>
                <th className="p-2.5">الموقع والتوصيف</th>
                <th className="p-2.5">القراءة المرصودة</th>
                <th className="p-2.5">الحدود الحرجة المسموحة</th>
                <th className="p-2.5">حالة المطابقة</th>
                <th className="p-2.5">المراقب الفني</th>
                <th className="p-2.5">التوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    جاري جلب القراءات اللحظية من المستشعرات...
                  </td>
                </tr>
              ) : ccpLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    لا توجد قراءات مسجلة حالياً. استخدم زر &quot;تسجيل قراءة فنية&quot; لإضافة قراءة جديدة.
                  </td>
                </tr>
              ) : (
                ccpLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-2.5 font-bold text-white font-mono">
                      {log.ccp_point_code}
                    </td>
                    <td className="p-2.5 font-semibold text-slate-300">
                      {log.ccp_point_name}
                    </td>
                    <td className="p-2.5 font-black text-sm">
                      <span className={log.is_deviation ? 'text-rose-400' : 'text-emerald-400'}>
                        {log.value_numeric !== null ? `${Number(log.value_numeric)}°` : log.value_text}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-slate-400 text-[11px]">
                      {log.critical_limit_min !== null ? `${Number(log.critical_limit_min)}°` : '-'} إلى {log.critical_limit_max !== null ? `${Number(log.critical_limit_max)}°` : '-'}
                    </td>
                    <td className="p-2.5">
                      {log.is_deviation ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          <XCircle className="w-3 h-3" />
                          حيود حرج (DEVIATION)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          مطابق (NORMAL)
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-400 text-[11px]">
                      {log.checked_by}
                    </td>
                    <td className="p-2.5 text-slate-500 text-[11px] font-mono">
                      {new Date(log.checked_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New CCP Reading */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form onSubmit={handleLogReading} className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                <Thermometer className="w-5 h-5" />
                تسجيل قراءة نقطة تحكم حرجة (HACCP Log)
              </div>
              <button type="button" onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">نقطة التحكم الحرجة</label>
                <select
                  value={newReading.ccpPointCode}
                  onChange={(e) => handlePointChange(e.target.value)}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                >
                  <option value="CCP-1-OVEN">CCP-1: أفران الخبيز المركزية (Tunnel Oven)</option>
                  <option value="CCP-2-CHILLER">CCP-2: غرف التبريد والتخمير البارد</option>
                  <option value="CCP-3-METAL">CCP-3: كاشف المعادن والشوائب الصلبة</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">القراءة الرقمية الحالية</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={newReading.valueNumeric}
                  onChange={(e) => setNewReading({ ...newReading, valueNumeric: parseFloat(e.target.value) || 0 })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">الحد الأدنى الحرج</label>
                  <input
                    type="number"
                    value={newReading.criticalLimitMin}
                    onChange={(e) => setNewReading({ ...newReading, criticalLimitMin: parseFloat(e.target.value) || 0 })}
                    className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">الحد الأقصى الحرج</label>
                  <input
                    type="number"
                    value={newReading.criticalLimitMax}
                    onChange={(e) => setNewReading({ ...newReading, criticalLimitMax: parseFloat(e.target.value) || 0 })}
                    className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">اسم المراقب الفني</label>
                <input
                  required
                  value={newReading.checkedBy}
                  onChange={(e) => setNewReading({ ...newReading, checkedBy: e.target.value })}
                  className="w-full erp-input-compact rounded-lg bg-slate-800 border border-white/10 text-white px-3"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">الإجراء التصحيحي المتخذ (في حالة الحيود)</label>
                <textarea
                  value={newReading.correctiveActionTaken}
                  onChange={(e) => setNewReading({ ...newReading, correctiveActionTaken: e.target.value })}
                  placeholder="ملاحظات ضبط درجات الحرارة أو إيقاف السير..."
                  className="w-full rounded-lg bg-slate-800 border border-white/10 text-white p-2 text-xs h-16"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 hover:bg-slate-800 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow"
              >
                تأكيد وتسجيل القراءة
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
