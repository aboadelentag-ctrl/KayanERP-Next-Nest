import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users')
  async getUsers() {
    return this.usersService.getUsers();
  }

  @Get('roles')
  async getRoles() {
    return this.usersService.getRoles();
  }

  @Get('permissions')
  async getPermissions() {
    return this.usersService.getPermissionsDictionary();
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateUser(id, dto);
  }
}
