'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  PhoneCall,
  Search,
  User,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Send,
  Printer,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  ArrowRight,
  Building,
  DollarSign,
  Tag,
  FileText,
  Boxes,
} from 'lucide-react';
import Link from 'next/link';

interface CustomerAddress {
  id: string;
  label: string;
  streetAddress: string;
  landmark?: string;
  floor?: string;
  apartment?: string;
  isDefault: boolean;
  zoneId?: string;
  zoneName?: string;
  deliveryFee: number;
  estimatedMinutes: number;
  branchId?: string;
  branchName?: string;
}

interface CustomerProfile {
  id: string;
  customerName: string;
  customerCode: string;
  phone: string;
  email?: string;
  trustScore: number;
  complaintsCount: number;
  preferencesNotes?: string;
  addresses: CustomerAddress[];
}

interface OrderItemLine {
  lineId?: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  batchId?: string;
  batchNumber?: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: string;
  deliveryStatus: string;
  totalAmount: number;
  branchName?: string;
  items: OrderItemLine[];
}

interface DeliveryZone {
  id: string;
  name: string;
  branchId: string;
  branchName?: string;
  deliveryFee: number;
  estimatedMinutes: number;
}

interface ProductBatch {
  batchId: string;
  batchNumber: string;
  currentQuantity: number;
  expiryDate: string;
}

interface ProductCatalogItem {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  basePrice: number;
  totalStock: number;
  batches: ProductBatch[];
  recommendedBatch?: ProductBatch | null;
}

interface CartItem {
  itemId: string;
  name: string;
  code: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  batchId?: string;
  batchNumber?: string;
  notes?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function CallCenterWorkspacePage() {
  // 1. Phone search & Customer state
  const [phoneQuery, setPhoneQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);

  // New Customer Form modal
  const [showNewCustModal, setShowNewCustModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  // New Address modal
  const [showNewAddrModal, setShowNewAddrModal] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState('المنزل');
  const [newAddrStreet, setNewAddrStreet] = useState('');
  const [newAddrLandmark, setNewAddrLandmark] = useState('');
  const [newAddrFloor, setNewAddrFloor] = useState('');
  const [newAddrApt, setNewAddrApt] = useState('');
  const [newAddrZoneId, setNewAddrZoneId] = useState('');

  // 2. Zones & Covering Branch Catalog
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [coveringBranchId, setCoveringBranchId] = useState<string>('1');
  const [coveringBranchName, setCoveringBranchName] = useState<string>('الفرع الرئيسي');
  const [catalog, setCatalog] = useState<ProductCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [productSearch, setProductSearch] = useState<string>('');

  // 3. Cart & Order Execution
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<'BRANCH_READY' | 'CUSTOM_PRODUCTION'>('BRANCH_READY');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Confirmation modal
  const [orderConfirmation, setOrderConfirmation] = useState<any>(null);

  // Load Zones on Mount
  useEffect(() => {
    fetchDeliveryZones();
  }, []);

  // Fetch Zones
  const fetchDeliveryZones = async () => {
    try {
      const res = await axios.get(`${API_BASE}/call-center/zones`);
      if (res.data?.success) {
        setZones(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch zones:', err);
    }
  };

  // Fetch Catalog for Covering Branch
  const fetchBranchCatalog = async (branchId: string) => {
    setCatalogLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/call-center/branch-stock?branchId=${branchId}`);
      if (res.data?.success) {
        setCatalog(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stock catalog:', err);
    } finally {
      setCatalogLoading(false);
    }
  };

  // Load default branch catalog initially
  useEffect(() => {
    fetchBranchCatalog(coveringBranchId);
  }, [coveringBranchId]);

  // Lookup Customer by Phone
  const handlePhoneLookup = async (phoneToSearch?: string) => {
    const q = (phoneToSearch || phoneQuery).trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const res = await axios.get(`${API_BASE}/call-center/customer/lookup?phone=${encodeURIComponent(q)}`);
      if (res.data?.success && res.data.data.isFound) {
        const c: CustomerProfile = res.data.data.customer;
        setCustomer(c);
        setRecentOrders(res.data.data.recentOrders || []);

        // Pick default address or first address
        if (c.addresses && c.addresses.length > 0) {
          const defaultAddr = c.addresses.find((a) => a.isDefault) || c.addresses[0];
          selectCustomerAddress(defaultAddr);
        } else {
          setSelectedAddress(null);
        }
      } else {
        // Customer not found, prompt create modal
        setCustomer(null);
        setRecentOrders([]);
        setSelectedAddress(null);
        setNewCustPhone(q);
        setShowNewCustModal(true);
      }
    } catch (err) {
      console.error('Error looking up customer:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Select an address and update the covering branch
  const selectCustomerAddress = (addr: CustomerAddress) => {
    setSelectedAddress(addr);
    if (addr.branchId) {
      setCoveringBranchId(addr.branchId);
      setCoveringBranchName(addr.branchName || 'فرع التغطية المعتمد');
    }
  };

  // Quick Customer Creation
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    try {
      const res = await axios.post(`${API_BASE}/call-center/customer`, {
        name: newCustName,
        phone: newCustPhone,
        address: newCustAddress,
        notes: newCustNotes,
      });

      if (res.data?.success) {
        setShowNewCustModal(false);
        setPhoneQuery(newCustPhone);
        await handlePhoneLookup(newCustPhone);
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
      alert('تعذر إنشاء العميل');
    }
  };

  // Add New Address for Customer
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || !newAddrStreet) return;

    try {
      const res = await axios.post(`${API_BASE}/call-center/customer/address`, {
        customerId: customer.id,
        zoneId: newAddrZoneId || (zones.length > 0 ? zones[0].id : undefined),
        label: newAddrLabel,
        streetAddress: newAddrStreet,
        landmark: newAddrLandmark,
        floor: newAddrFloor,
        apartment: newAddrApt,
        isDefault: true,
      });

      if (res.data?.success) {
        setShowNewAddrModal(false);
        setNewAddrStreet('');
        setNewAddrLandmark('');
        // Refresh customer data
        await handlePhoneLookup(customer.phone);
      }
    } catch (err) {
      console.error('Failed to add address:', err);
      alert('تعذر إضافة العنوان');
    }
  };

  // Add product to cart
  const addToCart = (product: ProductCatalogItem, selectedBatch?: ProductBatch | null) => {
    const batchToUse = selectedBatch || product.recommendedBatch;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.itemId === product.id && i.batchId === batchToUse?.batchId
      );

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex].quantity += 1;
        return next;
      } else {
        return [
          ...prev,
          {
            itemId: product.id,
            name: product.name,
            code: product.code,
            unit: product.unit,
            unitPrice: product.basePrice,
            quantity: 1,
            batchId: batchToUse?.batchId,
            batchNumber: batchToUse?.batchNumber,
          },
        ];
      }
    });
  };

  // 1-Click Reorder from Previous Orders
  const handleQuickReorder = (order: RecentOrder) => {
    if (!order.items || order.items.length === 0) return;

    const newCartItems: CartItem[] = order.items.map((item) => ({
      itemId: item.itemId,
      name: item.itemName,
      code: item.itemCode,
      unit: 'قطعة',
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      batchId: item.batchId,
      batchNumber: item.batchNumber,
    }));

    setCart(newCartItems);
  };

  // Update Cart Quantity
  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index].quantity = newQty;
      }
      return next;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  const deliveryFee = selectedAddress?.deliveryFee ?? (zones[0]?.deliveryFee || 25);
  const grandTotal = subtotal + (cart.length > 0 ? deliveryFee : 0);

  // Submit Order to Backend
  const handleSubmitOrder = async () => {
    if (!customer) {
      alert('يرجى تحديد أو تسجيل العميل أولاً');
      return;
    }
    if (cart.length === 0) {
      alert('السلة فارغة! يرجى إضافة أصناف للطلب');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: customer.id,
        customerName: customer.customerName,
        phone: customer.phone,
        addressId: selectedAddress?.id,
        branchId: coveringBranchId,
        deliveryZoneId: selectedAddress?.zoneId,
        deliveryFee,
        orderType,
        notes: orderNotes,
        items: cart.map((i) => ({
          itemId: i.itemId,
          batchId: i.batchId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          notes: i.notes,
        })),
      };

      const res = await axios.post(`${API_BASE}/call-center/orders`, payload);
      if (res.data?.success) {
        setOrderConfirmation(res.data.data);
        setCart([]);
        setOrderNotes('');
        // Refresh customer recent orders
        handlePhoneLookup(customer.phone);
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      alert(err.response?.data?.message || 'تعذر إرسال الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trust Score Color Resolver
  const getTrustBadge = (score: number) => {
    if (score >= 90) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        label: 'عميل ذهبي وموثوق (90%+)',
        icon: ShieldCheck,
      };
    }
    if (score >= 70) {
      return {
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        label: 'مصداقية جيدة (70-89%)',
        icon: ShieldCheck,
      };
    }
    return {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      label: 'عميل قيد التدقيق / شكاوى متكررة',
      icon: AlertTriangle,
    };
  };

  // Filter Categories
  const categories = ['ALL', ...Array.from(new Set(catalog.map((c) => c.category)))];
  const filteredCatalog = catalog.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      !productSearch ||
      item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      item.code.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-950 text-slate-100 font-sans overflow-hidden" dir="rtl">
      {/* 1. Header Toolbar */}
      <div className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg shadow-sm">
            <PhoneCall className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              منظومة عمليات الكول سنتر والتوصيل الذكي
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                FEFO Direct Link
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              ربط فوري بين العنوان، الفرع المغطّي، أرصدة التشغيلات، ومحرك فحص المصداقية
            </p>
          </div>
        </div>

        {/* Quick Nav Pills */}
        <div className="flex items-center gap-2">
          <Link
            href="/call-center/dispatch"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            شاشة متابعة الطيارين (Dispatch)
          </Link>
          <Link
            href="/call-center/complaints"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-medium rounded-lg border border-rose-900/40 transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            رادار الشكاوى والتتبع الأمامي
          </Link>
        </div>
      </div>

      {/* 2. Main 3-Column Compact Grid */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden divide-x divide-x-reverse divide-slate-800/80">
        {/* ======================================================== */}
        {/* RIGHT COLUMN: Customer Profile & Quick 1-Click Reorder (Col 3.5) */}
        {/* ======================================================== */}
        <div className="col-span-12 lg:col-span-3 bg-slate-900/60 p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
          {/* Phone Search Bar */}
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80 shadow-sm">
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
              <span>البحث برقم الهاتف / المحمول:</span>
              <span className="text-[10px] text-indigo-400">تسجيل مكالمة فوري</span>
            </label>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="010 / 011 / 012 / 015..."
                  value={phoneQuery}
                  onChange={(e) => setPhoneQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneLookup()}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none font-mono"
                  dir="ltr"
                />
              </div>
              <button
                onClick={() => handlePhoneLookup()}
                disabled={isSearching}
                className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center transition disabled:opacity-50"
                title="بحث"
              >
                {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Customer Details Card */}
          {customer ? (
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/80 space-y-2.5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                    <User className="w-4 h-4 text-indigo-400" />
                    {customer.customerName}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{customer.phone}</p>
                </div>
                {/* Trust Score Badge */}
                {(() => {
                  const badge = getTrustBadge(customer.trustScore);
                  const Icon = badge.icon;
                  return (
                    <div
                      className={`px-2 py-1 rounded-md text-[11px] font-bold border flex items-center gap-1 ${badge.bg}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{customer.trustScore}%</span>
                    </div>
                  );
                })()}
              </div>

              {/* Preferences & Complaint stats */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">إجمالي الشكاوى</span>
                  <span className={`font-bold ${customer.complaintsCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {customer.complaintsCount} شكاوى
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">العناوين المسجلة</span>
                  <span className="font-bold text-slate-200">{customer.addresses.length} عنوان</span>
                </div>
              </div>

              {customer.preferencesNotes && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-xs text-amber-300">
                  <span className="font-bold text-[10px] block text-amber-400">ملاحظات التفضيل الدائمة:</span>
                  {customer.preferencesNotes}
                </div>
              )}

              {/* Saved Addresses Selector */}
              <div className="pt-2 border-t border-slate-700/60">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                    عناوين التوصيل:
                  </span>
                  <button
                    onClick={() => setShowNewAddrModal(true)}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> إضافة عنوان
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {customer.addresses.map((addr) => {
                    const isSelected = selectedAddress?.id === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => selectCustomerAddress(addr)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                            : 'bg-slate-900/50 border-slate-700/60 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between font-medium">
                          <span>
                            {addr.label} - {addr.streetAddress}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                            {addr.deliveryFee} ج.م
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-1">
                          <span>المنطقة: {addr.zoneName || 'عام'}</span>
                          <span>•</span>
                          <span className="text-emerald-400">الفرع: {addr.branchName || 'الرئيسي'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 1-Click Reorder (Recent Orders) */}
              <div className="pt-2 border-t border-slate-700/60">
                <span className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>آخر الطلبات (إعادة طلب سريعة):</span>
                  <span className="text-[10px] text-slate-400">{recentOrders.length} طلبات</span>
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {recentOrders.length === 0 ? (
                    <p className="text-[11px] text-slate-500 text-center py-2">لا توجد طلبات سابقة مسجلة</p>
                  ) : (
                    recentOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-2 bg-slate-900/70 border border-slate-800 rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-indigo-300 font-bold">{ord.orderNumber}</span>
                          <span className="text-slate-400 text-[10px]">{ord.totalAmount} ج.م</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {ord.items.map((i) => `${i.itemName} (${i.quantity})`).join('، ')}
                        </p>
                        <button
                          onClick={() => handleQuickReorder(ord)}
                          className="w-full py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 rounded text-[11px] font-medium transition flex items-center justify-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          إعادة الطلب بضغطة واحدة
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-6 text-center text-slate-500 flex flex-col items-center justify-center">
              <User className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-xs font-medium">أدخل رقم هاتف العميل لبدء المعالجة الذكية للطلب</p>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CENTER COLUMN: Catalog & FEFO Real-Time Branch Stock (Col 5.5) */}
        {/* ======================================================== */}
        <div className="col-span-12 lg:col-span-5 bg-slate-950 p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
          {/* Covering Branch Live Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-2.5 rounded-xl border border-indigo-900/40 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-[10px] text-slate-400 block">الفرع المغطي للعنوان الحالي:</span>
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {coveringBranchName}
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </span>
              </div>
            </div>
            <div className="text-left text-xs font-mono">
              <span className="text-slate-400 text-[10px] block">رسوم التوصيل المقدرة</span>
              <span className="font-bold text-amber-400">{deliveryFee} ج.م</span>
            </div>
          </div>

          {/* Search & Category Pills */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث في أصناف الفرع المتاحة..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2" />
            </div>

            {/* Category tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg shrink-0 transition text-[11px] font-medium ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat === 'ALL' ? 'كافة الأصناف' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items High-Density Grid */}
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {catalogLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs">جاري جلب أرصدة وتشغيلات الفرع...</div>
            ) : filteredCatalog.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">لا توجد أصناف تطابق البحث</div>
            ) : (
              filteredCatalog.map((item) => {
                const hasStock = item.totalStock > 0;
                const recBatch = item.recommendedBatch;

                return (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">[{item.code}]</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        <span className="text-amber-400 font-bold">{item.basePrice} ج.م</span>
                        <span>•</span>
                        <span>الوحدة: {item.unit}</span>
                        <span>•</span>
                        {/* FEFO Stock Badge */}
                        <span
                          className={`font-semibold ${
                            hasStock ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          المتاح: {item.totalStock} {item.unit}
                        </span>
                      </div>

                      {/* Batch Pill (FEFO priority) */}
                      {recBatch ? (
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-indigo-300 bg-indigo-950/40 border border-indigo-900/40 px-2 py-0.5 rounded w-fit">
                          <Layers className="w-3 h-3 text-indigo-400" />
                          <span>التشغيلة الحالية: {recBatch.batchNumber}</span>
                          <span className="text-slate-400">({recBatch.currentQuantity} ق)</span>
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-amber-500/80">بدون تشغيلة محجوزة</div>
                      )}
                    </div>

                    {/* Quick Add Button */}
                    <button
                      onClick={() => addToCart(item)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* LEFT COLUMN: Cart, Order Type, and Dispatch Checkout (Col 3.5) */}
        {/* ======================================================== */}
        <div className="col-span-12 lg:col-span-4 bg-slate-900/60 p-3 overflow-y-auto flex flex-col justify-between gap-3 custom-scrollbar">
          <div className="space-y-3">
            {/* Order Mode Toggle */}
            <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setOrderType('BRANCH_READY')}
                className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  orderType === 'BRANCH_READY'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                فوري من الفرع (FEFO)
              </button>
              <button
                type="button"
                onClick={() => setOrderType('CUSTOM_PRODUCTION')}
                className={`py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
                  orderType === 'CUSTOM_PRODUCTION'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                طلب خاص للمصنع (MES)
              </button>
            </div>

            {/* Cart Header */}
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                سلة الطلب ({cart.length} أصناف)
              </span>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-rose-400 hover:text-rose-300 text-[11px]"
                >
                  تفريغ السلة
                </button>
              )}
            </div>

            {/* Cart Items Table */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  السلة فارغة، اختر الأصناف من كتالوج الفرع
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={`${item.itemId}-${item.batchId}-${idx}`}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate">{item.name}</span>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{item.unitPrice} ج.م × {item.quantity} = <strong className="text-white">{item.unitPrice * item.quantity} ج.م</strong></span>
                      {item.batchNumber && (
                        <span className="text-[10px] text-indigo-400 font-mono">#{item.batchNumber}</span>
                      )}
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => updateQuantity(idx, -1)}
                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center justify-center font-bold"
                      >
                        -
                      </button>
                      <span className="font-bold text-white px-2 font-mono">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(idx, 1)}
                        className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-white rounded flex items-center justify-center font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Order Notes */}
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">ملاحظات التوصيل والتجهيز:</label>
              <textarea
                rows={2}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="ملاحظات الشيف، تغليف هدايا، تفاصيل العنوان..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600 outline-none resize-none"
              />
            </div>
          </div>

          {/* Checkout Totals & Submit */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>إجمالي الأصناف:</span>
                <span className="font-mono text-white">{subtotal.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>رسوم التوصيل:</span>
                <span className="font-mono text-white">{cart.length > 0 ? deliveryFee : 0} ج.م</span>
              </div>
              <div className="pt-1.5 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>المبلغ المستحق:</span>
                <span className="font-mono text-amber-400">{grandTotal.toFixed(2)} ج.م</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  جاري توجيه الطلب...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  تأكيد وإرسال الأوردر للفرع
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: New Customer Quick Registration */}
      {/* ======================================================== */}
      {showNewCustModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                تسجيل عميل كول سنتر جديد
              </h3>
              <button
                onClick={() => setShowNewCustModal(false)}
                className="text-slate-500 hover:text-white text-xs"
              >
                إلغاء
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">اسم العميل:</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="محمد أحمد عادل"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">رقم المحمول:</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none font-mono"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">العنوان المبدئي:</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="شارع النصر، الدور 4، شقة 12"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">ملاحظات دائمة للعميل:</label>
                <textarea
                  rows={2}
                  value={newCustNotes}
                  onChange={(e) => setNewCustNotes(e.target.value)}
                  placeholder="تفضيلات المذاق أو مواعيد التوصيل..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
                >
                  حفظ وتسجيل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: New Address */}
      {/* ======================================================== */}
      {showNewAddrModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                إضافة عنوان توصيل جديد
              </h3>
              <button
                onClick={() => setShowNewAddrModal(false)}
                className="text-slate-500 hover:text-white text-xs"
              >
                إلغاء
              </button>
            </div>

            <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">تسمية العنوان:</label>
                  <input
                    type="text"
                    required
                    value={newAddrLabel}
                    onChange={(e) => setNewAddrLabel(e.target.value)}
                    placeholder="المنزل / العمل / فيلا الشيخ زايد"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">منطقة التغطية:</label>
                  <select
                    value={newAddrZoneId}
                    onChange={(e) => setNewAddrZoneId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.deliveryFee} ج.م)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">العنوان بالتفصيل:</label>
                <input
                  type="text"
                  required
                  value={newAddrStreet}
                  onChange={(e) => setNewAddrStreet(e.target.value)}
                  placeholder="اسم الشارع ورقم العمارة"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">علامة مميزة:</label>
                  <input
                    type="text"
                    value={newAddrLandmark}
                    onChange={(e) => setNewAddrLandmark(e.target.value)}
                    placeholder="بجوار..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الدور:</label>
                  <input
                    type="text"
                    value={newAddrFloor}
                    onChange={(e) => setNewAddrFloor(e.target.value)}
                    placeholder="4"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">الشقة:</label>
                  <input
                    type="text"
                    value={newAddrApt}
                    onChange={(e) => setNewAddrApt(e.target.value)}
                    placeholder="12"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewAddrModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
                >
                  حفظ العنوان
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: Order Confirmation Slip */}
      {/* ======================================================== */}
      {orderConfirmation && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">تم توجيه وتأكيد الأوردر بنجاح!</h3>
              <p className="text-xs text-slate-400 mt-1">
                رقم البوليصة: <strong className="text-indigo-400 font-mono text-sm">{orderConfirmation.order?.order_number}</strong>
              </p>
            </div>

            {orderConfirmation.mesWorkOrderNumber && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-xs text-amber-300 text-right">
                <span className="font-bold block text-amber-400">أمر تشغيل مصنعي (MES):</span>
                تم إرسال أمر الإنتاج الخاص رقم: <strong className="font-mono">{orderConfirmation.mesWorkOrderNumber}</strong>
              </div>
            )}

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-right space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>الفرع المستلم:</span>
                <span className="text-white font-medium">{orderConfirmation.order?.branches?.branch_name || coveringBranchName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>حالة التجهيز:</span>
                <span className="text-emerald-400 font-bold">{orderConfirmation.order?.delivery_status}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>الإجمالي المحصّل:</span>
                <span className="text-amber-400 font-bold font-mono">{orderConfirmation.order?.total_amount} ج.م</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setOrderConfirmation(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
              >
                إغلاق والعودة
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                طباعة البوليصة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
