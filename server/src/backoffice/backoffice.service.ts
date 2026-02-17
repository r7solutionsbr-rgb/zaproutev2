import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BackofficeService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async getAllTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true, drivers: true, vehicles: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return tenants;
  }

  async createTenant(data: any) {
    const { name, cnpj, plan, adminName, adminEmail, adminPassword } = data;

    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: adminEmail },
    });
    if (existingUser) throw new BadRequestException('Email já cadastrado.');

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Transaction to create Tenant and Admin User
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name,
          cnpj: cnpj || '00.000.000/0000-00', // Valor default ou obrigatório
          status: 'ACTIVE',
          // plan field removed as it is not in schema
        },
      });

      const user = await tx.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    // Send Welcome Email (Async, don't block)
    this.mailService
      .sendWelcomeEmail(adminEmail, adminName, adminPassword)
      .catch((err) =>
        console.error('Erro ao enviar email de boas-vindas:', err),
      );

    return result;
  }

  async updateTenantStatus(id: string, status: string) {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
    });
  }

  async updateTenant(id: string, data: any) {
    const { name } = data;

    return this.prisma.tenant.update({
      where: { id },
      data: {
        name,
        // plan removed
      },
    });
  }
}
