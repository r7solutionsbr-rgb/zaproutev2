import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SellersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return (this.prisma as any).seller.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { customers: true } } // Já mostra quantos clientes esse vendedor tem
      }
    });
  }

  async create(data: any) {
    const { tenantId, ...rest } = data;
    return (this.prisma as any).seller.create({
      data: {
        ...rest,
        tenant: { connect: { id: tenantId } }
      }
    });
  }

  async update(id: string, data: any) {
    const { id: _id, tenantId, ...cleanData } = data;
    return (this.prisma as any).seller.update({
      where: { id },
      data: cleanData
    });
  }

  async remove(id: string) {
    return (this.prisma as any).seller.delete({ where: { id } });
  }
}