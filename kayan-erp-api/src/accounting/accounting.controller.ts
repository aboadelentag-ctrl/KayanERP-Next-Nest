import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { AccountingService } from './accounting.service.js';

export class CreateAccountDto {
  accountCode!: string;
  accountName!: string;
  accountType!: 'Assets' | 'Liabilities' | 'Equity' | 'Revenues' | 'Expenses';
  parentAccountId?: string | number;
  description?: string;
}

export class JournalEntryLineDto {
  accountId!: string | number;
  accountCode?: string;
  accountName?: string;
  debit!: number;
  credit!: number;
  description?: string;
  costCenter?: string;
}

export class CreateJournalEntryDto {
  entryDate?: string;
  description!: string;
  referenceType?: string;
  referenceNumber?: string;
  branchName?: string;
  lines!: JournalEntryLineDto[];
}

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('chart-of-accounts')
  async getChartOfAccounts() {
    return await this.accountingService.getChartOfAccounts();
  }

  @Post('chart-of-accounts')
  async createAccount(@Body() body: CreateAccountDto) {
    return await this.accountingService.createAccount(body);
  }

  @Get('journal-entries')
  async getJournalEntries() {
    return await this.accountingService.getJournalEntries();
  }

  @Post('journal-entries')
  async createJournalEntry(@Body() body: CreateJournalEntryDto) {
    return await this.accountingService.createJournalEntry(body);
  }

  @Get('trial-balance')
  async getTrialBalance() {
    return await this.accountingService.getTrialBalance();
  }

  @Get('financial-reports/income-statement')
  async getIncomeStatement() {
    return await this.accountingService.getIncomeStatement();
  }
}
