import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class DeliveriesService {
  constructor(private prisma: PrismaService) {}

  async findAllPaginated(tenantId: string, paginationDto: PaginationDto) {
    console.log('🔍 findAllPaginated', { tenantId, paginationDto });
    // Force conversion to numbers to avoid Prisma validation errors
    const page = Number(paginationDto.page) || 1;
    const limit = Number(paginationDto.limit) || 20;
    const { startDate, endDate, status, priority, driverId, search } =
      paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      customer: {
        tenantId: tenantId,
      },
    };

    // Verificação rápida do Schema:
    // model Delivery { ... customer Customer? ... driver Driver? ... route Route? ... }
    // Customer tem tenantId. Driver tem tenantId. Route tem tenantId.
    // Melhor filtrar por Customer -> tenantId (é o dono da entrega/pedido)

    // 1. Filtro de Data (updatedAt ou date do campo string?)
    // Delivery tem `date` string e `updatedAt` DateTime. O frontend filtrava por `updatedAt`.
    // O campo `date` string pode ser a data de agendamento/rota.
    // Vou usar `updatedAt` para consistência com o frontend anterior, ou `date` se for mais preciso.
    // O frontend anterior usava: const deliveryDate = new Date(d.updatedAt).toISOString().split('T')[0];
    try {
      // 1. Filtro de Data
      if (startDate || endDate) {
        where.updatedAt = {};
        if (startDate)
          where.updatedAt.gte = new Date(`${startDate}T00:00:00.000Z`);
        if (endDate) where.updatedAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      }

      // 2. Filtro de Status
      if (status) {
        if (Array.isArray(status)) {
          where.status = { in: status };
        } else {
          where.status = status;
        }
      }

      // 3. Filtro de Prioridade
      if (priority) {
        where.priority = priority;
      }

      // 4. Filtro de Motorista
      if (driverId && driverId !== 'ALL') {
        where.driverId = driverId;
      }

      // 5. Busca
      if (search) {
        where.OR = [
          { orderId: { contains: search, mode: 'insensitive' } },
          {
            customer: { tradeName: { contains: search, mode: 'insensitive' } },
          },
        ];
      }
    } catch (error) {
      console.error('❌ Error building where clause:', error);
      // Fallback to safe defaults or rethrow
    }

    const [total, data] = await Promise.all([
      this.prisma.delivery.count({ where }),
      this.prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: true, // Preciso dos dados do cliente
          driver: true, // Preciso dos dados do motorista
          // route: true // Opcional
        },
      }),
    ]);

    // Mapear para o formato esperado pelo frontend se precisar renomear campos
    const mappedData = data.map((d) => ({
      ...d,
      invoiceNumber: d.orderId, // Assumindo mapeamento
    }));

    return {
      data: mappedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, tenantId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id,
        customer: { tenantId },
      },
      include: {
        customer: {
          include: {
            seller: true,
          },
        },
        driver: true,
        route: true,
      },
    });

    if (!delivery) return null;

    return {
      ...delivery,
      invoiceNumber: delivery.orderId,
    };
  }

  async confirmDelivery(
    id: string,
    tenantId: string,
    proofUrl: string | null,
    signatureUrl: string | null = null,
  ) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, customer: { tenantId } },
    });

    if (!delivery) throw new Error('Entrega não encontrada');

    return this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        proofOfDeliveryUrl: proofUrl,
        signatureUrl: signatureUrl,
        updatedAt: new Date(),
      },
    });
  }

  async failDelivery(id: string, tenantId: string, reason: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, customer: { tenantId } },
    });

    if (!delivery) throw new Error('Entrega não encontrada');

    return this.prisma.delivery.update({
      where: { id },
      data: {
        status: 'FAILED', // ou RETURNED
        failureReason: reason,
        updatedAt: new Date(),
      },
    });
  }
}
