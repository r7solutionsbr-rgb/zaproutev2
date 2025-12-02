import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { AiService } from '../ai/ai.service';

@Controller('drivers')
@UseGuards(JwtAuthGuard)
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly aiService: AiService
  ) { }

  @Get()
  async findAll(@Query('tenantId') tenantId: string, @Query('search') search?: string) {
    return this.driversService.findAll(tenantId, search);
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
  @Get(':id/ai-analysis')
  async getAiAnalysis(@Param('id') id: string) {
    try {
      const stats = await this.driversService.getDriverPerformance(id);
      const analysis = await this.aiService.analyzeDriverPerformance(stats.driverName, stats);
      return { analysis };
    } catch (error) {
      throw new HttpException(error.message || 'Erro ao analisar motorista', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}