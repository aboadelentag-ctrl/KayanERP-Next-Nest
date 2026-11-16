'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { 
  FileText, 
  CheckCircle, 
  Upload, 
  Trash2, 
  Send, 
  Loader2, 
  AlertCircle,
  Layers,
  Sparkles,
  ClipboardList,
  Plus,
  Settings2,
  Save,
  Printer,
  X,
  FilePlus,
  Sun,
  Moon,
  Search,
  ChevronDown,
  User,
  Package,
  Clock,
  Building,
  Warehouse,
  Truck,
  Users,
  Tag,
  Check,
  CheckSquare
} from 'lucide-react';

interface DynamicFormDto {
  id: string;
  formName: string;
  formCode: string;
  fieldsSchema: any;
  isActive: boolean;
}

export interface ErpItem {
  id: string;
  code: string;
  name: string;
  label: string;
  extra?: string;
}

// مصفوفة أنواع الحقول المرتبطة بكيانات الـ ERP وشاشات النظام
export const ERP_TYPES: Record<string, { label: string; source: string; codeHint: string; icon: string }> = {
  'erp_employee': { label: '👤 موظف (كود واسم وبحث)', source: 'employees', codeHint: 'رقم الموظف', icon: '👤' },
  'erp_item': { label: '📦 صنف / منتج (كود واسم)', source: 'items', codeHint: 'كود الصنف', icon: '📦' },
  'erp_raw_material': { label: '🌾 خامة أولية / مدخل إنتاج', source: 'raw_materials', codeHint: 'كود الخامة', icon: '🌾' },
  'erp_department': { label: '🏢 إدارة (كود واسم)', source: 'departments', codeHint: 'كود الإدارة', icon: '🏢' },
  'erp_production_line': { label: '⚙️ خط إنتاج / قسم صناعي', source: 'production_lines', codeHint: 'كود الخط', icon: '⚙️' },
  'erp_shift': { label: '⏱️ وردية عمل معتمدة', source: 'shifts', codeHint: 'كود الوردية', icon: '⏱️' },
  'erp_branch': { label: '🏪 فرع معتمد', source: 'branches', codeHint: 'كود الفرع', icon: '🏪' },
  'erp_warehouse': { label: '🏬 مستودع / مخزن', source: 'warehouses', codeHint: 'كود المخزن', icon: '🏬' },
  'erp_customer': { label: '🤝 عميل تجاري', source: 'customers', codeHint: 'كود العميل', icon: '🤝' },
  'erp_supplier': { label: '🚚 مورد معتمد', source: 'suppliers', codeHint: 'كود المورد', icon: '🚚' },
  'erp_asset': { label: '🏷️ أصل ثابت / ماكينة', source: 'assets', codeHint: 'كود الأصل', icon: '🏷️' },
};

// مكون القائمة المنسدلة الذكية للـ ERP مع مربع بحث سريع وعرض الأكواد والأسماء
function SearchableErpSelect({
  items,
  value,
  placeholder,
  onChange,
  isDarkMode,
  disabled = false,
}: {
  items: (ErpItem | string)[];
  value: string;
  placeholder?: string;
  onChange: (item: ErpItem) => void;
  isDarkMode: boolean;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // تطبيع العناصر لهيكل موحد
  const normalizedItems: ErpItem[] = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items.map((it, idx) => {
      if (typeof it === 'string') {
        return { id: String(idx), code: '', name: it, label: it, extra: '' };
      }
      return {
        id: String(it.id || idx),
        code: it.code || '',
        name: it.name || it.label || '',
        label: it.label || (it.code ? `[${it.code}] ${it.name}` : it.name),
        extra: it.extra || '',
      };
    });
  }, [items]);

  // تصفية النتائج فورياً عند الكتابة
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return normalizedItems;
    const term = searchTerm.toLowerCase();
    return normalizedItems.filter(
      (it) =>
        it.name.toLowerCase().includes(term) ||
        it.code.toLowerCase().includes(term) ||
        it.label.toLowerCase().includes(term) ||
        (it.extra && it.extra.toLowerCase().includes(term))
    );
  }, [normalizedItems, searchTerm]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItem = normalizedItems.find(
    (it) => it.label === value || it.name === value || (it.code && it.code === value)
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* زر عرض القائمة المنسدلة */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-2 rounded-xl border text-xs text-right flex items-center justify-between gap-2 transition cursor-pointer ${
          isDarkMode
            ? 'bg-slate-950 border-slate-700 text-slate-100 hover:border-emerald-500'
            : 'bg-white border-slate-300 text-slate-900 hover:border-emerald-500'
        } ${isOpen ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
      >
        <span className="truncate flex items-center gap-1.5 flex-1">
          {selectedItem || value ? (
            <>
              {selectedItem?.code ? (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold">
                  {selectedItem.code}
                </span>
              ) : null}
              <span className="font-semibold text-xs truncate">
                {selectedItem ? selectedItem.name : value}
              </span>
            </>
          ) : (
            <span className="text-slate-400 text-xs">{placeholder || '-- اضغط للاختيار والبحث --'}</span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
      </button>

      {/* نافذة البحث والاختيارات المنسدلة */}
      {isOpen && (
        <div
          className={`absolute z-50 right-0 left-0 mt-1 rounded-xl border shadow-2xl overflow-hidden p-2 space-y-1.5 max-h-72 flex flex-col ${
            isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          {/* مربع البحث اللحظي السريع */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="اكتب كود أو اسم للبحث الفوري..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pr-8 pl-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-black'
              }`}
            />
          </div>

          {/* قائمة النتائج */}
          <div className="overflow-y-auto max-h-52 divide-y divide-slate-800/20 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                {normalizedItems.length === 0 ? 'جاري تحميل البيانات من قاعدة بيانات Neon...' : 'لا توجد نتائج مطابقة لبحثك'}
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full p-2 rounded-lg text-right text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                    isDarkMode
                      ? 'hover:bg-emerald-500/10 hover:text-emerald-300'
                      : 'hover:bg-emerald-50 hover:text-emerald-700'
                  } ${value === item.label || value === item.name || value === item.code ? 'bg-emerald-500/20 font-bold text-emerald-400' : ''}`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {item.code && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold">
                        {item.code}
                      </span>
                    )}
                    <span className="font-semibold text-xs truncate">{item.name}</span>
                  </div>
                  {item.extra && (
                    <span className="text-[10px] text-slate-400 shrink-0 px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/50">
                      {item.extra}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FormViewerPage() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [forms, setForms] = useState<DynamicFormDto[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<DynamicFormDto | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [erpOptions, setErpOptions] = useState<Record<string, ErpItem[]>>({});
  
  const [isDesignMode, setIsDesignMode] = useState<boolean>(false);
  const [isSavingSchema, setIsSavingSchema] = useState<boolean>(false);

  const [isCreatingBlank, setIsCreatingBlank] = useState(false);
  const [blankName, setBlankName] = useState('');
  const [blankCode, setBlankCode] = useState('');

  const [isImporting, setIsImporting] = useState(false);
  const [importName, setImportName] = useState('');
  const [importCode, setImportCode] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  useEffect(() => {
    fetchForms();
    // تحميل مسبق لأهم مصادر الـ ERP من Neon DB لتكون القوائم المنسدلة فورية
    const coreSources = ['employees', 'items', 'raw_materials', 'departments', 'production_lines', 'shifts', 'branches', 'warehouses', 'customers', 'suppliers', 'assets'];
    coreSources.forEach((src) => {
      loadErpSource(src);
    });
  }, []);

  const fetchForms = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:3000/dynamic-forms');
      const data: DynamicFormDto[] = res.data || [];
      setForms(data);
      if (data.length > 0 && !selectedFormId) {
        activateForm(data[0]);
      }
    } catch (err: any) {
      console.warn('Backend server unreachable:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadErpSource = async (source: string) => {
    if (erpOptions[source] && erpOptions[source].length > 0) return;
    try {
      const res = await axios.get(`http://localhost:3000/dynamic-forms/erp-lookups/${source}`);
      const rawData = res.data || [];
      const normalized: ErpItem[] = rawData.map((item: any, idx: number) => {
        if (typeof item === 'string') {
          return { id: String(idx), code: '', name: item, label: item, extra: '' };
        }
        return {
          id: String(item.id || idx),
          code: item.code || '',
          name: item.name || item.label || '',
          label: item.label || (item.code ? `[${item.code}] ${item.name}` : item.name),
          extra: item.extra || '',
        };
      });
      setErpOptions((prev) => ({ ...prev, [source]: normalized }));
    } catch (err) {
      console.error('Error loading ERP lookup:', source, err);
    }
  };

  const activateForm = (current: DynamicFormDto) => {
    setSelectedForm(current);
    setSelectedFormId(String(current.id));
    setFeedback(null);
    setAnswers({});

    try {
      let rawSchema = current.fieldsSchema || (current as any).fields_schema;
      let parsedSchema = rawSchema;

      while (typeof parsedSchema === 'string') {
        try {
          parsedSchema = JSON.parse(parsedSchema);
        } catch {
          break;
        }
      }

      const blocks = parsedSchema?.blocks || parsedSchema?.Blocks || [];
      
      const normalizedSchema = {
        formCode: parsedSchema?.formCode || parsedSchema?.FormCode || current.formCode || (current as any).form_code,
        formTitle: parsedSchema?.formTitle || parsedSchema?.FormTitle || current.formName || (current as any).form_name,
        category: parsedSchema?.category || parsedSchema?.Category || 'عام',
        blocks: blocks.map((b: any, bIdx: number) => {
          const blockType = (b.blockType || b.BlockType || 'fields').toLowerCase();
          let rows = b.rows || b.Rows || [];

          if (blockType === 'table' || blockType === 'custom_rows') {
            const cols = b.columns || b.Columns || [];
            rows = rows.map((r: any, rIdx: number) => {
              if (r.fields && Array.isArray(r.fields)) return r;
              return {
                id: r.id || `r_${rIdx + 1}`,
                label: r.label || r.title || `بند رقم ${rIdx + 1}`,
                fields: cols.length > 0 ? cols.map((c: any) => ({
                  id: `f_${rIdx}_${c.key}`,
                  label: c.title,
                  type: c.columnType || 'text',
                  placeholder: 'اكتب هنا...',
                })) : [
                  { id: `f_${rIdx}_1`, label: 'البيان', type: 'text', placeholder: 'اكتب البيان...' },
                  { id: `f_${rIdx}_2`, label: 'المطابقة', type: 'radio', placeholder: '' },
                ],
              };
            });
          }

          return {
            id: b.id || b.Id || `b_${bIdx}`,
            blockType: blockType === 'table' ? 'custom_rows' : blockType,
            title: b.title || b.Title || '',
            instructionText: b.instructionText || b.InstructionText || '',
            fields: (() => {
              const usedKeys = new Set<string>();
              return (b.fields || b.Fields || []).map((f: any, fIdx: number) => {
                let fKey = String(f.key || f.Key || `field_${fIdx}`).trim();
                if (!fKey || usedKeys.has(fKey)) {
                  fKey = `${fKey || 'field'}_${fIdx + 1}`;
                }
                usedKeys.add(fKey);

                return {
                  id: f.id || f.Id || `f_${bIdx}_${fIdx}`,
                  key: fKey,
                  label: f.label || f.Label || '',
                  fieldType: (f.fieldType || f.FieldType || 'text').toLowerCase(),
                  erpSource: f.erpSource || f.ErpSource || '',
                  manualOptions: f.manualOptions || f.ManualOptions || [],
                  isRequired: f.isRequired ?? f.IsRequired ?? false,
                };
              });
            })(),
            rows,
          };
        }),
      };

      setSchema(normalizedSchema);

      const initialAnswers: Record<string, any> = {};
      for (const block of normalizedSchema.blocks) {
        if (block.fields) {
          for (const field of block.fields) {
            if (field.fieldType === 'date') {
              initialAnswers[field.key] = new Date().toISOString().split('T')[0];
            }
            if (field.fieldType === 'erp_select' && field.erpSource) {
              loadErpSource(field.erpSource);
            }
            if (ERP_TYPES[field.fieldType]) {
              loadErpSource(ERP_TYPES[field.fieldType].source);
            }
          }
        }
        if (block.rows) {
          for (const row of block.rows) {
            for (const field of row.fields || []) {
              if (ERP_TYPES[field.type]) {
                loadErpSource(ERP_TYPES[field.type].source);
              }
            }
          }
        }
      }
      setAnswers(initialAnswers);
    } catch (err: any) {
      setFeedback({ msg: 'حدث خطأ في معالجة بنود النموذج: ' + err.message, success: false });
    }
  };

  const handleSelectChange = (formId: string) => {
    if (!formId) {
      setSelectedForm(null);
      setSelectedFormId('');
      setSchema(null);
      return;
    }
    const current = forms.find((f) => String(f.id) === String(formId));
    if (current) activateForm(current);
  };

  const setFieldValue = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  // -------------------------------------------------------------
  // معالجات البيانات الأساسية (Header Fields)
  // -------------------------------------------------------------

  // إضافة حقل/عمود جديد للبيانات الأساسية
  const addFieldToHeader = (bIdx: number) => {
    if (!schema) return;
    const newSchema = { ...schema };
    const blk = newSchema.blocks[bIdx];
    if (!blk.fields) blk.fields = [];
    const newIdx = blk.fields.length + 1;
    blk.fields.push({
      id: `hf_${Date.now()}`,
      key: `header_${Date.now()}`,
      label: `بيان أساسي ${newIdx}`,
      fieldType: 'erp_employee',
      isRequired: false,
    });
    setSchema(newSchema);
    loadErpSource('employees');
  };

  // حذف حقل من البيانات الأساسية
  const removeFieldFromHeader = (bIdx: number, fIdx: number) => {
    if (!schema) return;
    const newSchema = { ...schema };
    newSchema.blocks[bIdx].fields.splice(fIdx, 1);
    setSchema(newSchema);
  };

  // تعديل خصائص حقل البيانات الأساسية (تسمية / نوع / إلزامي)
  const updateHeaderFieldMeta = (bIdx: number, fIdx: number, key: string, val: any) => {
    if (!schema) return;
    const newSchema = { ...schema };
    newSchema.blocks[bIdx].fields[fIdx][key] = val;
    setSchema(newSchema);

    if (key === 'fieldType') {
      const cfg = ERP_TYPES[val];
      if (cfg) {
        loadErpSource(cfg.source);
      }
    }
  };

  // اختيار كائن ERP في البيانات الأساسية والتعبئة التلقائية للكود في الحقل الملاصق
  const handleHeaderErpSelect = (bIdx: number, currentField: any, item: ErpItem) => {
    setFieldValue(currentField.key, item.label || item.name);

    // البحث عن حقل مجاور في نفس البيانات الأساسية يحتوي اسمه على "كود" أو "رقم"
    const blk = schema.blocks[bIdx];
    if (blk?.fields && item.code) {
      const codeKeywords = ['رقم', 'كود', 'code', 'number'];
      const adjacent = blk.fields.find(
        (f: any) =>
          f.key !== currentField.key &&
          codeKeywords.some((kw) => (f.label || '').toLowerCase().includes(kw))
      );
      if (adjacent) {
        setFieldValue(adjacent.key, item.code);
      }
    }
  };

  // -------------------------------------------------------------
  // معالجات الاستمارة التفصيلية (Custom Rows / Detail Columns)
  // -------------------------------------------------------------

  const addCustomRow = (bIdx: number) => {
    if (!schema) return;
    const newSchema = { ...schema };
    newSchema.blocks[bIdx].rows.push({
      id: `row_${Date.now()}`,
      label: `صف جديد (${newSchema.blocks[bIdx].rows.length + 1})`,
      fields: [
        { id: `f_${Date.now()}_1`, label: 'الموظف / البيان', type: 'erp_employee', placeholder: 'اختر...' },
        { id: `f_${Date.now()}_2`, label: 'رقم الموظف / الكود', type: 'text', placeholder: 'الكود...' },
      ],
    });
    setSchema(newSchema);
  };

  const removeCustomRow = (bIdx: number, rIdx: number) => {
    if (!schema) return;
    const newSchema = { ...schema };
    newSchema.blocks[bIdx].rows.splice(rIdx, 1);
    setSchema(newSchema);
  };

  const updateRowTitle = (bIdx: number, rIdx: number, val: string) => {
    if (!schema) return;
    const newSchema = { ...schema };
    newSchema.blocks[bIdx].rows[rIdx].label = val;
    setSchema(newSchema);
  };

  const addFieldToSpecificRow = (bIdx: number, rIdx: number) => {
    if (!schema) return;
    const newSchema = { ...schema };
    const row = newSchema.blocks[bIdx].rows[rIdx];
    if (!row.fields) row.fields = [];
    row.fields.push({
      id: `f_${Date.now()}`,
      label: `عمود (${row.fields.length + 1})`,
      type: 'text',
      placeholder: 'أدخل البيان...',
    });
    setSchema(newSchema);
  };

  const removeFieldFromRow = (bIdx: number, rIdx: number, fIdx: number) => {
    if (!schema) return;
    const newSchema = { ...schema };
    newSchema.blocks[bIdx].rows[rIdx].fields.splice(fIdx, 1);
    setSchema(newSchema);
  };

  const updateRowFieldMeta = (bIdx: number, rIdx: number, fIdx: number, key: string, val: string) => {
    if (!schema) return;
    const newSchema = { ...schema };
    newSchema.blocks[bIdx].rows[rIdx].fields[fIdx][key] = val;
    setSchema(newSchema);

    if (key === 'type') {
      const cfg = ERP_TYPES[val];
      if (cfg) {
        loadErpSource(cfg.source);
      }
    }
  };

  // اختيار كائن ERP في صفوف الاستمارة التفصيلية والتعبئة التلقائية للكود في المربع الملاصق
  const handleRowErpSelect = (bIdx: number, rIdx: number, fIdx: number, item: ErpItem) => {
    const row = schema.blocks[bIdx].rows[rIdx];
    const field = row.fields[fIdx];
    const cellKey = `${row.id || `r_${rIdx}`}_${field.id}`;
    setFieldValue(cellKey, item.label || item.name);

    // البحث عن عمود مجاور في نفس الصف يحتوي عنوانه على "رقم" أو "كود"
    if (item.code) {
      const codeKeywords = ['رقم', 'كود', 'code', 'number'];
      const adjacentField = row.fields.find(
        (f: any, idx: number) =>
          idx !== fIdx &&
          codeKeywords.some((kw) => (f.label || '').toLowerCase().includes(kw))
      );

      if (adjacentField) {
        const adjacentCellKey = `${row.id || `r_${rIdx}`}_${adjacentField.id}`;
        setFieldValue(adjacentCellKey, item.code);
      }
    }
  };

  // -------------------------------------------------------------
  // حفظ وتعديل وإنشاء النماذج
  // -------------------------------------------------------------

  const executeCreateBlankForm = async () => {
    if (!blankName.trim()) {
      setFeedback({ msg: 'يرجى كتابة اسم النموذج أولاً في خانة اسم النموذج المخصص', success: false });
      return;
    }

    setIsCreatingBlank(true);
    setFeedback(null);

    try {
      const res = await axios.post('http://localhost:3000/dynamic-forms/create-blank', {
        formName: blankName.trim(),
        formCode: blankCode.trim() || undefined,
      });

      if (res.data?.success && res.data?.form) {
        setFeedback({ msg: '✅ تم إنشاء النموذج وحفظه في قاعدة البيانات بنجاح!', success: true });
        const newForm = res.data.form;
        setForms((prev) => [newForm, ...prev]);
        setBlankName('');
        setBlankCode('');
        activateForm(newForm);
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر إنشاء النموذج', success: false });
    } finally {
      setIsCreatingBlank(false);
    }
  };

  const saveUpdatedSchema = async () => {
    if (!selectedForm || !schema) return;
    setIsSavingSchema(true);
    setFeedback(null);

    try {
      const res = await axios.put(`http://localhost:3000/dynamic-forms/${selectedForm.id}`, {
        formName: schema.formTitle,
        fieldsSchema: schema,
      });

      if (res.data.success) {
        setFeedback({ msg: '✅ تم حفظ تعديلات وهيكل النموذج بنجاح في قاعدة بيانات Neon!', success: true });
        setIsDesignMode(false);
        fetchForms();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر حفظ الهيكل', success: false });
    } finally {
      setIsSavingSchema(false);
    }
  };

  const handleImportDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setFeedback({ msg: 'يرجى اختيار ملف PDF أو صورة أولاً', success: false });
      return;
    }

    setIsImporting(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (importName) formData.append('formName', importName.trim());
    if (importCode) formData.append('formCode', importCode.trim());

    try {
      const res = await axios.post('http://localhost:3000/dynamic-forms/import-ai', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data?.form) {
        setFeedback({ msg: `✅ تم استخراج وتحويل المستند (${res.data.form.formName}) بواسطة Gemini AI وحفظه في قاعدة البيانات!`, success: true });
        const newForm = res.data.form;
        setForms((prev) => [newForm, ...prev]);
        setSelectedFile(null);
        setImportName('');
        setImportCode('');
        activateForm(newForm);
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر تحليل المستند بالذكاء الاصطناعي', success: false });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedForm) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await axios.post('http://localhost:3000/dynamic-forms/submit', {
        formId: selectedForm.id,
        submissionData: answers,
        submittedByName: 'مراقب الجودة / النظام',
        status: 'مكتمل',
      });

      if (res.data.success) {
        setFeedback({ msg: '✅ تم توثيق واعتماد المحضر وحفظه في جدول form_submissions بنجاح!', success: true });
        setAnswers({});
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر اعتماد التقرير', success: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen text-right transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} dir="rtl">
      <div className="erp-container-fluid space-y-4">

        {/* ترويسة الصفحة مع أدوات التحكم السريع */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 rounded-2xl border shadow-sm print:hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                منظومة إدارة الجودة والتفتيش QMS & AI
              </span>
              <span className="text-xs text-slate-500 font-mono">HACCP • GMP • ISO 22000</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black flex items-center gap-2 text-emerald-500">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              النماذج الديناميكية واستمارات الفحص الذكي للجودة
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              تصميم وتعبئة استمارات التفتيش الصحي وفحص خطوط الإنتاج والموردين بالذكاء الاصطناعي مع ربط مباشر بكيانات النظام
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/quality/inspections"
              className="px-3 py-1.5 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30 text-xs font-bold transition hover:bg-teal-600/30"
            >
              فحوصات الجودة (IQC/OQC)
            </Link>
            <Link
              href="/quality/ccp-monitor"
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition hover:bg-rose-600/30"
            >
              مراقبة نقاط CCP
            </Link>
            <Link
              href="/ams/tasks"
              className="px-3 py-1.5 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition hover:bg-amber-600/30"
            >
              تذاكر المهام التصحيحية
            </Link>
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border transition flex items-center gap-1.5 font-bold text-xs cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            </button>
          </div>
        </div>

        {/* بطاقة تصميم نموذج جديد كلياً */}
        <div className={`p-5 rounded-2xl border shadow-sm space-y-4 print:hidden ${isDarkMode ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-emerald-300'}`}>
          <div className="flex items-center gap-2 border-b pb-2.5 border-emerald-500/20">
            <FilePlus className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-sm text-emerald-500">تصميم وتخصيص نموذج جديد كلياً</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-bold mb-1">اسم النموذج المخصص</label>
              <input
                type="text"
                placeholder="مثال: نموذج تفتيش جودة الصالات والورديات"
                value={blankName}
                onChange={(e) => setBlankName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">كود النموذج (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: QC-INSP-2026"
                value={blankCode}
                onChange={(e) => setBlankCode(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={executeCreateBlankForm}
                disabled={isCreatingBlank}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow"
              >
                {isCreatingBlank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إنشاء وتصميم النموذج فوراً
              </button>
            </div>
          </div>
        </div>

        {/* اختيار النموذج المتاح من قاعدة البيانات */}
        <div className={`p-4 rounded-2xl border shadow-sm space-y-3 print:hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold">اختر النموذج المطلوب تعبئته أو تعديله من قاعدة بيانات Neon:</label>
            <button
              type="button"
              onClick={fetchForms}
              className="text-xs text-emerald-400 hover:underline font-bold cursor-pointer"
            >
              🔄 تحديث القائمة
            </button>
          </div>

          <select
            value={selectedFormId}
            onChange={(e) => handleSelectChange(e.target.value)}
            className={`w-full p-2.5 rounded-xl border font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
          >
            <option value="">-- اضغط هنا لاختيار استمارة الفحص --</option>
            {forms.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.formName || (f as any).form_name} ({f.formCode || (f as any).form_code})
              </option>
            ))}
          </select>

          {forms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                النماذج الحالية ({forms.length}):
              </span>
              {forms.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => activateForm(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    String(selectedFormId) === String(f.id)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow'
                      : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500' : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-emerald-500'
                  }`}
                >
                  {f.formName || (f as any).form_name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* رسائل التنبيه والنجاح */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 print:hidden ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            {feedback.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedback.msg}
          </div>
        )}

        {/* محرك بناء وعرض وتعديل وطباعة النموذج */}
        {schema && schema.blocks && schema.blocks.length > 0 && (
          <div className={`rounded-2xl border shadow-sm overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            
            {/* شريط أدوات النموذج العلوي */}
            <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-3 print:border-b-2 print:border-black print:bg-white print:p-2 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
              <div>
                <h2 className="text-lg md:text-xl font-black text-emerald-500 print:text-black">
                  {schema.formTitle || selectedForm?.formName}
                </h2>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-1 inline-block print:text-black print:border-black">
                  كود المستند: {schema.formCode || selectedForm?.formCode}
                </span>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-200 border-slate-300 text-slate-800'}`}
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-500" />
                  طباعة المستند
                </button>

                <button
                  type="button"
                  onClick={() => setIsDesignMode(!isDesignMode)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                    isDesignMode 
                      ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' 
                      : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  {isDesignMode ? 'إنهاء وضع التصميم' : 'تخصيص الحقول والأعمدة (Studio)'}
                </button>

                {isDesignMode && (
                  <button
                    type="button"
                    onClick={saveUpdatedSchema}
                    disabled={isSavingSchema}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow"
                  >
                    {isSavingSchema ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    حفظ هيكل النموذج في Neon
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 md:p-6 space-y-6 print:p-2 print:space-y-4">
              {schema.blocks.map((block: any, bIdx: number) => {
                
                // 1. كتلة التعليمات (Instructions)
                if (block.blockType === 'instruction') {
                  return (
                    <div key={bIdx} className={`p-3.5 rounded-xl border-r-4 border-r-blue-500 border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} print:border print:border-black print:bg-slate-50 print:p-2`}>
                      <h4 className="font-bold text-blue-500 text-xs mb-1 print:text-black">📌 {block.title}</h4>
                      <p className="text-xs whitespace-pre-line leading-relaxed print:text-black text-slate-400">{block.instructionText}</p>
                    </div>
                  );
                }

                // 2. كتلة البيانات الأساسية (Master Data / Header Fields)
                if (block.blockType === 'fields' || block.title === 'البيانات الأساسية') {
                  return (
                    <div key={bIdx} className="space-y-3.5 print:space-y-2">
                      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} print:text-black print:border-black`}>
                        <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
                          <Layers className="w-4 h-4 text-emerald-500 print:hidden" />
                          {block.title || 'البيانات الأساسية'}
                        </h3>

                        {isDesignMode && (
                          <button
                            type="button"
                            onClick={() => addFieldToHeader(bIdx)}
                            className="px-3 py-1 rounded-lg bg-emerald-600/25 text-emerald-400 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-600 hover:text-white transition flex items-center gap-1 cursor-pointer print:hidden"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + إضافة حقل / عمود للبيانات الأساسية
                          </button>
                        )}
                      </div>

                      {/* في وضع التصميم: كروت تعديل وتخصيص حقول البيانات الأساسية */}
                      {isDesignMode ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 print:hidden">
                          {block.fields?.map((f: any, fIdx: number) => (
                            <div key={f.id || fIdx} className={`p-3 rounded-xl border space-y-2 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'}`}>
                              <div className="flex items-center justify-between gap-1 border-b pb-1.5 border-slate-700/40">
                                <span className="text-[10px] font-bold text-emerald-400 font-mono">
                                  حقل #{fIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeFieldFromHeader(bIdx, fIdx)}
                                  className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer"
                                  title="حذف هذا الحقل"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">تسمية الحقل</label>
                                <input
                                  type="text"
                                  value={f.label}
                                  onChange={(e) => updateHeaderFieldMeta(bIdx, fIdx, 'label', e.target.value)}
                                  className={`w-full p-1.5 text-xs rounded-lg border font-bold ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`}
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">نوع الحقل / الربط بالنظام</label>
                                <select
                                  value={f.fieldType}
                                  onChange={(e) => updateHeaderFieldMeta(bIdx, fIdx, 'fieldType', e.target.value)}
                                  className={`w-full p-1.5 text-xs rounded-lg border font-bold text-emerald-500 ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                                >
                                  <optgroup label="البيانات العامة">
                                    <option value="text">نص حر (Text)</option>
                                    <option value="number">رقم (Number)</option>
                                    <option value="date">تاريخ (Date)</option>
                                  </optgroup>
                                  <optgroup label="الربط الذكي بكيانات ERP (مع الأكواد والبحث)">
                                    <option value="erp_employee">👤 موظف (كود واسم وبحث)</option>
                                    <option value="erp_item">📦 صنف / منتج (كود واسم)</option>
                                    <option value="erp_raw_material">🌾 خامة أولية / مدخل إنتاج</option>
                                    <option value="erp_department">🏢 إدارة (كود واسم)</option>
                                    <option value="erp_production_line">⚙️ خط إنتاج / قسم صناعي</option>
                                    <option value="erp_shift">⏱️ وردية عمل معتمدة</option>
                                    <option value="erp_branch">🏪 فرع معتمد</option>
                                    <option value="erp_warehouse">🏬 مستودع / مخزن</option>
                                    <option value="erp_customer">🤝 عميل تجاري</option>
                                    <option value="erp_supplier">🚚 مورد معتمد</option>
                                    <option value="erp_asset">🏷️ أصل ثابت / ماكينة</option>
                                  </optgroup>
                                </select>
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={f.isRequired || false}
                                    onChange={(e) => updateHeaderFieldMeta(bIdx, fIdx, 'isRequired', e.target.checked)}
                                    className="rounded text-emerald-500 focus:ring-emerald-500"
                                  />
                                  <span>حقل إلزامي *</span>
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* في وضع العرض والتعبئة: شبكة الحقول الأساسية مع القوائم الذكية */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
                          {block.fields?.map((f: any, fIdx: number) => {
                            const isErpType = Boolean(ERP_TYPES[f.fieldType]) || f.fieldType === 'erp_select';
                            const sourceKey = ERP_TYPES[f.fieldType]?.source || f.erpSource || 'employees';
                            const options = erpOptions[sourceKey] || [];

                            return (
                              <div key={f.id ? `${f.id}_${fIdx}` : `${f.key || 'f'}_${fIdx}`} className="space-y-1">
                                <label className="block text-xs font-bold text-slate-400 print:text-black flex items-center justify-between">
                                  <span>
                                    {f.label} {f.isRequired && <span className="text-rose-500 print:hidden">*</span>}
                                  </span>
                                  {ERP_TYPES[f.fieldType] && (
                                    <span className="text-[10px] text-emerald-400/80 font-mono">
                                      {ERP_TYPES[f.fieldType].icon} {sourceKey}
                                    </span>
                                  )}
                                </label>

                                {/* حقول الـ ERP الذكية (موظف، صنف، إدارة، وردية، فرع، إلخ) */}
                                {isErpType && (
                                  <SearchableErpSelect
                                    items={options}
                                    value={answers[f.key] || ''}
                                    placeholder={`-- ابحث واختر ${f.label} --`}
                                    onChange={(item) => handleHeaderErpSelect(bIdx, f, item)}
                                    isDarkMode={isDarkMode}
                                  />
                                )}

                                {/* حقل التاريخ */}
                                {f.fieldType === 'date' && (
                                  <input
                                    type="date"
                                    value={answers[f.key] || ''}
                                    onChange={(e) => setFieldValue(f.key, e.target.value)}
                                    className={`w-full p-2 rounded-xl border text-xs font-mono ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                                  />
                                )}

                                {/* حقل الأرقام */}
                                {f.fieldType === 'number' && (
                                  <input
                                    type="number"
                                    value={answers[f.key] || ''}
                                    onChange={(e) => setFieldValue(f.key, e.target.value)}
                                    placeholder="أدخل الرقم..."
                                    className={`w-full p-2 rounded-xl border text-xs font-mono ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                                  />
                                )}

                                {/* حقل النصوص العادية */}
                                {!isErpType && f.fieldType !== 'date' && f.fieldType !== 'number' && (
                                  <input
                                    type="text"
                                    value={answers[f.key] || ''}
                                    onChange={(e) => setFieldValue(f.key, e.target.value)}
                                    placeholder="أدخل القيمة..."
                                    className={`w-full p-2 rounded-xl border text-xs ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                // 3. كتلة الاستمارة التفصيلية (Custom Rows & Columns)
                if (block.blockType === 'custom_rows' || block.blockType === 'table') {
                  return (
                    <div key={bIdx} className="space-y-3.5 print:space-y-3">
                      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} print:border-black`}>
                        <h3 className="font-bold text-sm md:text-base flex items-center gap-2 print:text-black">
                          <CheckCircle className="w-4 h-4 text-emerald-500 print:hidden" />
                          {block.title || 'بيانات الاستمارة التفصيلية'}
                        </h3>

                        {isDesignMode && (
                          <button
                            type="button"
                            onClick={() => addCustomRow(bIdx)}
                            className="px-3 py-1 rounded-lg bg-emerald-600/25 text-emerald-400 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-600 hover:text-white transition flex items-center gap-1 cursor-pointer print:hidden"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + إضافة صف جديد
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {block.rows?.map((row: any, rIdx: number) => {
                          const rowKey = row.id || `r_${rIdx}`;

                          return (
                            <div key={rowKey} className={`p-3.5 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'} print:bg-white print:border-black print:p-2`}>
                              
                              {/* ترويسة الصف وأزرار إدارته */}
                              <div className={`flex items-center justify-between border-b pb-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} print:border-black`}>
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold print:text-black">
                                    {rIdx + 1}
                                  </span>
                                  {isDesignMode ? (
                                    <input
                                      type="text"
                                      value={row.label}
                                      onChange={(e) => updateRowTitle(bIdx, rIdx, e.target.value)}
                                      className={`p-1 rounded border text-xs font-bold max-w-sm ${isDarkMode ? 'bg-slate-900 border-slate-700 text-emerald-400' : 'bg-white border-slate-300 text-emerald-600'}`}
                                    />
                                  ) : (
                                    <span className="text-xs md:text-sm font-bold print:text-black">{row.label}</span>
                                  )}
                                </div>

                                {isDesignMode && (
                                  <div className="flex items-center gap-2 print:hidden">
                                    <button
                                      type="button"
                                      onClick={() => addFieldToSpecificRow(bIdx, rIdx)}
                                      className="px-2.5 py-1 rounded bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition cursor-pointer"
                                    >
                                      + إضافة عمود لهذا الصف
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeCustomRow(bIdx, rIdx)}
                                      className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                                      title="حذف هذا الصف"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* شبكة الأعمدة والحقول داخل الصف */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
                                {row.fields?.map((field: any, fIdx: number) => {
                                  const cellKey = `${rowKey}_${field.id}`;
                                  const val = answers[cellKey];
                                  const isErpCol = Boolean(ERP_TYPES[field.type]);
                                  const sourceKey = ERP_TYPES[field.type]?.source || 'employees';
                                  const options = erpOptions[sourceKey] || [];

                                  return (
                                    <div key={`${rowKey}_${field.id || fIdx}`} className={`p-2.5 rounded-lg border space-y-1.5 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} print:bg-white print:border print:border-black`}>
                                      
                                      {/* ترويسة العمود في وضع التصميم */}
                                      {isDesignMode ? (
                                        <div className="space-y-1 print:hidden">
                                          <div className="flex items-center justify-between gap-1">
                                            <input
                                              type="text"
                                              value={field.label}
                                              onChange={(e) => updateRowFieldMeta(bIdx, rIdx, fIdx, 'label', e.target.value)}
                                              className={`w-full p-1 text-[11px] rounded border font-bold ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
                                            />
                                            <button
                                              type="button"
                                              onClick={() => removeFieldFromRow(bIdx, rIdx, fIdx)}
                                              className="text-rose-400 hover:text-rose-300 p-0.5 cursor-pointer"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                          <select
                                            value={field.type}
                                            onChange={(e) => updateRowFieldMeta(bIdx, rIdx, fIdx, 'type', e.target.value)}
                                            className={`w-full p-1 text-[10px] rounded border font-bold text-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-300'}`}
                                          >
                                            <optgroup label="البيانات العامة">
                                              <option value="text">نص (Text)</option>
                                              <option value="number">رقم (Number)</option>
                                              <option value="date">تاريخ (Date)</option>
                                              <option value="radio">مطابقة (✓ / ✕)</option>
                                            </optgroup>
                                            <optgroup label="الربط الذكي بـ ERP (كود واسم وبحث)">
                                              <option value="erp_employee">👤 موظف (كود واسم وبحث)</option>
                                              <option value="erp_item">📦 صنف / منتج (كود واسم)</option>
                                              <option value="erp_raw_material">🌾 خامة أولية / مدخل إنتاج</option>
                                              <option value="erp_department">🏢 إدارة (كود واسم)</option>
                                              <option value="erp_production_line">⚙️ خط إنتاج / قسم صناعي</option>
                                              <option value="erp_shift">⏱️ وردية عمل معتمدة</option>
                                              <option value="erp_branch">🏪 فرع معتمد</option>
                                              <option value="erp_warehouse">🏬 مستودع / مخزن</option>
                                              <option value="erp_customer">🤝 عميل تجاري</option>
                                              <option value="erp_supplier">🚚 مورد معتمد</option>
                                              <option value="erp_asset">🏷️ أصل ثابت / ماكينة</option>
                                            </optgroup>
                                          </select>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <span className="block text-[11px] font-semibold text-slate-400 print:text-black">
                                            {field.label}
                                          </span>
                                          {isErpCol && (
                                            <span className="text-[10px] text-emerald-400/80 font-mono">
                                              {ERP_TYPES[field.type].icon}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {/* حقول الـ ERP الذكية مع البحث والتعبئة التلقائية للأكواد في المربع الملاصق */}
                                      {isErpCol && (
                                        <SearchableErpSelect
                                          items={options}
                                          value={val || ''}
                                          placeholder={`-- اختر ${field.label} --`}
                                          onChange={(item) => handleRowErpSelect(bIdx, rIdx, fIdx, item)}
                                          isDarkMode={isDarkMode}
                                        />
                                      )}

                                      {/* المطابقة والمطابقة السريعة */}
                                      {field.type === 'radio' && (
                                        <div className="flex gap-1 print:block">
                                          <button
                                            type="button"
                                            onClick={() => setFieldValue(cellKey, 'مطابق')}
                                            className={`flex-1 py-1 text-xs font-bold rounded border transition cursor-pointer print:border-black ${
                                              val === 'مطابق' ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-500/10 text-emerald-400'
                                            }`}
                                          >
                                            ✓ مطابق
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setFieldValue(cellKey, 'غير مطابق')}
                                            className={`flex-1 py-1 text-xs font-bold rounded border transition cursor-pointer print:border-black ${
                                              val === 'غير مطابق' ? 'bg-rose-600 text-white' : 'hover:bg-rose-500/10 text-rose-400'
                                            }`}
                                          >
                                            ✕ غير مطابق
                                          </button>
                                        </div>
                                      )}

                                      {/* حقل التاريخ */}
                                      {field.type === 'date' && (
                                        <input
                                          type="date"
                                          value={val || ''}
                                          onChange={(e) => setFieldValue(cellKey, e.target.value)}
                                          className={`w-full p-1.5 rounded border text-xs font-mono ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                                        />
                                      )}

                                      {/* حقل الأرقام */}
                                      {field.type === 'number' && (
                                        <input
                                          type="number"
                                          value={val || ''}
                                          onChange={(e) => setFieldValue(cellKey, e.target.value)}
                                          placeholder={field.placeholder || 'رقم...'}
                                          className={`w-full p-1.5 rounded border text-xs font-mono ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                                        />
                                      )}

                                      {/* حقل النصوص الحرة */}
                                      {!isErpCol && field.type !== 'radio' && field.type !== 'date' && field.type !== 'number' && (
                                        <input
                                          type="text"
                                          value={val || ''}
                                          onChange={(e) => setFieldValue(cellKey, e.target.value)}
                                          placeholder={field.placeholder || 'اكتب هنا...'}
                                          className={`w-full p-1.5 rounded border text-xs ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* زر الحفظ والاعتماد النهائي */}
              <div className="pt-4 border-t flex justify-end print:hidden">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  حفظ واعتماد التقرير رقمياً
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
