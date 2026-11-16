'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  User,
  CheckCircle2,
  Clock,
  Layers,
  Wrench,
  DollarSign,
} from 'lucide-react';
import EngineeringHeader from '../components/EngineeringHeader';

interface StaffMember {
  id: string;
  name: string;
  phone?: string;
  role: string;
  specialty: string;
  hourly_cost_rate: number;
  is_available: boolean;
  engineering_workshops?: {
    id: string;
    name: string;
    code: string;
  };
}

interface Workshop {
  id: string;
  name: string;
  code: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function EngineeringStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [workshopFilter, setWorkshopFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal: New Staff
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'TECHNICIAN' | 'ENGINEER'>('TECHNICIAN');
  const [newWorkshopId, setNewWorkshopId] = useState('');
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newRate, setNewRate] = useState(75);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [staffRes, wsRes] = await Promise.all([
        axios.get(`${API_BASE}/engineering/staff`),
        axios.get(`${API_BASE}/engineering/workshops`),
      ]);

      if (staffRes.data?.success) setStaff(staffRes.data.data);
      if (wsRes.data?.success) setWorkshops(wsRes.data.data);
    } catch (err) {
      console.error('Failed to load staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newWorkshopId) return;

    setCreating(true);
    try {
      const res = await axios.post(`${API_BASE}/engineering/staff`, {
        name: newName,
        phone: newPhone || undefined,
        role: newRole,
        workshopId: newWorkshopId,
        specialty: newSpecialty || 'فني صيانة عامة',
        hourlyCostRate: Number(newRate),
      });

      if (res.data?.success) {
        setShowNewModal(false);
        setNewName('');
        setNewPhone('');
        setNewSpecialty('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('تعذر إضافة العضو للفريق الفني');
    } finally {
      setCreating(false);
    }
  };

  const exportRows = staff.map((s) => ({
    'الاسم': s.name,
    'رقم الهاتف': s.phone || 'غير مسجل',
    'الصفة': s.role,
    'الورشة': s.engineering_workshops?.name || 'عام',
    'التخصص الفني': s.specialty,
    'أجر الساعة (ج.م)': s.hourly_cost_rate,
    'الحالة': s.is_available ? 'متاح للعمل' : 'في مهمة صيانة',
  }));

  const filteredStaff = staff.filter((s) => {
    const matchesWs = workshopFilter === 'ALL' || s.engineering_workshops?.id === workshopFilter;
    const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
    const matchesSearch =
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.specialty.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWs && matchesRole && matchesSearch;
  });

  // Metrics
  const totalStaff = staff.length;
  const engineersCount = staff.filter((s) => s.role === 'ENGINEER').length;
  const techniciansCount = staff.filter((s) => s.role === 'TECHNICIAN').length;
  const availableCount = staff.filter((s) => s.is_available).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12" dir="rtl">
      <EngineeringHeader
        title="فريق المهندسين والفنيين (Engineering Staff & Technical Team)"
        subtitle="إدارة أطقم الورش الهندسية، التخصصات، أجر الساعة، وتوزيع أعباء الصيانة والتصنيع"
        entityName="staff"
        exportData={exportRows}
        exportFileName="فريق_المهندسين_والفنيين.xlsx"
        onImportSuccess={fetchData}
        primaryAction={{
          label: 'إضافة مهندس / فني جديد',
          onClick: () => setShowNewModal(true),
          icon: Plus,
        }}
      />

      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-slate-800 text-slate-300 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">إجمالي الفريق الهندسي</span>
              <span className="text-lg font-black text-white font-mono">{totalStaff}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-indigo-900/40 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">مهندسو الورش</span>
              <span className="text-lg font-black text-indigo-400 font-mono">{engineersCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-amber-900/40 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">فنيو التشغيل والتصنيع</span>
              <span className="text-lg font-black text-amber-400 font-mono">{techniciansCount}</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-900/40 p-3 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">جاهزون للمهام الميدانية</span>
              <span className="text-lg font-black text-emerald-400 font-mono">{availableCount}</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-300">الورشة:</span>
            <select
              value={workshopFilter}
              onChange={(e) => setWorkshopFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-white outline-none"
            >
              <option value="ALL">كافة الورش</option>
              {workshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <span className="font-semibold text-slate-300 mr-2">الصفة:</span>
            <div className="flex items-center gap-1">
              {[
                { k: 'ALL', l: 'الكل' },
                { k: 'ENGINEER', l: 'مهندسون' },
                { k: 'TECHNICIAN', l: 'فنيون' },
              ].map((r) => (
                <button
                  key={r.k}
                  onClick={() => setRoleFilter(r.k)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] ${
                    roleFilter === r.k
                      ? 'bg-amber-600 text-white shadow'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {r.l}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-72">
            <input
              type="text"
              placeholder="بحث بالاسم، التخصص الفني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2" />
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-3">اسم المهندس / الفني</th>
                <th className="p-3">رقم الهاتف</th>
                <th className="p-3">الصفة الوظيفية</th>
                <th className="p-3">الورشة التابع لها</th>
                <th className="p-3">التخصص الفني الدقيق</th>
                <th className="p-3">أجر الساعة المعتمد</th>
                <th className="p-3">حالة الجاهزية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    جاري تحميل بيانات الفريق الهندسي...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    لا يوجد أعضاء يطابقون شروط البحث
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                          {s.name.slice(0, 1)}
                        </div>
                        <strong className="text-white text-xs">{s.name}</strong>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-400" dir="ltr">
                      {s.phone || 'غير مسجل'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.role === 'ENGINEER'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {s.role === 'ENGINEER' ? 'مهندس متخصص' : 'فني أول'}
                      </span>
                    </td>
                    <td className="p-3">{s.engineering_workshops?.name || 'عام'}</td>
                    <td className="p-3 font-medium text-slate-300">{s.specialty}</td>
                    <td className="p-3 font-mono font-bold text-white">{s.hourly_cost_rate} ج.م / س</td>
                    <td className="p-3">
                      {s.is_available ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          متاح ومستعد
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          في مأمورية صيانة
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Staff */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                إضافة مهندس أو فني للفريق
              </h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-500 hover:text-white">
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-slate-300 mb-1 font-semibold">اسم المهندس / الفني:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="محمد نبيل السعيد"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الصفة الوظيفية:</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="TECHNICIAN">فني أول</option>
                    <option value="ENGINEER">مهندس متخصص</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">الورشة التابع لها:</label>
                  <select
                    required
                    value={newWorkshopId}
                    onChange={(e) => setNewWorkshopId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  >
                    <option value="">اختر الورشة...</option>
                    {workshops.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">التخصص الدقيق:</label>
                  <input
                    type="text"
                    required
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="لحام أرغون، فني كباسات، تحكم PLC..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">أجر الساعة (ج.م):</label>
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">رقم الهاتف / الواتساب:</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="010..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 text-white font-mono"
                  dir="ltr"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
                >
                  {creating ? 'جاري الإضافة...' : 'حفظ الفني'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
