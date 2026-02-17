import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JourneyService } from './journey.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JourneyEventType } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Journey')
@ApiBearerAuth()
@Controller('journey')
@UseGuards(JwtAuthGuard)
export class JourneyController {
  constructor(private readonly journeyService: JourneyService) {}

  @ApiOperation({ summary: 'Registrar evento de jornada' })
  @ApiBody({
    schema: {
      example: { type: 'JOURNEY_START', latitude: -23.5, longitude: -46.6 },
    },
  })
  @Post('event')
  async createEvent(
    @Req() req: any,
    @Body()
    body: {
      driverId?: string;
      type: JourneyEventType;
      latitude?: number;
      longitude?: number;
      locationAddress?: string;
      notes?: string;
    },
  ) {
    // Assume validação de driverId no service ou aqui se necessário
    const driverId = body.driverId || 'infer-from-user-context'; // Simplificação
    return this.journeyService.createEvent(req.user.tenantId, driverId, body);
  }

  @ApiOperation({ summary: 'Obter histórico de jornada do motorista' })
  @ApiQuery({ name: 'date', required: false, example: '2023-10-25' })
  @Get(':driverId/history')
  async getHistory(
    @Req() req: any,
    @Param('driverId') driverId: string,
    @Query('date') date?: string,
  ) {
    return this.journeyService.getHistory(req.user.tenantId, driverId, date);
  }
}
