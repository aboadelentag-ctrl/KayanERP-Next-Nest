import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import { GoogleGenAI, Type } from '@google/genai';

@Injectable()
export class DynamicFormsService {
  private aiClient: GoogleGenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.aiClient = new GoogleGenAI({ apiKey });
  }

  // 1. جلب كافة النماذج من Neon DB
  async getActiveForms() {
    try {
      const forms = await (this.prisma as any).dynamic_forms.findMany({
        orderBy: { id: 'desc' },
      });
      return forms.map((f: any) => ({
        id: String(f.id),
        formName: f.form_name,
        formCode: f.form_code,
        fieldsSchema: typeof f.fields_schema === 'string' ? f.fields_schema : JSON.stringify(f.fields_schema),
        isActive: f.is_active ?? true,
      }));
    } catch (err: any) {
      console.error('Error fetching forms from DB:', err.message);
      return [];
    }
  }

  // 2. القوائم المنسدلة المرتبطة بالـ ERP مستخرجة حصرياً وبأكوادها وتفاصيلها من Neon DB
  async getErpLookup(source: string) {
    try {
      switch (source) {
        case 'employees': {
          const emp = await this.prisma.employees.findMany({
            where: { active: true },
            select: {
              id: true,
              employee_code: true,
              employee_name: true,
              job_titles: { select: { title_name: true } },
              departments: { select: { department_name: true } },
            },
            orderBy: { employee_code: 'asc' },
          });
          return emp.map((e: any) => ({
            id: String(e.id),
            code: e.employee_code || `EMP-${e.id}`,
            name: e.employee_name,
            label: `[${e.employee_code || `EMP-${e.id}`}] ${e.employee_name}`,
            extra: e.job_titles?.title_name || e.departments?.department_name || 'موظف',
          }));
        }

        case 'items':
        case 'products': {
          const items = await this.prisma.items.findMany({
            where: { active: true },
            select: {
              id: true,
              item_code: true,
              item_name: true,
              item_type: true,
              unit: true,
              department_name: true,
            },
            orderBy: { item_code: 'asc' },
          });
          return items.map((i: any) => ({
            id: String(i.id),
            code: i.item_code || `ITM-${i.id}`,
            name: i.item_name,
            label: `[${i.item_code || `ITM-${i.id}`}] ${i.item_name}`,
            extra: `${i.unit ? `${i.unit} • ` : ''}${i.item_type || 'صنف'}`,
          }));
        }

        case 'raw_materials': {
          const items = await this.prisma.items.findMany({
            where: {
              active: true,
              item_type: { in: ['خامات', 'نصف مصنع', 'RAW', 'RAW_MATERIAL'] },
            },
            select: {
              id: true,
              item_code: true,
              item_name: true,
              item_type: true,
              unit: true,
            },
            orderBy: { item_code: 'asc' },
          });
          return items.map((i: any) => ({
            id: String(i.id),
            code: i.item_code || `RAW-${i.id}`,
            name: i.item_name,
            label: `[${i.item_code || `RAW-${i.id}`}] ${i.item_name}`,
            extra: `${i.unit ? `${i.unit} • ` : ''}${i.item_type || 'مادة خام'}`,
          }));
        }

        case 'departments': {
          const depts = await this.prisma.departments.findMany({
            where: { active: true },
            select: { id: true, department_code: true, department_name: true },
            orderBy: { department_code: 'asc' },
          });
          return depts.map((d: any) => ({
            id: String(d.id),
            code: d.department_code || `D-${d.id}`,
            name: d.department_name,
            label: `[${d.department_code || `D-${d.id}`}] ${d.department_name}`,
            extra: 'إدارة رئيسية',
          }));
        }

        case 'production_lines': {
          const lines = await this.prisma.departments.findMany({
            where: { active: true, department_code: { gte: '300' } },
            select: { id: true, department_code: true, department_name: true },
            orderBy: { department_code: 'asc' },
          });
          return lines.map((l: any) => ({
            id: String(l.id),
            code: l.department_code || `LINE-${l.id}`,
            name: l.department_name,
            label: `[${l.department_code || `LINE-${l.id}`}] ${l.department_name}`,
            extra: 'خط إنتاج',
          }));
        }

        case 'shifts': {
          return [
            { id: 'shift_1', code: 'SH-01', name: 'الوردية الأولى (الصباحية)', label: '[SH-01] الوردية الأولى (الصباحية)', extra: '08:00 - 16:00' },
            { id: 'shift_2', code: 'SH-02', name: 'الوردية الثانية (المسائية)', label: '[SH-02] الوردية الثانية (المسائية)', extra: '16:00 - 00:00' },
            { id: 'shift_3', code: 'SH-03', name: 'الوردية الثالثة (الليلية)', label: '[SH-03] الوردية الثالثة (الليلية)', extra: '00:00 - 08:00' },
          ];
        }

        case 'branches': {
          const brs = await this.prisma.branches.findMany({
            where: { active: true },
            select: { id: true, branch_code: true, branch_name: true, address: true },
            orderBy: { branch_code: 'asc' },
          });
          return brs.map((b: any) => ({
            id: String(b.id),
            code: b.branch_code || `BR-${b.id}`,
            name: b.branch_name,
            label: `[${b.branch_code || `BR-${b.id}`}] ${b.branch_name}`,
            extra: b.address || 'فرع معتمد',
          }));
        }

        case 'warehouses': {
          const whs = await this.prisma.warehouses.findMany({
            where: { active: true },
            select: { id: true, warehouse_code: true, warehouse_name: true, warehouse_type: true },
            orderBy: { warehouse_code: 'asc' },
          });
          return whs.map((w: any) => ({
            id: String(w.id),
            code: w.warehouse_code || `WH-${w.id}`,
            name: w.warehouse_name,
            label: `[${w.warehouse_code || `WH-${w.id}`}] ${w.warehouse_name}`,
            extra: w.warehouse_type || 'مستودع',
          }));
        }

        case 'customers': {
          const cust = await this.prisma.customers.findMany({
            where: { active: true },
            select: { id: true, customer_code: true, customer_name: true, phone: true },
            orderBy: { customer_code: 'asc' },
          });
          return cust.map((c: any) => ({
            id: String(c.id),
            code: c.customer_code || `CUST-${c.id}`,
            name: c.customer_name,
            label: `[${c.customer_code || `CUST-${c.id}`}] ${c.customer_name}`,
            extra: c.phone || 'عميل تجاري',
          }));
        }

        case 'suppliers': {
          const supp = await this.prisma.suppliers.findMany({
            where: { active: true },
            select: { id: true, supplier_code: true, supplier_name: true, phone: true },
            orderBy: { supplier_code: 'asc' },
          });
          return supp.map((s: any) => ({
            id: String(s.id),
            code: s.supplier_code || `SUP-${s.id}`,
            name: s.supplier_name,
            label: `[${s.supplier_code || `SUP-${s.id}`}] ${s.supplier_name}`,
            extra: s.phone || 'مورد معتمد',
          }));
        }

        case 'assets': {
          const assets = await this.prisma.fixed_assets.findMany({
            select: { id: true, asset_code: true, name: true, department: true },
            orderBy: { asset_code: 'asc' },
          });
          return assets.map((a: any) => ({
            id: String(a.id),
            code: a.asset_code || `AST-${a.id}`,
            name: a.name,
            label: `[${a.asset_code || `AST-${a.id}`}] ${a.name}`,
            extra: a.department || 'أصل ثابت',
          }));
        }

        default: {
          const items = await this.prisma.items.findMany({
            where: { active: true },
            select: { id: true, item_code: true, item_name: true },
            take: 20,
          });
          return items.map((i: any) => ({
            id: String(i.id),
            code: i.item_code,
            name: i.item_name,
            label: `[${i.item_code}] ${i.item_name}`,
            extra: 'صنف',
          }));
        }
      }
    } catch (err: any) {
      console.error(`Error in getErpLookup(${source}):`, err.message);
      return [];
    }
  }

  // 3. إنشاء استمارة فارغة يدوياً وحفظها في Neon DB
  async createBlankForm(body: any) {
    const formName = body.formName || 'نموذج إداري جديد';
    const formCode = body.formCode || `FORM-${Math.floor(1000 + Math.random() * 9000)}`;

    const blankSchema = {
      formCode,
      formTitle: formName,
      category: 'نماذج مخصصة',
      blocks: [
        {
          id: 'b1',
          blockType: 'instruction',
          title: 'تعليمات النموذج',
          instructionText: 'نموذج مخصص. يمكنك تعديل الحقول والأعمدة بحرية عبر وضع التصميم (Studio).',
        },
        {
          id: 'b2',
          blockType: 'fields',
          title: 'البيانات الأساسية',
          fields: [
            { id: 'f1', key: 'record_date', label: 'تاريخ الإجراء', fieldType: 'date', isRequired: true },
            { id: 'f2', key: 'location', label: 'الفرع / القسم', fieldType: 'erp_select', erpSource: 'branches', isRequired: true },
          ],
        },
        {
          id: 'b3',
          blockType: 'custom_rows',
          title: 'بيانات الاستمارة التفصيلية',
          rows: [
            {
              id: 'r1',
              label: 'الإدارة / القسم',
              fields: [
                { id: 'c1', label: 'الإدارة', type: 'text', placeholder: 'اكتب الإدارة...' },
                { id: 'c2', label: 'القسم', type: 'text', placeholder: 'اكتب القسم...' },
              ],
            },
            {
              id: 'r2',
              label: 'بيانات الموظف',
              fields: [
                { id: 'c3', label: 'اسم الموظف', type: 'text', placeholder: 'اسم الموظف...' },
                { id: 'c4', label: 'رقم الموظف', type: 'number', placeholder: 'الرقم الوظيفي...' },
              ],
            },
          ],
        },
      ],
    };

    try {
      const saved = await (this.prisma as any).dynamic_forms.create({
        data: {
          form_name: formName,
          form_code: formCode,
          fields_schema: JSON.stringify(blankSchema),
          is_active: true,
        },
      });

      return {
        success: true,
        message: 'تم إنشاء النموذج في قاعدة البيانات بنجاح',
        form: {
          id: String(saved.id),
          formName: saved.form_name,
          formCode: saved.form_code,
          fieldsSchema: typeof saved.fields_schema === 'string' ? saved.fields_schema : JSON.stringify(saved.fields_schema),
          isActive: saved.is_active,
        },
      };
    } catch (err: any) {
      console.error('Prisma Create Blank Error:', err);
      throw new BadRequestException('تعذر إنشاء النموذج: ' + err.message);
    }
  }

  // 4. استخراج المستندات بواسطة Gemini API
  async parseDocumentWithAi(file: any, formName?: string, formCode?: string) {
    if (!file || !file.buffer) {
      throw new BadRequestException('الملف مطلوب للتحليل عبر الذكاء الاصطناعي');
    }

    let originalName = file.originalname || 'استمارة_ذكية';
    try {
      originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    } catch {
      originalName = file.originalname;
    }

    const generatedCode = formCode || `AI-${Math.floor(1000 + Math.random() * 9000)}`;
    const generatedName = formName || originalName.replace(/\.[^/.]+$/, '');

    const base64Data = file.buffer.toString('base64');
    let mimeType = file.mimetype || 'application/pdf';
    if (file.originalname?.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (file.originalname?.endsWith('.xlsx')) mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    const systemInstruction = `
      أنت نظام ذكي لتحويل النماذج الإدارية ومحاضر الفحص في المصانع إلى هيكل رقمي.
      استخرج كل صف مع حقوله وأعمدته المناسبة.
      أنواع الحقول المسموحة فقط:
      text: للنصوص والأسماء
      number: للأرقام والساعات
      date: للتواريخ
      radio: للمطابقة (مطابق / غير مطابق)
    `;

    try {
      // تجربة استدعاء النموذج الأساسي
      const aiResponse = await this.aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data,
                },
              },
              {
                text: 'قم بتحليل هيكل هذه الاستمارة بدقة، واستخرج عنوانها والتعليمات وجميع الصفوف والحقول التفصيلية بداخلها.',
              },
            ],
          },
        ],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              formTitle: { type: Type.STRING },
              instructionText: { type: Type.STRING },
              rows: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    fields: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          type: { type: Type.STRING, enum: ['text', 'number', 'date', 'radio'] },
                          placeholder: { type: Type.STRING },
                        },
                        required: ['label', 'type'],
                      },
                    },
                  },
                  required: ['label', 'fields'],
                },
              },
            },
            required: ['formTitle', 'rows'],
          },
        },
      });

      const parsedData = JSON.parse(aiResponse.text || '{}');

      const formattedSchema = {
        formCode: generatedCode,
        formTitle: parsedData.formTitle || generatedName,
        category: 'استمارات AI الذكية',
        blocks: [
          {
            id: 'b1',
            blockType: 'instruction',
            title: 'تعليمات النموذج المستخرج',
            instructionText: parsedData.instructionText || 'تم استخراج وتوليد هذا النموذج الذكي بواسطة Gemini API بدقة.',
          },
          {
            id: 'b2',
            blockType: 'fields',
            title: 'البيانات الأساسية',
            fields: [
              { id: 'f1', key: 'record_date', label: 'تاريخ الإجراء', fieldType: 'date', isRequired: true },
              { id: 'f2', key: 'location', label: 'الفرع / القسم', fieldType: 'erp_select', erpSource: 'branches', isRequired: true },
            ],
          },
          {
            id: 'b3',
            blockType: 'custom_rows',
            title: 'جدول البيانات والبنود المستخرجة',
            rows: (parsedData.rows || []).map((r: any, rIdx: number) => ({
              id: `r_${rIdx + 1}`,
              label: r.label,
              fields: (r.fields || []).map((f: any, fIdx: number) => ({
                id: `f_${rIdx}_${fIdx + 1}`,
                label: f.label,
                type: f.type,
                placeholder: f.placeholder || '',
              })),
            })),
          },
        ],
      };

      const saved = await (this.prisma as any).dynamic_forms.create({
        data: {
          form_name: generatedName,
          form_code: generatedCode,
          fields_schema: JSON.stringify(formattedSchema),
          is_active: true,
        },
      });

      return {
        success: true,
        message: 'تم تحليل المستند بواسطة Gemini AI وتوليد الاستمارة بنجاح',
        form: {
          id: String(saved.id),
          formName: saved.form_name,
          formCode: saved.form_code,
          fieldsSchema: typeof saved.fields_schema === 'string' ? saved.fields_schema : JSON.stringify(saved.fields_schema),
          isActive: saved.is_active,
        },
      };
    } catch (aiError: any) {
      console.error('AI Generation Error:', aiError);
      throw new InternalServerErrorException('فشل استخراج البيانات عبر الذكاء الاصطناعي: ' + (aiError.message || ''));
    }
  }

  // 5. حفظ وتحديث هيكل النموذج (Studio)
  async updateFormSchema(id: string, body: any) {
    const rawSchema = body.fieldsSchema || body.fields_schema || body;
    const formName = body.formName || body.form_name;
    const schemaString = typeof rawSchema === 'string' ? rawSchema : JSON.stringify(rawSchema);

    try {
      const updated = await (this.prisma as any).dynamic_forms.update({
        where: { id: BigInt(id) },
        data: {
          ...(formName ? { form_name: formName } : {}),
          fields_schema: schemaString,
        },
      });

      return {
        success: true,
        message: 'تم حفظ وتحديث هيكل النموذج في قاعدة البيانات بنجاح',
        form: {
          id: String(updated.id),
          formName: updated.form_name,
          formCode: updated.form_code,
          fieldsSchema: updated.fields_schema,
          isActive: updated.is_active,
        },
      };
    } catch (err: any) {
      console.error('Update Form Error:', err);
      throw new BadRequestException('تعذر الحفظ في قاعدة البيانات: ' + err.message);
    }
  }

  // 6. اعتماد وتوثيق الإدخالات الميدانية (تم تحويل submission_data إلى String لحل الخطأ نهائياً)
  async submitForm(payload: {
    formId: string | number;
    submissionData: string | Record<string, any>;
    userId?: number;
    submittedByName?: string;
    status?: string;
  }) {
    // تحويل البيانات دائماً إلى String لتتوافق مع عمود Text في Neon DB
    const submissionString = typeof payload.submissionData === 'string'
      ? payload.submissionData
      : JSON.stringify(payload.submissionData || {});

    try {
      const savedEntry = await (this.prisma as any).form_submissions.create({
        data: {
          form_id: BigInt(payload.formId),
          submission_data: submissionString, // String صريح يمنع خطأ Expected String, provided Object
          ...(payload.userId ? { user_id: BigInt(payload.userId) } : {}),
          status: payload.status || 'مكتمل',
          submitted_at: new Date(),
        },
      });

      try {
        this.realtime.server?.emit('form_submitted', {
          formId: String(payload.formId),
          submittedByName: payload.submittedByName || 'مراقب الجودة الميداني',
          status: payload.status || 'مكتمل',
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Realtime skipped:', e);
      }

      return {
        success: true,
        data: savedEntry,
        message: 'تم حفظ واعتماد النموذج وتوثيقه بنجاح',
      };
    } catch (err: any) {
      console.error('Submit Form Error:', err);
      throw new BadRequestException('تعذر توثيق النموذج في قاعدة البيانات: ' + err.message);
    }
  }
}