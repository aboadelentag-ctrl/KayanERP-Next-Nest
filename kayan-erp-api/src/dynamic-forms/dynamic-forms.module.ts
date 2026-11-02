import { Module } from '@nestjs/common';
import { DynamicFormsController } from './dynamic-forms.controller.js';
import { DynamicFormsService } from './dynamic-forms.service.js';
import { RealtimeGateway } from '../realtime.gateway.js';

@Module({
  controllers: [DynamicFormsController],
  providers: [DynamicFormsService, RealtimeGateway],
  exports: [DynamicFormsService],
})
export class DynamicFormsModule {}