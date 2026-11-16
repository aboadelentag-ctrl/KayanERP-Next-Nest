import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CustomIconsService } from './custom-icons.service.js';
import { CreateCustomIconDto, UpdateCustomIconDto } from './dto/navigation.dto.js';

@Controller('navigation')
export class NavigationController {
  constructor(private readonly customIconsService: CustomIconsService) {}

  @Get('custom-icons')
  async getCustomIcons() {
    const companyId = BigInt(1);
    const data = await this.customIconsService.getCustomIcons(companyId);
    return { success: true, count: data.length, data };
  }

  @Post('custom-icons')
  async createCustomIcon(@Body() dto: CreateCustomIconDto) {
    const companyId = BigInt(1);
    const data = await this.customIconsService.createCustomIcon(companyId, dto);
    return { success: true, message: 'تم إنشاء الأيقونة وتخصيص شاشاتها بنجاح', data };
  }

  @Patch('custom-icons/:id')
  async updateCustomIcon(@Param('id') id: string, @Body() dto: UpdateCustomIconDto) {
    const companyId = BigInt(1);
    const data = await this.customIconsService.updateCustomIcon(companyId, BigInt(id), dto);
    return { success: true, message: 'تم تحديث الأيقونة وشاشاتها بنجاح', data };
  }

  @Delete('custom-icons/:id')
  async deleteCustomIcon(@Param('id') id: string) {
    const companyId = BigInt(1);
    const data = await this.customIconsService.deleteCustomIcon(companyId, BigInt(id));
    return data;
  }

  @Post('custom-icons/seed-defaults')
  async seedDefaults() {
    const companyId = BigInt(1);
    await this.customIconsService.seedDefaults(companyId);
    return { success: true, message: 'تم تهيئة الأيقونات الافتراضية بنجاح' };
  }
}
