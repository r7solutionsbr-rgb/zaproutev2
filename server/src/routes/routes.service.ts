import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRouteDto, UpdateDeliveryStatusDto } from './dto/route.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService
  ) { }

  private fixDate(dateInput: string | Date): Date {
    if (!dateInput) {
      throw new BadRequestException('A data da rota é obrigatória.');
    }

    let d = new Date(dateInput);

    // Se a conversão padrão falhou (Invalid Date) e é uma string
    if (isNaN(d.getTime()) && typeof dateInput === 'string') {
      // Tenta salvar se o formato for brasileiro (DD/MM/YYYY)
      if (dateInput.includes('/')) {
        const parts = dateInput.split('/');
        if (parts.length === 3) {
          // Converte para ISO (YYYY-MM-DD) que o JavaScript entende
          // parts[2] = ano, parts[1] = mês, parts[0] = dia
          d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }
    }

    // Se ainda assim for inválida, para tudo e avisa
    if (isNaN(d.getTime())) {
      this.logger.error(`Data inválida recebida: ${dateInput}`);
      throw new BadRequestException(
        `Data inválida: "${dateInput}". Certifique-se de que está no formato YYYY-MM-DD ou DD/MM/YYYY.`
      );
    }

    // Fixa meio-dia UTC para evitar problemas de fuso horário (-3h)
    d.setUTCHours(12, 0, 0, 0);
    return d;
  }

  private cleanString(str: string | number | null | undefined): string {
    if (str === null || str === undefined) return '';
    return String(str).replace(/\D/g, '');
  }

  async findAll(tenantId: string, days?: number) {
    if (!tenantId) return [];

    const where: any = { tenantId };

    if (days || days === undefined) {
      const limit = days || 30; // Default 30 days
      const date = new Date();
      date.setDate(date.getDate() - limit);
      where.date = { gte: date };
    }

    return (this.prisma as any).route.findMany({
      where,
      include: {
        driver: true,
        vehicle: true,
        deliveries: { include: { customer: true } },
        _count: { select: { deliveries: true } }
      },
      orderBy: { date: 'desc' }
    });
  }

  async findOne(id: string) {
    return (this.prisma as any).route.findUnique({
      where: { id },
      include: {
        deliveries: { include: { customer: true } },
        driver: true,
        vehicle: true
      }
    });
  }

  async update(id: string, data: any) {
    const { driverId, vehicleId, date, ...rest } = data;
    const updateData: any = { ...rest };

    if (date) updateData.date = this.fixDate(date);
    if (driverId) updateData.driver = { connect: { id: driverId } };
    if (vehicleId) updateData.vehicle = { connect: { id: vehicleId } };

    return (this.prisma as any).route.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await (this.prisma as any).delivery.deleteMany({ where: { routeId: id } });
    return (this.prisma as any).route.delete({ where: { id } });
  }

  private formatCNPJ(value: string): string {
    const v = this.cleanString(value);
    if (v.length !== 14) return value;
    return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
  }

  // --- IMPORTAÇÃO ESTRITA (APENAS VINCULA) ---
  async importRoute(data: CreateRouteDto) {
    this.logger.log(`🔒 Iniciando importação estrita: ${data.name}`);

    return (this.prisma as any).$transaction(async (tx: any) => {

      // 1. Validação do Motorista (Estratégia Dinâmica)
      let finalDriverId = data.driverId;

      if (!finalDriverId) {
        // Busca Configuração do Tenant
        const tenant = await tx.tenant.findUnique({ where: { id: data.tenantId } });
        const config = tenant?.config as any || {};
        const strategy = config.driverImportStrategy || 'CPF'; // Default: CPF

        let driver = null;

        if (strategy === 'PHONE' && data.driverPhone) {
          // Estratégia: TELEFONE (Busca flexível)
          const cleanPhone = this.cleanString(data.driverPhone);
          if (cleanPhone.length > 8) {
            driver = await tx.driver.findFirst({
              where: {
                tenantId: data.tenantId,
                phone: { contains: cleanPhone } // Busca parcial para evitar problemas de +55
              }
            });
          }
        } else if (strategy === 'EXTERNAL_ID' && data.driverExternalId) {
          // Estratégia: MATRÍCULA (Busca exata)
          driver = await tx.driver.findFirst({
            where: {
              tenantId: data.tenantId,
              externalId: data.driverExternalId
            }
          });
        } else if (data.driverCpf) {
          // Estratégia: CPF (Padrão e Fallback)
          const cleanCpf = this.cleanString(data.driverCpf);
          driver = await tx.driver.findFirst({
            where: {
              tenantId: data.tenantId,
              OR: [{ cpf: cleanCpf }, { cpf: data.driverCpf }]
            }
          });
        }

        if (!driver) {
          const field = strategy === 'PHONE' ? 'Telefone' : strategy === 'EXTERNAL_ID' ? 'Matrícula' : 'CPF';
          const value = strategy === 'PHONE' ? data.driverPhone : strategy === 'EXTERNAL_ID' ? data.driverExternalId : data.driverCpf;

          throw new NotFoundException(
            `Motorista não encontrado! Estratégia: ${field} (${value || 'Não informado'}). Verifique o cadastro ou a configuração da empresa.`
          );
        }
        finalDriverId = driver.id;

      } else {
        // Se veio ID direto, valida se existe
        const exists = await tx.driver.findUnique({ where: { id: finalDriverId } });
        if (!exists) throw new NotFoundException(`Motorista ID ${finalDriverId} inválido.`);
      }

      // 2. Validação do Veículo (Obrigatório existir)
      let finalVehicleId = data.vehicleId;

      if (!finalVehicleId && data.vehiclePlate) {
        const cleanPlate = this.cleanString(data.vehiclePlate).toUpperCase();
        const vehicle = await tx.vehicle.findFirst({
          where: {
            tenantId: data.tenantId,
            OR: [{ plate: cleanPlate }, { plate: data.vehiclePlate }]
          }
        });

        if (!vehicle) {
          throw new NotFoundException(`Veículo não encontrado! Placa: ${data.vehiclePlate}. Cadastre-o antes de importar.`);
        }
        finalVehicleId = vehicle.id;
      }

      // 3. Validação dos Clientes (Todos devem existir) - OTIMIZADO (BATCH)
      const deliveriesToCreate = [];
      const missingCustomers = [];

      // Coletar todos os CNPJs e Nomes para buscar de uma vez
      const originalCnpjs = data.deliveries.map(d => d.customerCnpj).filter(Boolean);
      const rawCnpjs = data.deliveries.map(d => d.customerCnpj ? this.cleanString(d.customerCnpj) : null).filter(Boolean);
      const formattedCnpjs = rawCnpjs.map(c => this.formatCNPJ(c));
      const names = data.deliveries.map(d => d.customerName).filter(Boolean);

      // Busca em lote (CNPJ Limpo OU Formatado OU Original)
      const existingCustomers = await tx.customer.findMany({
        where: {
          tenantId: data.tenantId,
          OR: [
            { cnpj: { in: rawCnpjs } },
            { cnpj: { in: formattedCnpjs } },
            { cnpj: { in: originalCnpjs } },
            { tradeName: { in: names, mode: 'insensitive' } },
            { legalName: { in: names, mode: 'insensitive' } }
          ]
        }
      });

      // Criar Mapas para busca rápida em memória
      const customerByCnpj = new Map();
      const customerByName = new Map();

      existingCustomers.forEach((c: any) => {
        if (c.cnpj) {
          // Indexa por todas as variações possíveis para garantir o match
          customerByCnpj.set(c.cnpj, c); // Raw DB
          customerByCnpj.set(this.cleanString(c.cnpj), c); // Clean DB
          customerByCnpj.set(this.formatCNPJ(c.cnpj), c); // Formatted DB
        }
        if (c.tradeName) customerByName.set(c.tradeName.toUpperCase(), c);
        if (c.legalName) customerByName.set(c.legalName.toUpperCase(), c);
      });

      for (const del of data.deliveries) {
        let customer = null;

        // Tenta achar por CNPJ no Map (várias tentativas)
        if (del.customerCnpj) {
          // 1. Tenta exato como veio
          customer = customerByCnpj.get(del.customerCnpj);

          // 2. Tenta limpo
          if (!customer) {
            customer = customerByCnpj.get(this.cleanString(del.customerCnpj));
          }

          // 3. Tenta formatado
          if (!customer) {
            customer = customerByCnpj.get(this.formatCNPJ(del.customerCnpj));
          }
        }

        // Se não achou por CNPJ, tenta por Nome no Map
        if (!customer && del.customerName) {
          customer = customerByName.get(del.customerName.toUpperCase());
        }

        if (!customer) {
          missingCustomers.push(`${del.customerName} (${del.customerCnpj || 'S/CNPJ'})`);
        } else {
          // Prepara o objeto para criar depois (apenas se todos passarem)
          deliveriesToCreate.push({
            invoiceNumber: del.invoiceNumber,
            volume: Number(del.volume),
            weight: Number(del.weight),
            value: del.value ? Number(del.value) : 0,
            product: del.product,
            salesperson: del.salesperson,
            priority: del.priority,
            status: 'PENDING',
            customerId: customer.id,
            driverId: finalDriverId // Vincula o motorista da entrega ao da rota
          });
        }
      }

      // SE HOUVER CLIENTES FALTANDO -> ABORTA TUDO
      if (missingCustomers.length > 0) {
        const list = missingCustomers.slice(0, 5).join(', ');
        const more = missingCustomers.length > 5 ? `... e mais ${missingCustomers.length - 5}` : '';
        throw new BadRequestException(
          `Importação cancelada! Clientes não cadastrados encontrados: ${list}${more}. Cadastre-os primeiro.`
        );
      }

      // 4. Criar Rota (Tudo validado)
      const route = await tx.route.create({
        data: {
          tenant: { connect: { id: data.tenantId } },
          name: data.name,
          date: this.fixDate(data.date),
          driver: finalDriverId ? { connect: { id: finalDriverId } } : undefined,
          vehicle: finalVehicleId ? { connect: { id: finalVehicleId } } : undefined,
          status: 'PLANNED'
        }
      });

      // 5. Criar Entregas (Bulk Insert se possível, ou loop)
      // Otimização: createMany não suporta relations em alguns casos, mas aqui estamos conectando.
      // Vamos manter o loop mas agora é só INSERT, sem SELECTs no meio.
      for (const delData of deliveriesToCreate) {
        const { customerId, driverId, ...restOfDelivery } = delData;

        await tx.delivery.create({
          data: {
            ...restOfDelivery,
            route: { connect: { id: route.id } },
            customer: { connect: { id: customerId } },
            driver: driverId ? { connect: { id: driverId } } : undefined
          }
        });
      }

      // Notificar motorista
      if (finalDriverId) {
        const driver = await tx.driver.findUnique({ where: { id: finalDriverId } });
        if (driver && driver.phone) {
          const msg = `👋 Olá ${driver.name}! Nova rota "${route.name}" definida para você com ${deliveriesToCreate.length} entregas.`;
          this.whatsapp.sendText(driver.phone, msg).catch(e => this.logger.error("Erro WhatsApp", e));
        }
      }

      this.logger.log(`✅ Importação estrita concluída: Rota ${route.id}`);
      return route;
    }, {
      maxWait: 5000,
      timeout: 20000
    });
  }

  async updateDeliveryStatus(id: string, dto: UpdateDeliveryStatusDto) {
    const data: any = {
      status: dto.status,
      proofOfDelivery: dto.proofUrl,
      failureReason: dto.failureReason,
      updatedAt: new Date()
    };

    if (dto.arrivedAt) data.arrivedAt = new Date(dto.arrivedAt);
    if (dto.unloadingStartedAt) data.unloadingStartedAt = new Date(dto.unloadingStartedAt);
    if (dto.unloadingEndedAt) data.unloadingEndedAt = new Date(dto.unloadingEndedAt);

    return (this.prisma as any).delivery.update({
      where: { id },
      data
    });
  }
}