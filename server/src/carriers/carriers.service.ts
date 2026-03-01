import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CarriersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const [total, data] = await Promise.all([
      (this.prisma as any).carrier.count({ where: { tenantId } }),
      (this.prisma as any).carrier.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { deliveries: true } },
        },
      }),
    ]);

    const totalPages = total > 0 ? 1 : 0;
    return {
      data,
      meta: {
        total,
        page: 1,
        limit: total,
        totalPages,
        hasNext: false,
        hasPrev: false,
      },
    };
  }

  async create(data: any) {
    const { tenantId, ...rest } = data;
    return (this.prisma as any).carrier.create({
      data: {
        ...rest,
        tenant: { connect: { id: tenantId } },
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    const { name, phone } = data;

    const exists = await (this.prisma as any).carrier.findFirst({
      where: { id, tenantId },
    });
    if (!exists) throw new NotFoundException('Transportadora não encontrada');

    return (this.prisma as any).carrier.update({
      where: { id },
      data: {
        name,
        phone,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    const exists = await (this.prisma as any).carrier.findFirst({
      where: { id, tenantId },
    });
    if (!exists) throw new NotFoundException('Transportadora não encontrada');

    return (this.prisma as any).carrier.delete({ where: { id } });
  }
}
