import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service.js';
import { SalesService } from './sales/sales.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly salesService: SalesService,
  ) {}

  @Get()
  getHello(@Res() res: Response) {
    return res.redirect('http://localhost:3001');
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
