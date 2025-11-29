import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client'; // Importa tipos auxiliares se necessário
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
    
    return this.prisma.user.create({
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