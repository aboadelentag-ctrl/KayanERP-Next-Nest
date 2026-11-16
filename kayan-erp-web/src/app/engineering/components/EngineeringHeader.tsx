'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as XLSX from 'xlsx';
import axios from 'axios';
import {
  Wrench,
  Layers,
  Settings,
  Boxes,
  Users,
  Download,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface EngineeringHeaderProps {
  title: string;
  subtitle: string;
  entityName: 'tickets' | 'workshops' | 'assets' | 'materials' | 'staff' | 'fabrication-orders';
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

export default function EngineeringHeader({
  title,
  subtitle,
  entityName,
  exportData,
  exportFileName,
  onImportSuccess,
  primaryAction,
  secondaryAction,
}: EngineeringHeaderProps) {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  // Navigation Tabs
  const navTabs = [
    { href: '/engineering/tickets', label: 'تذاكر الصيانة والمهام الطارئة', icon: Wrench },
    { href: '/engineering/workshops', label: 'الورش والتصنيع الداخلي', icon: Layers },
    { href: '/engineering/assets', label: 'سجل الأصول الهندسية', icon: Settings },
    { href: '/engineering/inventory', label: 'مخزن الخامات وقطع الغيار', icon: Boxes },
    { href: '/engineering/staff', label: 'فريق المهندسين والفنيين', icon: Users },
  ];

  // 1. Export Excel Handler
  const handleExport = () => {
    if (exportData && exportData.length > 0) {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 30));
      const fn = exportFileName || `${entityName}_${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fn);
    } else {
      // Direct Download from API endpoint
      window.open(`${API_BASE}/engineering/excel/export/${entityName}`, '_blank');
    }
  };

  // 2. Import Excel Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportMsg(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          alert('ملف Excel فارغ أو لا يحتوي على صفوف بيانات!');
          setImporting(false);
          return;
        }

        const res = await axios.post(`${API_BASE}/engineering/excel/import/${entityName}`, {
          rows,
        });

        if (res.data?.success) {
          setImportMsg(res.data.message || `تم استيراد ${rows.length} سجل بنجاح`);
          if (onImportSuccess) {
            onImportSuccess();
          }
        } else {
          alert(res.data?.message || 'تعذر استيراد الملف');
        }
      } catch (err: any) {
        console.error('Import error:', err);
        alert('حدث خطأ أثناء معالجة ملف Excel');
      } finally {
        setImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-slate-100 font-sans shadow-sm" dir="rtl">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Top Banner & Title */}
      <div className="px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 rounded-xl shadow-md text-slate-950 font-black">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              {title}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                CMMS & Fabrication
              </span>
            </h1>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        {/* Global Toolbar: Excel Export/Import + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Excel Button */}
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            title="تصدير السجلات الحالية كملف Excel"
          >
            <Download className="w-3.5 h-3.5" />
            تصدير Excel
          </button>

          {/* Import Excel Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="استيراد وتحديث البيانات من ملف Excel"
          >
            {importing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            استيراد Excel
          </button>

          {/* Secondary Action (e.g. + إضافة مسار) */}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              {secondaryAction.icon ? (
                <secondaryAction.icon className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {secondaryAction.label}
            </button>
          )}

          {/* Primary Action (e.g. + بلاغ صيانة / + أمر تصنيع) */}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              {primaryAction.icon ? (
                <primaryAction.icon className="w-3.5 h-3.5" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>

      {/* Import Notification Banner if active */}
      {importMsg && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-1.5 text-xs text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {importMsg}
          </span>
          <button onClick={() => setImportMsg(null)} className="text-emerald-400 hover:text-white font-bold text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="px-4 sm:px-6 flex items-center gap-1 overflow-x-auto py-1.5 custom-scrollbar text-xs">
        {navTabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
