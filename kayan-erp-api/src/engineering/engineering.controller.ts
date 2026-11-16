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
} from '@nestjs/common';
import type { Response } from 'express';
import { UnifiedMaintenanceService } from './unified-maintenance.service.js';
import { FabricationService } from './fabrication.service.js';
import { WorkflowConfigService } from './workflow-config.service.js';
import { EngineeringExcelService } from './engineering-excel.service.js';
import {
  CreateMaintenanceTicketDto,
  UpdateTicketStepDto,
  QaClearanceDto,
  CloseTicketDto,
  CreateWorkshopDto,
  CreateWorkflowRouteDto,
  CreateFabricationOrderDto,
  IssueMaterialDto,
  CompleteFabricationOrderDto,
  CreateAssetDto,
  CreateStaffDto,
  CreateMaterialDto,
} from './dto/engineering.dto.js';

@Controller('engineering')
export class EngineeringController {
  constructor(
    private readonly maintenanceService: UnifiedMaintenanceService,
    private readonly fabricationService: FabricationService,
    private readonly workflowService: WorkflowConfigService,
    private readonly excelService: EngineeringExcelService,
  ) {}

  // ==========================================
  // 1. تذاكر الصيانة والمهام الطارئة (CMMS & Emergency)
  // ==========================================

  @Get('tickets')
  async getTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('sourceType') sourceType?: string,
    @Query('workshopId') workshopId?: string,
    @Query('search') search?: string,
  ) {
    return this.maintenanceService.getTickets(1, { status, priority, sourceType, workshopId, search });
  }

  @Post('tickets')
  async createTicket(@Body() dto: CreateMaintenanceTicketDto) {
    return this.maintenanceService.createTicket(dto, 1);
  }

  @Patch('tickets/:id/advance')
  async advanceStep(@Param('id') id: string, @Body() dto: UpdateTicketStepDto) {
    return this.maintenanceService.advanceStep(id, dto, 1);
  }

  @Patch('tickets/:id/qa-clearance')
  async qaClearance(@Param('id') id: string, @Body() dto: QaClearanceDto) {
    return this.maintenanceService.qaClearance(id, dto, 1);
  }

  @Patch('tickets/:id/close')
  async closeTicket(@Param('id') id: string, @Body() dto: CloseTicketDto) {
    return this.maintenanceService.closeTicket(id, dto, 1);
  }

  @Get('metrics/downtime-oee')
  async getDowntimeOee() {
    return this.maintenanceService.getDowntimeAndOeeMetrics(1);
  }

  // ==========================================
  // 2. إدارة الورش والمسارات الديناميكية (Workshops & Dynamic Routing)
  // ==========================================

  @Get('workshops')
  async getWorkshops() {
    return this.workflowService.getWorkshops(1);
  }

  @Post('workshops')
  async createWorkshop(@Body() dto: CreateWorkshopDto) {
    return this.workflowService.createWorkshop(dto, 1);
  }

  @Post('workshops/routes')
  async createWorkflowRoute(@Body() dto: CreateWorkflowRouteDto) {
    return this.workflowService.createWorkflowRoute(dto, 1);
  }

  // ==========================================
  // 3. أوامر التصنيع الداخلي والرسملة (Fabrication & Capitalization)
  // ==========================================

  @Get('fabrication/orders')
  async getFabricationOrders(
    @Query('status') status?: string,
    @Query('workshopId') workshopId?: string,
    @Query('search') search?: string,
  ) {
    return this.fabricationService.getFabricationOrders(1, { status, workshopId, search });
  }

  @Post('fabrication/orders')
  async createFabricationOrder(@Body() dto: CreateFabricationOrderDto) {
    return this.fabricationService.createFabricationOrder(dto, 1);
  }

  @Post('fabrication/orders/issue-material')
  async issueMaterial(@Body() dto: IssueMaterialDto) {
    return this.fabricationService.issueMaterial(dto, 1);
  }

  @Post('fabrication/orders/:id/capitalize')
  async completeAndCapitalizeOrder(
    @Param('id') id: string,
    @Body() dto: CompleteFabricationOrderDto,
  ) {
    return this.fabricationService.completeAndCapitalizeOrder(id, dto, 1);
  }

  // ==========================================
  // 4. سجل الأصول الهندسية
  // ==========================================

  @Get('assets')
  async getAssets(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
  ) {
    return this.fabricationService.getAssets(1, { category, status, branchId, search });
  }

  @Post('assets')
  async createAsset(@Body() dto: CreateAssetDto) {
    return this.fabricationService.createAsset(dto, 1);
  }

  // ==========================================
  // 5. مخزن الخامات الهندسية وقطع الغيار
  // ==========================================

  @Get('materials')
  async getMaterials(
    @Query('materialType') materialType?: string,
    @Query('isRemnant') isRemnant?: string,
    @Query('search') search?: string,
  ) {
    const remnantBool = isRemnant !== undefined ? isRemnant === 'true' : undefined;
    return this.fabricationService.getMaterials(1, { materialType, isRemnant: remnantBool, search });
  }

  @Post('materials')
  async createMaterial(@Body() dto: CreateMaterialDto) {
    return this.fabricationService.createMaterial(dto, 1);
  }

  // ==========================================
  // 6. فريق المهندسين والفنيين
  // ==========================================

  @Get('staff')
  async getStaff(
    @Query('workshopId') workshopId?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.fabricationService.getStaff(1, { workshopId, role, search });
  }

  @Post('staff')
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.fabricationService.createStaff(dto, 1);
  }

  // ==========================================
  // 7. خدمة التصدير والاستيراد لملفات Excel (Universal Excel)
  // ==========================================

  @Get('excel/export/:entity')
  async exportExcel(@Param('entity') entity: string, @Res() res: Response) {
    let buffer: Buffer;
    let fileName = `engineering_${entity}_${Date.now()}.xlsx`;

    switch (entity) {
      case 'assets':
        buffer = await this.excelService.exportAssets(1);
        fileName = 'سجل_الأصول_الهندسية.xlsx';
        break;
      case 'tickets':
        buffer = await this.excelService.exportTickets(1);
        fileName = 'تذاكر_الصيانة_والطوارئ.xlsx';
        break;
      case 'materials':
        buffer = await this.excelService.exportMaterials(1);
        fileName = 'مخزن_الخامات_وقطع_الغيار.xlsx';
        break;
      case 'staff':
        buffer = await this.excelService.exportStaff(1);
        fileName = 'فريق_المهندسين_والفنيين.xlsx';
        break;
      case 'fabrication-orders':
        buffer = await this.excelService.exportFabricationOrders(1);
        fileName = 'أوامر_التصنيع_الداخلي.xlsx';
        break;
      default:
        return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'كيان غير مدعوم' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  }

  @Post('excel/import/:entity')
  async importExcel(@Param('entity') entity: string, @Body() body: { rows: any[] }) {
    const rows = Array.isArray(body?.rows) ? body.rows : [];

    switch (entity) {
      case 'assets':
        return this.excelService.importAssets(rows, 1);
      case 'tickets':
        return this.excelService.importTickets(rows, 1);
      case 'materials':
        return this.excelService.importMaterials(rows, 1);
      case 'staff':
        return this.excelService.importStaff(rows, 1);
      default:
        return { success: false, message: 'كيان غير مدعوم للاستيراد' };
    }
  }
}
