'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Users,
  Search,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Key,
  RotateCw,
  Printer,
  Edit2,
  Lock,
  Unlock,
  Building2,
  Layers,
  ArrowRight,
  Sun,
  Moon,
  X,
  Loader2,
  UserCheck,
  Check,
} from 'lucide-react';

interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
  departmentName: string;
  employeeCode: string;
  isActive: boolean;
  allowedBranches: string[];
  lastLogin?: string;
}

interface AppRole {
  id: string;
  roleName: string;
  displayName: string;
  description: string;
}

interface PermissionGroup {
  module: string;
  permissions: string[];
}

export default function UsersManagementPage() {
  const { socket, isConnected } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'USERS' | 'ROLES' | 'PERMISSIONS'>('USERS');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<PermissionGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // مودالات
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  // فورم مستخدم جديد
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newRole, setNewRole] = useState<string>('PRODUCTION_SUPERVISOR');
  const [newDept, setNewDept] = useState<string>('صالة الحلويات الشرقية');
  const [newAllowedBranches, setNewAllowedBranches] = useState<string[]>(['المصنع المركزي']);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  // نصوص التواريخ الآمنة للمنع من أخطاء الـ Prerender
  const [displayDate, setDisplayDate] = useState<string>('2026-10-31');

  useEffect(() => {
    setDisplayDate(new Date().toLocaleDateString('ar-EG'));
    loadAllUserData();

    if (socket) {
      socket.on('user_created', () => loadUsers());
      socket.on('user_updated', () => loadUsers());

      return () => {
        socket.off('user_created');
        socket.off('user_updated');
      };
    }
  }, [socket]);

  const loadAllUserData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadRoles(), loadPermissions()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    try {
      const res = await axios.get('http://localhost:3000/users/users');
      if (res.data?.success && res.data.data) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch users', err);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await axios.get('http://localhost:3000/users/roles');
      if (res.data?.success && res.data.data) {
        setRoles(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch roles', err);
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await axios.get('http://localhost:3000/users/permissions');
      if (res.data?.success && res.data.data) {
        setPermissions(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch permissions', err);
    }
  };

  // تصفية المستخدمين
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const s = searchTerm.toLowerCase().trim();
      return (
        s === '' ||
        u.username.toLowerCase().includes(s) ||
        u.fullName.toLowerCase().includes(s) ||
        u.role.toLowerCase().includes(s) ||
        u.departmentName.toLowerCase().includes(s)
      );
    });
  }, [users, searchTerm]);

  // إنشاء مستخدم جديد
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await axios.post('http://localhost:3000/users/users', {
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        role: newRole,
        departmentName: newDept,
        allowedBranchIds: newAllowedBranches,
      });

      if (res.data?.success) {
        setFeedback({ msg: res.data.message, success: true });
        setShowAddModal(false);
        setNewUsername('');
        setNewFullName('');
        loadUsers();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إنشاء المستخدم', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  // تعديل حالة المستخدم (تفعيل / تعطيل)
  const toggleUserStatus = async (user: AppUser) => {
    try {
      const res = await axios.put(`http://localhost:3000/users/users/${user.id}`, {
        isActive: !user.isActive,
      });
      if (res.data?.success) {
        setFeedback({ msg: `تم ${!user.isActive ? 'تفعيل' : 'تعطيل'} حساب [${user.username}]`, success: true });
        loadUsers();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تعديل الحالة', success: false });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200" dir="rtl">
      <div className="erp-container-fluid space-y-4">

        {/* الترويسة */}
        <header className="erp-card p-5 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors duration-200 print:hidden">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 rounded-xl border erp-sub hover:opacity-80 transition cursor-pointer">
              <ArrowRight className="w-5 h-5 text-indigo-600" />
            </Link>
            <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black">إدارة المستخدمين ومصفوفة الأدوار والصلاحيات (RBAC)</h1>
              <p className="text-xs erp-muted">
                مصانع وحلواني أبو عادل | حوكمة الصلاحيات، الفروع المصرح بها، وقوالب الأدوار المعتمدة
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة تقرير الصلاحيات A4</span>
            </button>

            <button
              onClick={loadAllUserData}
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

        {/* التبويبات الفنية */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b erp-card pb-2 print:hidden">
          <div className="flex items-center gap-2">
            {[
              { id: 'USERS', label: 'المستخدمون المعتمدون', count: users.length },
              { id: 'ROLES', label: 'قوالب الأدوار الوظيفية', count: roles.length },
              { id: 'PERMISSIONS', label: 'شجرة الصلاحيات التفصيلية', count: permissions.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'erp-sub hover:opacity-80'
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute right-3 top-2.5 erp-muted" />
            <input
              type="text"
              placeholder="بحث باسم المستخدم أو الإدارة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 rounded-xl border erp-sub text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* ترويسة الطباعة الرسمية A4 */}
        <div className="hidden print:block border-b-2 border-black pb-3 mb-4 text-center">
          <h2 className="text-xl font-black">مصانع وحلواني أبو عادل</h2>
          <p className="text-xs text-gray-700">دليل حوكمة المستخدمين ومصفوفة الأدوار والصلاحيات (RBAC)</p>
          <div className="flex justify-between items-center text-xs mt-2 px-4 font-bold">
            <span>إدارة أمن المعلومات والرقابة الداخلية</span>
            <span>تاريخ الطباعة: {displayDate}</span>
          </div>
        </div>

        {/* 1. جدول المستخدمين */}
        {activeTab === 'USERS' && (
          <div className="erp-card rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="erp-sub border-b text-[11px]">
                  <tr>
                    <th className="p-3.5 font-bold">اسم المستخدم (Login)</th>
                    <th className="p-3.5 font-bold">الاسم الكامل للموظف</th>
                    <th className="p-3.5 font-bold">الدور الوظيفي (Role)</th>
                    <th className="p-3.5 font-bold">الإدارة / القسم</th>
                    <th className="p-3.5 font-bold">الفروع المصرح بها</th>
                    <th className="p-3.5 font-bold">آخر تسجيل دخول</th>
                    <th className="p-3.5 font-bold text-center">الحالة</th>
                    <th className="p-3.5 font-bold text-center print:hidden">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center erp-muted">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>جاري تحميل قائمة المستخدمين...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center erp-muted">
                        لا يوجد مستخدمون مطابقون لمعايير البحث.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-500/5 transition">
                        <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {user.username}
                        </td>
                        <td className="p-3.5 font-bold">{user.fullName}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-500 font-bold text-[10px]">
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-gray-700 dark:text-gray-300 font-medium">
                          {user.departmentName}
                        </td>
                        <td className="p-3.5 text-gray-600 dark:text-gray-400 text-[11px]">
                          {user.allowedBranches.join('، ')}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-gray-500">
                          {user.lastLogin || 'نشط الآن'}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              user.isActive
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}
                          >
                            {user.isActive ? 'مفعل ونشط' : 'معطل مؤقتاً'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center print:hidden">
                          <button
                            onClick={() => toggleUserStatus(user)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              user.isActive
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600'
                            }`}
                            title={user.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          >
                            {user.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
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

        {/* 2. قوالب الأدوار */}
        {activeTab === 'ROLES' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roles.map((r) => (
              <div key={r.id} className="erp-card p-4 rounded-2xl shadow-sm border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{r.displayName}</span>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-500/10">
                    {r.roleName}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">{r.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* 3. شجرة الصلاحيات */}
        {activeTab === 'PERMISSIONS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {permissions.map((group, idx) => (
              <div key={idx} className="erp-card p-4 rounded-2xl shadow-sm border space-y-3">
                <div className="flex items-center gap-2 border-b erp-card pb-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <h3 className="font-bold text-sm">{group.module}</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {group.permissions.map((perm, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="font-mono text-[11px]">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* مودال: إضافة مستخدم جديد */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="erp-card rounded-2xl shadow-2xl border max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b erp-card pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base">إضافة مستخدم جديد للنظام</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">اسم الدخول (Username) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: adel_chef"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">الاسم الكامل للموظف *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شيف إبراهيم عادل"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">الدور الوظيفي (Role) *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.roleName}>{r.displayName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">الإدارة / القسم *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: صالة الحلويات الشرقية"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">الفروع المصرح للمستخدم بالعمل عليها</label>
                <select
                  multiple
                  value={newAllowedBranches}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                    setNewAllowedBranches(selected);
                  }}
                  className="w-full p-2.5 rounded-xl border erp-sub outline-none font-bold h-24"
                >
                  <option value="المصنع المركزي">المصنع المركزي (سندوب)</option>
                  <option value="معرض المنصورة">معرض المنصورة (شارع الجمهورية)</option>
                  <option value="معرض دكرنس">معرض دكرنس</option>
                  <option value="معرض منية النصر">معرض منية النصر</option>
                  <option value="معرض شربين">معرض شربين</option>
                  <option value="معرض بلقاس">معرض بلقاس</option>
                  <option value="معرض الزقازيق">معرض الزقازيق</option>
                  <option value="معرض السنبلاوين">معرض السنبلاوين</option>
                </select>
                <span className="text-[10px] text-gray-500 mt-1 block">اضغط زر Ctrl لاختيار أكثر من فرع</span>
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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  <span>حفظ وإنشاء الحساب</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
