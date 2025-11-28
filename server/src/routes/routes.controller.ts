import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto, UpdateDeliveryStatusDto } from './dto/route.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.routesService.findAll(tenantId);
  }

  @Post('import')
  async importRoute(@Body() createRouteDto: CreateRouteDto) {
    return this.routesService.importRoute(createRouteDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.routesService.findOne(id);
  }

  // --- NOVO: Endpoint para Atualizar Rota ---
  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.routesService.update(id, data);
  }

  // --- NOVO: Endpoint para Deletar Rota ---
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.routesService.remove(id);
  }

  @Patch('deliveries/:id/status')
  async updateDeliveryStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeliveryStatusDto
  ) {
    return this.routesService.updateDeliveryStatus(id, updateDto);
  }
}