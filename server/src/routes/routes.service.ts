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
  ) {}

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

  private cleanString(str: string): string {
    if (!str) return '';
    return str.replace(/[^a-zA-Z0-9]/g, '');
  }

  async findAll(tenantId: string) {
    if (!tenantId) return [];
    return (this.prisma as any).route.findMany({
      where: { tenantId },
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

  // --- IMPORTAÇÃO ESTRITA (APENAS VINCULA) ---
  async importRoute(data: CreateRouteDto) {
    this.logger.log(`🔒 Iniciando importação estrita: ${data.name}`);

    return (this.prisma as any).$transaction(async (tx: any) => {
      
      // 1. Validação do Motorista (Obrigatório existir)
      let finalDriverId = data.driverId;
      
      if (!finalDriverId && data.driverCpf) {
        const cleanCpf = this.cleanString(data.driverCpf);
        const driver = await tx.driver.findFirst({
            where: { 
              tenantId: data.tenantId, 
              OR: [{ cpf: cleanCpf }, { cpf: data.driverCpf }] 
            }
        });
        
        if (!driver) {
            throw new NotFoundException(`Motorista não encontrado! CPF: ${data.driverCpf}. Cadastre-o antes de importar.`);
        }
        finalDriverId = driver.id;
      } else if (finalDriverId) {
         // Se veio ID, valida se existe
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

      // 3. Validação dos Clientes (Todos devem existir)
      const deliveriesToCreate = [];
      const missingCustomers = [];

      for (const del of data.deliveries) {
        let customer = null;
        
        // Tenta achar por CNPJ
        if (del.customerCnpj) {
            const cleanCnpj = this.cleanString(del.customerCnpj);
            customer = await tx.customer.findFirst({
                where: { 
                    tenantId: data.tenantId,
                    OR: [{ cnpj: del.customerCnpj }, { cnpj: cleanCnpj }]
                }
            });
        }

        // Se não achou por CNPJ, tenta por Nome (Razão ou Fantasia)
        if (!customer) {
            customer = await tx.customer.findFirst({
                where: { 
                    tenantId: data.tenantId, 
                    OR: [
                        { tradeName: { equals: del.customerName, mode: 'insensitive' } }, 
                        { legalName: { equals: del.customerName, mode: 'insensitive' } }
                    ] 
                }
            });
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
      for (const delData of deliveriesToCreate) {
          // Extraímos os IDs para não enviar duplicado no 'data'
          const { customerId, driverId, ...restOfDelivery } = delData;

          await tx.delivery.create({
              data: {
                  ...restOfDelivery, // Espalha apenas: invoiceNumber, volume, weight, status, etc.
                  
                  // Faz as conexões usando os IDs extraídos
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
    return (this.prisma as any).delivery.update({
      where: { id },
      data: {
        status: dto.status,
        proofOfDelivery: dto.proofUrl,
        failureReason: dto.failureReason,
        updatedAt: new Date()
      }
    });
  }
}