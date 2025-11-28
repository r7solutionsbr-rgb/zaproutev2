import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.customersService.findAll(tenantId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.customersService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.customersService.update(id, data);
  }

  // Endpoint para o botão "Localizar"
  @Post(':id/geocode')
  async geocode(@Param('id') id: string) {
    return this.customersService.geocodeCustomer(id);
  }

  // Endpoint para Importação via Excel/CSV
  @Post('import')
  async import(@Body() body: { tenantId: string; customers: any[] }) {
    return this.customersService.importMassive(body.tenantId, body.customers);
  }
}