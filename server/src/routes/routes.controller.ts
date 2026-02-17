import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto, UpdateDeliveryStatusDto } from './dto/route.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Routes')
@ApiBearerAuth()
@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @ApiOperation({ summary: 'Listar rotas' })
  @ApiQuery({
    name: 'days',
    required: false,
    description: 'Filtrar por últimos X dias',
  })
  @Get()
  async findAll(
    @Query('tenantId') tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.routesService.findAll(
      tenantId,
      days ? parseInt(days) : undefined,
    );
  }

  @ApiOperation({ summary: 'Estatísticas do Dashboard' })
  @Get('dashboard')
  async getDashboardStats(
    @Query('tenantId') tenantId: string,
    @Query('days') days?: string,
  ) {
    return this.routesService.getDashboardStats(
      tenantId,
      days ? parseInt(days) : 7,
    );
  }

  @ApiOperation({ summary: 'Listar rotas com paginação' })
  @Get('paginated')
  async findAllPaginated(
    @Query('tenantId') tenantId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.routesService.findAllPaginated(tenantId, paginationDto);
  }

  @ApiOperation({ summary: 'Importar rota' })
  @Post('import')
  async importRoute(@Body() createRouteDto: CreateRouteDto) {
    return this.routesService.importRoute(createRouteDto);
  }

  @ApiOperation({ summary: 'Obter detalhes da rota' })
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.routesService.findOne(id, req.user.tenantId);
  }

  @ApiOperation({ summary: 'Atualizar rota' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    return this.routesService.update(id, req.user.tenantId, data);
  }

  @ApiOperation({ summary: 'Remover rota' })
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.routesService.remove(id, req.user.tenantId);
  }

  @ApiOperation({ summary: 'Atualizar status da entrega' })
  @Patch('deliveries/:id/status')
  async updateDeliveryStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateDeliveryStatusDto,
  ) {
    return this.routesService.updateDeliveryStatus(id, updateDto);
  }
}
