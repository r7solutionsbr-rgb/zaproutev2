import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search: string = '',
    @Query('status') status: string = ''
  ) {
    return this.customersService.findAll(req.user.tenantId, Number(page), Number(limit), search, status);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.customersService.findOne(id, req.user.tenantId);
  }

  // ... (outros métodos: create, update, geocode, import mantêm-se iguais)
  @Post()
  async create(@Body() data: any, @Req() req: any) {
    return this.customersService.create({ ...data, tenantId: req.user.tenantId });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.customersService.update(id, req.user.tenantId, data);
  }

  @Post(':id/geocode')
  async geocode(@Param('id') id: string, @Req() req: any) { return this.customersService.geocodeCustomer(id, req.user.tenantId); }

  @Post('import')
  async import(@Body() body: { customers: any[] }, @Req() req: any) {
    return this.customersService.importMassive(req.user.tenantId, body.customers);
  }
}