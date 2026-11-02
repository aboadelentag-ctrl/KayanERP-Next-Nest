'use client';

import React, { useState, useEffect } from 'react';
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
  Moon
} from 'lucide-react';

interface DynamicFormDto {
  id: string;
  formName: string;
  formCode: string;
  fieldsSchema: any;
  isActive: boolean;
}

export default function FormViewerPage() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [forms, setForms] = useState<DynamicFormDto[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<DynamicFormDto | null>(null);
  const [schema, setSchema] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [erpOptions, setErpOptions] = useState<Record<string, string[]>>({});
  
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
            fields: (b.fields || b.Fields || []).map((f: any, fIdx: number) => ({
              id: f.id || f.Id || `f_${fIdx}`,
              key: f.key || f.Key || `field_${fIdx}`,
              label: f.label || f.Label || '',
              fieldType: (f.fieldType || f.FieldType || 'text').toLowerCase(),
              erpSource: f.erpSource || f.ErpSource || '',
              manualOptions: f.manualOptions || f.ManualOptions || [],
              isRequired: f.isRequired ?? f.IsRequired ?? false,
            })),
            rows,
            approvalStages: (b.approvalStages || b.ApprovalStages || []).map((s: any, sIdx: number) => ({
              stageId: s.stageId || s.StageId || `stage_${sIdx}`,
              roleTitle: s.roleTitle || s.RoleTitle || 'المعتمد',
              condition: s.condition || s.Condition || '',
              decisionOptions: s.decisionOptions || s.DecisionOptions || ['أوافق', 'لا أوافق'],
              hasNotes: s.hasNotes ?? s.HasNotes ?? false,
              hasSignature: s.hasSignature ?? s.HasSignature ?? false,
            })),
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

  const loadErpSource = async (source: string) => {
    if (erpOptions[source]) return;
    try {
      const res = await axios.get(`http://localhost:3000/dynamic-forms/erp-lookups/${source}`);
      setErpOptions((prev) => ({ ...prev, [source]: res.data || [] }));
    } catch (err) {
      console.error(err);
    }
  };

  const setFieldValue = (key: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const addCustomRow = (bIdx: number) => {
    if (!schema) return;
    const newSchema = { ...schema };
    newSchema.blocks[bIdx].rows.push({
      id: `row_${Date.now()}`,
      label: `صف جديد (${newSchema.blocks[bIdx].rows.length + 1})`,
      fields: [
        { id: `f_${Date.now()}_1`, label: 'حقل 1', type: 'text', placeholder: 'اكتب القيمة...' },
        { id: `f_${Date.now()}_2`, label: 'حقل 2', type: 'text', placeholder: 'اكتب القيمة...' },
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
      label: `حقل (${row.fields.length + 1})`,
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
  };

  // إنشاء النموذج يدوياً وحفظه فوراً في Neon DB
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

  // حفظ الهيكل المعدل في Neon DB
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
        setFeedback({ msg: '✅ تم حفظ تعديلات وهيكل النموذج بنجاح في قاعدة البيانات!', success: true });
        setIsDesignMode(false);
        fetchForms();
      }
    } catch (err: any) {
      setFeedback({ msg: err.response?.data?.message || 'تعذر حفظ الهيكل', success: false });
    } finally {
      setIsSavingSchema(false);
    }
  };

  // الاستيراد بالذكاء الاصطناعي
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

  // حفظ المحضر الميداني
  const handleSubmit = async () => {
    if (!selectedForm) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await axios.post('http://localhost:3000/dynamic-forms/submit', {
        formId: selectedForm.id,
        submissionData: answers,
        submittedByName: 'مراقب الجودة الميداني',
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
    <div className={`min-h-screen p-4 md:p-8 text-right transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ترويسة الصفحة مع زر التبديل بين الليل والنهار */}
        <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-6 rounded-2xl border shadow-sm print:hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-emerald-500">
              <FileText className="w-7 h-7" />
              منظومة تصميم وتعبئة نماذج التفتيش والعمليات
            </h1>
            <p className="text-sm text-slate-400 mt-1">تخصيص أعمدة كل صف على حدة، إنشاء نماذج يدوياً، واستيراد ذكي فوري بواسطة AI</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold transition"
            >
              الرئيسية
            </Link>
            <Link
              href="/production"
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow"
            >
              صالة الإنتاج
            </Link>
            <Link
              href="/transfers"
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow"
            >
              تحويلات الفروع
            </Link>
            <Link
              href="/crates"
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow"
            >
              تتبع الصناديق
            </Link>
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-xl border transition flex items-center gap-2 font-bold text-xs cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            </button>

            <span className="text-xs px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-400 font-medium">
              المستخدم: مراقب الجودة / النظام
            </span>
          </div>
        </div>

        {/* بطاقة تصميم نموذج جديد كلياً (بدون استدعاء ملفات) */}
        <div className={`p-6 rounded-2xl border shadow-sm space-y-4 print:hidden ${isDarkMode ? 'bg-slate-900 border-emerald-500/30' : 'bg-white border-emerald-300'}`}>
          <div className="flex items-center gap-2 border-b pb-3 border-emerald-500/20">
            <FilePlus className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-base text-emerald-500">تصميم نموذج جديد كلياً (بدون استدعاء ملفات)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold mb-1">اسم النموذج المخصص</label>
              <input
                type="text"
                placeholder="مثال: نموذج استئذان موظفين"
                value={blankName}
                onChange={(e) => setBlankName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">كود النموذج (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: HR-PER-01"
                value={blankCode}
                onChange={(e) => setBlankCode(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={executeCreateBlankForm}
                disabled={isCreatingBlank}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow"
              >
                {isCreatingBlank ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                إنشاء وتصميم النموذج فوراً
              </button>
            </div>
          </div>
        </div>

        {/* بطاقة الاستيراد الذكي بالذكاء الاصطناعي (PDF, Images, Word, Excel) */}
        <div className={`p-6 rounded-2xl border shadow-sm space-y-4 print:hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 border-b pb-3 border-slate-700/50">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-indigo-400">الاستيراد الذكي بواسطة Gemini AI (PDF, صور, Word, Excel)</h3>
          </div>

          <form onSubmit={handleImportDocument} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold mb-1">اسم النموذج المستورد (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: محضر فحص وتفتيش الجودة"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold mb-1">كود النموذج (اختياري)</label>
              <input
                type="text"
                placeholder="مثال: QC-INSP-01"
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-sm font-mono ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className={`flex-1 cursor-pointer flex items-center justify-center gap-2 p-2.5 rounded-xl border hover:border-indigo-500 text-sm font-medium transition ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'}`}>
                <Upload className="w-4 h-4 text-indigo-400" />
                <span className="truncate">{selectedFile ? selectedFile.name : 'اختر (PDF أو صورة أو مستند)'}</span>
                <input
                  type="file"
                  accept=".pdf, image/*, .docx, .xlsx"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </label>

              <button
                type="submit"
                disabled={isImporting || !selectedFile}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                تحليل بالـ AI
              </button>
            </div>
          </form>
        </div>

        {/* اختيار النموذج المتاح من قاعدة البيانات */}
        <div className={`p-6 rounded-2xl border shadow-sm space-y-4 print:hidden ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex justify-between items-center">
            <label className="block text-sm font-bold">اختر النموذج المطلوب تعبئته أو تعديله من قاعدة البيانات:</label>
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
            className={`w-full p-3 rounded-xl border font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'}`}
          >
            <option value="">-- اضغط هنا لاختيار استمارة الفحص --</option>
            {forms.map((f) => (
              <option key={f.id} value={String(f.id)}>
                {f.formName || (f as any).form_name} ({f.formCode || (f as any).form_code})
              </option>
            ))}
          </select>

          {forms.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <ClipboardList className="w-3.5 h-3.5" />
                النماذج في قاعدة البيانات ({forms.length}):
              </span>
              {forms.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => activateForm(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
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
            className={`p-4 rounded-xl border text-sm font-bold flex items-center gap-2 print:hidden ${
              feedback.success
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
            }`}
          >
            {feedback.success ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {feedback.msg}
          </div>
        )}

        {/* محرك بناء وعرض وتعديل وطباعة النموذج */}
        {schema && schema.blocks && schema.blocks.length > 0 && (
          <div className={`rounded-2xl border shadow-sm overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            
            <div className={`p-5 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:border-b-2 print:border-black print:bg-white print:p-2 ${isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/60 border-slate-200'}`}>
              <div>
                <h2 className="text-xl font-bold text-emerald-500 print:text-black print:text-2xl">
                  {schema.formTitle || selectedForm?.formName}
                </h2>
                <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-1 inline-block print:text-black print:border-black">
                  كود المستند: {schema.formCode || selectedForm?.formCode}
                </span>
              </div>

              <div className="flex items-center gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-200 border-slate-300 text-slate-800'}`}
                >
                  <Printer className="w-4 h-4 text-emerald-500" />
                  طباعة المستند
                </button>

                <button
                  type="button"
                  onClick={() => setIsDesignMode(!isDesignMode)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                    isDesignMode 
                      ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' 
                      : isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                  {isDesignMode ? 'إنهاء وضع التصميم' : 'تخصيص الأعمدة والصفوف (Studio)'}
                </button>

                {isDesignMode && (
                  <button
                    type="button"
                    onClick={saveUpdatedSchema}
                    disabled={isSavingSchema}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingSchema ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ هيكل النموذج في Neon
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 space-y-8 print:p-2 print:space-y-4">
              {schema.blocks.map((block: any, bIdx: number) => {
                
                if (block.blockType === 'instruction') {
                  return (
                    <div key={bIdx} className={`p-4 rounded-xl border-r-4 border-r-blue-500 border ${isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'} print:border print:border-black print:bg-slate-50 print:p-2`}>
                      <h4 className="font-bold text-blue-500 text-sm mb-1 print:text-black">📌 {block.title}</h4>
                      <p className="text-sm whitespace-pre-line leading-relaxed print:text-black text-slate-400">{block.instructionText}</p>
                    </div>
                  );
                }

                if (block.blockType === 'fields' && block.fields && block.fields.length > 0) {
                  return (
                    <div key={bIdx} className="space-y-4 print:space-y-2">
                      <h3 className={`font-bold text-base border-b pb-2 flex items-center gap-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} print:text-black print:border-black`}>
                        <Layers className="w-4 h-4 text-emerald-500 print:hidden" />
                        {block.title}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
                        {block.fields.map((f: any) => (
                          <div key={f.key}>
                            <label className="block text-xs font-semibold mb-1.5 text-slate-400 print:text-black">
                              {f.label} {f.isRequired && <span className="text-rose-500 print:hidden">*</span>}
                            </label>

                            {f.fieldType === 'erp_select' && (
                              <select
                                value={answers[f.key] || ''}
                                onChange={(e) => setFieldValue(f.key, e.target.value)}
                                className={`w-full p-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                              >
                                <option value="">-- اختر {f.label} --</option>
                                {erpOptions[f.erpSource]?.map((opt: string) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}

                            {f.fieldType === 'date' && (
                              <input
                                type="date"
                                value={answers[f.key] || ''}
                                onChange={(e) => setFieldValue(f.key, e.target.value)}
                                className={`w-full p-2.5 rounded-xl border text-sm font-mono ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                              />
                            )}

                            {f.fieldType !== 'erp_select' && f.fieldType !== 'date' && (
                              <input
                                type="text"
                                value={answers[f.key] || ''}
                                onChange={(e) => setFieldValue(f.key, e.target.value)}
                                className={`w-full p-2.5 rounded-xl border text-sm ${isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                                placeholder="أدخل البيانات..."
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (block.blockType === 'custom_rows' || block.blockType === 'table') {
                  return (
                    <div key={bIdx} className="space-y-4 print:space-y-3">
                      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'} print:border-black`}>
                        <h3 className="font-bold text-base flex items-center gap-2 print:text-black">
                          <CheckCircle className="w-4 h-4 text-emerald-500 print:hidden" />
                          {block.title || 'بيانات النموذج والصفوف الحرة'}
                        </h3>

                        {isDesignMode && (
                          <button
                            type="button"
                            onClick={() => addCustomRow(bIdx)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold hover:bg-emerald-600 hover:text-white transition flex items-center gap-1 cursor-pointer print:hidden"
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
                            <div key={rowKey} className={`p-4 rounded-xl border space-y-3 ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'} print:bg-white print:border-black print:p-2`}>
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
                                    <span className="text-sm font-bold print:text-black">{row.label}</span>
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

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
                                {row.fields?.map((field: any, fIdx: number) => {
                                  const cellKey = `${rowKey}_${field.id}`;
                                  const val = answers[cellKey];

                                  return (
                                    <div key={field.id} className={`p-2.5 rounded-lg border space-y-1.5 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} print:bg-white print:border print:border-black`}>
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
                                            <option value="text">نص (Text)</option>
                                            <option value="number">رقم (Number)</option>
                                            <option value="date">تاريخ (Date)</option>
                                            <option value="radio">مطابقة (✓ / ✕)</option>
                                          </select>
                                        </div>
                                      ) : (
                                        <span className="block text-[11px] font-semibold text-slate-400 print:text-black">
                                          {field.label}
                                        </span>
                                      )}

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

                                      {field.type === 'date' && (
                                        <input
                                          type="date"
                                          value={val || ''}
                                          onChange={(e) => setFieldValue(cellKey, e.target.value)}
                                          className={`w-full p-1.5 rounded border text-xs font-mono ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                                        />
                                      )}

                                      {field.type === 'number' && (
                                        <input
                                          type="number"
                                          value={val || ''}
                                          onChange={(e) => setFieldValue(cellKey, e.target.value)}
                                          placeholder={field.placeholder || 'رقم...'}
                                          className={`w-full p-1.5 rounded border text-xs font-mono ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-black'} print:bg-white print:text-black print:border-black`}
                                        />
                                      )}

                                      {field.type !== 'radio' && field.type !== 'date' && field.type !== 'number' && (
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

              <div className="pt-4 border-t flex justify-end print:hidden">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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