import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { SupervisorExecutionService } from './supervisor-execution.service.js';
import { HousekeepingIntegrationService } from './housekeeping-integration.service.js';
import { HousekeepingMasterService } from './housekeeping-master.service.js';
import { HousekeepingExcelService } from './housekeeping-excel.service.js';
import {
  CreateWorkerDto,
  UpdateWorkerDto,
  CreateZoneDto,
  UpdateZoneDto,
  ExecuteTaskDto,
  ConvertToMaintenanceDto,
  QaVerificationDto,
  CreateSupplyDto,
  IssueSupplyDto,
  CreateHygieneCheckDto,
} from './dto/housekeeping.dto.js';

@Controller('housekeeping')
export class HousekeepingController {
  constructor(
    private readonly supervisorService: SupervisorExecutionService,
    private readonly integrationService: HousekeepingIntegrationService,
    private readonly masterService: HousekeepingMasterService,
    private readonly excelService: HousekeepingExcelService,
  ) {}

  // =================== تنفيذ وتفتيش المشرف ===================

  @Post('tasks/execute')
  async executeTask(@Body() dto: ExecuteTaskDto) {
    const companyId = BigInt(1);
    const data = await this.supervisorService.executeTask(companyId, dto);
    return { success: true, message: 'تم تسجيل مهمة النظافة بنجاح باسم العامل', data };
  }

  @Get('tasks')
  async getTasks(
    @Query('zoneId') zoneId?: string,
    @Query('workerId') workerId?: string,
    @Query('status') status?: string,
    @Query('taskType') taskType?: string,
  ) {
    const companyId = BigInt(1);
    const data = await this.supervisorService.getTaskLogs(companyId, {
      zoneId,
      workerId,
      status,
      taskType,
    });
    return { success: true, count: data.length, data };
  }

  @Get('tasks/:id')
  async getTaskById(@Param('id') id: string) {
    const companyId = BigInt(1);
    const data = await this.supervisorService.getTaskById(companyId, BigInt(id));
    return { success: true, data };
  }

  @Get('metrics/dashboard')
  async getDashboardMetrics() {
    const companyId = BigInt(1);
    const data = await this.supervisorService.getDashboardMetrics(companyId);
    return { success: true, data };
  }

  // =================== التكامل مع الصيانة والجودة ===================

  @Post('tasks/convert-to-maintenance')
  async convertToMaintenance(@Body() dto: ConvertToMaintenanceDto) {
    const companyId = BigInt(1);
    const data = await this.integrationService.convertToMaintenanceTicket(companyId, dto);
    return {
      success: true,
      message: 'تم تحويل البلاغ وتوليد تذكرة صيانة هندسية وربطها بنجاح',
      data,
    };
  }

  @Post('tasks/verify-qa')
  async verifyTaskByQa(@Body() dto: QaVerificationDto) {
    const companyId = BigInt(1);
    const data = await this.integrationService.verifyTaskByQa(companyId, dto);
    return { success: true, message: 'تم توثيق نتيجة فحص الجودة والتطهير بنجاح', data };
  }

  @Post('tasks/fleet-sanitize')
  async logFleetSanitization(@Body() data: any) {
    const companyId = BigInt(1);
    const result = await this.integrationService.logFleetSanitization(companyId, data);
    return { success: true, message: 'تم توثيق تطهير الشاحنة المبردة بنجاح', data: result };
  }

  // =================== إدارة العمال والمناطق والمخزن ===================

  @Get('workers')
  async getWorkers(@Query('search') search?: string, @Query('zoneType') zoneType?: string) {
    const companyId = BigInt(1);
    const data = await this.masterService.getWorkers(companyId, { search, zoneType });
    return { success: true, count: data.length, data };
  }

  @Post('workers')
  async createWorker(@Body() dto: CreateWorkerDto) {
    const companyId = BigInt(1);
    const data = await this.masterService.createWorker(companyId, dto);
    return { success: true, message: 'تم تسجيل عامل الإشراف الداخلي بنجاح', data };
  }

  @Patch('workers/:id')
  async updateWorker(@Param('id') id: string, @Body() dto: UpdateWorkerDto) {
    const companyId = BigInt(1);
    const data = await this.masterService.updateWorker(companyId, BigInt(id), dto);
    return { success: true, message: 'تم تحديث بيانات العامل بنجاح', data };
  }

  @Get('zones')
  async getZones(@Query('envType') envType?: string, @Query('search') search?: string) {
    const companyId = BigInt(1);
    const data = await this.masterService.getZones(companyId, { envType, search });
    return { success: true, count: data.length, data };
  }

  @Post('zones')
  async createZone(@Body() dto: CreateZoneDto) {
    const companyId = BigInt(1);
    const data = await this.masterService.createZone(companyId, dto);
    return { success: true, message: 'تم إضافة منطقة النظافة والـ SSOP بنجاح', data };
  }

  @Patch('zones/:id')
  async updateZone(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    const companyId = BigInt(1);
    const data = await this.masterService.updateZone(companyId, BigInt(id), dto);
    return { success: true, message: 'تم تحديث المنطقة بنجاح', data };
  }

  @Get('supplies')
  async getSupplies(@Query('category') category?: string, @Query('colorCode') colorCode?: string) {
    const companyId = BigInt(1);
    const data = await this.masterService.getSupplies(companyId, { category, colorCode });
    return { success: true, count: data.length, data };
  }

  @Post('supplies')
  async createSupply(@Body() dto: CreateSupplyDto) {
    const companyId = BigInt(1);
    const data = await this.masterService.createSupply(companyId, dto);
    return { success: true, message: 'تم إضافة المنظف/الأداة للمخزن بنجاح', data };
  }

  @Post('supplies/issue')
  async issueSupply(@Body() dto: IssueSupplyDto) {
    const companyId = BigInt(1);
    const data = await this.masterService.issueSupply(companyId, dto);
    return { success: true, message: 'تم صرف المنظفات والأدوات وتحديث الرصيد', data };
  }

  @Get('supplies/issuances')
  async getIssuances() {
    const companyId = BigInt(1);
    const data = await this.masterService.getIssuances(companyId);
    return { success: true, count: data.length, data };
  }

  @Get('hygiene')
  async getHygieneChecks() {
    const companyId = BigInt(1);
    const data = await this.masterService.getHygieneChecks(companyId);
    return { success: true, count: data.length, data };
  }

  @Post('hygiene')
  async logHygieneCheck(@Body() dto: CreateHygieneCheckDto) {
    const companyId = BigInt(1);
    const data = await this.masterService.logHygieneCheck(companyId, dto);
    return { success: true, message: 'تم تسجيل فحص النظافة الشخصية بنجاح', data };
  }

  // =================== رفع الصور ===================

  @Post('upload-photo')
  async uploadPhoto(@Body() body: { imageBase64: string; title?: string }) {
    if (!body.imageBase64) {
      throw new BadRequestException('يجب تزويد بيانات الصورة');
    }
    // دعم حفظ الصور كـ Data URL مشفرة للاسترجاع المباشر الفوري
    const photoUrl = body.imageBase64.startsWith('data:')
      ? body.imageBase64
      : `data:image/jpeg;base64,${body.imageBase64}`;
    return { success: true, url: photoUrl };
  }

  // =================== تصدير واستيراد Excel ===================

  @Get('excel/export/:entity')
  async exportExcel(@Param('entity') entity: string, @Res() res: Response) {
    const companyId = BigInt(1);
    const { buffer, fileName } = await this.excelService.exportEntity(entity, companyId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    res.status(HttpStatus.OK).send(buffer);
  }

  @Post('excel/import/:entity')
  async importExcel(@Param('entity') entity: string, @Body() body: { rows: any[] }) {
    const companyId = BigInt(1);
    if (!body || !Array.isArray(body.rows) || body.rows.length === 0) {
      throw new BadRequestException('يجب إرسال مصفوفة السجلات rows ضمن جسم الطلب');
    }
    const result = await this.excelService.importEntity(entity, body.rows, companyId);
    return { success: true, ...result };
  }
}
