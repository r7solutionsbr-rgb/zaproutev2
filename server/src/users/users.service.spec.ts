import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;
  let mailService: MailService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockMailService = {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock bcrypt.hash
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
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

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    mailService = module.get<MailService>(MailService);
  });

  describe('findAll', () => {
    it('deve retornar lista de usuários do tenant', async () => {
      const users = [
        {
          id: 'user-1',
          name: 'João Silva',
          email: 'joao@example.com',
          role: 'ADMIN',
          isActive: true,
        },
        {
          id: 'user-2',
          name: 'Maria Santos',
          email: 'maria@example.com',
          role: 'VIEWER',
          isActive: true,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(users);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual(users);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          avatarUrl: true,
        },
        orderBy: { name: 'asc' },
      });
    });

    it('deve ordenar usuários por nome', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1');

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('não deve retornar campo password', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1');

      const callArgs = mockPrismaService.user.findMany.mock.calls[0][0];
      expect(callArgs.select.password).toBeUndefined();
    });
  });

  describe('create', () => {
    const validUserData = {
      tenantId: 'tenant-1',
      name: 'João Silva',
      email: 'joao@example.com',
      password: 'senha123',
      role: 'ADMIN',
    };

    it('deve criar usuário com senha hasheada', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        ...validUserData,
        password: 'hashed-password',
      });

      await service.create(validUserData);

      expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password: 'hashed-password',
        }),
      });
    });

    it('deve usar senha padrão se não fornecida', async () => {
      const dataWithoutPassword = { ...validUserData };
      delete dataWithoutPassword.password;

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        ...dataWithoutPassword,
      });

      await service.create(dataWithoutPassword);

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
    });

    it('deve lançar erro se email já existir', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: validUserData.email,
      });

      await expect(service.create(validUserData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(validUserData)).rejects.toThrow(
        'Email já cadastrado',
      );
    });

    it('deve enviar email de boas-vindas', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'João Silva',
        email: 'joao@example.com',
      });

      await service.create(validUserData);

      expect(mockMailService.sendWelcomeEmail).toHaveBeenCalledWith(
        'joao@example.com',
        'João Silva',
        'senha123',
      );
    });

    it('deve usar role padrão VIEWER se não fornecida', async () => {
      const dataWithoutRole = { ...validUserData };
      delete dataWithoutRole.role;

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        ...dataWithoutRole,
      });

      await service.create(dataWithoutRole);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'VIEWER',
        }),
      });
    });

    it('deve conectar usuário ao tenant correto', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        ...validUserData,
      });

      await service.create(validUserData);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenant: { connect: { id: 'tenant-1' } },
        }),
      });
    });

    it('não deve falhar se envio de email falhar', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-1',
        name: 'João Silva',
        email: 'joao@example.com',
      });

      mockMailService.sendWelcomeEmail.mockRejectedValue(
        new Error('SMTP error'),
      );

      // Não deve lançar erro
      await expect(service.create(validUserData)).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('deve atualizar usuário', async () => {
      const updateData = {
        name: 'João Silva Atualizado',
        role: 'MANAGER',
      };

      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
        ...updateData,
      });

      const result = await service.update('user-1', updateData);

      expect(result).toBeDefined();
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateData,
      });
    });

    it('deve hashear senha se fornecida na atualização', async () => {
      const updateData = {
        password: 'nova-senha',
      };

      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
      });

      await service.update('user-1', updateData);

      expect(bcrypt.hash).toHaveBeenCalledWith('nova-senha', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          password: 'hashed-password',
        }),
      });
    });

    it('não deve hashear senha se não fornecida', async () => {
      const updateData = {
        name: 'Novo Nome',
      };

      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
      });

      (bcrypt.hash as jest.Mock).mockClear();

      await service.update('user-1', updateData);

      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deve deletar usuário', async () => {
      mockPrismaService.user.delete.mockResolvedValue({
        id: 'user-1',
        name: 'João Silva',
      });

      const result = await service.delete('user-1');

      expect(result).toBeDefined();
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('deve repassar erros do Prisma na deleção', async () => {
      mockPrismaService.user.delete.mockRejectedValue(
        new Error('Record not found'),
      );
      await expect(service.delete('invalid-id')).rejects.toThrow(
        'Record not found',
      );
    });
  });

  describe('Security', () => {
    it('deve sempre hashear senhas antes de salvar', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({ id: 'user-1' });

      await service.create({
        tenantId: 'tenant-1',
        name: 'Test',
        email: 'test@example.com',
        password: 'plain-password',
      });

      expect(bcrypt.hash).toHaveBeenCalled();
    });

    it('não deve retornar senha em findAll', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', name: 'Test', email: 'test@example.com' },
      ]);

      await service.findAll('tenant-1');

      const selectFields =
        mockPrismaService.user.findMany.mock.calls[0][0].select;
      expect(selectFields.password).toBeUndefined();
    });
  });
});
