import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class DriversService {
  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService
  ) { }

  async findAll(tenantId: string) {
    if (!tenantId) return [];
    return this.prisma.driver.findMany({
      where: { tenantId },
      include: { vehicle: true },
      orderBy: { name: 'asc' }
    });
  }

  // Criação Individual
  async create(data: Prisma.DriverCreateInput & { tenantId: string }) {
    const { tenantId, ...rest } = data;
    const driver = await this.prisma.driver.create({
      data: {
        ...rest,
        status: 'IDLE',
        tenant: { connect: { id: tenantId } }
      }
    });

    // Envia Boas-vindas
    if (driver.phone) {
      const msg = `Olá *${driver.name}*! 👋\n\nBem-vindo ao *ZapRoute*!\nSeu cadastro foi realizado com sucesso.\n\nAgora você receberá suas rotas e suporte por aqui. 🚚💨`;
      this.whatsapp.sendText(driver.phone, msg);
    }

    return driver;
  }

  // Edição
  async update(id: string, data: any) {
    // Remove campos relacionais e IDs para evitar erros
    const { id: _id, tenantId, tenant, vehicle, deliveries, routes, ...cleanData } = data;
    return this.prisma.driver.update({
      where: { id },
      data: cleanData,
    });
  }

  // Importação Massiva (Lógica Manual "Check-Then-Act")
  async importMassive(tenantId: string, drivers: any[]) {
    const results = [];

    for (const d of drivers) {
      // Ignora linhas sem CPF
      if (!d.cpf) continue;

      // 1. Tenta encontrar o motorista pelo CPF (Manual, pois CPF não é @unique no schema)
      const existingDriver = await this.prisma.driver.findFirst({
        where: {
          cpf: d.cpf,
          tenantId: tenantId // Garante que é da mesma empresa
        }
      });

      // Tratamento de segurança para datas inválidas
      let expirationDate = new Date();
      if (d.cnhExpiration && !isNaN(new Date(d.cnhExpiration).getTime())) {
        expirationDate = new Date(d.cnhExpiration);
      }

      if (existingDriver) {
        // ATUALIZA
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
        // CRIA
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

        // Envia Boas-vindas
        if (created.phone) {
          const msg = `Olá *${created.name}*! 👋\n\nBem-vindo ao *ZapRoute*!\nSeu cadastro foi realizado com sucesso.\n\nAgora você receberá suas rotas e comprovantes por aqui. 🚚💨`;
          this.whatsapp.sendText(created.phone, msg);
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

    // Data de 30 dias atrás
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Busca entregas dos últimos 30 dias
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

    // Busca últimas 3 ocorrências (falhas)
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