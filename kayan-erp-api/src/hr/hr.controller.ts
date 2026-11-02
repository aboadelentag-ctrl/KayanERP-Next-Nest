import { Controller, Get, Post, Body, Query, BadRequestException } from '@nestjs/common';
import { HrService } from './hr.service.js';

// تعريف كلاسات الـ DTO بشكل صريح لتوافق كامل مع isolatedModules و emitDecoratorMetadata
export class CreateEmployeeDto {
  name!: string;
  employeeCode?: string;
  departmentId?: string | number;
  jobTitleId?: string | number;
  branchId?: string | number;
  basicSalary?: number;
  allowances?: number;
  active?: boolean;
}

export class AttendanceLogDto {
  employeeId?: string | number;
  employeeCode!: string;
  employeeName?: string;
  checkInTime?: string;
  checkOutTime?: string;
  workDate?: string;
  shiftName?: string;
  status?: 'PRESENT' | 'LATE' | 'ABSENT' | 'OVERTIME';
  overtimeHours?: number;
  delayMinutes?: number;
  notes?: string;
}

export class CreateAdvanceDto {
  employeeId!: string | number;
  employeeCode?: string;
  employeeName?: string;
  amount!: number;
  reason?: string;
  deductMonth?: string;
  status?: 'PENDING' | 'APPROVED' | 'DEDUCTED';
}

@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('employees')
  async getEmployees(
    @Query('departmentId') departmentId?: string,
    @Query('branchId') branchId?: string,
    @Query('active') active?: string,
  ) {
    const isActive = active !== undefined ? active === 'true' : undefined;
    return await this.hrService.getEmployees({ departmentId, branchId, active: isActive });
  }

  @Post('employees')
  async createEmployee(@Body() body: CreateEmployeeDto) {
    return await this.hrService.createEmployee(body);
  }

  @Get('departments')
  async getDepartments() {
    return await this.hrService.getDepartments();
  }

  @Get('job-titles')
  async getJobTitles() {
    return await this.hrService.getJobTitles();
  }

  @Post('attendance/log')
  async logAttendance(@Body() body: AttendanceLogDto) {
    return await this.hrService.logAttendance(body);
  }

  @Get('attendance/logs')
  async getAttendanceLogs(
    @Query('date') date?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return await this.hrService.getAttendanceLogs(date, employeeId);
  }

  @Get('advances')
  async getAdvances(@Query('employeeId') employeeId?: string) {
    return await this.hrService.getAdvances(employeeId);
  }

  @Post('advances')
  async createAdvance(@Body() body: CreateAdvanceDto) {
    return await this.hrService.createAdvance(body);
  }
}
