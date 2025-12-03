import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client'; // Importa tipos auxiliares se necessário
import * as bcrypt from 'bcryptjs';

import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) { }

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        phone: true,
        avatarUrl: true
      },
      orderBy: { name: 'asc' }
    });
  }

  // Uso de Prisma.UserCreateInput (Opcional, mas boa prática) ou 'any' se preferir manter flexível por enquanto
  async create(data: any) {
    const rawPassword = data.password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new BadRequestException('Email já cadastrado.');
    }

    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: data.role || 'VIEWER',
        phone: data.phone,
        status: 'ACTIVE',
        tenant: { connect: { id: data.tenantId } }
      }
    });

    // Envia E-mail de Boas-vindas com a senha original
    this.mailService.sendWelcomeEmail(user.email, user.name, rawPassword)
      .catch(err => console.error('Erro ao enviar email de boas-vindas:', err));

    return user;
  }

  async update(id: string, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}