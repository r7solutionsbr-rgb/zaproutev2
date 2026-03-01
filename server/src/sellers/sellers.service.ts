import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SellersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return (this.prisma as any).seller.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { customers: true } }, // Já mostra quantos clientes esse vendedor tem
      },
    });
  }

  async create(data: any) {
    const { tenantId, ...rest } = data;
    return (this.prisma as any).seller.create({
      data: {
        ...rest,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    // Filtrar apenas os campos permitidos para evitar erro do Prisma com campos extras (ex: _count, createdAt)
    const { name, phone, email, status } = data;

    const exists = await (this.prisma as any).seller.findFirst({
      where: { id, tenantId },
    });
    if (!exists) throw new NotFoundException('Vendedor não encontrado');

    return (this.prisma as any).seller.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        status,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const exists = await (this.prisma as any).seller.findFirst({
      where: { id, tenantId },
    });
    if (!exists) throw new NotFoundException('Vendedor não encontrado');

    return (this.prisma as any).seller.delete({ where: { id } });
  }
}
