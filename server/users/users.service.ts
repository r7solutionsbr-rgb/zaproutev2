import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return (this.prisma as any).user.findMany({
      where: { tenantId },
      // Seleciona apenas dados seguros (sem senha)
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

  async create(data: any) {
    // Usa a senha fornecida ou '123456' como padrão
    const rawPassword = data.password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    
    return (this.prisma as any).user.create({
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

  // Permite alterar dados (incluindo senha se enviada)
  async update(id: string, data: any) {
      if (data.password) {
          data.password = await bcrypt.hash(data.password, 10);
      }
      return (this.prisma as any).user.update({
          where: { id },
          data
      });
  }

  async delete(id: string) {
    return (this.prisma as any).user.delete({ where: { id } });
  }
}