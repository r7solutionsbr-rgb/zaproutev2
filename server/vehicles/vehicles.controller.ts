import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.vehiclesService.findAll(tenantId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.vehiclesService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.vehiclesService.update(id, data);
  }

  @Post('import')
  async import(@Body() body: any) {
    if (!body.vehicles || !Array.isArray(body.vehicles)) {
        throw new HttpException('Lista de veículos inválida', HttpStatus.BAD_REQUEST);
    }
    return this.vehiclesService.importMassive(body.tenantId, body.vehicles);
  }
}