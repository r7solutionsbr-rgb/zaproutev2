import { Test, TestingModule } from '@nestjs/testing';
import { DriversService } from './drivers.service';
import { PrismaService } from '../prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

describe('DriversService', () => {
  let service: DriversService;
  let prisma: PrismaService;
  let whatsapp: WhatsappService;

  const mockPrismaService = {
    driver: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
    },
    delivery: {
      findMany: jest.fn(),
    },
  };

  const mockWhatsappService = {
    sendText: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WhatsappService,
          useValue: mockWhatsappService,
        },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
    prisma = module.get<PrismaService>(PrismaService);
    whatsapp = module.get<WhatsappService>(WhatsappService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a driver and send welcome message', async () => {
      const tenantId = 'tenant-1';
      const createDto: any = {
        name: 'John Doe',
        cpf: '123.456.789-00',
        phone: '11999999999',
        cnh: '12345678900',
        cnhCategory: 'B',
      };

      const mockTenant = { id: tenantId, name: 'Transportadora X', config: {} };
      const mockCreatedDriver = {
        id: '1',
        ...createDto,
        status: 'IDLE',
        tenantId,
        updatedAt: new Date(),
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(mockTenant);
      mockPrismaService.driver.create.mockResolvedValue(mockCreatedDriver);

      const result = await service.create({ ...createDto, tenantId });

      expect(result).toEqual(mockCreatedDriver);
      expect(mockWhatsappService.sendText).toHaveBeenCalled(); // Welcome message
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated drivers', async () => {
      const tenantId = 'tenant-1';
      const mockDrivers = [{ id: '1', name: 'John' }];
      const mockTotal = 1;

      mockPrismaService.driver.findMany.mockResolvedValue(mockDrivers);
      mockPrismaService.driver.count.mockResolvedValue(mockTotal);

      const result = await service.findAllPaginated(tenantId, 1, 10);

      expect(result.data).toEqual(mockDrivers);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('getDriverPerformance', () => {
    it('should calculate success rate correctly', async () => {
      const driverId = 'driver-1';
      const tenantId = 'tenant-1';

      const mockDriver = { id: driverId, name: 'John' };
      // 2 delivered, 1 failed
      const mockDeliveries = [
        { id: '1', status: 'DELIVERED', updatedAt: new Date() },
        { id: '2', status: 'DELIVERED', updatedAt: new Date() },
        {
          id: '3',
          status: 'FAILED',
          updatedAt: new Date(),
          failureReason: 'Ausente',
        },
      ];
      const mockRecentFailures = [
        {
          id: '3',
          status: 'FAILED',
          updatedAt: new Date(),
          failureReason: 'Ausente',
        },
      ];

      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);
      // First call matches findMany for aggregation stats
      // Second call matches findMany for recentFailures
      mockPrismaService.delivery.findMany
        .mockResolvedValueOnce(mockDeliveries)
        .mockResolvedValueOnce(mockRecentFailures);

      const result = await service.getDriverPerformance(driverId, tenantId);

      expect(result.driverName).toBe('John');
      expect(result.totalDeliveries).toBe(3);
      expect(result.failedCount).toBe(1);
      expect(result.successRate).toBe('66.7'); // (2/3)*100
    });
  });
});
