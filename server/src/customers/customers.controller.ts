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
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  // ... (outros métodos: create, update, geocode, import mantêm-se iguais)
  @Post()
  async create(@Body() data: any, @Req() req: any) {
    return this.customersService.create({ ...data, tenantId: req.user.tenantId });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    // Garante que não se pode mudar o tenantId e que o update usa o tenant do usuário (embora o service precise validar se o ID pertence ao tenant)
    // Nota: O service idealmente deveria receber o tenantId para verificar ownership.
    // Por enquanto, vamos passar o tenantId para o service se ele suportar ou confiar que o ID é único globalmente (UUID), 
    // mas para segurança total, o service deve verificar: where: { id, tenantId }
    return this.customersService.update(id, { ...data, tenantId: req.user.tenantId });
  }

  @Post(':id/geocode')
  async geocode(@Param('id') id: string) { return this.customersService.geocodeCustomer(id); }

  @Post('import')
  async import(@Body() body: { customers: any[] }, @Req() req: any) {
    return this.customersService.importMassive(req.user.tenantId, body.customers);
  }
}