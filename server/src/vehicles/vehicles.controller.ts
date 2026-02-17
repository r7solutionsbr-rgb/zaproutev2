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
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @ApiOperation({ summary: 'Listar veículos' })
  @ApiQuery({ name: 'tenantId', required: false })
  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.vehiclesService.findAll(tenantId);
  }

  @ApiOperation({ summary: 'Cadastrar veículo' })
  @Post()
  async create(@Body() data: any) {
    return this.vehiclesService.create(data);
  }

  @ApiOperation({ summary: 'Atualizar veículo' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.vehiclesService.update(id, data);
  }

  @ApiOperation({ summary: 'Importação massiva de veículos' })
  @Post('import')
  async import(@Body() body: any) {
    if (!body.vehicles || !Array.isArray(body.vehicles)) {
      throw new HttpException(
        'Lista de veículos inválida',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.vehiclesService.importMassive(body.tenantId, body.vehicles);
  }
}
