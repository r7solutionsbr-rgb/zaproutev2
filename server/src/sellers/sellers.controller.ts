import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sellers')
@UseGuards(JwtAuthGuard)
export class SellersController {
  constructor(private readonly sellersService: SellersService) { }

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.sellersService.findAll(tenantId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.sellersService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.sellersService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.sellersService.remove(id);
  }
}