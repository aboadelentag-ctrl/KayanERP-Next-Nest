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

  // 2. القوائم المنسدلة المرتبطة بالـ ERP
  async getErpLookup(source: string) {
    switch (source) {
      case 'production_lines':
        return ['خط الحلويات الشرقية (البسبوسة والكنافة)', 'خط الحلويات الغربية والجاتوه', 'خط الشوكولاتة والتزيين', 'خط التعبئة والتغليف النهائي'];
      case 'warehouses':
        return ['مخزن الخامات الرئيسي', 'مخزن إنتاج تام - المعمل', 'مخزن مواد التعبئة والتغليف'];
      case 'branches':
        return ['معرض المنصورة', 'معرض دكرنس', 'معرض منية النصر', 'معرض شربين', 'معرض بلقاس', 'معرض الزقازيق', 'معرض السنبلاوين'];
      default:
        return ['قسم عام 1', 'قسم عام 2'];
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