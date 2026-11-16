'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as XLSX from 'xlsx';
import axios from 'axios';
import {
  Sparkles,
  ClipboardCheck,
  Users,
  MapPin,
  Droplets,
  Download,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';

interface HousekeepingHeaderProps {
  title: string;
  subtitle: string;
  entityName: 'tasks' | 'workers' | 'zones' | 'supplies' | 'hygiene';
  exportData?: any[];
  exportFileName?: string;
  onImportSuccess?: () => void;
  primaryAction?: {
    label: string;
    onClick: () => void;
    icon?: any;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: any;
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function HousekeepingHeader({
  title,
  subtitle,
  entityName,
  exportData,
  exportFileName,
  onImportSuccess,
  primaryAction,
  secondaryAction,
}: HousekeepingHeaderProps) {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // التبويبات الموحدة لموديول الإشراف الداخلي
  const navTabs = [
    {
      name: 'شاشة المشرف الميداني (موبايل/تابلت)',
      href: '/housekeeping/supervisor-log',
      icon: Smartphone,
    },
    {
      name: 'لوحة متابعة النظافة والـ SSOP',
      href: '/housekeeping/dashboard',
      icon: Sparkles,
    },
    {
      name: 'سجل العمال وأكوادهم',
      href: '/housekeeping/workers',
      icon: Users,
    },
    {
      name: 'خريطة المناطق وقوائم الفحص',
      href: '/housekeeping/zones',
      icon: MapPin,
    },
    {
      name: 'مخزن المنظفات والأدوات الملونة',
      href: '/housekeeping/supplies',
      icon: Droplets,
    },
  ];

  // 1. التصدير المباشر لـ Excel
  const handleExport = async () => {
    try {
      if (exportData && exportData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'البيانات');
        XLSX.writeFile(wb, `${exportFileName || 'بيانات_الإشراف_الداخلي'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      } else {
        // الاستدعاء من الباك إند
        const res = await axios.get(`${API_BASE}/housekeeping/excel/export/${entityName}`, {
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${exportFileName || 'سجل_الإشراف_الداخلي'}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err: any) {
      console.error('Export error:', err);
      setImportMsg({ text: 'فشل تصدير ملف Excel، يرجى المحاولة لاحقاً', type: 'error' });
      setTimeout(() => setImportMsg(null), 4000);
    }
  };

  // 2. الاستيراد الجماعي من Excel
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMsg(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات صالحة');
        }

        const res = await axios.post(`${API_BASE}/housekeeping/excel/import/${entityName}`, {
          rows: data,
        });

        setImportMsg({
          text: res.data.message || `تم استيراد ${data.length} سجل بنجاح`,
          type: 'success',
        });

        if (onImportSuccess) {
          onImportSuccess();
        }
      } catch (err: any) {
        console.error('Import error:', err);
        setImportMsg({
          text: err.response?.data?.message || err.message || 'حدث خطأ أثناء معالجة واستيراد ملف Excel',
          type: 'error',
        });
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setImportMsg(null), 5000);
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-100 px-4 py-3 sticky top-0 z-30 shadow-md">
      {/* الصف العلوي: العنوان والأدوات */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100">{title}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                منظومة الإشراف الداخلي والـ SSOP
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* أزرار العمليات والتصدير والاستيراد الموحدة */}
        <div className="flex items-center flex-wrap gap-2">
          {/* مدخل ملف Excel الخفي */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".xlsx, .xls"
            className="hidden"
          />

          {/* زر استيراد Excel */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 transition-colors shadow-sm disabled:opacity-50"
            title="استيراد كشف Excel بالجملة"
          >
            {importing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>استيراد Excel</span>
          </button>

          {/* زر تصدير Excel */}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-300 transition-colors shadow-sm"
            title="تصدير كشف Excel فوري"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير Excel</span>
          </button>

          {/* الإجراء الثانوي إن وجد */}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors shadow-sm"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-3.5 h-3.5" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}

          {/* الإجراء الرئيسي إن وجد */}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-colors shadow-sm shadow-teal-900/30"
            >
              {primaryAction.icon ? (
                <primaryAction.icon className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* رسالة إشعار الاستيراد إن وجدت */}
      {importMsg && (
        <div
          className={`mb-2 px-3 py-2 rounded-lg text-xs flex items-center gap-2 border ${
            importMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/90 border-rose-700 text-rose-200'
          }`}
        >
          {importMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{importMsg.text}</span>
        </div>
      )}

      {/* شريط التبويبات للتنقل السريع بين شاشات الإشراف الداخلي */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs border-t border-slate-800/80 pt-2 scrollbar-none">
        {navTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-teal-600/30 text-teal-300 border border-teal-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
