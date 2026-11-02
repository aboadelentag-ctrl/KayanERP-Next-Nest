import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service.js';
import { SalesService } from './sales/sales.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly salesService: SalesService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('categories')
  async getCategories() {
    return await this.salesService.getCategories();
  }

  @Get('products')
  async getProducts(@Query('category') category?: string) {
    return await this.salesService.getProducts(category);
  }
}
