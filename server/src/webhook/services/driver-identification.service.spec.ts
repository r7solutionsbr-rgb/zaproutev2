import { Test, TestingModule } from '@nestjs/testing';
import { DriverIdentificationService } from './driver-identification.service';
import { PrismaService } from '../../prisma.service';

describe('DriverIdentificationService', () => {
  let service: DriverIdentificationService;
  let prisma: PrismaService;

  const mockPrismaService = {
    driver: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverIdentificationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DriverIdentificationService>(
      DriverIdentificationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('identifyDriver', () => {
    it('should identify a driver with a clean phone number', async () => {
      const rawPhone = '5511999999999';
      const mockDriver = { id: 'driver-1', phone: '+55 (11) 99999-9999' };
      mockPrismaService.driver.findFirst.mockResolvedValue(mockDriver);

      const result = await service.identifyDriver(rawPhone);

      expect(result).toEqual(mockDriver);
      expect(mockPrismaService.driver.findFirst).toHaveBeenCalledWith({
        where: {
          phone: {
            in: expect.arrayContaining([
              '11999999999',
              '5511999999999',
              '+55 (11) 99999-9999',
            ]),
          },
        },
        include: { vehicles: true, tenant: true },
      });
    });

    it('should handle phone numbers with non-digits', async () => {
      const rawPhone = '+55 (11) 98888-8888';
      mockPrismaService.driver.findFirst.mockResolvedValue({ id: 'driver-2' });

      await service.identifyDriver(rawPhone);

      expect(mockPrismaService.driver.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            phone: {
              in: expect.arrayContaining([
                '11988888888',
                '5511988888888',
                '+55 (11) 98888-8888',
              ]),
            },
          },
        }),
      );
    });

    it('should generate variations for 8-digit numbers (nono dígito)', async () => {
      const rawPhone = '1188888888'; // DDD + 8 digits
      mockPrismaService.driver.findFirst.mockResolvedValue({ id: 'driver-3' });

      await service.identifyDriver(rawPhone);

      // In our service, 1188888888 (10 digits) means ddd=11, number=88888888
      // variations are added for number.length === 8:
      const searchList =
        mockPrismaService.driver.findFirst.mock.calls[0][0].where.phone.in;
      expect(searchList).toContain('988888888'); // Added 9 to number
      expect(searchList).toContain('5511988888888'); // 55 + DDD + with9
      expect(searchList).toContain('+55 (11) 98888-8888'); // Formatted visual with 9
    });

    it('should generate variations for 9-digit numbers (removendo nono dígito)', async () => {
      const rawPhone = '11977777777'; // DDD + 9 digits starting with 9
      mockPrismaService.driver.findFirst.mockResolvedValue({ id: 'driver-4' });

      await service.identifyDriver(rawPhone);

      const searchList =
        mockPrismaService.driver.findFirst.mock.calls[0][0].where.phone.in;
      expect(searchList).toContain('77777777'); // Removed 9 from number
      expect(searchList).toContain('551177777777'); // Country code + DDD + removed 9
      expect(searchList).toContain('+55 (11) 7777-7777'); // Formatted visual without 9
    });

    it('should return null if no driver is found', async () => {
      mockPrismaService.driver.findFirst.mockResolvedValue(null);
      const result = await service.identifyDriver('1234567890');
      expect(result).toBeNull();
    });
  });
});
