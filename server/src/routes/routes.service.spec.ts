import { Test, TestingModule } from '@nestjs/testing';
import { RoutesService } from './routes.service';
import { PrismaService } from '../prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';

describe('RoutesService', () => {
  let service: RoutesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    route: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    tenant: { findUnique: jest.fn() },
    driver: { findFirst: jest.fn(), findUnique: jest.fn() },
    vehicle: { findFirst: jest.fn() },
    customer: { findMany: jest.fn() },
    delivery: { createMany: jest.fn(), deleteMany: jest.fn() },
  };

  const mockWhatsappService = {
    sendText: jest.fn().mockResolvedValue(true),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WhatsappService,
          useValue: mockWhatsappService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('importRoute', () => {
    it('should import a new route', async () => {
      const createDto: any = {
        name: 'Rota Teste',
        date: new Date('2024-01-15'),
        tenantId: 'tenant-1',
        deliveries: [],
        driverId: 'driver-1',
        vehicleId: 'vehicle-1',
      };

      const mockRoute = {
        id: '1',
        ...createDto,
        status: 'PLANNED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.driver.findUnique.mockResolvedValue({
        id: 'driver-1',
        name: 'Driver',
        phone: '123',
      });
      mockPrismaService.vehicle.findFirst.mockResolvedValue({
        id: 'vehicle-1',
      });
      mockPrismaService.route.create.mockResolvedValue(mockRoute);
      mockPrismaService.tenant.findUnique.mockResolvedValue({
        id: 'tenant-1',
        config: {},
      });
      mockPrismaService.customer.findMany.mockResolvedValue([]); // Fix for forEach error

      const result = await service.importRoute(createDto);

      expect(result).toEqual(mockRoute);
      expect(mockPrismaService.route.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return array of routes for a tenant', async () => {
      const mockRoutes = [
        {
          id: '1',
          name: 'Rota 1',
          status: 'PENDING',
          date: new Date(),
          tenantId: 'tenant-1',
          driverId: null,
          vehicleId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Rota 2',
          status: 'IN_PROGRESS',
          date: new Date(),
          tenantId: 'tenant-1',
          driverId: 'driver-1',
          vehicleId: 'vehicle-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.route.findMany.mockResolvedValue(mockRoutes);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual(mockRoutes);
      expect(result).toHaveLength(2);
      expect(mockPrismaService.route.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
          include: expect.any(Object),
          orderBy: { date: 'desc' },
        }),
      );
    });

    it('should return empty array when no routes exist', async () => {
      mockPrismaService.route.findMany.mockResolvedValue([]);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findOne', () => {
    it('should return a route by id', async () => {
      const mockRoute = {
        id: '1',
        name: 'Rota Teste',
        status: 'PENDING',
        date: new Date(),
        tenantId: 'tenant-1',
        driverId: null,
        vehicleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.route.findFirst.mockResolvedValue(mockRoute);

      const result = await service.findOne('1', 'tenant-1');

      expect(result).toEqual(mockRoute);
      expect(mockPrismaService.route.findFirst).toHaveBeenCalledWith({
        where: { id: '1', tenantId: 'tenant-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when route is not found', async () => {
      mockPrismaService.route.findFirst.mockResolvedValue(null);
      await expect(service.findOne('non-existent', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a route', async () => {
      const updateDto = {
        name: 'Rota Atualizada',
        status: 'IN_PROGRESS',
      };

      const mockUpdatedRoute = {
        id: '1',
        ...updateDto,
        date: new Date(),
        tenantId: 'tenant-1',
        driverId: 'driver-1',
        vehicleId: 'vehicle-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.route.findFirst.mockResolvedValue(mockUpdatedRoute);
      mockPrismaService.route.update.mockResolvedValue(mockUpdatedRoute);

      const result = await service.update('1', 'tenant-1', updateDto);

      expect(result).toEqual(mockUpdatedRoute);
      expect(mockPrismaService.route.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should delete a route', async () => {
      const mockDeletedRoute = {
        id: '1',
        name: 'Rota Deletada',
        status: 'PENDING',
        date: new Date(),
        tenantId: 'tenant-1',
        driverId: null,
        vehicleId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.route.findFirst.mockResolvedValue(mockDeletedRoute);
      mockPrismaService.route.delete.mockResolvedValue(mockDeletedRoute);

      const result = await service.remove('1', 'tenant-1');

      expect(result).toEqual(mockDeletedRoute);
      expect(mockPrismaService.route.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });
});
