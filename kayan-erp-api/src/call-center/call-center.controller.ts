import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { CallCenterService } from './call-center.service.js';
import { ComplaintTraceabilityService } from './complaint-traceability.service.js';
import {
  CreateCallCenterOrderDto,
  CreateCustomerAddressDto,
  UpdateDispatchStatusDto,
  CreateComplaintDto,
  FreezeBatchDto,
  ResolveComplaintDto,
  LogSurveyDto,
} from './dto/call-center.dto.js';

@Controller('call-center')
export class CallCenterController {
  constructor(
    private readonly callCenterService: CallCenterService,
    private readonly complaintService: ComplaintTraceabilityService,
  ) {}

  // 1. البحث الفوري عن العميل برقم الهاتف
  @Get('customer/lookup')
  async lookupCustomer(@Query('phone') phone: string) {
    return this.callCenterService.lookupCustomer(phone || '');
  }

  // 2. تسجيل عميل جديد
  @Post('customer')
  async createQuickCustomer(
    @Body() dto: { name: string; phone: string; address?: string; notes?: string },
  ) {
    return this.callCenterService.createQuickCustomer(dto);
  }

  // 3. إضافة عنوان للعميل
  @Post('customer/address')
  async addCustomerAddress(@Body() dto: CreateCustomerAddressDto) {
    return this.callCenterService.addCustomerAddress(dto);
  }

  // 4. مناطق التوصيل
  @Get('zones')
  async getDeliveryZones() {
    return this.callCenterService.getDeliveryZones();
  }

  // 5. الرصيد اللحظي للفرع مع أولوية FEFO والتشغيلات
  @Get('branch-stock')
  async getBranchStock(@Query('branchId') branchId: string) {
    return this.callCenterService.getBranchStockFEFO(branchId || '1');
  }

  // 6. إصدار وتوجيه طلب الكول سنتر
  @Post('orders')
  async createCallCenterOrder(@Body() dto: CreateCallCenterOrderDto) {
    return this.callCenterService.createCallCenterOrder(dto);
  }

  // 7. قائمة طلبات التوصيل للطيارين
  @Get('dispatch/orders')
  async getDispatchOrders(
    @Query('deliveryStatus') deliveryStatus?: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
  ) {
    return this.callCenterService.getDispatchOrders(1, { deliveryStatus, branchId, search });
  }

  // 8. تحديث حالة التوصيل وتعيين الطيار
  @Patch('dispatch/orders/:id/status')
  async updateDispatchStatus(
    @Param('id') id: string,
    @Body() dto: UpdateDispatchStatusDto,
  ) {
    return this.callCenterService.updateDispatchStatus(id, dto);
  }

  // 9. قائمة الطيارين المتاحين
  @Get('dispatch/drivers')
  async getDispatchDrivers() {
    return this.callCenterService.getDispatchDrivers();
  }

  // 10. استرجاع الشكاوى
  @Get('complaints')
  async getComplaints(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.complaintService.getComplaints(1, { status, category, search });
  }

  // 11. الرادار التشغيلي للتشغيلة والتحقق من المصداقية
  @Get('complaints/analyze-batch')
  async analyzeBatch(
    @Query('batchId') batchId?: string,
    @Query('orderId') orderId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.complaintService.analyzeBatchForComplaint(1, batchId, orderId, customerId);
  }

  // 12. تسجيل شكوى عميل جديدة
  @Post('complaints')
  async createComplaint(@Body() dto: CreateComplaintDto) {
    return this.complaintService.createComplaint(dto);
  }

  // 13. تجميد فوري للتشغيلة بكافة الفروع ورفع مهمة AMS
  @Post('complaints/freeze-batch')
  async freezeBatch(@Body() dto: FreezeBatchDto) {
    return this.complaintService.freezeBatchAcrossBranches(dto);
  }

  // 14. البت في الشكوى وتعديل مصداقية العميل
  @Patch('complaints/:id/resolve')
  async resolveComplaint(
    @Param('id') id: string,
    @Body() dto: Omit<ResolveComplaintDto, 'complaintId'>,
  ) {
    return this.complaintService.resolveComplaint({
      complaintId: id,
      ...dto,
    });
  }

  // 15. تسجيل نتيجة اتصال استبيان جودة
  @Post('complaints/survey-buyer')
  async logSurveyBuyer(@Body() dto: LogSurveyDto) {
    return this.complaintService.logSurveyBuyer(dto);
  }
}
