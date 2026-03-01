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
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { ImportVehiclesDto } from './dto/import-vehicles.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
@UseGuards(JwtAuthGuard, TenantGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @ApiOperation({ summary: 'Listar veículos' })
  @Get()
  async findAll(@Req() req: any) {
    return this.vehiclesService.findAll(req.user.tenantId);
  }

  @ApiOperation({ summary: 'Cadastrar veículo' })
  @Post()
  async create(@Body() data: CreateVehicleDto, @Req() req: any) {
    return this.vehiclesService.create({
      ...data,
      tenantId: req.user.tenantId,
    });
  }

  @ApiOperation({ summary: 'Atualizar veículo' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateVehicleDto,
    @Req() req: any,
  ) {
    return this.vehiclesService.update(id, req.user.tenantId, data);
  }

  @ApiOperation({ summary: 'Importação massiva de veículos' })
  @Post('import')
  async import(@Body() body: ImportVehiclesDto, @Req() req: any) {
    if (!body.vehicles || !Array.isArray(body.vehicles)) {
      throw new HttpException(
        'Lista de veículos inválida',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.vehiclesService.importMassive(req.user.tenantId, body.vehicles);
  }
}
