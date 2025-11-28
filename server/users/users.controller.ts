import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @Post()
  async create(@Request() req: any, @Body() data: any) {
    return this.usersService.create({ ...data, tenantId: req.user.tenantId });
  }
  
  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
      return this.usersService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}