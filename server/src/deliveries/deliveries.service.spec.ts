import { Test, TestingModule } from '@nestjs/testing';
import { DeliveriesService } from './deliveries.service';
import { PrismaService } from '../prisma.service';

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    delivery: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(), // Placeholder if needed
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAllPaginated', () => {
    it('should return paginated deliveries', async () => {
      const tenantId = 'tenant-1';
      const paginationDto = { page: 1, limit: 10 };

      const mockDeliveries = [
        {
          id: '1',
          status: 'PENDING',
          orderId: 'ORD-001',
          updatedAt: new Date(),
        },
        {
          id: '2',
          status: 'DELIVERED',
          orderId: 'ORD-002',
          updatedAt: new Date(),
        },
      ];
      const mockTotal = 2;

      mockPrismaService.delivery.findMany.mockResolvedValue(mockDeliveries);
      mockPrismaService.delivery.count.mockResolvedValue(mockTotal);

      const result = await service.findAllPaginated(tenantId, paginationDto);

      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(2);
      expect(result.data[0].invoiceNumber).toBe('ORD-001'); // Check mapping
      expect(result.meta.total).toBe(2);
      expect(mockPrismaService.delivery.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customer: { tenantId },
          }),
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should return empty result when no deliveries found', async () => {
      mockPrismaService.delivery.findMany.mockResolvedValue([]);
      mockPrismaService.delivery.count.mockResolvedValue(0);

      const result = await service.findAllPaginated('tenant-1', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
