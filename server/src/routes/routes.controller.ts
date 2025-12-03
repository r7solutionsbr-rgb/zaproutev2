import { Controller, Get, Post, Body, Param, Patch, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto, UpdateDeliveryStatusDto } from './dto/route.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) { }

  @Get()
  async findAll(@Query('tenantId') tenantId: string, @Query('days') days?: string) {
    return this.routesService.findAll(tenantId, days ? parseInt(days) : undefined);
  }

  @Post('import')
  async importRoute(@Body() createRouteDto: CreateRouteDto) {
    return this.routesService.importRoute(createRouteDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.routesService.findOne(id, req.user.tenantId);
  }

  // --- NOVO: Endpoint para Atualizar Rota ---
  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.routesService.update(id, req.user.tenantId, data);
  }

  // --- NOVO: Endpoint para Deletar Rota ---
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.routesService.remove(id, req.user.tenantId);
  }

  @Patch('deliveries/:id/status')
  async updateDeliveryStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeliveryStatusDto
  ) {
    return this.routesService.updateDeliveryStatus(id, updateDto);
  }
}