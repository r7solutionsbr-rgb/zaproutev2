import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.driversService.findAll(tenantId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.driversService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.driversService.update(id, data);
  }

  @Post('import')
  async import(@Body() body: any) {
    if (!body.drivers || !Array.isArray(body.drivers)) {
        throw new HttpException('Lista de motoristas inválida', HttpStatus.BAD_REQUEST);
    }
    return this.driversService.importMassive(body.tenantId, body.drivers);
  }
}