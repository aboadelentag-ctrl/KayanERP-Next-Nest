'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useCustomIcons, CustomAppIcon, CustomScreen } from '../context/CustomIconsContext';
import { APP_MODULES } from '../config/modules';
import {
  Factory,
  ShieldCheck,
  Boxes,
  Store,
  Wrench,
  Sparkles,
  Droplets,
  Smartphone,
  Truck,
  Users,
  Wallet,
  Flame,
  Layers,
  Radio,
  Calculator,
  FileText,
  Warehouse,
  ShoppingBag,
  Receipt,
  PackageCheck,
  BellRing,
  Star,
  Zap,
  Settings,
  ClipboardList,
  Activity,
  Building2,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  LayoutGrid,
  ExternalLink,
  Sliders,
  CheckSquare,
  Square,
} from 'lucide-react';

const ICON_OPTIONS = [
  { name: 'Factory', label: 'مصنع / تصنيع', icon: Factory },
  { name: 'ShieldCheck', label: 'جودة وتفتيش', icon: ShieldCheck },
  { name: 'Boxes', label: 'مستودعات وخامات', icon: Boxes },
  { name: 'Store', label: 'معارض وفروع', icon: Store },
  { name: 'ShoppingBag', label: 'مشتريات ومبيعات', icon: ShoppingBag },
  { name: 'Receipt', label: 'فواتير وخزائن', icon: Receipt },
  { name: 'Wrench', label: 'صيانة وهندسة', icon: Wrench },
  { name: 'Sparkles', label: 'نماذج ونظافة', icon: Sparkles },
  { name: 'Droplets', label: 'منظفات وتطهير', icon: Droplets },
  { name: 'Truck', label: 'أسطول وتوصيل', icon: Truck },
  { name: 'Smartphone', label: 'موبايل ومشرف', icon: Smartphone },
  { name: 'Users', label: 'موظفين وعملاء', icon: Users },
  { name: 'Wallet', label: 'سيولة ونقدية', icon: Wallet },
  { name: 'Flame', label: 'طوارئ وأوامر', icon: Flame },
  { name: 'Layers', label: 'تركيبات وهندسة', icon: Layers },
  { name: 'Calculator', label: 'تكاليف وحسابات', icon: Calculator },
  { name: 'FileText', label: 'مستندات وطلبات', icon: FileText },
  { name: 'Warehouse', label: 'مخازن رئيسية', icon: Warehouse },
  { name: 'PackageCheck', label: 'تسليم ومناولة', icon: PackageCheck },
  { name: 'BellRing', label: 'تنبيهات ورصد', icon: BellRing },
  { name: 'Zap', label: 'تدخل عاجل', icon: Zap },
  { name: 'Star', label: 'مميز ومفضل', icon: Star },
  { name: 'Settings', label: 'إعدادات وحوكمة', icon: Settings },
  { name: 'ClipboardList', label: 'قوائم وفحص', icon: ClipboardList },
];

const COLOR_OPTIONS = [
  { id: 'amber', label: 'ذهبي كهرماني', class: 'bg-amber-500 text-slate-950', ring: 'ring-amber-500' },
  { id: 'teal', label: 'فيروزي بترولي', class: 'bg-teal-500 text-slate-950', ring: 'ring-teal-500' },
  { id: 'emerald', label: 'أخضر زمردي', class: 'bg-emerald-500 text-slate-950', ring: 'ring-emerald-500' },
  { id: 'blue', label: 'أزرق ملكي', class: 'bg-blue-500 text-white', ring: 'ring-blue-500' },
  { id: 'indigo', label: 'نيلي داكن', class: 'bg-indigo-500 text-white', ring: 'ring-indigo-500' },
  { id: 'purple', label: 'أرجواني', class: 'bg-purple-500 text-white', ring: 'ring-purple-500' },
  { id: 'rose', label: 'أحمر وردي', class: 'bg-rose-500 text-white', ring: 'ring-rose-500' },
  { id: 'cyan', label: 'سماوي ساطع', class: 'bg-cyan-500 text-slate-950', ring: 'ring-cyan-500' },
];

export function getLucideIcon(iconName?: string) {
  const found = ICON_OPTIONS.find((opt) => opt.name === iconName);
  return found ? found.icon : LayoutGrid;
}

export default function ManageIconModal() {
  const { isModalOpen, closeModal, editingIcon, createIcon, updateIcon, deleteIcon } = useCustomIcons();

  // Form State
  const [title, setTitle] = useState('');
  const [iconName, setIconName] = useState('Factory');
  const [color, setColor] = useState('amber');
  const [badgeText, setBadgeText] = useState('');
  const [showInNavbar, setShowInNavbar] = useState(true);
  const [showInTabs, setShowInTabs] = useState(true);
  const [selectedScreens, setSelectedScreens] = useState<CustomScreen[]>([]);

  // Search & Screen Selection Tab
  const [screenTab, setScreenTab] = useState<'EXISTING' | 'NEW'>('EXISTING');
  const [screenSearch, setScreenSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // New Custom Screen Form
  const [newScreenLabel, setNewScreenLabel] = useState('');
  const [newScreenHref, setNewScreenHref] = useState('');
  const [newScreenTag, setNewScreenTag] = useState('');
  const [newScreenIcon, setNewScreenIcon] = useState('LayoutGrid');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // إعداد كافة شاشات النظام المتاحة
  const allSystemScreens = useMemo(() => {
    const list: (CustomScreen & { categoryName: string })[] = [];
    APP_MODULES.forEach((cat) => {
      cat.items.forEach((item) => {
        list.push({
          href: item.href,
          label: item.label,
          tag: item.tag,
          iconName: item.icon.name || 'LayoutGrid',
          isCustom: false,
          categoryName: cat.category,
        });
      });
    });
    return list;
  }, []);

  // فئات النظام المتاحة للفلترة
  const moduleCategories = useMemo(() => {
    return Array.from(new Set(allSystemScreens.map((s) => s.categoryName)));
  }, [allSystemScreens]);

  // ملء النموذج عند التعديل أو التهيئة
  useEffect(() => {
    if (editingIcon) {
      setTitle(editingIcon.title);
      setIconName(editingIcon.icon_name || 'Factory');
      setColor(editingIcon.color || 'amber');
      setBadgeText(editingIcon.badge_text || '');
      setShowInNavbar(editingIcon.show_in_navbar ?? true);
      setShowInTabs(editingIcon.show_in_tabs ?? true);
      setSelectedScreens(Array.isArray(editingIcon.screens_json) ? editingIcon.screens_json : []);
    } else {
      setTitle('');
      setIconName('Factory');
      setColor('amber');
      setBadgeText('');
      setShowInNavbar(true);
      setShowInTabs(true);
      setSelectedScreens([]);
    }
    setErrorMsg(null);
    setNewScreenLabel('');
    setNewScreenHref('');
    setNewScreenTag('');
  }, [editingIcon, isModalOpen]);

  if (!isModalOpen) return null;

  // Toggle selection for an existing system screen
  const toggleScreenSelection = (screen: CustomScreen) => {
    setSelectedScreens((prev) => {
      const exists = prev.some((s) => s.href === screen.href);
      if (exists) {
        return prev.filter((s) => s.href !== screen.href);
      } else {
        return [...prev, screen];
      }
    });
  };

  // Select all / Deselect all in filtered view
  const handleSelectAllFiltered = (screensToToggle: CustomScreen[], select: boolean) => {
    setSelectedScreens((prev) => {
      if (select) {
        const newOnes = screensToToggle.filter((st) => !prev.some((p) => p.href === st.href));
        return [...prev, ...newOnes];
      } else {
        const hrefsToRemove = new Set(screensToToggle.map((s) => s.href));
        return prev.filter((p) => !hrefsToRemove.has(p.href));
      }
    });
  };

  // Add new custom screen
  const handleAddNewCustomScreen = () => {
    if (!newScreenLabel.trim() || !newScreenHref.trim()) {
      setErrorMsg('يرجى إدخال اسم الشاشة الجديدة والمسار/الرابط الخاص بها');
      return;
    }

    const newScreen: CustomScreen = {
      id: `custom-${Date.now()}`,
      label: newScreenLabel.trim(),
      href: newScreenHref.trim().startsWith('/') ? newScreenHref.trim() : `/${newScreenHref.trim()}`,
      tag: newScreenTag.trim() || 'شاشة مخصصة جديدة',
      iconName: newScreenIcon,
      isCustom: true,
    };

    setSelectedScreens((prev) => [...prev, newScreen]);
    setNewScreenLabel('');
    setNewScreenHref('');
    setNewScreenTag('');
    setErrorMsg(null);
    setScreenTab('EXISTING'); // الرجوع للقائمة لمشاهدتها
  };

  // Remove a screen from selected list
  const handleRemoveScreen = (href: string) => {
    setSelectedScreens((prev) => prev.filter((s) => s.href !== href));
  };

  // Save Icon
  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('يرجى إدخال اسم الأيقونة (مثل: الإنتاج، الجودة، المبيعات...)');
      return;
    }
    if (selectedScreens.length === 0) {
      setErrorMsg('يرجى تحديد شاشة واحدة على الأقل لتظهر داخل هذه الأيقونة');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const payload = {
        title: title.trim(),
        icon_name: iconName,
        color,
        badge_text: badgeText.trim() || null,
        show_in_navbar: showInNavbar,
        show_in_tabs: showInTabs,
        screens_json: selectedScreens,
      };

      if (editingIcon) {
        await updateIcon(editingIcon.id, payload);
      } else {
        await createIcon(payload);
      }

      closeModal();
    } catch (err: any) {
      console.error('Save icon error:', err);
      setErrorMsg(err.response?.data?.message || 'حدث خطأ أثناء حفظ الأيقونة');
    } finally {
      setSaving(false);
    }
  };

  // Delete Icon
  const handleDelete = async () => {
    if (!editingIcon) return;
    if (confirm(`هل أنت متأكد من حذف أيقونة "${editingIcon.title}"؟`)) {
      try {
        setSaving(true);
        await deleteIcon(editingIcon.id);
        closeModal();
      } catch (err) {
        console.error('Delete error:', err);
      } finally {
        setSaving(false);
      }
    }
  };

  // Filter existing screens
  const filteredExistingScreens = allSystemScreens.filter((s) => {
    const matchesCat = selectedCategoryFilter === 'ALL' || s.categoryName === selectedCategoryFilter;
    const matchesSearch =
      !screenSearch.trim() ||
      s.label.toLowerCase().includes(screenSearch.toLowerCase()) ||
      (s.tag && s.tag.toLowerCase().includes(screenSearch.toLowerCase())) ||
      s.href.toLowerCase().includes(screenSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const SelectedIconComponent = getLucideIcon(iconName);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full my-auto p-5 sm:p-6 space-y-5 shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black shadow-md ${
              COLOR_OPTIONS.find((c) => c.id === color)?.class || 'bg-amber-500 text-slate-950'
            }`}>
              <SelectedIconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-100">
                  {editingIcon ? `تعديل أيقونة: ${editingIcon.title}` : 'إضافة أيقونة جديدة وتحديد شاشاتها'}
                </h2>
                {badgeText && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {badgeText}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تظهر الأيقونة بجوار «كافة التطبيقات» في الشريط العلوي وتدرج ضمن تبويبات لوحة التحكم
              </p>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-center gap-2 shrink-0">
            <span className="font-bold">⚠️ خطأ:</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="overflow-y-auto space-y-5 pr-1 flex-1">
          {/* 1. الخصائص الأساسية: الاسم والرمز واللون */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            {/* اسم الأيقونة */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                اسم الأيقونة / التصنيف: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: الإنتاج، الجودة، المستودعات..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>

            {/* شارة توضيحية */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                شارة نصية (اختياري):
              </label>
              <input
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="مثال: MES / HACCP / سريع"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* خيارات الظهور */}
            <div className="flex flex-col justify-center space-y-1.5 pt-2 md:pt-0">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={showInNavbar}
                  onChange={(e) => setShowInNavbar(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <span>إظهار في الشريط العلوي الرئيسي (Navbar)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={showInTabs}
                  onChange={(e) => setShowInTabs(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <span>إظهار في شريط التبويبات بالداشبورد</span>
              </label>
            </div>
          </div>

          {/* 2. اختيار رمز الأيقونة واللون */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* اختيار الرمز */}
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">اختر رمز الأيقونة:</span>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-900 rounded-xl border border-slate-800/80">
                {ICON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = iconName === opt.name;
                  return (
                    <button
                      key={opt.name}
                      type="button"
                      onClick={() => setIconName(opt.name)}
                      title={opt.label}
                      className={`p-2 rounded-xl flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* اختيار اللون */}
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 block">اختر التدرج اللوني:</span>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {COLOR_OPTIONS.map((c) => {
                  const isSelected = color === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition flex items-center gap-1.5 ${
                        isSelected
                          ? `${c.class} border-white/40 ring-2 ${c.ring} shadow-md`
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.class.split(' ')[0]}`} />
                      <span className="truncate">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. الشاشات المحددة داخل هذه الأيقونة (Selected Screens Summary) */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                الشاشات التي ستظهر داخل هذه الأيقونة ({selectedScreens.length} شاشة):
              </span>
              {selectedScreens.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedScreens([])}
                  className="text-[11px] text-rose-400 hover:underline"
                >
                  إفراغ كافة الشاشات
                </button>
              )}
            </div>

            {selectedScreens.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-900 border border-dashed border-slate-700 text-center text-xs text-slate-500">
                لم يتم اختيار أي شاشات بعد. اختر من شاشات النظام أدناه أو أضف شاشات جديدة.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                {selectedScreens.map((s) => {
                  const SIcon = getLucideIcon(s.iconName);
                  return (
                    <div
                      key={s.href}
                      className="px-2.5 py-1 rounded-xl bg-slate-800 border border-slate-700 flex items-center gap-2 text-xs group hover:border-slate-600 transition"
                    >
                      <SIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span className="font-bold text-slate-200">{s.label}</span>
                      {s.isCustom && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                          مخصصة
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveScreen(s.href)}
                        className="text-slate-400 hover:text-rose-400 transition"
                        title="إزالة من الأيقونة"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. تبويب اختيار الشاشات: شاشات النظام القديمة أو شاشات جديدة مخصصة */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-3">
            {/* التبديل بين شاشات النظام والشاشات الجديدة */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setScreenTab('EXISTING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  screenTab === 'EXISTING'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>اختيار من شاشات النظام الحالية ({allSystemScreens.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setScreenTab('NEW')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  screenTab === 'NEW'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>➕ إضافة شاشة مخصصة جديدة</span>
              </button>
            </div>

            {/* تبويب الشاشات الحالية */}
            {screenTab === 'EXISTING' && (
              <div className="space-y-3">
                {/* البحث والفلترة */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="ALL">كافة أقسام المنظومة</option>
                      {moduleCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleSelectAllFiltered(filteredExistingScreens, true)}
                      className="text-[11px] text-teal-400 hover:underline font-bold"
                    >
                      تحديد الكل الظاهر
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllFiltered(filteredExistingScreens, false)}
                      className="text-[11px] text-slate-400 hover:underline"
                    >
                      إلغاء تحديد الظاهر
                    </button>
                  </div>

                  <div className="relative w-full sm:w-60">
                    <input
                      type="text"
                      value={screenSearch}
                      onChange={(e) => setScreenSearch(e.target.value)}
                      placeholder="بحث في شاشات النظام..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
                  </div>
                </div>

                {/* قائمة الشاشات مع مربعات الاختيار */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1">
                  {filteredExistingScreens.map((screen) => {
                    const isSelected = selectedScreens.some((s) => s.href === screen.href);
                    const SIcon = getLucideIcon(screen.iconName);

                    return (
                      <div
                        key={screen.href}
                        onClick={() => toggleScreenSelection(screen)}
                        className={`p-2 rounded-xl border cursor-pointer transition flex items-start gap-2.5 text-xs select-none ${
                          isSelected
                            ? 'bg-teal-950/70 border-teal-500/80 shadow-sm'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-teal-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500" />
                          )}
                        </div>

                        <div className="overflow-hidden flex-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-200">
                            <SIcon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                            <span className="truncate">{screen.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                            {screen.tag || screen.href}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* تبويب إضافة شاشة جديدة مخصصة */}
            {screenTab === 'NEW' && (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                <span className="font-bold text-amber-400 block">
                  إضافة شاشة جديدة (قد تكون رابط داخلي جديد أو شاشة خارجية أو مسار خاص):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">اسم الشاشة الجديدة:</label>
                    <input
                      type="text"
                      value={newScreenLabel}
                      onChange={(e) => setNewScreenLabel(e.target.value)}
                      placeholder="مثال: شاشة تتبع طلبات فرع المعادي"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">المسار أو الرابط (URL / Path):</label>
                    <input
                      type="text"
                      value={newScreenHref}
                      onChange={(e) => setNewScreenHref(e.target.value)}
                      placeholder="مثال: /orders/maadi-special أو https://..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100 font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">الوصف المختصر (Tag):</label>
                    <input
                      type="text"
                      value={newScreenTag}
                      onChange={(e) => setNewScreenTag(e.target.value)}
                      placeholder="مثال: طلبات خاصة • إشراف فوري"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">أيقونة الشاشة:</label>
                    <select
                      value={newScreenIcon}
                      onChange={(e) => setNewScreenIcon(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-slate-100"
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.name} value={opt.name}>
                          {opt.label} ({opt.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddNewCustomScreen}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إدراج الشاشة داخل هذه الأيقونة</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3 shrink-0">
          <div>
            {editingIcon && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/60 border border-rose-800/50 flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف الأيقونة</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ الأيقونة والشاشات'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
