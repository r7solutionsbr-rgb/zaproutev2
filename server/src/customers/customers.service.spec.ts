import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    seller: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('create', () => {
    const validCustomerData = {
      tenantId: 'tenant-1',
      sellerId: 'seller-1',
      legalName: 'Empresa Teste LTDA',
      tradeName: 'Empresa Teste',
      cnpj: '12345678000190',
      stateRegistration: '123456789',
      email: 'contato@empresateste.com',
      phone: '11999999999',
      whatsapp: '11999999999',
      communicationPreference: 'WHATSAPP',
      addressDetails: {
        street: 'Rua Teste',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234567',
      },
      location: {
        address: 'Rua Teste, 123 - Centro, São Paulo - SP',
      },
    };

    it('deve criar um cliente com dados válidos', async () => {
      const createdCustomer = {
        id: 'customer-1',
        ...validCustomerData,
        status: 'ACTIVE',
      };

      mockPrismaService.customer.create.mockResolvedValue(createdCustomer);

      const result = await service.create(validCustomerData);

      expect(result).toEqual(createdCustomer);
      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'ACTIVE',
          communicationPreference: 'WHATSAPP',
          tenant: { connect: { id: 'tenant-1' } },
          seller: { connect: { id: 'seller-1' } },
        }),
      });
    });

    it('deve lançar erro se campo obrigatório estiver faltando', async () => {
      const invalidData = { ...validCustomerData };
      delete invalidData.legalName;

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidData)).rejects.toThrow(
        'O campo legalName é obrigatório',
      );
    });

    it('deve lançar erro se sellerId não for fornecido', async () => {
      const invalidData = { ...validCustomerData };
      delete invalidData.sellerId;

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidData)).rejects.toThrow(
        'O vendedor (sellerId) é obrigatório',
      );
    });

    it('deve lançar erro se endereço estiver incompleto', async () => {
      const invalidData = {
        ...validCustomerData,
        addressDetails: { ...validCustomerData.addressDetails },
      };
      delete invalidData.addressDetails.street;

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidData)).rejects.toThrow(
        'Todos os campos do endereço são obrigatórios',
      );
    });

    it('deve lançar erro se localização não for fornecida', async () => {
      const invalidData = {
        ...validCustomerData,
        addressDetails: { ...validCustomerData.addressDetails },
      };
      delete invalidData.location;

      await expect(service.create(invalidData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.create(invalidData)).rejects.toThrow(
        'A localização (Google Maps) é obrigatória',
      );
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de clientes', async () => {
      const customers = [
        {
          id: 'customer-1',
          tradeName: 'Empresa A',
          tenantId: 'tenant-1',
        },
        {
          id: 'customer-2',
          tradeName: 'Empresa B',
          tenantId: 'tenant-1',
        },
      ];

      mockPrismaService.customer.count.mockResolvedValue(2);
      mockPrismaService.customer.findMany.mockResolvedValue(customers);

      const result = await service.findAll('tenant-1', 1, 10, '', undefined);

      expect(result.data).toEqual(customers);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.lastPage).toBe(1);
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', OR: undefined },
        skip: 0,
        take: 10,
        orderBy: { tradeName: 'asc' },
        include: { seller: true },
      });
    });

    it('deve filtrar por search term', async () => {
      mockPrismaService.customer.count.mockResolvedValue(1);
      mockPrismaService.customer.findMany.mockResolvedValue([
        { id: 'customer-1', tradeName: 'Empresa Teste' },
      ]);

      await service.findAll('tenant-1', 1, 10, 'Teste', undefined);

      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { tradeName: { contains: 'Teste', mode: 'insensitive' } },
              { legalName: { contains: 'Teste', mode: 'insensitive' } },
              { cnpj: { contains: 'Teste' } },
            ],
          }),
        }),
      );
    });

    it('deve filtrar por status', async () => {
      mockPrismaService.customer.count.mockResolvedValue(1);
      mockPrismaService.customer.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', 1, 10, '', 'ACTIVE');

      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('deve retornar vazio se tenantId não for fornecido', async () => {
      const result = await service.findAll('', 1, 10, '', undefined);

      expect(result).toEqual({ data: [], total: 0, pages: 0 });
      expect(mockPrismaService.customer.findMany).not.toHaveBeenCalled();
    });

    it('deve calcular paginação corretamente', async () => {
      mockPrismaService.customer.count.mockResolvedValue(25);
      mockPrismaService.customer.findMany.mockResolvedValue([]);

      const result = await service.findAll('tenant-1', 2, 10, '', undefined);

      expect(result.meta.lastPage).toBe(3); // 25 / 10 = 3 páginas
      expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (2 - 1) * 10
          take: 10,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar um cliente por ID', async () => {
      const customer = {
        id: 'customer-1',
        tradeName: 'Empresa Teste',
        tenantId: 'tenant-1',
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(customer);

      const result = await service.findOne('customer-1', 'tenant-1');

      expect(result).toEqual(customer);
      expect(mockPrismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-1', tenantId: 'tenant-1' },
        include: { seller: true },
      });
    });

    it('deve lançar NotFoundException se cliente não for encontrado', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('invalid-id', 'tenant-1')).rejects.toThrow(
        'Cliente não encontrado',
      );
    });

    it('deve respeitar multi-tenancy', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('customer-1', 'other-tenant'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.customer.findFirst).toHaveBeenCalledWith({
        where: { id: 'customer-1', tenantId: 'other-tenant' },
        include: { seller: true },
      });
    });
  });

  describe('update', () => {
    it('deve atualizar um cliente existente', async () => {
      const existingCustomer = {
        id: 'customer-1',
        tradeName: 'Empresa Antiga',
        tenantId: 'tenant-1',
      };

      const updateData = {
        tradeName: 'Empresa Nova',
      };

      const updatedCustomer = {
        ...existingCustomer,
        ...updateData,
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(existingCustomer);
      mockPrismaService.customer.update.mockResolvedValue(updatedCustomer);

      const result = await service.update('customer-1', 'tenant-1', updateData);

      expect(result).toEqual(updatedCustomer);
      expect(mockPrismaService.customer.update).toHaveBeenCalled();
    });

    it('deve lançar erro se cliente não existir', async () => {
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await expect(
        service.update('invalid-id', 'tenant-1', { tradeName: 'Novo Nome' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Multi-tenancy', () => {
    it('deve isolar dados entre tenants', async () => {
      mockPrismaService.customer.findMany.mockResolvedValue([]);
      mockPrismaService.customer.count.mockResolvedValue(0);

      await service.findAll('tenant-1', 1, 10, '', undefined);
      await service.findAll('tenant-2', 1, 10, '', undefined);

      expect(mockPrismaService.customer.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
        }),
      );

      expect(mockPrismaService.customer.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-2' }),
        }),
      );
    });
  });

  describe('importMassive', () => {
    it('deve importar novos clientes e atualizar existentes', async () => {
      const customers = [
        {
          tradeName: 'Novo Cliente',
          cnpj: '00000000000191',
          salesperson: 'Vendedor A',
        },
        { tradeName: 'Cliente Existente', cnpj: '45990181000189' },
        { tradeName: 'Inválido', cnpj: '123' }, // Deve ser ignorado
      ];

      mockPrismaService.seller.findMany.mockResolvedValue([
        { id: 'seller-1', name: 'Vendedor A' },
      ]);
      mockPrismaService.customer.findFirst
        .mockResolvedValueOnce(null) // Novo
        .mockResolvedValueOnce({ id: 'existing-1', cnpj: '45990181000189' }); // Existente

      const result = await service.importMassive('tenant-1', customers);

      expect(result.created).toBe(1);
      expect(result.updated).toBe(1);
      expect(mockPrismaService.customer.create).toHaveBeenCalled();
      expect(mockPrismaService.customer.update).toHaveBeenCalled();
    });

    it('deve criar vendedor automaticamente se não existir', async () => {
      const customers = [
        {
          tradeName: 'Cliente X',
          cnpj: '00000000000191',
          salesperson: 'Novo Vendedor',
        },
      ];

      mockPrismaService.seller.findMany.mockResolvedValue([]);
      mockPrismaService.seller.create.mockResolvedValue({
        id: 'new-seller-id',
        name: 'Novo Vendedor',
      });
      mockPrismaService.customer.findFirst.mockResolvedValue(null);

      await service.importMassive('tenant-1', customers);

      expect(mockPrismaService.seller.create).toHaveBeenCalled();
    });
  });

  describe('geocodeCustomer', () => {
    it('deve atualizar localização do cliente usando Nominatim', async () => {
      const customer = {
        id: 'cust-1',
        addressDetails: {
          street: 'Avenida Paulista',
          number: '1000',
          city: 'São Paulo',
          state: 'SP',
        },
      };

      mockPrismaService.customer.findFirst.mockResolvedValue(customer);
      (axios.get as jest.Mock).mockResolvedValue({
        data: [{ lat: '-23.56', lon: '-46.65' }],
      });

      await service.geocodeCustomer('cust-1', 'tenant-1');

      expect(mockPrismaService.customer.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: expect.objectContaining({
          location: expect.objectContaining({ lat: -23.56, lng: -46.65 }),
        }),
      });
    });

    it('deve salvar com coordenadas 0 se endereço não for localizado', async () => {
      const customer = {
        id: 'cust-2',
        addressDetails: {
          street: 'Rua Inexistente Muito Longa',
          city: 'Cidade Atípica',
          state: 'ZZ',
        },
      };
      mockPrismaService.customer.findFirst.mockResolvedValue(customer);
      (axios.get as jest.Mock).mockResolvedValue({ data: [] });

      await service.geocodeCustomer('cust-2', 'tenant-1');

      expect(mockPrismaService.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cust-2' },
          data: expect.objectContaining({
            location: expect.objectContaining({ lat: 0, lng: 0 }),
          }),
        }),
      );
    });
  });
});
