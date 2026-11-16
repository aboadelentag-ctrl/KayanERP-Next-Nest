import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';
import {
  CreateComplaintDto,
  FreezeBatchDto,
  ResolveComplaintDto,
  LogSurveyDto,
} from './dto/call-center.dto.js';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ComplaintTraceabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (obj instanceof Decimal) return Number(obj);
    if (Array.isArray(obj)) return obj.map((item) => this.serializeBigInt(item));
    if (typeof obj === 'object' && !(obj instanceof Date)) {
      const res: any = {};
      for (const key of Object.keys(obj)) {
        res[key] = this.serializeBigInt(obj[key]);
      }
      return res;
    }
    return obj;
  }

  // 1. تحليل التشغيلة والشكاوى والتتبع الأمامي الفوري (Forward Traceability Radar)
  async analyzeBatchForComplaint(
    companyId: string | number = 1,
    batchId?: string | number,
    orderId?: string | number,
    customerId?: string | number,
  ) {
    const cid = BigInt(companyId);

    let targetBatch: any = null;
    let bId: bigint | null = null;

    if (batchId) {
      bId = BigInt(batchId);
      targetBatch = await this.prisma.inventory_batches.findFirst({
        where: { id: bId, company_id: cid },
      });
    } else if (orderId) {
      // البحث عن أول تشغيلة مرتبطة ببنود الطلب
      const orderLines = await this.prisma.sales_order_lines.findMany({
        where: {
          sales_order_id: BigInt(orderId),
          batch_id: { not: null },
        },
      });

      if (orderLines.length > 0 && orderLines[0].batch_id) {
        bId = orderLines[0].batch_id;
        targetBatch = await this.prisma.inventory_batches.findFirst({
          where: { id: bId, company_id: cid },
        });
      }
    }

    if (!targetBatch && bId) {
      targetBatch = await this.prisma.inventory_batches.findFirst({
        where: { id: bId, company_id: cid },
      });
    }

    const batchNumber = targetBatch?.batch_number || 'UNKNOWN';

    // أ) التتبع الأمامي: إيجاد كافة العملاء والطلبات التي صُرفت لها هذه التشغيلة
    const orderLinesWithBatch = bId
      ? await this.prisma.sales_order_lines.findMany({
          where: { batch_id: bId },
          include: {
            sales_orders: {
              include: {
                customers: true,
                branches: true,
              },
            },
            items: true,
          },
          orderBy: { id: 'desc' },
        })
      : [];

    const otherBuyersMap = new Map<string, any>();
    let totalSoldFromBatch = 0;

    for (const line of orderLinesWithBatch) {
      const order = line.sales_orders;
      if (!order) continue;
      const cust = order.customers;
      const qty = Number(line.quantity || 0);
      totalSoldFromBatch += qty;

      const custKey = cust ? String(cust.id) : `GUEST-${order.order_number}`;
      if (!otherBuyersMap.has(custKey)) {
        otherBuyersMap.set(custKey, {
          customerId: cust ? String(cust.id) : null,
          customerName: cust?.customer_name || 'عميل نقدي / غير مسجل',
          phone: cust?.phone || 'غير مسجل',
          trustScore: cust?.trust_score ?? 100,
          branchName: order.branches?.branch_name || 'الفرع الرئيسي',
          orderNumber: order.order_number,
          orderDate: order.order_date,
          quantity: qty,
          unitPrice: Number(line.unit_price || 0),
          isCurrentComplainant: customerId && cust ? String(cust.id) === String(customerId) : false,
        });
      } else {
        const existing = otherBuyersMap.get(custKey);
        existing.quantity += qty;
      }
    }

    const otherBuyers = Array.from(otherBuyersMap.values());

    // ب) حصر الرصيد المتبقي من هذه التشغيلة في كافة ثلاجات ومستودعات الفروع
    const batchesAcrossBranches = await this.prisma.inventory_batches.findMany({
      where: {
        company_id: cid,
        batch_number: batchNumber,
      },
    });

    let totalProduced = 0;
    let totalRemaining = 0;
    const branchStockList: any[] = [];

    for (const b of batchesAcrossBranches) {
      const initQ = Number(b.initial_quantity || 0);
      const curQ = Number(b.current_quantity || 0);
      totalProduced += initQ;
      totalRemaining += curQ;

      const wh = await this.prisma.warehouses.findFirst({
        where: { id: b.warehouse_id },
        include: { branches: true },
      });

      branchStockList.push({
        batchId: String(b.id),
        warehouseId: String(b.warehouse_id),
        warehouseName: wh?.warehouse_name || 'مستودع رئيسي',
        branchName: wh?.branches?.branch_name || 'الفرع الرئيسي',
        currentQuantity: curQ,
        initialQuantity: initQ,
        isFrozen: b.is_frozen,
        freezeReason: b.freeze_reason,
        status: b.status,
      });
    }

    // ج) حصر الشكاوى السابقة على نفس التشغيلة
    const batchComplaints = bId
      ? await this.prisma.customer_complaints.findMany({
          where: {
            company_id: cid,
            batch_id: bId,
          },
          include: {
            customers: true,
          },
          orderBy: { created_at: 'desc' },
        })
      : [];

    // د) فحص سجل العميل المشتكي وحساب مؤشر المصداقية (Anti-Fraud Algorithm)
    let complainantProfile: any = null;
    let customerTotalComplaints = 0;
    let customerTrustScore = 100;

    if (customerId) {
      const cust = await this.prisma.customers.findFirst({
        where: { id: BigInt(customerId), company_id: cid },
      });
      if (cust) {
        customerTotalComplaints = cust.complaints_count || 0;
        customerTrustScore = cust.trust_score ?? 100;
        complainantProfile = {
          customerId: String(cust.id),
          customerName: cust.customer_name,
          phone: cust.phone,
          trustScore: customerTrustScore,
          complaintsCount: customerTotalComplaints,
          preferencesNotes: cust.preferences_notes,
        };
      }
    }

    // هـ) الحساب الذكي لمؤشر مصداقية الشكوى
    // قاعدة التحقق:
    // 1. إذا كان عدد الشكاوى الأخرى على التشغيلة >= 2 -> عيب تشغيلة حقيقي بنسبة عالية
    // 2. إذا كان المشترين الآخرين >= 10 ولم يشتكِ أحد، وكان رصيد ثقة العميل منخفض (< 70) أو شكاويه متكررة (> 3) -> شبهة كيدية
    // 3. خلاف ذلك -> حادث فردي أو قيد الفحص
    let fraudSuggestion: 'GENUINE_BATCH_DEFECT' | 'ISOLATED_INCIDENT' | 'MALICIOUS_SUSPECTED' | 'UNDER_INVESTIGATION' = 'UNDER_INVESTIGATION';
    let fraudConfidencePercent = 75;
    let fraudAnalysisReason = 'البيانات قيد التدقيق وفحص عينات الجودة.';

    const otherComplaintsCount = batchComplaints.length;
    const otherBuyersCount = otherBuyers.length;

    if (otherComplaintsCount >= 2) {
      fraudSuggestion = 'GENUINE_BATCH_DEFECT';
      fraudConfidencePercent = 95;
      fraudAnalysisReason = `تم رصد ${otherComplaintsCount} شكاوى سابقة على نفس التشغيلة من فروع/عملاء مختلفين. مؤشر واضح لوجود خلل تصنيعي بالتشغيلة.`;
    } else if (otherBuyersCount >= 8 && otherComplaintsCount === 0 && customerTrustScore <= 60) {
      fraudSuggestion = 'MALICIOUS_SUSPECTED';
      fraudConfidencePercent = 88;
      fraudAnalysisReason = `تم بيع التشغيلة لأكثر من ${otherBuyersCount} عميلاً دون أي ملاحظة جودة، وسجل العميل المشتكي يحتوي على شكاوى متكررة مع تدني مؤشر الثقة (${customerTrustScore}%).`;
    } else if (otherBuyersCount >= 5 && otherComplaintsCount === 0) {
      fraudSuggestion = 'ISOLATED_INCIDENT';
      fraudConfidencePercent = 80;
      fraudAnalysisReason = `تم بيع التشغيلة لـ ${otherBuyersCount} عملاء بنجاح. قد يكون العيب ناتجاً عن سوء نقل أو ظروف تخزين فردية لدى العميل.`;
    } else {
      fraudSuggestion = 'UNDER_INVESTIGATION';
      fraudConfidencePercent = 60;
      fraudAnalysisReason = 'التشغيلة جديدة وعدد المشترين محدود، يُوصى بالتواصل الاستباقي مع باقي المشترين.';
    }

    return this.serializeBigInt({
      success: true,
      data: {
        batchId: targetBatch ? String(targetBatch.id) : null,
        batchNumber,
        productionDate: targetBatch?.production_date,
        expiryDate: targetBatch?.expiry_date,
        isFrozen: targetBatch?.is_frozen || false,
        freezeReason: targetBatch?.freeze_reason || null,
        totalProduced,
        totalSold: totalSoldFromBatch,
        totalRemaining,
        otherBuyersCount,
        otherComplaintsCount,
        otherBuyers,
        branchStock: branchStockList,
        batchComplaints: batchComplaints.map((c) => ({
          id: String(c.id),
          ticketNumber: c.ticket_number,
          customerName: c.customers?.customer_name,
          category: c.category,
          severity: c.severity,
          status: c.status,
          investigationResult: c.investigation_result,
          createdAt: c.created_at,
        })),
        complainantProfile,
        radarDiagnosis: {
          suggestion: fraudSuggestion,
          confidencePercent: fraudConfidencePercent,
          reason: fraudAnalysisReason,
        },
      },
    });
  }

  // 2. تجميد فوري للتشغيلة المشبوهة بكافة الفروع وفتح تذكرة AMS تصحيحية
  async freezeBatchAcrossBranches(dto: FreezeBatchDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const bId = BigInt(dto.batchId);

    const initialBatch = await this.prisma.inventory_batches.findFirst({
      where: { id: bId, company_id: cid },
    });

    if (!initialBatch) {
      throw new NotFoundException('التشغيلة المطلوبة غير موجودة');
    }

    const batchNumber = initialBatch.batch_number;

    // تجميد كافة سجلات التشغيلة عبر كافة المستودعات والفروع
    await this.prisma.inventory_batches.updateMany({
      where: {
        company_id: cid,
        batch_number: batchNumber,
      },
      data: {
        is_frozen: true,
        freeze_reason: dto.reason || 'تجميد احترازي عاجل بناء على شكوى جودة كول سنتر',
        status: 'HOLD',
      },
    });

    // إنشاء تذكرة تصحيحية تلقائية في AMS (Action Management System)
    const amsTaskCode = `AMS-HOLD-${Date.now().toString().slice(-6)}`;
    const amsTask = await this.prisma.ams_tasks.create({
      data: {
        company_id: cid,
        task_code: amsTaskCode,
        title: `[حظر فوري للتشغيلة] ${batchNumber} - فحص جودة عاجل`,
        description: `تم إيقاف وتجميد التشغيلة رقم (${batchNumber}) في كافة الفروع والمستودعات تلقائياً. السبب: ${dto.reason}. يرجى فحص عينات الشاهد وسحب المتبقي فورا.`,
        task_type: 'BATCH_HOLD_NCR',
        priority: 'CRITICAL',
        assignee_name: 'مدير تأكيد الجودة (QA)',
        sla_deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // ساعتان فقط للبت في الإيقاف
        status: 'IN_PROGRESS',
        whatsapp_status: 'QUEUED',
      },
    });

    // إذا كانت هناك شكوى مرتبطة، ربط التذكرة بها وتحديث حالتها
    if (dto.complaintId) {
      await this.prisma.customer_complaints.update({
        where: { id: BigInt(dto.complaintId) },
        data: {
          status: 'ESCALATED_AMS',
          ams_task_id: amsTask.id,
          resolution_notes: `تم تجميد التشغيلة ${batchNumber} ورفع تذكرة تصحيحية رقم ${amsTaskCode}`,
        },
      });
    }

    // إرسال إشعار فوري عبر الـ WebSocket
    try {
      this.realtime?.server?.emit('batch:frozen', {
        batchNumber,
        reason: dto.reason,
        amsTaskCode,
        timestamp: new Date(),
      });
    } catch (e) {
      // ignore websocket errors
    }

    return this.serializeBigInt({
      success: true,
      message: `تم بنجاح تجميد التشغيلة (${batchNumber}) في كافة الفروع وإنشاء مهمة تصحيحية AMS برقم ${amsTaskCode}`,
      data: {
        batchNumber,
        isFrozen: true,
        amsTaskId: String(amsTask.id),
        amsTaskCode,
      },
    });
  }

  // 3. تسجيل شكوى عميل جديدة
  async createComplaint(dto: CreateComplaintDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const ticketNumber = `CMP-${Date.now().toString().slice(-6)}`;

    const cId = BigInt(dto.customerId);
    const orderId = dto.salesOrderId ? BigInt(dto.salesOrderId) : null;
    const batchId = dto.batchId ? BigInt(dto.batchId) : null;

    // حصر الشكاوى السابقة على التشغيلة
    let batchOtherComplaintsCount = 0;
    let batchOtherBuyersCount = 0;

    if (batchId) {
      batchOtherComplaintsCount = await this.prisma.customer_complaints.count({
        where: { company_id: cid, batch_id: batchId },
      });

      batchOtherBuyersCount = await this.prisma.sales_order_lines.count({
        where: { batch_id: batchId },
      });
    }

    const complaint = await this.prisma.customer_complaints.create({
      data: {
        company_id: cid,
        ticket_number: ticketNumber,
        customer_id: cId,
        sales_order_id: orderId,
        batch_id: batchId,
        category: dto.category,
        severity: dto.severity || 'MEDIUM',
        description: dto.description,
        investigation_result: 'UNDER_INVESTIGATION',
        batch_other_buyers_count: batchOtherBuyersCount,
        batch_other_complaints_count: batchOtherComplaintsCount,
        status: 'OPEN',
      },
    });

    // زيادة عداد الشكاوى للعميل
    await this.prisma.customers.update({
      where: { id: cId },
      data: {
        complaints_count: { increment: 1 },
      },
    });

    return this.serializeBigInt({
      success: true,
      message: `تم تسجيل الشكوى برقم ${ticketNumber}`,
      data: complaint,
    });
  }

  // 4. البت في الشكوى وتعديل مصداقية العميل (Resolution & Anti-Fraud Action)
  async resolveComplaint(dto: ResolveComplaintDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const compId = BigInt(dto.complaintId);

    const complaint = await this.prisma.customer_complaints.findFirst({
      where: { id: compId, company_id: cid },
    });

    if (!complaint) {
      throw new NotFoundException('الشكوى غير موجودة');
    }

    const cust = await this.prisma.customers.findFirst({
      where: { id: complaint.customer_id },
    });

    let newTrustScore = cust?.trust_score ?? 100;

    if (dto.investigationResult === 'MALICIOUS_SUSPECTED') {
      // خصم من رصيد المصداقية
      const penalty = dto.trustScoreDelta ?? 25;
      newTrustScore = Math.max(10, newTrustScore - penalty);
    } else if (dto.investigationResult === 'GENUINE_BATCH_DEFECT') {
      // العميل كان على حق، تحسين رصيد المصداقية
      const reward = dto.trustScoreDelta ?? 5;
      newTrustScore = Math.min(100, newTrustScore + reward);
    }

    if (cust) {
      await this.prisma.customers.update({
        where: { id: cust.id },
        data: {
          trust_score: newTrustScore,
        },
      });
    }

    const updated = await this.prisma.customer_complaints.update({
      where: { id: compId },
      data: {
        investigation_result: dto.investigationResult,
        status: dto.status || 'RESOLVED',
        resolution_notes: dto.resolutionNotes,
        resolved_at: new Date(),
      },
    });

    return this.serializeBigInt({
      success: true,
      message: 'تم البت في الشكوى وتحديث مؤشر مصداقية العميل',
      data: {
        complaint: updated,
        customerTrustScore: newTrustScore,
      },
    });
  }

  // 5. تسجيل نتيجة اتصال استبيان جودة مع مشترٍ آخر من نفس التشغيلة
  async logSurveyBuyer(dto: LogSurveyDto, companyId: string | number = 1) {
    const cid = BigInt(companyId);
    const custId = BigInt(dto.targetCustomerId);

    const callLog = await this.prisma.call_logs.create({
      data: {
        company_id: cid,
        customer_id: custId,
        call_type: 'QUALITY_SURVEY',
        phone_number: dto.phone || 'N/A',
        notes: `[استبيان تشغيلة ${dto.batchId}] حالة الرضا: ${dto.satisfactionStatus}. ملاحظات: ${dto.notes || 'سليم دون ملاحظات'}`,
      },
    });

    return this.serializeBigInt({
      success: true,
      message: 'تم تسجيل نتيجة الاتصال الاستبياني بنجاح',
      data: callLog,
    });
  }

  // 6. استرجاع قائمة الشكاوى
  async getComplaints(companyId: string | number = 1, query?: { status?: string; category?: string; search?: string }) {
    const cid = BigInt(companyId);
    const where: any = { company_id: cid };

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }
    if (query?.category && query.category !== 'ALL') {
      where.category = query.category;
    }

    const list = await this.prisma.customer_complaints.findMany({
      where,
      include: {
        customers: true,
        sales_orders: true,
        inventory_batches: true,
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    return this.serializeBigInt({
      success: true,
      data: list,
    });
  }
}
