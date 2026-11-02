import { Controller, Get, Post, Body } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { Prisma } from '@prisma/client';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Body() data: Prisma.accountsCreateInput) {
    return this.accountsService.create(data);
  }

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }
}