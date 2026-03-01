import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../prisma.service';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    vehicle: {
      findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return array of vehicles', async () => {
      const tenantId = 'tenant-1';
      const mockVehicles = [{ id: '1', plate: 'ABC1234' }];
        mockPrismaService.vehicle.count.mockResolvedValue(mockVehicles.length);
      mockPrismaService.vehicle.findMany.mockResolvedValue(mockVehicles);

      const result = await service.findAll(tenantId);
        expect(result.data).toEqual(mockVehicles);
    });
  });

  describe('create', () => {
    it('should create a vehicle with sanitized data', async () => {
      const tenantId = 'tenant-1';
      const createDto = {
        plate: 'abc1234',
        model: 'Truck',
        year: '2022',
        capacityWeight: '1000',
        tenantId,
      };

      const expectedData = {
        plate: 'abc1234',
        model: 'Truck',
        year: 2022,
        capacityWeight: 1000,
        capacityVolume: 0,
        status: 'AVAILABLE',
        lastMaintenance: null,
        nextMaintenance: null,
        tenant: { connect: { id: tenantId } },
      };

      const mockCreatedVehicle = { id: '1', ...expectedData };
      mockPrismaService.vehicle.create.mockResolvedValue(mockCreatedVehicle);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCreatedVehicle);
      expect(mockPrismaService.vehicle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          plate: 'abc1234',
          year: 2022,
          capacityWeight: 1000,
        }),
      });
    });
  });

  describe('importMassive', () => {
    it('should update existing vehicle and create new one', async () => {
      const tenantId = 'tenant-1';
      const vehicles = [
        { plate: 'ABC1234', model: 'Old Truck' },
        { plate: 'XYZ9876', model: 'New Truck' },
      ];

      // Mock findFirst: exists for ABC1234, null for XYZ9876
      mockPrismaService.vehicle.findFirst
        .mockResolvedValueOnce({ id: '1', plate: 'ABC1234' })
        .mockResolvedValueOnce(null);

      mockPrismaService.vehicle.update.mockResolvedValue({
        id: '1',
        plate: 'ABC1234',
        updated: true,
      });
      mockPrismaService.vehicle.create.mockResolvedValue({
        id: '2',
        plate: 'XYZ9876',
        created: true,
      });

      const result = await service.importMassive(tenantId, vehicles);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.vehicle.update).toHaveBeenCalled();
      expect(mockPrismaService.vehicle.create).toHaveBeenCalled();
    });
  });
});
