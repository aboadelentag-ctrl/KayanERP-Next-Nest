import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DynamicFormsService } from './dynamic-forms.service.js';

@Controller('dynamic-forms')
export class DynamicFormsController {
  constructor(private readonly service: DynamicFormsService) {}

  @Get()
  async getActiveForms() {
    return await this.service.getActiveForms();
  }

  @Get('erp-lookups/:source')
  async getErpLookup(@Param('source') source: string) {
    if (!source) {
      throw new BadRequestException('مصدر البيانات مطلوب');
    }
    return await this.service.getErpLookup(source);
  }

  @Post('create-blank')
  async createBlankForm(@Body() body: any) {
    if (!body || !body.formName) {
      throw new BadRequestException('اسم النموذج مطلوب');
    }
    return await this.service.createBlankForm(body);
  }

  @Post('import-ai')
  @UseInterceptors(FileInterceptor('file'))
  async importWithAi(
    @UploadedFile() file: any,
    @Body('formName') formName?: string,
    @Body('formCode') formCode?: string,
  ) {
    if (!file) {
      throw new BadRequestException('يرجى رفع ملف لتحليله بالذكاء الاصطناعي');
    }
    return await this.service.parseDocumentWithAi(file, formName, formCode);
  }

  @Put(':id')
  async updateFormSchema(@Param('id') id: string, @Body() body: any) {
    if (!id) {
      throw new BadRequestException('معرف النموذج مطلوب للتحديث');
    }
    return await this.service.updateFormSchema(id, body);
  }

  @Post('submit')
  async submitForm(@Body() body: any) {
    if (!body || !body.formId) {
      throw new BadRequestException('بيانات اعتماد وتوثيق النموذج غير مكتملة');
    }
    return await this.service.submitForm(body);
  }
}