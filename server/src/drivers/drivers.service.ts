import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

import { WhatsappService, ProviderConfig } from '../whatsapp/whatsapp.service';

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService
  ) { }

  // Helper para limpar dados
  private prepareData(data: any) {
    const clean = { ...data };
    if (clean.cpf) clean.cpf = clean.cpf.replace(/\D/g, '');
    if (clean.phone) {
      clean.phone = clean.phone.replace(/\D/g, '');
      // Se tiver 10 ou 11 dígitos (DDD + Número), adiciona 55
      if (clean.phone.length === 10 || clean.phone.length === 11) {
        clean.phone = `55${clean.phone}`;
      }
    }
    if (clean.cnh) clean.cnh = clean.cnh.replace(/\D/g, '');
    return clean;
  }

  // Helper para obter configuração do WhatsApp
  private getWhatsappConfig(tenant: any): ProviderConfig {
    const providerType = tenant.config?.whatsappProvider || 'ZAPI';

    if (providerType === 'SENDPULSE') {
      return {
        type: 'SENDPULSE',
        sendpulseClientId: process.env.SENDPULSE_ID,
        sendpulseClientSecret: process.env.SENDPULSE_SECRET,
        sendpulseBotId: tenant.config?.whatsappProvider?.sendpulseBotId || process.env.SENDPULSE_BOT_ID
      };
    }

    // Default: Z-API
    return {
      type: 'ZAPI',
      zapiInstanceId: tenant.config?.whatsappProvider?.zapiInstanceId || process.env.ZAPI_INSTANCE_ID,
      zapiToken: tenant.config?.whatsappProvider?.zapiToken || process.env.ZAPI_TOKEN,
      zapiClientToken: tenant.config?.whatsappProvider?.zapiClientToken || process.env.ZAPI_CLIENT_TOKEN
    };
  }

  async findAll(tenantId: string, search?: string) {
    if (!tenantId) return [];

    const where: Prisma.DriverWhereInput = { tenantId };

    if (search) {
      const cleanSearch = search.replace(/\D/g, '');
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        ...(cleanSearch ? [
          { cpf: { contains: cleanSearch } },
          { cnh: { contains: cleanSearch } }
        ] : [])
      ];
    }

    return this.prisma.driver.findMany({
      where,
      include: { vehicle: true },
      orderBy: { name: 'asc' }
    });
  }

  // Criação Individual
  async create(data: Prisma.DriverCreateInput & { tenantId: string }) {
    const { tenantId, ...rest } = this.prepareData(data);

    // 1. Busca Tenant para saber a config
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error("Empresa não encontrada");

    const driver = await this.prisma.driver.create({
      data: {
        ...rest,
        status: 'IDLE',
        tenant: { connect: { id: tenantId } }
      }
    });

    // Envia Boas-vindas via TEXTO (não template)
    if (driver.phone) {
      const whatsappConfig = this.getWhatsappConfig(tenant);
      this.logger.log(`Criando motorista para tenant: ${tenant.name} via ${whatsappConfig.type}`);

      const firstName = driver.name.split(' ')[0];
      const welcomeMessage = `Olá, ${firstName}! 👋\n\nSeja bem-vindo(a) à equipe *${tenant.name}*!\n\nVocê foi cadastrado(a) como motorista em nosso sistema.\n\nEm breve você receberá suas rotas e entregas por aqui.\n\nQualquer dúvida, estamos à disposição!`;

      // Envia como texto simples
      await this.whatsapp.sendText(
        driver.phone,
        welcomeMessage,
        whatsappConfig
      );
    }

    return driver;
  }

  // Edição
  async update(id: string, data: any) {
    const { id: _id, tenantId, tenant, vehicle, deliveries, routes, ...rawData } = data;
    const cleanData = this.prepareData(rawData);

    return this.prisma.driver.update({
      where: { id },
      data: cleanData,
    });
  }

  // Importação Massiva
  async importMassive(tenantId: string, drivers: any[]) {
    const results = [];

    // 1. Busca Tenant UMA VEZ para saber a config
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error("Empresa não encontrada");

    const whatsappConfig = this.getWhatsappConfig(tenant);
    this.logger.log(`Importação massiva para tenant: ${tenant.name} via ${whatsappConfig.type}`);

    for (const rawDriver of drivers) {
      const d = this.prepareData(rawDriver);

      if (!d.cpf) continue;

      const existingDriver = await this.prisma.driver.findFirst({
        where: {
          cpf: d.cpf,
          tenantId: tenantId
        }
      });

      let expirationDate = new Date();
      if (d.cnhExpiration && !isNaN(new Date(d.cnhExpiration).getTime())) {
        expirationDate = new Date(d.cnhExpiration);
      }

      if (existingDriver) {
        const updated = await this.prisma.driver.update({
          where: { id: existingDriver.id },
          data: {
            name: d.name,
            email: d.email,
            phone: d.phone,
            cnh: d.cnh,
            cnhCategory: d.cnhCategory,
            cnhExpiration: expirationDate,
          }
        });
        results.push(updated);
      } else {
        const created = await this.prisma.driver.create({
          data: {
            name: d.name,
            cpf: d.cpf,
            email: d.email,
            phone: d.phone,
            cnh: d.cnh,
            cnhCategory: d.cnhCategory,
            cnhExpiration: expirationDate,
            status: 'IDLE',
            avatarUrl: `https://ui-avatars.com/api/?name=${d.name}&background=random`,
            tenant: { connect: { id: tenantId } }
          }
        });

        // Envia Boas-vindas via TEXTO (não template)
        if (created.phone) {
          const firstName = created.name.split(' ')[0];
          const welcomeMessage = `Olá, ${firstName}! 👋\n\nSeja bem-vindo(a) à equipe *${tenant.name}*!\n\nVocê foi cadastrado(a) como motorista em nosso sistema.\n\nEm breve você receberá suas rotas e entregas por aqui.\n\nQualquer dúvida, estamos à disposição!`;

          // Envia como texto simples
          await this.whatsapp.sendText(
            created.phone,
            welcomeMessage,
            whatsappConfig
          );
        }

        results.push(created);
      }
    }
    return results;
  }

  async getDriverPerformance(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: { vehicle: true }
    });

    if (!driver) throw new Error("Motorista não encontrado");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        driverId,
        updatedAt: { gte: thirtyDaysAgo },
        status: { in: ['DELIVERED', 'FAILED', 'RETURNED'] }
      }
    });

    const totalDeliveries = deliveries.length;
    const deliveredCount = deliveries.filter(d => d.status === 'DELIVERED').length;
    const failedCount = deliveries.filter(d => d.status !== 'DELIVERED').length;

    const successRate = totalDeliveries > 0
      ? ((deliveredCount / totalDeliveries) * 100).toFixed(1)
      : "0.0";

    const recentFailures = await this.prisma.delivery.findMany({
      where: {
        driverId,
        status: { in: ['FAILED', 'RETURNED'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: { failureReason: true, updatedAt: true }
    });

    const recentIssues = recentFailures.map(f =>
      `${new Date(f.updatedAt).toLocaleDateString()}: ${f.failureReason || 'Sem motivo'}`
    );

    return {
      driverName: driver.name,
      totalDeliveries,
      successRate,
      failedCount,
      recentIssues
    };
  }
}