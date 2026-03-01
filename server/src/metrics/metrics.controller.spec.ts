import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: jest.Mocked<MetricsService>;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    metricsService = {
      getMetrics: jest.fn().mockResolvedValue('metrics'),
      getContentType: jest.fn().mockReturnValue('text/plain'),
      observeHttpRequest: jest.fn(),
    } as any;

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'METRICS_ENABLED') return true;
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        { provide: MetricsService, useValue: metricsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('deve retornar métricas quando habilitado', async () => {
    const res = { setHeader: jest.fn() } as any;

    await expect(controller.getMetrics(undefined as any, res)).resolves.toBe(
      'metrics',
    );
  });

  it('deve negar acesso sem token quando configurado', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'METRICS_ENABLED') return true;
      if (key === 'METRICS_TOKEN') return 'secret';
      return undefined;
    });

    await expect(
      controller.getMetrics(undefined as any, {} as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('deve aceitar token correto quando configurado', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'METRICS_ENABLED') return true;
      if (key === 'METRICS_TOKEN') return 'secret';
      return undefined;
    });

    const res = { setHeader: jest.fn() } as any;

    await expect(controller.getMetrics('secret', res)).resolves.toBe('metrics');
  });

  it('deve retornar 404 quando métricas desabilitadas', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'METRICS_ENABLED') return false;
      return undefined;
    });

    await expect(
      controller.getMetrics(undefined as any, {} as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
