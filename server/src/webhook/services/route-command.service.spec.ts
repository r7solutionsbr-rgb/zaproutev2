import { Test, TestingModule } from '@nestjs/testing';
import { RouteCommandService } from './route-command.service';
import { PrismaService } from '../../prisma.service';

describe('RouteCommandService', () => {
  let service: RouteCommandService;
  let prisma: PrismaService;

  const mockPrismaService = {
    route: {
      update: jest.fn(),
    },
    delivery: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouteCommandService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RouteCommandService>(RouteCommandService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleStartRoute', () => {
    it('should update route to ACTIVE and deliveries to IN_TRANSIT', async () => {
      const driverId = 'driver-1';
      const routeId = 'route-1';

      mockPrismaService.route.update.mockResolvedValue({});
      mockPrismaService.delivery.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.handleStartRoute(driverId, routeId);

      expect(result).toEqual({ status: 'route_started' });
      expect(mockPrismaService.route.update).toHaveBeenCalledWith({
        where: { id: routeId },
        data: { status: 'ACTIVE' },
      });
      expect(mockPrismaService.delivery.updateMany).toHaveBeenCalledWith({
        where: { routeId, status: 'PENDING' },
        data: { status: 'IN_TRANSIT' },
      });
    });
  });

  describe('handleExitRoute', () => {
    it('should update route to PLANNED and deliveries back to PENDING', async () => {
      const routeId = 'route-1';

      mockPrismaService.route.update.mockResolvedValue({});
      mockPrismaService.delivery.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.handleExitRoute(routeId);

      expect(result).toEqual({ status: 'route_exited' });
      expect(mockPrismaService.route.update).toHaveBeenCalledWith({
        where: { id: routeId },
        data: { status: 'PLANNED' },
      });
      expect(mockPrismaService.delivery.updateMany).toHaveBeenCalledWith({
        where: { routeId, status: 'IN_TRANSIT' },
        data: { status: 'PENDING' },
      });
    });
  });

  describe('handleDeliveryUpdate', () => {
    it('should update delivery status to DELIVERED', async () => {
      const deliveryId = 'delivery-1';
      mockPrismaService.delivery.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.handleDeliveryUpdate(
        deliveryId,
        'DELIVERED',
      );

      expect(result).toBe(true);
      expect(mockPrismaService.delivery.updateMany).toHaveBeenCalledWith({
        where: { id: deliveryId, status: { in: ['PENDING', 'IN_TRANSIT'] } },
        data: expect.objectContaining({ status: 'DELIVERED' }),
      });
    });

    it('should update delivery status to FAILED with reason and proof', async () => {
      const deliveryId = 'delivery-1';
      mockPrismaService.delivery.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.handleDeliveryUpdate(
        deliveryId,
        'FAILED',
        'Customer absent',
        'http://proof.url',
      );

      expect(result).toBe(true);
      expect(mockPrismaService.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            failureReason: 'Customer absent',
            proofOfDeliveryUrl: 'http://proof.url',
          }),
        }),
      );
    });

    it('should return false if no delivery was updated', async () => {
      mockPrismaService.delivery.updateMany.mockResolvedValue({ count: 0 });
      const result = await service.handleDeliveryUpdate('invalid', 'DELIVERED');
      expect(result).toBe(false);
    });
  });

  describe('handleWorkflowStep', () => {
    it('should update arrivedAt for CHEGADA step', async () => {
      const deliveryId = 'delivery-1';
      mockPrismaService.delivery.update.mockResolvedValue({});

      const result = await service.handleWorkflowStep(deliveryId, 'CHEGADA');

      expect(result).toEqual({
        status: 'workflow_step_updated',
        step: 'CHEGADA',
      });
      expect(mockPrismaService.delivery.update).toHaveBeenCalledWith({
        where: { id: deliveryId },
        data: expect.objectContaining({ arrivedAt: expect.any(Date) }),
      });
    });

    it('should update unloadingStartedAt for INICIO_DESCARGA step', async () => {
      const deliveryId = 'delivery-1';
      mockPrismaService.delivery.update.mockResolvedValue({});

      await service.handleWorkflowStep(deliveryId, 'INICIO_DESCARGA');

      expect(mockPrismaService.delivery.update).toHaveBeenCalledWith({
        where: { id: deliveryId },
        data: expect.objectContaining({ unloadingStartedAt: expect.any(Date) }),
      });
    });

    it('should update unloadingEndedAt for FIM_DESCARGA step', async () => {
      const deliveryId = 'delivery-1';
      mockPrismaService.delivery.update.mockResolvedValue({});

      await service.handleWorkflowStep(deliveryId, 'FIM_DESCARGA');

      expect(mockPrismaService.delivery.update).toHaveBeenCalledWith({
        where: { id: deliveryId },
        data: expect.objectContaining({ unloadingEndedAt: expect.any(Date) }),
      });
    });
  });

  describe('handleFinishRoute', () => {
    it('should update route status to COMPLETED', async () => {
      const routeId = 'route-1';
      mockPrismaService.route.update.mockResolvedValue({});

      const result = await service.handleFinishRoute(routeId);

      expect(result).toEqual({ status: 'route_completed' });
      expect(mockPrismaService.route.update).toHaveBeenCalledWith({
        where: { id: routeId },
        data: { status: 'COMPLETED' },
      });
    });
  });
});
