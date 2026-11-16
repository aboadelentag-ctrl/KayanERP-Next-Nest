'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface CustomScreen {
  id?: string;
  href: string;
  label: string;
  tag?: string;
  iconName?: string;
  isCustom?: boolean;
  category?: string;
}

export interface CustomAppIcon {
  id: string;
  title: string;
  icon_name: string;
  color: string;
  badge_text?: string | null;
  show_in_navbar: boolean;
  show_in_tabs: boolean;
  order_index: number;
  screens_json: CustomScreen[];
}

interface CustomIconsContextType {
  icons: CustomAppIcon[];
  loading: boolean;
  activeTabId: string; // 'ALL' or icon ID
  setActiveTabId: (id: string) => void;
  isModalOpen: boolean;
  editingIcon: CustomAppIcon | null;
  openModal: (icon?: CustomAppIcon | null) => void;
  closeModal: () => void;
  createIcon: (data: Partial<CustomAppIcon>) => Promise<CustomAppIcon>;
  updateIcon: (id: string, data: Partial<CustomAppIcon>) => Promise<CustomAppIcon>;
  deleteIcon: (id: string) => Promise<void>;
  refreshIcons: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const STORAGE_KEY = 'kayan_custom_icons_cache';

export const DEFAULT_SEEDED_ICONS: CustomAppIcon[] = [
  {
    id: '1',
    title: 'الإنتاج و MES',
    icon_name: 'Factory',
    color: 'amber',
    badge_text: 'صناعي',
    show_in_navbar: true,
    show_in_tabs: true,
    order_index: 1,
    screens_json: [
      { href: '/mes/shop-floor', label: 'صالة التصنيع الرقمية', tag: 'Shop Floor MES • شاشات لمس صناعية', iconName: 'Factory' },
      { href: '/transfers/finished-goods', label: 'استلام وتسليم المنتج التام', tag: 'تسليم الصالة • ميزان التكاليف • فحص الجودة • استلام الكنترول', iconName: 'Scale' },
      { href: '/transfers/finished-goods?tab=rework', label: 'مرتجعات صالة الإنتاج والتعديل', tag: 'دفعات إعادة التشغيل • الإجراءات التصحيحية', iconName: 'RotateCcw' },
      { href: '/transfers/finished-goods?tab=disputes', label: 'لجان النزاعات النشطة', tag: 'نزاعات ميزان التكاليف والكنترول • محاضر اللجان', iconName: 'Gavel' },
      { href: '/production', label: 'أوامر الإنتاج والتشغيل', tag: 'أوامر الإطلاق الحرجة • أعطال وتشغيلات • تتبع SLA', iconName: 'Flame' },
      { href: '/mes/bom', label: 'هندسة التركيبات (BOM)', tag: 'شجرة المواد Multi-Level • نسب الهدر المعياري', iconName: 'Layers' },
      { href: '/emergency-tasks', label: 'الأوامر الطارئة والتدخل السريع', tag: 'طوارئ SOS • أعطال الماكينات • استجابة فورية', iconName: 'Radio' },
      { href: '/costing', label: 'التكاليف الصناعية والتشغيل', tag: 'تكلفة الدفعة • انحراف المعايير • تحليلات الربح', iconName: 'Calculator' },
      { href: '/requisitions', label: 'طلبات صرف الخامات', tag: 'صرف أوتوماتيكي من المستودعات لصالات التصنيع', iconName: 'FileText' },
    ],
  },
  {
    id: '2',
    title: 'الجودة و HACCP',
    icon_name: 'ShieldCheck',
    color: 'teal',
    badge_text: 'معتمد',
    show_in_navbar: true,
    show_in_tabs: true,
    order_index: 2,
    screens_json: [
      { href: '/quality/inspections', label: 'فحوصات الجودة والحجر', tag: 'IQC • IPQC • OQC • حظر صحي فوري', iconName: 'ShieldCheck' },
      { href: '/transfers/finished-goods?tab=reports', label: 'تقرير الهالك والفحص المعملي', tag: 'تحليل الهدر الفني • عينات المعمل • نسب الإتلاف', iconName: 'FileSpreadsheet' },
      { href: '/transfers/finished-goods?tab=qc', label: 'فحص وتصنيف جودة المنتج التام', tag: 'فحص تشغيلات المنتج التام • العينات والهالك', iconName: 'ShieldCheck' },
      { href: '/quality/ccp-monitor', label: 'المراقبة الميدانية المباشرة (CCP)', tag: 'حرارة الأفران • غرف التجميد • أجهزة المعايرة', iconName: 'Radio' },
      { href: '/forms', label: 'النماذج الديناميكية واستمارات الجودة', tag: 'قوائم التحقق الذكية • فحوصات معتمدة AI', iconName: 'Sparkles' },
      { href: '/ams/tasks', label: 'تطبيقات الذكاء والرصد المدمجة (AMS)', tag: 'الرصد الذاتي • تنبيهات SLA • إشعارات طارئة', iconName: 'BellRing' },
    ],
  },
  {
    id: '3',
    title: 'المستودعات وسلاسل الإمداد',
    icon_name: 'Boxes',
    color: 'blue',
    badge_text: 'مخازن',
    show_in_navbar: true,
    show_in_tabs: true,
    order_index: 3,
    screens_json: [
      { href: '/inventory', label: 'المستودعات وبطاقات الأصناف', tag: 'حجز الأصناف وقوى التوريد • جرد المخازن', iconName: 'Warehouse' },
      { href: '/transfers', label: 'المناقلات والتحويلات الداخلية', tag: 'تحويل بين المستودعات والصالات والمعارض', iconName: 'Truck' },
      { href: '/crates', label: 'الصناديق الدوارة وعهد العملاء', tag: 'أرصدة الصناديق الفارغة للعملاء والمعارض', iconName: 'Boxes' },
      { href: '/procurement', label: 'سجل الموردين وأوامر الشراء', tag: 'مشتريات الخامات • تقييم الموردين • فحص GRN', iconName: 'ShoppingBag' },
    ],
  },
  {
    id: '4',
    title: 'نقاط البيع والمبيعات',
    icon_name: 'Store',
    color: 'emerald',
    badge_text: 'POS',
    show_in_navbar: true,
    show_in_tabs: true,
    order_index: 4,
    screens_json: [
      { href: '/pos/salesman', label: 'بائع المعرض (POS Salesman)', tag: 'إصدار أمر البيع وحجز الصواني • طباعة باركود الاستلام', iconName: 'Store' },
      { href: '/pos/cashier', label: 'الخزينة والكاشير (POS Cashier)', tag: 'تحصيل الإيصالات • فيزا ونقدي وخصومات • إصدار فاتورة ضريبية', iconName: 'Receipt' },
      { href: '/pos/dispatch', label: 'صالة التسليم والتحضير (POS Dispatch)', tag: 'تجهيز صواني التورت والحلويات • تسليم فوري للعميل', iconName: 'PackageCheck' },
      { href: '/sales', label: 'فواتير المبيعات المعتمدة', tag: 'الفواتير والعملاء • ربط مع الضرائب والمالية', iconName: 'Receipt' },
      { href: '/customers', label: 'دليل العملاء وسجل المديونيات', tag: 'بيانات العملاء • حدود الائتمان وسجل الفواتير', iconName: 'Users' },
    ],
  },
];

const CustomIconsContext = createContext<CustomIconsContextType | undefined>(undefined);

export function CustomIconsProvider({ children }: { children: React.ReactNode }) {
  const [icons, setIcons] = useState<CustomAppIcon[]>(DEFAULT_SEEDED_ICONS);
  const [loading, setLoading] = useState(true);
  const [activeTabId, setActiveTabId] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIcon, setEditingIcon] = useState<CustomAppIcon | null>(null);

  // تحميل الكاش الأولي من localStorage لمنع وميض الواجهة
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setIcons(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse cached icons', e);
      }
    }
  }, []);

  const fetchIcons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/navigation/custom-icons`);
      const list = res.data?.data || [];
      setIcons(list);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      }
    } catch (err) {
      console.warn('Failed to fetch custom icons from API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIcons();
  }, [fetchIcons]);

  const openModal = (icon?: CustomAppIcon | null) => {
    setEditingIcon(icon || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingIcon(null);
  };

  const createIcon = async (data: Partial<CustomAppIcon>) => {
    const payload = {
      title: data.title,
      iconName: data.icon_name || 'LayoutGrid',
      color: data.color || 'amber',
      badgeText: data.badge_text,
      showInNavbar: data.show_in_navbar ?? true,
      showInTabs: data.show_in_tabs ?? true,
      orderIndex: data.order_index ?? (icons.length + 1),
      screensJson: data.screens_json || [],
    };

    const res = await axios.post(`${API_BASE}/navigation/custom-icons`, payload);
    const created: CustomAppIcon = res.data?.data;
    const updatedList = [...icons, created];
    setIcons(updatedList);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    }
    return created;
  };

  const updateIcon = async (id: string, data: Partial<CustomAppIcon>) => {
    const payload = {
      title: data.title,
      iconName: data.icon_name,
      color: data.color,
      badgeText: data.badge_text,
      showInNavbar: data.show_in_navbar,
      showInTabs: data.show_in_tabs,
      orderIndex: data.order_index,
      screensJson: data.screens_json,
    };

    const res = await axios.patch(`${API_BASE}/navigation/custom-icons/${id}`, payload);
    const updated: CustomAppIcon = res.data?.data;
    const updatedList = icons.map((ic) => (ic.id === id ? updated : ic));
    setIcons(updatedList);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    }
    return updated;
  };

  const deleteIcon = async (id: string) => {
    await axios.delete(`${API_BASE}/navigation/custom-icons/${id}`);
    const updatedList = icons.filter((ic) => ic.id !== id);
    setIcons(updatedList);
    if (activeTabId === id) {
      setActiveTabId('ALL');
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    }
  };

  return (
    <CustomIconsContext.Provider
      value={{
        icons,
        loading,
        activeTabId,
        setActiveTabId,
        isModalOpen,
        editingIcon,
        openModal,
        closeModal,
        createIcon,
        updateIcon,
        deleteIcon,
        refreshIcons: fetchIcons,
      }}
    >
      {children}
    </CustomIconsContext.Provider>
  );
}

export function useCustomIcons() {
  const context = useContext(CustomIconsContext);
  if (!context) {
    throw new Error('useCustomIcons must be used within a CustomIconsProvider');
  }
  return context;
}
