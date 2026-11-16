import { Controller, Get, Post, Body, Param, Query, BadRequestException } from '@nestjs/common';
import { QualityService } from './quality.service.js';
import {
  CreateInspectionDto,
  ReleaseQuarantineDto,
  CreateCcpLogDto,
  CreateNcrDto,
  CloseNcrDto,
} from './dto/quality.dto.js';

@Controller('quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  // 1. استعراض كافة فحوصات الجودة (IQC, IPQC, OQC)
  @Get('inspections')
  async getAllInspections(
    @Query('companyId') companyId?: string,
    @Query('type') type?: string,
  ) {
    return this.qualityService.getAllInspections(companyId || 1, type);
  }

  // 2. تسجيل فحص جودة جديد (حجر صحي تلقائي لـ IQC)
  @Post('inspections')
  async createInspection(@Body() body: CreateInspectionDto) {
    if (!body.itemId || !body.inspectionType || !body.quantity) {
      throw new BadRequestException('الصنف، نوع الفحص، والكمية حقول إلزامية');
    }
    return this.qualityService.createInspection(body);
  }

  // 3. الإفراج عن المواد من الحجر الصحي (Release from Quarantine)
  @Post('inspections/:id/release')
  async releaseQuarantine(
    @Param('id') id: string,
    @Body() body: ReleaseQuarantineDto,
  ) {
    if (!body.status || !body.result) {
      throw new BadRequestException('الحالة والنتيجة المخبرية حقول مطلوبة للإفراج من الحجر');
    }
    return this.qualityService.releaseQuarantine(id, body);
  }

  // 4. قراءات ومتابعة نقاط التحكم الحرجة (HACCP CCP Telemetry)
  @Get('ccp-logs')
  async getCcpLogs(
    @Query('companyId') companyId?: string,
    @Query('pointCode') pointCode?: string,
  ) {
    return this.qualityService.getCcpLogs(companyId || 1, pointCode);
  }

  // 5. تسجيل قراءة نقطة تحكم حرجة (واكتشاف الحيود وتوليد AMS تلقائي)
  @Post('ccp-logs')
  async logCcpReading(@Body() body: CreateCcpLogDto) {
    if (!body.ccpPointCode || !body.ccpPointName || !body.readingType) {
      throw new BadRequestException('كود النقطة، اسم نقطة التحكم، ونوع القراءة حقول مطلوبة');
    }
    return this.qualityService.logCcpReading(body);
  }

  // 6. تقارير عدم المطابقة (NCRs)
  @Get('ncrs')
  async getAllNcrs(@Query('companyId') companyId?: string) {
    return this.qualityService.getAllNcrs(companyId || 1);
  }

  // 7. تسجيل تقرير عدم مطابقة جديد
  @Post('ncrs')
  async createNcr(@Body() body: CreateNcrDto) {
    if (!body.ncrNumber || !body.defectTitle || !body.defectDescription || !body.sourceType) {
      throw new BadRequestException('رقم التقرير، عنوان العيب، الوصف، ومصدر العيب حقول مطلوبة');
    }
    return this.qualityService.createNcr(body);
  }

  // 8. إغلاق تقرير عدم مطابقة
  @Post('ncrs/:id/close')
  async closeNcr(
    @Param('id') id: string,
    @Body() body: CloseNcrDto,
  ) {
    if (!body.disposition) {
      throw new BadRequestException('التصرف النهائي في المنتج حقل إلزامي لإغلاق التقرير');
    }
    return this.qualityService.closeNcr(id, body);
  }
}
