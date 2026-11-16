import { Module } from '@nestjs/common';
import { NavigationController } from './navigation.controller.js';
import { CustomIconsService } from './custom-icons.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [NavigationController],
  providers: [CustomIconsService],
  exports: [CustomIconsService],
})
export class NavigationModule {}
