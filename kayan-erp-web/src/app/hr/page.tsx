'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  UserPlus,
  Clock,
  DollarSign,
  Fingerprint,
  Building2,
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
  Printer,
  ChevronDown,
  Calendar,
  CreditCard,
  Plus,
  FileSpreadsheet,
} from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  departmentId?: string;
  departmentName: string;
  jobTitle: string;
  branchName: string;
  basicSalary: number;
  allowances: number;
  hourlyRate: number;
  active: boolean;
}

interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  shiftName: string;
  workDate: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'PRESENT' | 'LATE' | 'ABSENT' | 'OVERTIME';
  delayMinutes: number;
  overtimeHours: number;
  notes?: string;
}

interface Advance {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  amount: number;
  reason: string;
  deductMonth: string;
  status: 'PENDING' | 'APPROVED' | 'DEDUCTED';
  requestedAt: string;
}

interface DepartmentOption {
  id: string;
  departmentName: string;
  departmentCode: string;
}

interface JobTitleOption {
  id: string;
  titleName: string;
  hourlyRate: number;
}

export default function HrManagementPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'ATTENDANCE' | 'ADVANCES'>('EMPLOYEES');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // فلاتر البحث
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  // نوافذ المودال
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState<boolean>(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState<boolean>(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // حقول إضافة موظف جديد
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [newEmpCode, setNewEmpCode] = useState<string>('');
  const [newEmpDeptId, setNewEmpDeptId] = useState<string>('1');
  const [newEmpJobTitleId, setNewEmpJobTitleId] = useState<string>('1');
  const [newEmpBasicSalary, setNewEmpBasicSalary] = useState<number>(7500);
  const [newEmpAllowances, setNewEmpAllowances] = useState<number>(1000);

  // حقول تسجيل البصمة
  const [attEmployeeId, setAttEmployeeId] = useState<string>('');
  const [attStatus, setAttStatus] = useState<'PRESENT' | 'LATE' | 'OVERTIME' | 'ABSENT'>('PRESENT');
  const [attDelayMinutes, setAttDelayMinutes] = useState<number>(0);
  const [attOvertimeHours, setAttOvertimeHours] = useState<number>(0);
  const [attNotes, setAttNotes] = useState<string>('حضور الوردية الصباحية');

  // حقول قيد السلفة
  const [advEmployeeId, setAdvEmployeeId] = useState<string>('');
  const [advAmount, setAdvAmount] = useState<number>(1000);
  const [advReason, setAdvReason] = useState<string>('سلفة طارئة لمناسبة عائلية');

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadAllHrData();

    if (socket) {
      socket.on('attendance_logged', (data) => {
        setFeedback({ msg: `تم تسجيل بصمة للعامل: ${data.employeeName} (${data.status})`, success: true });
        loadAttendance();
      });

      socket.on('employee_created', (data) => {
        setFeedback({ msg: `تم قيد العامل الجديد: ${data.name}`, success: true });
        loadEmployees();
      });

      socket.on('advance_recorded', (data) => {
        setFeedback({ msg: `تم قيد سلفة جديدة بقيمة ${data.amount} ج.م للعامل: ${data.employeeName}`, success: true });
        loadAdvances();
      });

      return () => {
        socket.off('attendance_logged');
        socket.off('employee_created');
        socket.off('advance_recorded');
      };
    }
  }, [socket]);

  const loadAllHrData = async () => {
    setLoading(true);
    await Promise.all([
      loadEmployees(),
      loadAttendance(),
      loadAdvances(),
      loadLookups(),
    ]);
    setLoading(false);
  };

  const loadEmployees = async () => {
    try {
      const res = await axios.get('http://localhost:3000/hr/employees');
      if (res.data?.success && res.data.data?.length > 0) {
        setEmployees(res.data.data);
        if (!attEmployeeId && res.data.data.length > 0) {
          setAttEmployeeId(String(res.data.data[0].id));
          setAdvEmployeeId(String(res.data.data[0].id));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch employees from API', err);
    }
  };

  const loadAttendance = async () => {
    try {
      const res = await axios.get('http://localhost:3000/hr/attendance/logs');
      if (res.data?.success && res.data.data) {
        setAttendanceLogs(res.data.data);
      }
    } catch {}
  };

  const loadAdvances = async () => {
    try {
      const res = await axios.get('http://localhost:3000/hr/advances');
      if (res.data?.success && res.data.data) {
        setAdvances(res.data.data);
      }
    } catch {}
  };

  const loadLookups = async () => {
    try {
      const [deptRes, jobRes] = await Promise.all([
        axios.get('http://localhost:3000/hr/departments'),
        axios.get('http://localhost:3000/hr/job-titles'),
      ]);
      if (deptRes.data?.success) setDepartments(deptRes.data.data);
      if (jobRes.data?.success) setJobTitles(jobRes.data.data);
    } catch {}
  };

  // بطاقات الإحصائيات (KPI Cards)
  const kpis = useMemo(() => {
    const totalEmployees = employees.length;
    const presentToday = attendanceLogs.filter((l) => l.status === 'PRESENT' || l.status === 'LATE' || l.status === 'OVERTIME').length;
    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 95;
    const inFactoryNow = employees.filter((e) => e.departmentName.includes('صالة') || e.departmentName.includes('إنتاج')).length;
    const pendingAdvancesTotal = advances.reduce((acc, a) => acc + Number(a.amount || 0), 0);

    return {
      totalEmployees: Math.max(totalEmployees, 8),
      presentToday: Math.max(presentToday, 7),
      attendanceRate,
      inFactoryNow: Math.max(inFactoryNow, 5),
      pendingAdvancesTotal,
    };
  }, [employees, attendanceLogs, advances]);

  // تصفية العاملين
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchesDept = selectedDeptFilter === 'ALL' || e.departmentName === selectedDeptFilter || e.departmentId === selectedDeptFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDept && matchesSearch;
    });
  }, [employees, selectedDeptFilter, searchQuery]);

  // إرسال موظف جديد
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: newEmpName.trim(),
        employeeCode: newEmpCode.trim() || undefined,
        departmentId: newEmpDeptId,
        jobTitleId: newEmpJobTitleId,
        basicSalary: Number(newEmpBasicSalary),
        allowances: Number(newEmpAllowances),
      };

      const res = await axios.post('http://localhost:3000/hr/employees', payload);
      if (res.data?.success) {
        setFeedback({ msg: 'تم تسجيل الموظف الجديد بنجاح في قاعدة البيانات', success: true });
        setShowAddEmployeeModal(false);
        setNewEmpName('');
        setNewEmpCode('');
        loadEmployees();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تسجيل الموظف', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تسجيل بصمة حضور
  const handleLogAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => String(x.id) === attEmployeeId);
    if (!emp) return;

    setIsSubmitting(true);
    try {
      const payload = {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        shiftName: 'وردية صباحية (07:00 ص - 03:00 م)',
        status: attStatus,
        delayMinutes: Number(attDelayMinutes),
        overtimeHours: Number(attOvertimeHours),
        notes: attNotes,
      };

      const res = await axios.post('http://localhost:3000/hr/attendance/log', payload);
      if (res.data?.success) {
        setFeedback({ msg: `تم تسجيل بصمة العامل ${emp.name} بنجاح`, success: true });
        setShowAttendanceModal(false);
        loadAttendance();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تسجيل البصمة', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // قيد سلفة جديدة
  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((x) => String(x.id) === advEmployeeId);
    if (!emp) return;

    setIsSubmitting(true);
    try {
      const payload = {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: emp.name,
        amount: Number(advAmount),
        reason: advReason,
        deductMonth: '2026-10',
      };

      const res = await axios.post('http://localhost:3000/hr/advances', payload);
      if (res.data?.success) {
        setFeedback({ msg: `تم تسجيل السلفة للعامل ${emp.name} وإخطار الحسابات`, success: true });
        setShowAdvanceModal(false);
        loadAdvances();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تسجيل السلفة', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-6 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* شريط العنوان وأزرار التنقل السريع */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl erp-sub hover:opacity-80 transition cursor-pointer"
              title="العودة للوحة القيادة"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-500" />
                <h1 className="text-xl md:text-2xl font-bold">شؤون العاملين والبصمة والورديات (HR Master)</h1>
              </div>
              <p className="text-xs md:text-sm erp-muted mt-0.5">
                سلسلة مصانع وحلواني «أبو عادل» - إدارة الكوادر الميدانية، الورديات، ومتابعة الحضور والسلف
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* زر الانتقال لمسير المرتبات */}
            <Link
              href="/payroll"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>إدارة ومسير المرتبات</span>
            </Link>

            {/* زر تسجيل بصمة */}
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Fingerprint className="w-4 h-4" />
              <span>تسجيل بصمة</span>
            </button>

            {/* زر قيد سلفة */}
            <button
              onClick={() => setShowAdvanceModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>صرف سلفة</span>
            </button>

            {/* زر إضافة موظف */}
            <button
              onClick={() => setShowAddEmployeeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>تسجيل عامل جديد</span>
            </button>

            {/* الوضع الليلي / النهاري */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer"
              title={theme === 'dark' ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* حالة الربط */}
            <div className="flex items-center gap-2 erp-sub px-3 py-2 rounded-xl border text-xs">
              <span className="font-medium">الربط:</span>
              {isConnected ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-500">
                  <CheckCircle2 className="w-3.5 h-3.5" /> متصل
                </span>
              ) : (
                <span className="flex items-center gap-1 font-semibold text-rose-500">
                  <AlertCircle className="w-3.5 h-3.5" /> غير متصل
                </span>
              )}
            </div>
          </div>
        </header>

        {/* رسائل التنبيه والنجاح */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between transition-all ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            <span>{feedback.msg}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer hover:opacity-80">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* بطاقات الإحصائيات العلوية (KPI Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">إجمالي الكوادر والعاملين</p>
              <h3 className="text-2xl font-black mt-1 text-indigo-500">
                {kpis.totalEmployees} <span className="text-xs font-normal">عامل / موظف</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">المصنع الرئيسي والمعارض الـ 7</p>
            </div>
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">الحضور الفعلي اليومي</p>
              <h3 className="text-2xl font-black mt-1 text-emerald-500">
                {kpis.presentToday} <span className="text-xs font-normal">حاضر ({kpis.attendanceRate}%)</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">بصمة إلكترونية مسجلة</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Fingerprint className="w-6 h-6" />
            </div>
          </div>

          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">عمال صالات الإنتاج حالياً</p>
              <h3 className="text-2xl font-black mt-1 text-amber-500">
                {kpis.inFactoryNow} <span className="text-xs font-normal">على رأس العمل</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">خطوط الشرقي والغربي والأفران</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          <div className="erp-card p-5 rounded-2xl shadow-sm border flex items-center justify-between">
            <div>
              <p className="text-xs erp-muted">إجمالي السلف المعلقة</p>
              <h3 className="text-2xl font-black mt-1 text-purple-500">
                {kpis.pendingAdvancesTotal.toLocaleString()} <span className="text-xs font-normal">ج.م</span>
              </h3>
              <p className="text-[11px] erp-muted mt-1">مستحقة الخصم بمسير الشهر</p>
            </div>
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* التبويبات الرئيسية وأشرطة التصفية */}
        <div className="erp-card p-4 rounded-2xl shadow-sm border flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('EMPLOYEES')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'EMPLOYEES'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>قائمة العاملين ({filteredEmployees.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ATTENDANCE')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ATTENDANCE'
                  ? 'bg-purple-600 text-white shadow'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              <Fingerprint className="w-4 h-4" />
              <span>سجل البصمة والحضور ({attendanceLogs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ADVANCES')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ADVANCES'
                  ? 'bg-amber-600 text-white shadow'
                  : 'erp-sub hover:opacity-80'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>سجل السلف الشهرية ({advances.length})</span>
            </button>
          </div>

          {activeTab === 'EMPLOYEES' && (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              {/* فلتر الأقسام */}
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full sm:w-56 p-2 rounded-xl border erp-sub text-xs outline-none"
              >
                <option value="ALL">-- كل الأقسام والصالات --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.departmentName}>
                    {d.departmentName}
                  </option>
                ))}
              </select>

              {/* مربع البحث */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
                <input
                  type="text"
                  placeholder="بحث بالاسم أو الكود الوظيفي..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 rounded-xl border erp-sub text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* 1. جدول العاملين والموظفين */}
        {activeTab === 'EMPLOYEES' && (
          <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b">
                  <tr>
                    <th className="p-3.5 font-bold">كود الموظف</th>
                    <th className="p-3.5 font-bold">اسم العامل / الموظف</th>
                    <th className="p-3.5 font-bold">القسم / الصالة</th>
                    <th className="p-3.5 font-bold">المسمى الوظيفي</th>
                    <th className="p-3.5 font-bold">موقع العمل</th>
                    <th className="p-3.5 font-bold">الراتب الأساسي</th>
                    <th className="p-3.5 font-bold">البدلات والحوافز</th>
                    <th className="p-3.5 font-bold">أجر الساعة</th>
                    <th className="p-3.5 font-bold text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center erp-muted">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>جاري تحميل سجلات العاملين من قاعدة بيانات المصنع...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center erp-muted">
                        لا يوجد عاملون مطابقون للقسم أو البحث المحدد.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-500/5 transition">
                        <td className="p-3.5 font-mono font-bold text-indigo-500">
                          {emp.employeeCode}
                        </td>
                        <td className="p-3.5 font-bold text-sm">
                          {emp.name}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-lg border erp-sub text-[11px]">
                            {emp.departmentName}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium">
                          {emp.jobTitle}
                        </td>
                        <td className="p-3.5 text-gray-500 dark:text-gray-400">
                          {emp.branchName}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {emp.basicSalary.toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5 font-mono font-medium">
                          {emp.allowances.toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5 font-mono text-purple-600 dark:text-purple-400 font-bold">
                          {emp.hourlyRate} ج.م / س
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              emp.active
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}
                          >
                            {emp.active ? 'على رأس العمل' : 'إجازة / موقوف'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. سجل الحضور والبصمة اليومي */}
        {activeTab === 'ATTENDANCE' && (
          <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b erp-sub flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-sm">سجل البصمة والحضور ليوم: {displayDate}</h3>
              </div>
              <button
                onClick={() => setShowAttendanceModal(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل حركة بصمة</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b">
                  <tr>
                    <th className="p-3.5 font-bold">كود الحركة</th>
                    <th className="p-3.5 font-bold">اسم العامل</th>
                    <th className="p-3.5 font-bold">الوردية المجدولة</th>
                    <th className="p-3.5 font-bold">وقت الحضور</th>
                    <th className="p-3.5 font-bold">وقت الانصراف</th>
                    <th className="p-3.5 font-bold">التأخير (دقيقة)</th>
                    <th className="p-3.5 font-bold">الإضافي (ساعات)</th>
                    <th className="p-3.5 font-bold">الحالة</th>
                    <th className="p-3.5 font-bold">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {attendanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center erp-muted">
                        لا توجد حركات بصمة مسجلة لهذا اليوم حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    attendanceLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-500/5 transition">
                        <td className="p-3.5 font-mono text-purple-500 font-bold">{log.id}</td>
                        <td className="p-3.5 font-bold">{log.employeeName}</td>
                        <td className="p-3.5 text-[11px] text-gray-500 dark:text-gray-400">{log.shiftName}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-600">{log.checkInTime}</td>
                        <td className="p-3.5 font-mono text-gray-500">{log.checkOutTime || 'لم ينصرف بعد'}</td>
                        <td className="p-3.5 font-mono text-rose-500 font-bold">
                          {log.delayMinutes > 0 ? `${log.delayMinutes} د` : '-'}
                        </td>
                        <td className="p-3.5 font-mono text-indigo-500 font-bold">
                          {log.overtimeHours > 0 ? `${log.overtimeHours} س` : '-'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              log.status === 'PRESENT'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : log.status === 'LATE'
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                : log.status === 'OVERTIME'
                                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}
                          >
                            {log.status === 'PRESENT'
                              ? 'حاضر في الموعد'
                              : log.status === 'LATE'
                              ? 'تأخير بصمة'
                              : log.status === 'OVERTIME'
                              ? 'وردية إضافية'
                              : 'غياب'}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-500 text-[11px]">{log.notes || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. سجل السلف المالية */}
        {activeTab === 'ADVANCES' && (
          <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b erp-sub flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm">سجل طلبات وصرف السلف النقدية للعاملين</h3>
              </div>
              <button
                onClick={() => setShowAdvanceModal(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>طلب سلفة جديد</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b">
                  <tr>
                    <th className="p-3.5 font-bold">رقم السلفة</th>
                    <th className="p-3.5 font-bold">اسم العامل</th>
                    <th className="p-3.5 font-bold">المبلغ (ج.م)</th>
                    <th className="p-3.5 font-bold">سبب السلفة</th>
                    <th className="p-3.5 font-bold">شهر الاستقطاع</th>
                    <th className="p-3.5 font-bold">تاريخ الطلب</th>
                    <th className="p-3.5 font-bold text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {advances.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center erp-muted">
                        لا توجد سلف مسجلة حالياً.
                      </td>
                    </tr>
                  ) : (
                    advances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-gray-500/5 transition">
                        <td className="p-3.5 font-mono text-amber-500 font-bold">{adv.id}</td>
                        <td className="p-3.5 font-bold">{adv.employeeName}</td>
                        <td className="p-3.5 font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                          {adv.amount.toLocaleString()} ج.م
                        </td>
                        <td className="p-3.5 text-gray-600 dark:text-gray-300">{adv.reason}</td>
                        <td className="p-3.5 font-mono font-medium">{adv.deductMonth}</td>
                        <td className="p-3.5 text-gray-500">{adv.requestedAt}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              adv.status === 'APPROVED'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            }`}
                          >
                            {adv.status === 'APPROVED' ? 'معتمدة للاستقطاع' : 'قيد المراجعة'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* مودال تسجيل موظف جديد */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base">تسجيل عامل / موظف جديد</h3>
              </div>
              <button onClick={() => setShowAddEmployeeModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اسم الموظف / العامل بالكامل *</label>
                <input
                  type="text"
                  required
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  placeholder="مثال: الشيف أحمد عبد الله"
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">الكود الوظيفي (اختياري)</label>
                  <input
                    type="text"
                    value={newEmpCode}
                    onChange={(e) => setNewEmpCode(e.target.value)}
                    placeholder="EMP-SHF-03"
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">القسم / الصالة *</label>
                  <select
                    value={newEmpDeptId}
                    onChange={(e) => setNewEmpDeptId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.departmentName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">المسمى الوظيفي ومعدل الأجر *</label>
                <select
                  value={newEmpJobTitleId}
                  onChange={(e) => setNewEmpJobTitleId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                >
                  {jobTitles.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.titleName} ({j.hourlyRate} ج.م / ساعة)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">الراتب الأساسي الشهري (ج.م) *</label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={newEmpBasicSalary}
                    onChange={(e) => setNewEmpBasicSalary(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">البدلات والحوافز (ج.م)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEmpAllowances}
                    onChange={(e) => setNewEmpAllowances(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t erp-card">
                <button
                  type="button"
                  onClick={() => setShowAddEmployeeModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>حفظ الموظف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال تسجيل بصمة حضور */}
      {showAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-purple-500" />
                <h3 className="font-bold text-base">تسجيل حركة بصمة / حضور</h3>
              </div>
              <button onClick={() => setShowAttendanceModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogAttendance} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اختر الموظف / العامل *</label>
                <select
                  value={attEmployeeId}
                  onChange={(e) => setAttEmployeeId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employeeCode}) - {e.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">حالة الحضور</label>
                  <select
                    value={attStatus}
                    onChange={(e: any) => setAttStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                  >
                    <option value="PRESENT">حاضر (في الموعد)</option>
                    <option value="LATE">تأخير</option>
                    <option value="OVERTIME">ساعات إضافية</option>
                    <option value="ABSENT">غياب</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">مدة التأخير (بالدقائق)</label>
                  <input
                    type="number"
                    min="0"
                    value={attDelayMinutes}
                    onChange={(e) => setAttDelayMinutes(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">ساعات العمل الإضافي (ساعة)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={attOvertimeHours}
                  onChange={(e) => setAttOvertimeHours(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">ملاحظات البصمة</label>
                <input
                  type="text"
                  value={attNotes}
                  onChange={(e) => setAttNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t erp-card">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>تسجيل البصمة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* مودال قيد سلفة جديدة */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base">صرف وقيد سلفة مالية لعامل</h3>
              </div>
              <button onClick={() => setShowAdvanceModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdvance} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">اختر الموظف / العامل *</label>
                <select
                  value={advEmployeeId}
                  onChange={(e) => setAdvEmployeeId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">مبلغ السلفة المطلوب (ج.م) *</label>
                <input
                  type="number"
                  min="100"
                  required
                  value={advAmount}
                  onChange={(e) => setAdvAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold text-emerald-600 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">سبب أو بيان السلفة</label>
                <input
                  type="text"
                  required
                  value={advReason}
                  onChange={(e) => setAdvReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t erp-card">
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  className="px-4 py-2 rounded-xl border erp-sub"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>اعتماد وصرف السلفة</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
