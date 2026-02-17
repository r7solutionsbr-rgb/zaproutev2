import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class OccurrencesService {
  constructor(private prisma: PrismaService) {}

  async findAllPaginated(tenantId: string, paginationDto: PaginationDto) {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      status,
      driverId,
      search,
    } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId: tenantId, // Occurrence tem tenantId direto no schema
    };

    // 1. Filtro de Data (createdAt)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate)
        where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    // 2. Filtro de Status (FAILED, RETURNED - O campo no Occurrence é 'type' ou 'description'?
    // No schema Occurrence: id, type, description, driverId, routeId, deliveryId.
    // NÃO TEM STATUS.
    // A lista de ocorrências no frontend filtra Delivery.status = FAILED/RETURNED.
    // Mas existe uma tabela Occurrence. Será que ela é usada?
    // O frontend antigo carregava ROTAS e filtrava DELIVERIES com status de erro.
    // A tabela Occurrence parece ser um log separado.
    // Se eu usar a tabela Occurrence, posso perder o status exato da entrega se não estiver sincronizado.
    // Mas o ideal é usar a tabela Delivery com filtro de status FAILED/RETURNED.
    // Entao o OccurrencesService deve consultar a tabela DELIVERY com filtros especificos.

    // Vou reescrever para consultar Delivery com status de erro.

    // UPDATE: Onde: Model Delivery
    // Status: FAILED, RETURNED
    const deliveryWhere: any = {
      customer: { tenantId },
      status: { in: ['FAILED', 'RETURNED'] },
    };

    if (startDate || endDate) {
      deliveryWhere.updatedAt = {};
      if (startDate)
        deliveryWhere.updatedAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate)
        deliveryWhere.updatedAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    if (driverId && driverId !== 'ALL') {
      deliveryWhere.driverId = driverId;
    }

    if (search) {
      deliveryWhere.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { customer: { tradeName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Se o user passou 'status' filtro (ex: RETURNED), aplicamos. Se for ALL, pega FAILED e RETURNED.
    if (status && status !== 'ALL') {
      if (Array.isArray(status)) {
        deliveryWhere.status = { in: status };
      } else {
        deliveryWhere.status = status;
      }
    }

    const [total, data] = await Promise.all([
      this.prisma.delivery.count({ where: deliveryWhere }),
      this.prisma.delivery.findMany({
        where: deliveryWhere,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          customer: true,
          driver: true,
          route: true,
        },
      }),
    ]);

    const mappedData = data.map((d) => ({
      ...d,
      invoiceNumber: d.orderId,
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
}
