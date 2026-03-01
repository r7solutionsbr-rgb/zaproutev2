import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';
import { ImportDriversDto } from './dto/import-drivers.dto';

import { AiService } from '../ai/ai.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Drivers')
@ApiBearerAuth()
@Controller('drivers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DriversController {
  constructor(
    private readonly driversService: DriversService,
    private readonly aiService: AiService,
  ) {}

  @ApiOperation({ summary: 'Listar motoristas' })
  @ApiQuery({ name: 'search', required: false })
  @Get()
  async findAll(@Req() req: any, @Query('search') search?: string) {
    // Usar tenantId do usuário autenticado, mas permitir override se for admin (opcional, aqui simplificado)
    const tenantId = req.user.tenantId;
    return this.driversService.findAll(tenantId, search);
  }

  @ApiOperation({ summary: 'Listar motoristas com paginação' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @Get('paginated')
  async findAllPaginated(
    @Req() req: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.driversService.findAllPaginated(
      req.user.tenantId,
      Number(page),
      Number(limit),
      search,
    );
  }

  @ApiOperation({ summary: 'Obter detalhes do motorista' })
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.driversService.findOne(id, req.user.tenantId);
  }

  @ApiOperation({ summary: 'Cadastrar motorista' })
  @Post()
  async create(@Body() data: CreateDriverDto, @Req() req: any) {
    return this.driversService.create({
      ...data,
      tenantId: req.user.tenantId,
    });
  }

  @ApiOperation({ summary: 'Atualizar motorista' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateDriverDto,
    @Req() req: any,
  ) {
    return this.driversService.update(id, req.user.tenantId, data);
  }

  @ApiOperation({ summary: 'Importação massiva de motoristas' })
  @Post('import')
  async import(@Body() body: ImportDriversDto, @Req() req: any) {
    if (!body.drivers || !Array.isArray(body.drivers)) {
      throw new HttpException(
        'Lista de motoristas inválida',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.driversService.importMassive(req.user.tenantId, body.drivers);
  }
  @ApiOperation({ summary: 'Análise de performance com IA' })
  @Get(':id/ai-analysis')
  async getAiAnalysis(@Param('id') id: string, @Req() req: any) {
    try {
      const stats = await this.driversService.getDriverPerformance(
        id,
        req.user.tenantId,
      );
      const analysis = await this.aiService.analyzeDriverPerformance(
        stats.driverName,
        stats,
      );
      return { analysis };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Erro ao analisar motorista',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  @ApiOperation({ summary: 'Atualizar localização em tempo real' })
  @Post('location')
  async updateLocation(
    @Body() body: { lat: number; lng: number },
    @Req() req: any,
  ) {
    // Requer que o driverId esteja no token (já implementado no AuthService)
    if (!req.user.driverId) {
      // Se for admin testando, pode passar driverId no body
      // if (body.driverId) ...
      throw new HttpException(
        'Apenas motoristas podem atualizar localização',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.driversService.updateLocation(
      req.user.driverId,
      body.lat,
      body.lng,
    );
  }

  @ApiOperation({ summary: 'Obter localização em tempo real' })
  @Get(':id/location')
  async getLocation(@Param('id') id: string) {
    return this.driversService.getLocation(id);
  }
}
