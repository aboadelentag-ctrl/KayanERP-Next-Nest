import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { MesService } from './mes.service.js';
import {
  CreateBomHeaderDto,
  CreateWorkOrderDto,
  StartRoutingStepDto,
  CompleteRoutingStepDto,
  LogScrapDto,
  CreateShiftLogDto,
} from './dto/mes.dto.js';

@Controller('mes')
export class MesController {
  constructor(private readonly mesService: MesService) {}

  // 1. استعراض قوائم المواد والتركيبات (BOM)
  @Get('boms')
  async getAllBoms(@Query('companyId') companyId?: string) {
    return this.mesService.getAllBoms(companyId || 1);
  }

  // 2. تفاصيل التركيبة الشجرية ومكوناتها
  @Get('boms/:id')
  async getBomById(@Param('id') id: string) {
    return this.mesService.getBomById(id);
  }

  // 3. إنشاء تركيبة صناعية متعددة المستويات
  @Post('boms')
  async createBom(@Body() body: CreateBomHeaderDto) {
    if (!body.bomCode || !body.bomName || !body.itemId || !body.standardBatchQty) {
      throw new BadRequestException('كود التركيبة، الاسم، الصنف وكمية التشغيلة حقول إلزامية');
    }
    return this.mesService.createBom(body);
  }

  // 4. استعراض أوامر التشغيل الصناعي (Work Orders)
  @Get('work-orders')
  async getAllWorkOrders(
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
  ) {
    return this.mesService.getAllWorkOrders(companyId || 1, status);
  }

  // 5. استرجاع تفاصيل أمر تشغيل محدد
  @Get('work-orders/:id')
  async getWorkOrderById(@Param('id') id: string) {
    return this.mesService.getWorkOrderById(id);
  }

  // 6. إصدار أمر تشغيل جديد
  @Post('work-orders')
  async createWorkOrder(@Body() body: CreateWorkOrderDto) {
    if (!body.workOrderNumber || !body.batchId || !body.itemId || !body.targetQuantity) {
      throw new BadRequestException('رقم أمر التشغيل، رقم التشغيلة/الدفعة، الصنف والكمية حقول مطلوبة');
    }
    return this.mesService.createWorkOrder(body);
  }

  // 7. بدء مرحلة صناعية في صالة الإنتاج
  @Post('work-orders/:id/step/:stepId/start')
  async startRoutingStep(
    @Param('stepId') stepId: string,
    @Body() body: StartRoutingStepDto,
  ) {
    return this.mesService.startRoutingStep(stepId, body);
  }

  // 8. إغلاق وإنهاء مرحلة صناعية
  @Post('work-orders/:id/step/:stepId/complete')
  async completeRoutingStep(
    @Param('stepId') stepId: string,
    @Body() body: CompleteRoutingStepDto,
  ) {
    return this.mesService.completeRoutingStep(stepId, body);
  }

  // 9. رصد وتسجيل هالك أو فاقد تشغيلي
  @Post('work-orders/:id/scrap')
  async logScrap(
    @Param('id') id: string,
    @Body() body: LogScrapDto,
  ) {
    if (!body.itemId || !body.quantity || !body.scrapReasonCategory) {
      throw new BadRequestException('الصنف، الكمية الهالكة، وتصنيف سبب الهدر حقول مطلوبة');
    }
    return this.mesService.logScrap(id, body);
  }

  // 10. إغلاق أمر التشغيل بالكامل واعتماد المنتج التام
  @Post('work-orders/:id/complete')
  async completeWorkOrder(
    @Param('id') id: string,
    @Body() body: { producedQuantity?: number },
  ) {
    return this.mesService.completeWorkOrder(id, body?.producedQuantity);
  }

  // 11. مؤشرات الكفاءة التشغيلية والإنتاجية (OEE & Downtime)
  @Get('oee-stats')
  async getOeeStats(@Query('companyId') companyId?: string) {
    return this.mesService.getOeeStats(companyId || 1);
  }

  // 12. سجلات تسليم الوردية
  @Get('shift-logs')
  async getShiftLogs(@Query('companyId') companyId?: string) {
    return this.mesService.getShiftLogs(companyId || 1);
  }

  // 13. تسجيل محضر تسليم وردية
  @Post('shift-logs')
  async createShiftLog(@Body() body: CreateShiftLogDto) {
    if (!body.shiftName || !body.supervisorName) {
      throw new BadRequestException('اسم الوردية واسم المشرف حقول مطلوبة');
    }
    return this.mesService.createShiftLog(body);
  }
}
