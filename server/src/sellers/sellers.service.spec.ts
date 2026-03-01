import { Test, TestingModule } from '@nestjs/testing';
import { SellersService } from './sellers.service';
import { PrismaService } from '../prisma.service';

describe('SellersService', () => {
  let service: SellersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    seller: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SellersService>(SellersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deve retornar lista de vendedores do tenant', async () => {
      const sellers = [
        {
          id: 'seller-1',
          name: 'João Silva',
          tenantId: 'tenant-1',
          _count: { customers: 5 },
        },
        {
          id: 'seller-2',
          name: 'Maria Santos',
          tenantId: 'tenant-1',
          _count: { customers: 3 },
        },
      ];

      mockPrismaService.seller.findMany.mockResolvedValue(sellers);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual(sellers);
      expect(mockPrismaService.seller.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { customers: true } },
        },
      });
    });

    it('deve ordenar vendedores por nome', async () => {
      mockPrismaService.seller.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1');

      expect(mockPrismaService.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('deve incluir contagem de clientes', async () => {
      mockPrismaService.seller.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1');

      expect(mockPrismaService.seller.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            _count: { select: { customers: true } },
          },
        }),
      );
    });
  });

  describe('create', () => {
    const validSellerData = {
      tenantId: 'tenant-1',
      name: 'João Silva',
      phone: '11999999999',
      email: 'joao@example.com',
      status: 'ACTIVE',
    };

    it('deve criar um vendedor com dados válidos', async () => {
      const createdSeller = {
        id: 'seller-1',
        ...validSellerData,
      };

      mockPrismaService.seller.create.mockResolvedValue(createdSeller);

      const result = await service.create(validSellerData);

      expect(result).toEqual(createdSeller);
      expect(mockPrismaService.seller.create).toHaveBeenCalledWith({
        data: {
          name: 'João Silva',
          phone: '11999999999',
          email: 'joao@example.com',
          status: 'ACTIVE',
          tenant: { connect: { id: 'tenant-1' } },
        },
      });
    });

    it('deve conectar vendedor ao tenant correto', async () => {
      mockPrismaService.seller.create.mockResolvedValue({
        id: 'seller-1',
        ...validSellerData,
      });

      await service.create(validSellerData);

      expect(mockPrismaService.seller.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenant: { connect: { id: 'tenant-1' } },
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('deve atualizar vendedor com campos permitidos', async () => {
      const updateData = {
        name: 'João Silva Atualizado',
        phone: '11888888888',
        email: 'joao.novo@example.com',
        status: 'INACTIVE',
      };

      const updatedSeller = {
        id: 'seller-1',
        ...updateData,
      };

      mockPrismaService.seller.update.mockResolvedValue(updatedSeller);
      mockPrismaService.seller.findFirst.mockResolvedValue({
        id: 'seller-1',
        tenantId: 'tenant-1',
      });

      const result = await service.update('seller-1', 'tenant-1', updateData);

      expect(result).toEqual(updatedSeller);
      expect(mockPrismaService.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: {
          name: 'João Silva Atualizado',
          phone: '11888888888',
          email: 'joao.novo@example.com',
          status: 'INACTIVE',
        },
      });
    });

    it('deve filtrar campos não permitidos', async () => {
      const updateData = {
        name: 'João Silva',
        phone: '11999999999',
        email: 'joao@example.com',
        status: 'ACTIVE',
        _count: { customers: 10 }, // Campo extra que deve ser filtrado
        createdAt: new Date(), // Campo extra que deve ser filtrado
      };

      mockPrismaService.seller.update.mockResolvedValue({
        id: 'seller-1',
        name: 'João Silva',
      });
      mockPrismaService.seller.findFirst.mockResolvedValue({
        id: 'seller-1',
        tenantId: 'tenant-1',
      });

      await service.update('seller-1', 'tenant-1', updateData);

      expect(mockPrismaService.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: {
          name: 'João Silva',
          phone: '11999999999',
          email: 'joao@example.com',
          status: 'ACTIVE',
          // _count e createdAt não devem estar aqui
        },
      });
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      const partialUpdate = {
        name: 'Novo Nome',
      };

      mockPrismaService.seller.update.mockResolvedValue({
        id: 'seller-1',
        name: 'Novo Nome',
      });
      mockPrismaService.seller.findFirst.mockResolvedValue({
        id: 'seller-1',
        tenantId: 'tenant-1',
      });

      await service.update('seller-1', 'tenant-1', partialUpdate);

      expect(mockPrismaService.seller.update).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
        data: expect.objectContaining({
          name: 'Novo Nome',
        }),
      });
    });
  });

  describe('remove', () => {
    it('deve deletar vendedor por ID', async () => {
      const deletedSeller = {
        id: 'seller-1',
        name: 'João Silva',
      };

      mockPrismaService.seller.delete.mockResolvedValue(deletedSeller);
      mockPrismaService.seller.findFirst.mockResolvedValue({
        id: 'seller-1',
        tenantId: 'tenant-1',
      });

      const result = await service.remove('seller-1', 'tenant-1');

      expect(result).toEqual(deletedSeller);
      expect(mockPrismaService.seller.delete).toHaveBeenCalledWith({
        where: { id: 'seller-1' },
      });
    });
  });

  describe('Multi-tenancy', () => {
    it('deve isolar vendedores entre tenants', async () => {
      mockPrismaService.seller.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1');
      await service.findAll('tenant-2');

      expect(mockPrismaService.seller.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
        }),
      );

      expect(mockPrismaService.seller.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { tenantId: 'tenant-2' },
        }),
      );
    });

    it('deve criar vendedor no tenant correto', async () => {
      const sellerData = {
        tenantId: 'tenant-2',
        name: 'Maria Santos',
        phone: '11888888888',
        email: 'maria@example.com',
      };

      mockPrismaService.seller.create.mockResolvedValue({
        id: 'seller-2',
        ...sellerData,
      });

      await service.create(sellerData);

      expect(mockPrismaService.seller.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenant: { connect: { id: 'tenant-2' } },
          }),
        }),
      );
    });
  });
});
