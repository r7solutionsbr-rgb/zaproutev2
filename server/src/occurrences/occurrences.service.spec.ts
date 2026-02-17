import { Test, TestingModule } from '@nestjs/testing';
import { OccurrencesService } from './occurrences.service';
import { PrismaService } from '../prisma.service';

describe('OccurrencesService', () => {
  let service: OccurrencesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    delivery: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OccurrencesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<OccurrencesService>(OccurrencesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAllPaginated', () => {
    it('should return paginated occurrences (failed/returned deliveries)', async () => {
      const tenantId = 'tenant-1';
      const paginationDto = { page: 1, limit: 10 };

      const mockDeliveries = [
        {
          id: '1',
          status: 'FAILED',
          orderId: 'ORD-001',
          updatedAt: new Date(),
          customer: { tenantId },
        },
        {
          id: '2',
          status: 'RETURNED',
          orderId: 'ORD-002',
          updatedAt: new Date(),
          customer: { tenantId },
        },
      ];
      const mockTotal = 2;

      mockPrismaService.delivery.findMany.mockResolvedValue(mockDeliveries);
      mockPrismaService.delivery.count.mockResolvedValue(mockTotal);

      const result = await service.findAllPaginated(tenantId, paginationDto);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].invoiceNumber).toBe('ORD-001'); // Mapeamento orderId -> invoiceNumber
      expect(result.meta.total).toBe(2);

      // Verifica se o filtro de status foi aplicado corretamente (FAILED, RETURNED)
      expect(mockPrismaService.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customer: { tenantId },
            status: { in: ['FAILED', 'RETURNED'] },
          }),
          skip: 0,
          take: 10,
          orderBy: { updatedAt: 'desc' },
        }),
      );
    });

    it('should apply validation filters (date, driver, search)', async () => {
      const tenantId = 'tenant-1';
      const paginationDto = {
        page: 1,
        limit: 10,
        driverId: 'driver-1',
        search: 'fail',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      mockPrismaService.delivery.findMany.mockResolvedValue([]);
      mockPrismaService.delivery.count.mockResolvedValue(0);

      await service.findAllPaginated(tenantId, paginationDto);

      expect(mockPrismaService.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            driverId: 'driver-1',
            updatedAt: expect.any(Object),
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });
});
