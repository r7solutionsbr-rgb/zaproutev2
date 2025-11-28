import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    return (this.prisma as any).tenant.findUnique({
      where: { id }
    });
  }

  async update(id: string, data: any) {
    // Remove campos sensíveis E campos de sistema (datas)
    // Isso previne o erro de tentar atualizar createdAt/updatedAt manualmente
    const { id: _id, plan, slug, createdAt, updatedAt, ...cleanData } = data;
    
    return (this.prisma as any).tenant.update({
      where: { id },
      data: cleanData
    });
  }
}