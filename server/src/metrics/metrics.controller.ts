import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async getMetrics(
    @Headers('x-metrics-token') token: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const enabled = this.configService.get<boolean>('METRICS_ENABLED');
    if (enabled === false) {
      throw new NotFoundException();
    }

    const expectedToken = this.configService.get<string>('METRICS_TOKEN');
    if (expectedToken && token !== expectedToken) {
      throw new UnauthorizedException('Token inválido');
    }

    res.setHeader('Content-Type', this.metricsService.getContentType());
    return this.metricsService.getMetrics();
  }
}
