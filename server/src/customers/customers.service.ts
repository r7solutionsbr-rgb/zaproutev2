import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private prisma: PrismaService) { }

  // --- BUSCA COM PAGINAÇÃO E FILTRO ---
  async findAll(tenantId: string, page: number, limit: number, search: string) {
    if (!tenantId) return { data: [], total: 0, pages: 0 };

    const skip = (page - 1) * limit;

    const whereClause: any = {
      tenantId,
      OR: search ? [
        { tradeName: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search } }
      ] : undefined
    };

    const [total, data] = await Promise.all([
      (this.prisma as any).customer.count({ where: whereClause }),
      (this.prisma as any).customer.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { tradeName: 'asc' },
        include: { seller: true }
      })
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit)
      }
    };
  }

  async create(data: any) {
    const { tenantId, id, ...rest } = data;
    const cleanData = this.prepareData(rest);

    return (this.prisma as any).customer.create({
      data: {
        ...cleanData,
        status: cleanData.status || 'ACTIVE',
        tenant: { connect: { id: tenantId } }
      }
    });
  }

  async update(id: string, data: any) {
    const { id: _id, tenantId, tenant, deliveries, ...rest } = data;
    const cleanData = this.prepareData(rest);

    return (this.prisma as any).customer.update({
      where: { id },
      data: cleanData,
    });
  }

  async geocodeCustomer(id: string) {
    const customer = await (this.prisma as any).customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Cliente não encontrado');

    const details = customer.addressDetails || {};
    const addressStr = [
      details.street,
      details.number,
      details.city,
      details.state,
      "Brasil"
    ].filter(Boolean).join(', ');

    if (addressStr.length < 10) throw new Error('Endereço incompleto para geocodificação.');

    // THROTTLE: Espera 1.5s antes de chamar a API
    await new Promise(r => setTimeout(r, 1500));

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr)}&limit=1`;
      const response = await axios.get(url, { headers: { 'User-Agent': 'ZapRoute/1.0' } });

      if (response.data && response.data.length > 0) {
        const lat = parseFloat(response.data[0].lat);
        const lng = parseFloat(response.data[0].lon);

        return (this.prisma as any).customer.update({
          where: { id },
          data: {
            location: {
              lat,
              lng,
              address: customer.location?.address || addressStr
            }
          }
        });
      } else {
        // Salva sem coordenadas para não travar processos futuros
        this.logger.warn(`Endereço não localizado: ${addressStr}`);
        return (this.prisma as any).customer.update({
          where: { id },
          data: {
            location: {
              lat: 0,
              lng: 0,
              address: addressStr + " (Não localizado)"
            }
          }
        });
      }
    } catch (error: any) {
      this.logger.error(`Erro ao geocodificar: ${error.message}`);
      // Não lança erro para não quebrar importações em massa
      return null;
    }
  }

  // --- IMPORTAÇÃO MASSIVA COM BATCH ---
  async importMassive(tenantId: string, customers: any[]) {
    // Contadores
    let createdCount = 0;
    let updatedCount = 0;

    // 1. OTIMIZAÇÃO: Carrega todos os vendedores em memória (Cache)
    const existingSellers = await (this.prisma as any).seller.findMany({
      where: { tenantId }
    });

    const sellerMap = new Map<string, string>();
    existingSellers.forEach((s: any) => sellerMap.set(s.name.toUpperCase().trim(), s.id));

    // PROCESSAMENTO EM LOTES (CHUNKS)
    const BATCH_SIZE = 50;
    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
      const batch = customers.slice(i, i + BATCH_SIZE);

      // Processa o lote em paralelo (mas cuidado com conexões do banco)
      // Aqui faremos sequencial dentro do lote para garantir integridade
      for (const c of batch) {
        if (!c.cnpj && !c.tradeName) continue;

        // 2. Resolve Vendedor
        let sellerId = null;
        if (c.salesperson) {
          const sName = c.salesperson.toUpperCase().trim();

          if (sellerMap.has(sName)) {
            sellerId = sellerMap.get(sName);
          } else {
            try {
              const newSeller = await (this.prisma as any).seller.create({
                data: {
                  name: c.salesperson,
                  tenant: { connect: { id: tenantId } },
                  status: 'ACTIVE'
                }
              });
              sellerId = newSeller.id;
              sellerMap.set(sName, sellerId);
            } catch (e) {
              this.logger.warn(`Erro ao criar vendedor automático: ${sName}`);
            }
          }
        }

        // 3. Verifica Existência
        const existingCustomer = await (this.prisma as any).customer.findFirst({
          where: {
            tenantId: tenantId,
            OR: [
              { cnpj: c.cnpj },
              { tradeName: c.tradeName }
            ]
          }
        });

        // 4. Prepara Dados
        const rawData = {
          legalName: c.legalName || c.tradeName,
          tradeName: c.tradeName,
          cnpj: c.cnpj,
          stateRegistration: c.stateRegistration,
          email: c.email,
          phone: c.phone,
          whatsapp: c.whatsapp,
          salesperson: c.salesperson,
          location: c.location || { lat: 0, lng: 0, address: 'Não informado' },
          addressDetails: c.addressDetails || {},
          creditLimit: c.creditLimit,
          status: 'ACTIVE'
        };

        const customerData = this.prepareData(rawData);

        // Prepare relation object
        const relationData: any = {};
        if (sellerId) {
          relationData.seller = { connect: { id: sellerId } };
        }

        // 5. Salva e Incrementa Contadores
        if (existingCustomer) {
          await (this.prisma as any).customer.update({
            where: { id: existingCustomer.id },
            data: {
              ...customerData,
              ...relationData
            }
          });
          updatedCount++;
        } else {
          await (this.prisma as any).customer.create({
            data: {
              ...customerData,
              ...relationData,
              tenant: { connect: { id: tenantId } }
            }
          });
          createdCount++;
        }
      }
    }

    // RETORNO PERSONALIZADO
    return {
      message: `Processamento finalizado! ${createdCount} clientes adicionados e ${updatedCount} atualizados.`,
      created: createdCount,
      updated: updatedCount
    };
  }

  private prepareData(data: any) {
    const clean: any = { ...data };

    if (clean.creditLimit === '' || clean.creditLimit === null || clean.creditLimit === undefined) {
      clean.creditLimit = null;
    } else {
      const floatVal = parseFloat(clean.creditLimit);
      clean.creditLimit = isNaN(floatVal) ? null : floatVal;
    }

    if (clean.location) {
      clean.location = {
        ...clean.location,
        lat: parseFloat(clean.location.lat || 0),
        lng: parseFloat(clean.location.lng || 0)
      };
    }

    return clean;
  }
}