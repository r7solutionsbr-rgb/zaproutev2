import { Test, TestingModule } from '@nestjs/testing';
import { BackofficeService } from './backoffice.service';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs');

describe('BackofficeService', () => {
  let service: BackofficeService;
  let prisma: PrismaService;
  let mailService: MailService;

  const mockPrismaService = {
    tenant: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackofficeService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<BackofficeService>(BackofficeService);
    prisma = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);
  });

  describe('getAllTenants', () => {
    it('deve retornar lista de tenants com contagens', async () => {
      const tenants = [
        {
          id: 'tenant-1',
          name: 'Empresa A',
          _count: { users: 5, drivers: 10, vehicles: 8 },
        },
        {
          id: 'tenant-2',
          name: 'Empresa B',
          _count: { users: 3, drivers: 6, vehicles: 4 },
        },
      ];

      mockPrismaService.tenant.findMany.mockResolvedValue(tenants);

      const result = await service.getAllTenants();

      expect(result).toEqual({
        data: tenants,
        meta: { total: tenants.length },
      });
      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith({
        include: {
          _count: {
            select: { users: true, drivers: true, vehicles: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('deve ordenar tenants por data de criação decrescente', async () => {
      mockPrismaService.tenant.findMany.mockResolvedValue([]);

      await service.getAllTenants();

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('deve incluir contagem de usuários, motoristas e veículos', async () => {
      mockPrismaService.tenant.findMany.mockResolvedValue([]);

      await service.getAllTenants();

      expect(mockPrismaService.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            _count: {
              select: {
                users: true,
                drivers: true,
                vehicles: true,
              },
            },
          },
        }),
      );
    });
  });

  describe('createTenant', () => {
    const validTenantData = {
      name: 'Nova Empresa',
      cnpj: '12.345.678/0001-90',
      adminName: 'Admin User',
      adminEmail: 'admin@empresa.com',
      adminPassword: 'senha123',
    };

    it('deve criar tenant e usuário admin em transação', async () => {
      const tenant = { id: 'tenant-1', name: 'Nova Empresa' };
      const user = { id: 'user-1', email: 'admin@empresa.com' };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          tenant: { create: jest.fn().mockResolvedValue(tenant) },
          user: { create: jest.fn().mockResolvedValue(user) },
        });
      });

      const result = await service.createTenant(validTenantData);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('deve lançar erro se email do admin já existir', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'admin@empresa.com',
      });

      await expect(service.createTenant(validTenantData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createTenant(validTenantData)).rejects.toThrow(
        'Email já cadastrado',
      );
    });

    it('deve hashear senha do admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          tenant: { create: jest.fn().mockResolvedValue({}) },
          user: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      await service.createTenant(validTenantData);

      expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);
    });

    it('deve enviar email de boas-vindas ao admin', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          tenant: { create: jest.fn().mockResolvedValue({}) },
          user: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      await service.createTenant(validTenantData);

      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'admin@empresa.com',
        'Admin User',
        'senha123',
      );
    });

    it('deve usar CNPJ padrão se não fornecido', async () => {
      const dataWithoutCnpj = { ...validTenantData };
      delete dataWithoutCnpj.cnpj;

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const mockCreate = jest.fn().mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          tenant: { create: mockCreate },
          user: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      await service.createTenant(dataWithoutCnpj);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cnpj: '00.000.000/0000-00',
        }),
      });
    });

    it('deve criar usuário com role ADMIN', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const mockUserCreate = jest.fn().mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          tenant: { create: jest.fn().mockResolvedValue({ id: 'tenant-1' }) },
          user: { create: mockUserCreate },
        });
      });

      await service.createTenant(validTenantData);

      expect(mockUserCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'ADMIN',
        }),
      });
    });

    it('deve criar tenant com status ACTIVE', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const mockTenantCreate = jest.fn().mockResolvedValue({});
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          tenant: { create: mockTenantCreate },
          user: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      await service.createTenant(validTenantData);

      expect(mockTenantCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'ACTIVE',
        }),
      });
    });

    it('não deve falhar se envio de email falhar', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          tenant: { create: jest.fn().mockResolvedValue({}) },
          user: { create: jest.fn().mockResolvedValue({}) },
        });
      });

      mockMailService.sendWelcomeEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      await expect(
        service.createTenant(validTenantData),
      ).resolves.toBeDefined();
    });
  });

  describe('updateTenantStatus', () => {
    it('deve atualizar status do tenant', async () => {
      const updatedTenant = {
        id: 'tenant-1',
        status: 'INACTIVE',
      };

      mockPrismaService.tenant.update.mockResolvedValue(updatedTenant);

      const result = await service.updateTenantStatus('tenant-1', 'INACTIVE');

      expect(result).toEqual(updatedTenant);
      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { status: 'INACTIVE' },
      });
    });

    it('deve aceitar diferentes status', async () => {
      const statuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];

      mockPrismaService.tenant.update.mockResolvedValue({});

      for (const status of statuses) {
        await service.updateTenantStatus('tenant-1', status);

        expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
          where: { id: 'tenant-1' },
          data: { status },
        });
      }
    });
  });

  describe('updateTenant', () => {
    it('deve atualizar nome do tenant', async () => {
      const updateData = { name: 'Novo Nome' };
      const updatedTenant = { id: 'tenant-1', name: 'Novo Nome' };

      mockPrismaService.tenant.update.mockResolvedValue(updatedTenant);

      const result = await service.updateTenant('tenant-1', updateData);

      expect(result).toEqual(updatedTenant);
      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { name: 'Novo Nome' },
      });
    });

    it('deve ignorar campos não permitidos', async () => {
      const updateData = {
        name: 'Novo Nome',
        status: 'INACTIVE', // Não deve ser atualizado por este método
        createdAt: new Date(),
      };

      mockPrismaService.tenant.update.mockResolvedValue({});

      await service.updateTenant('tenant-1', updateData);

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { name: 'Novo Nome' },
      });
    });
  });
});
