import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.accountsCreateInput) {
    return this.prisma.accounts.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.accounts.findMany();
  }
}