import { Test, TestingModule } from '@nestjs/testing';
import { JourneyService } from './journey.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('JourneyService', () => {
  let service: JourneyService;
  let prisma: PrismaService;

  const mockPrismaService = {
    driver: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    driverJourneyEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JourneyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<JourneyService>(JourneyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('createEvent', () => {
    const tenantId = 'tenant-1';
    const driverId = 'driver-1';

    it('deve criar evento de início de jornada', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: null,
      };

      const event = {
        id: 'event-1',
        type: 'JOURNEY_START',
        timestamp: new Date(),
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);
      mockPrismaService.driverJourneyEvent.create.mockResolvedValue(event);
      mockPrismaService.driver.update.mockResolvedValue({});

      const result = await service.createEvent(tenantId, driverId, {
        type: 'JOURNEY_START',
      });

      expect(result).toEqual(event);
      expect(mockPrismaService.driverJourneyEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'JOURNEY_START',
          tenantId,
          driverId,
        }),
      });
    });

    it('deve lançar erro se motorista não existir', async () => {
      mockPrismaService.driver.findFirst.mockResolvedValue(null);

      await expect(
        service.createEvent(tenantId, driverId, { type: 'JOURNEY_START' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createEvent(tenantId, driverId, { type: 'JOURNEY_START' }),
      ).rejects.toThrow('Motorista não encontrado');
    });

    it('deve lançar erro ao iniciar jornada se já estiver em jornada', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: 'JOURNEY_START',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);

      await expect(
        service.createEvent(tenantId, driverId, { type: 'JOURNEY_START' }),
      ).rejects.toThrow('Motorista já está em jornada');
    });

    it('deve permitir iniciar jornada se a anterior foi encerrada', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: 'JOURNEY_END',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);
      mockPrismaService.driverJourneyEvent.create.mockResolvedValue({
        id: 'event-1',
      });
      mockPrismaService.driver.update.mockResolvedValue({});

      await expect(
        service.createEvent(tenantId, driverId, { type: 'JOURNEY_START' }),
      ).resolves.toBeDefined();
    });

    it('deve lançar erro ao iniciar pausa sem jornada ativa', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: null,
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);

      await expect(
        service.createEvent(tenantId, driverId, { type: 'MEAL_START' }),
      ).rejects.toThrow(
        'É necessário iniciar a jornada antes de registrar pausas',
      );
    });

    it('deve lançar erro ao iniciar pausa se já estiver em outra pausa', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: 'MEAL_START',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);

      await expect(
        service.createEvent(tenantId, driverId, { type: 'REST_START' }),
      ).rejects.toThrow('Você já está em uma pausa. Encerre-a primeiro');
    });

    it('deve permitir iniciar pausa durante jornada ativa', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: 'JOURNEY_START',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);
      mockPrismaService.driverJourneyEvent.create.mockResolvedValue({
        id: 'event-1',
      });
      mockPrismaService.driver.update.mockResolvedValue({});

      await expect(
        service.createEvent(tenantId, driverId, { type: 'MEAL_START' }),
      ).resolves.toBeDefined();
    });

    it('deve lançar erro ao encerrar refeição sem refeição ativa', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: 'JOURNEY_START',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);

      await expect(
        service.createEvent(tenantId, driverId, { type: 'MEAL_END' }),
      ).rejects.toThrow('Não há intervalo de refeição aberto para encerrar');
    });

    it('deve permitir encerrar refeição se estiver em refeição', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: 'MEAL_START',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);
      mockPrismaService.driverJourneyEvent.create.mockResolvedValue({
        id: 'event-1',
      });
      mockPrismaService.driver.update.mockResolvedValue({});

      await expect(
        service.createEvent(tenantId, driverId, { type: 'MEAL_END' }),
      ).resolves.toBeDefined();
    });

    it('deve atualizar status para JOURNEY_START ao encerrar pausa', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: 'MEAL_START',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);
      mockPrismaService.driverJourneyEvent.create.mockResolvedValue({
        id: 'event-1',
      });
      mockPrismaService.driver.update.mockResolvedValue({});

      await service.createEvent(tenantId, driverId, { type: 'MEAL_END' });

      expect(mockPrismaService.driver.update).toHaveBeenCalledWith({
        where: { id: driverId },
        data: expect.objectContaining({
          currentJourneyStatus: 'JOURNEY_START',
        }),
      });
    });

    it('deve lançar erro ao encerrar jornada durante pausa', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: 'MEAL_START',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);

      await expect(
        service.createEvent(tenantId, driverId, { type: 'JOURNEY_END' }),
      ).rejects.toThrow('Encerre a pausa atual antes de finalizar a jornada');
    });

    it('deve atualizar status do motorista para OFFLINE ao encerrar jornada', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: 'JOURNEY_START',
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);
      mockPrismaService.driverJourneyEvent.create.mockResolvedValue({
        id: 'event-1',
      });
      mockPrismaService.driver.update.mockResolvedValue({});

      await service.createEvent(tenantId, driverId, { type: 'JOURNEY_END' });

      expect(mockPrismaService.driver.update).toHaveBeenCalledWith({
        where: { id: driverId },
        data: expect.objectContaining({
          status: 'OFFLINE',
        }),
      });
    });

    it('deve incluir dados de localização no evento', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: null,
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);
      mockPrismaService.driverJourneyEvent.create.mockResolvedValue({
        id: 'event-1',
      });
      mockPrismaService.driver.update.mockResolvedValue({});

      await service.createEvent(tenantId, driverId, {
        type: 'JOURNEY_START',
        latitude: -23.5505,
        longitude: -46.6333,
        locationAddress: 'Av. Paulista, São Paulo',
      });

      expect(mockPrismaService.driverJourneyEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          latitude: -23.5505,
          longitude: -46.6333,
          locationAddress: 'Av. Paulista, São Paulo',
        }),
      });
    });

    it('deve incluir notas no evento', async () => {
      const driver = {
        id: driverId,
        currentJourneyStatus: null,
      };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);
      mockPrismaService.driverJourneyEvent.create.mockResolvedValue({
        id: 'event-1',
      });
      mockPrismaService.driver.update.mockResolvedValue({});

      await service.createEvent(tenantId, driverId, {
        type: 'JOURNEY_START',
        notes: 'Iniciando rota matinal',
      });

      expect(mockPrismaService.driverJourneyEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: 'Iniciando rota matinal',
        }),
      });
    });
  });

  describe('getHistory', () => {
    const tenantId = 'tenant-1';
    const driverId = 'driver-1';

    it('deve retornar histórico de eventos do motorista', async () => {
      const events = [
        { id: 'event-1', type: 'JOURNEY_START', timestamp: new Date() },
        { id: 'event-2', type: 'MEAL_START', timestamp: new Date() },
      ];

      mockPrismaService.driverJourneyEvent.findMany.mockResolvedValue(events);

      const result = await service.getHistory(tenantId, driverId);

      expect(result).toEqual(events);
      expect(
        mockPrismaService.driverJourneyEvent.findMany,
      ).toHaveBeenCalledWith({
        where: { tenantId, driverId },
        orderBy: { timestamp: 'desc' },
      });
    });

    it('deve filtrar eventos por data', async () => {
      mockPrismaService.driverJourneyEvent.findMany.mockResolvedValue([]);

      await service.getHistory(tenantId, driverId, '2026-02-15');

      expect(
        mockPrismaService.driverJourneyEvent.findMany,
      ).toHaveBeenCalledWith({
        where: expect.objectContaining({
          timestamp: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
        orderBy: { timestamp: 'desc' },
      });
    });

    it('deve ordenar eventos por timestamp decrescente', async () => {
      mockPrismaService.driverJourneyEvent.findMany.mockResolvedValue([]);

      await service.getHistory(tenantId, driverId);

      expect(
        mockPrismaService.driverJourneyEvent.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { timestamp: 'desc' },
        }),
      );
    });
  });

  describe('Multi-tenancy', () => {
    it('deve validar tenant ao buscar motorista', async () => {
      mockPrismaService.driver.findFirst.mockResolvedValue(null);

      await expect(
        service.createEvent('tenant-1', 'driver-1', { type: 'JOURNEY_START' }),
      ).rejects.toThrow();

      expect(mockPrismaService.driver.findFirst).toHaveBeenCalledWith({
        where: { id: 'driver-1', tenantId: 'tenant-1' },
      });
    });

    it('deve incluir tenantId em eventos', async () => {
      const driver = { id: 'driver-1', currentJourneyStatus: null };

      mockPrismaService.driver.findFirst.mockResolvedValue(driver);
      mockPrismaService.driverJourneyEvent.create.mockResolvedValue({
        id: 'event-1',
      });
      mockPrismaService.driver.update.mockResolvedValue({});

      await service.createEvent('tenant-1', 'driver-1', {
        type: 'JOURNEY_START',
      });

      expect(mockPrismaService.driverJourneyEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
        }),
      });
    });
  });
});
