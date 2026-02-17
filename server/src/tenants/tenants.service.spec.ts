import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma.service';

describe('TenantsService', () => {
  let service: TenantsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findOne', () => {
    it('deve retornar um tenant por ID', async () => {
      const tenant = {
        id: 'tenant-1',
        name: 'Empresa Teste',
        slug: 'empresa-teste',
        cnpj: '12345678000190',
        plan: 'PREMIUM',
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue(tenant);

      const result = await service.findOne('tenant-1');

      expect(result).toEqual(tenant);
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
      });
    });

    it('deve retornar null se tenant não existir', async () => {
      mockPrismaService.tenant.findUnique.mockResolvedValue(null);

      const result = await service.findOne('invalid-id');

      expect(result).toBeNull();
      expect(mockPrismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: 'invalid-id' },
      });
    });
  });

  describe('update', () => {
    it('deve atualizar tenant com dados válidos', async () => {
      const updateData = {
        name: 'Empresa Atualizada',
        phone: '11999999999',
        email: 'contato@empresa.com',
      };

      const updatedTenant = {
        id: 'tenant-1',
        ...updateData,
      };

      mockPrismaService.tenant.update.mockResolvedValue(updatedTenant);

      const result = await service.update('tenant-1', updateData);

      expect(result).toEqual(updatedTenant);
      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: updateData,
      });
    });

    it('deve filtrar campos de sistema (createdAt, updatedAt)', async () => {
      const updateData = {
        name: 'Empresa Atualizada',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        name: 'Empresa Atualizada',
      });

      await service.update('tenant-1', updateData);

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {
          name: 'Empresa Atualizada',
          // createdAt e updatedAt não devem estar aqui
        },
      });
    });

    it('deve filtrar campos sensíveis (id, plan, slug)', async () => {
      const updateData = {
        id: 'new-id', // Não deve ser atualizado
        name: 'Empresa Atualizada',
        plan: 'ENTERPRISE', // Não deve ser atualizado
        slug: 'novo-slug', // Não deve ser atualizado
      };

      mockPrismaService.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        name: 'Empresa Atualizada',
      });

      await service.update('tenant-1', updateData);

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {
          name: 'Empresa Atualizada',
          // id, plan e slug não devem estar aqui
        },
      });
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      const partialUpdate = {
        name: 'Novo Nome',
      };

      mockPrismaService.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        name: 'Novo Nome',
      });

      await service.update('tenant-1', partialUpdate);

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {
          name: 'Novo Nome',
        },
      });
    });

    it('deve permitir atualizar configurações customizadas', async () => {
      const updateData = {
        name: 'Empresa Teste',
        settings: {
          theme: 'dark',
          notifications: true,
        },
      };

      mockPrismaService.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        ...updateData,
      });

      await service.update('tenant-1', updateData);

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: updateData,
      });
    });
  });

  describe('Data Sanitization', () => {
    it('deve remover todos os campos não permitidos em uma única operação', async () => {
      const dirtyData = {
        id: 'should-be-removed',
        name: 'Valid Name',
        plan: 'should-be-removed',
        slug: 'should-be-removed',
        createdAt: new Date(),
        updatedAt: new Date(),
        email: 'valid@email.com',
        phone: '11999999999',
      };

      mockPrismaService.tenant.update.mockResolvedValue({
        id: 'tenant-1',
        name: 'Valid Name',
      });

      await service.update('tenant-1', dirtyData);

      expect(mockPrismaService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: {
          name: 'Valid Name',
          email: 'valid@email.com',
          phone: '11999999999',
        },
      });
    });
  });
});
