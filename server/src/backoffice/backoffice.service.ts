import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BackofficeService {
    constructor(private prisma: PrismaService) { }

    async getAllTenants() {
        const tenants = await this.prisma.tenant.findMany({
            include: {
                _count: {
                    select: { users: true, drivers: true, vehicles: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return tenants;
    }

    async createTenant(data: any) {
        const { name, slug, plan, adminName, adminEmail, adminPassword } = data;

        // Check if slug exists
        const existingSlug = await this.prisma.tenant.findUnique({ where: { slug } });
        if (existingSlug) throw new BadRequestException('Slug já está em uso.');

        // Check if email exists
        const existingUser = await this.prisma.user.findUnique({ where: { email: adminEmail } });
        if (existingUser) throw new BadRequestException('Email já cadastrado.');

        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Transaction to create Tenant and Admin User
        return this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name,
                    slug,
                    plan: plan || 'FREE',
                    status: 'ACTIVE'
                }
            });

            const user = await tx.user.create({
                data: {
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'ADMIN',
                    tenantId: tenant.id
                }
            });

            return { tenant, user };
        });
    }

    async updateTenantStatus(id: string, status: string) {
        return this.prisma.tenant.update({
            where: { id },
            data: { status }
        });
    }
}
