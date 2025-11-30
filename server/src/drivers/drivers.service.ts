import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) { }

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
    return this.prisma.driver.create({
      data: {
        ...rest,
        status: 'IDLE',
        tenant: { connect: { id: tenantId } }
      }
    });
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
        results.push(created);
      }
    }
    return results;
  }
}