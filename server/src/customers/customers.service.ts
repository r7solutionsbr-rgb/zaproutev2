import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    if (!tenantId) return [];
    return (this.prisma as any).customer.findMany({
      where: { tenantId },
      orderBy: { tradeName: 'asc' }
    });
  }

  // --- CRIAÇÃO ---
  async create(data: any) {
    const { tenantId, id, ...rest } = data;
    
    // Limpa dados (converte string vazia em null, etc)
    const cleanData = this.prepareData(rest);

    return (this.prisma as any).customer.create({
      data: {
        ...cleanData,
        status: cleanData.status || 'ACTIVE',
        tenant: { connect: { id: tenantId } }
      }
    });
  }

  // --- ATUALIZAÇÃO ---
  async update(id: string, data: any) {
    const { id: _id, tenantId, tenant, deliveries, ...rest } = data;

    // Limpa dados
    const cleanData = this.prepareData(rest);

    return (this.prisma as any).customer.update({
      where: { id },
      data: cleanData,
    });
  }

  // --- GEOCODIFICAÇÃO (Botão Localizar) ---
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
            throw new Error('Endereço não localizado no mapa.');
        }
    } catch (error: any) {
        this.logger.error(`Erro ao geocodificar: ${error.message}`);
        throw new Error('Falha ao conectar serviço de mapas.');
    }
  }

  // --- IMPORTAÇÃO MASSIVA (Restaurada e Integrada) ---
  async importMassive(tenantId: string, customers: any[]) {
    const results = [];
    
    for (const c of customers) {
      if (!c.cnpj && !c.tradeName) continue;

      // 1. Tenta achar cliente existente
      const existingCustomer = await (this.prisma as any).customer.findFirst({
        where: { 
            tenantId: tenantId,
            OR: [
                { cnpj: c.cnpj },
                { tradeName: c.tradeName } 
            ]
        }
      });

      // Monta objeto bruto
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

      // Passa pelo prepareData para garantir tipos corretos
      const customerData = this.prepareData(rawData);

      if (existingCustomer) {
        // ATUALIZA
        const updated = await (this.prisma as any).customer.update({
          where: { id: existingCustomer.id },
          data: customerData
        });
        results.push(updated);
      } else {
        // CRIA
        const created = await (this.prisma as any).customer.create({
          data: {
              ...customerData,
              tenant: { connect: { id: tenantId } }
          }
        });
        results.push(created);
      }
    }
    return results;
  }

  // --- HELPER: Limpeza e Tipagem de Dados ---
  private prepareData(data: any) {
    const clean: any = { ...data };

    // 1. Corrige Credit Limit (String vazia vira null)
    if (clean.creditLimit === '' || clean.creditLimit === null || clean.creditLimit === undefined) {
        clean.creditLimit = null;
    } else {
        // Converte para float se for string numérica, ou mantém se já for número
        const floatVal = parseFloat(clean.creditLimit);
        clean.creditLimit = isNaN(floatVal) ? null : floatVal;
    }

    // 2. Garante Lat/Lng numéricos
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