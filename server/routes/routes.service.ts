import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateRouteDto, UpdateDeliveryStatusDto } from './dto/route.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { toStorageFormatPhone } from '../shared/storage-format.util';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService
  ) {}

  private fixDate(dateInput: string | Date): Date {
    const d = new Date(dateInput);
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

  // --- IMPORTAÇÃO OTIMIZADA (SEM GEOCODING) ---
  async importRoute(data: CreateRouteDto) {
    this.logger.log(`🚀 IMPORTAÇÃO RÁPIDA: ${data.name} com ${data.deliveries.length} entregas`);
    
    const cleanedDriverCpf = data.driverCpf ? this.cleanString(data.driverCpf) : null;
    const cleanedVehiclePlate = data.vehiclePlate ? this.cleanString(data.vehiclePlate).toUpperCase() : null;
    
    try {
      // Aumentamos o timeout para 20s para garantir que lotes grandes de INSERT passem
      // mas removemos toda lógica externa que causava lentidão
      const result = await (this.prisma as any).$transaction(async (tx: any) => {
        
        // 1. Validar Motorista
        let finalDriverId: string | null = null;
        if (cleanedDriverCpf) {
           const driver = await tx.driver.findFirst({
             where: { tenantId: data.tenantId, cpf: cleanedDriverCpf }
           });
           if (driver) finalDriverId = driver.id;
        }

        // 2. Validar Veículo
        let finalVehicleId: string | null = null;
        if (cleanedVehiclePlate) {
           const vehicle = await tx.vehicle.findFirst({
             where: { tenantId: data.tenantId, plate: cleanedVehiclePlate }
           });
           if (vehicle) finalVehicleId = vehicle.id;
        }

        // 3. Criar a Rota
        const routeData: any = {
          tenantId: data.tenantId,
          name: data.name,
          date: this.fixDate(data.date),
          status: 'PLANNED'
        };
        
        if (finalDriverId) routeData.driverId = finalDriverId;
        if (finalVehicleId) routeData.vehicleId = finalVehicleId;
        
        const route = await tx.route.create({ data: routeData });

        // 4. Processar Entregas (Apenas Banco de Dados)
        for (const del of data.deliveries) {
          let customer = null;
          
          // Tenta achar cliente existente
          if (del.customerCnpj) {
              const cleanCnpj = this.cleanString(del.customerCnpj);
              customer = await tx.customer.findFirst({
                  where: { 
                      tenantId: data.tenantId,
                      OR: [{ cnpj: del.customerCnpj }, { cnpj: cleanCnpj }]
                  }
              });
          }
          if (!customer) {
              customer = await tx.customer.findFirst({
                  where: { tenantId: data.tenantId, OR: [{ tradeName: del.customerName }, { legalName: del.customerName }] }
              });
          }

          const rawAddress = del.customerAddress || '';

          if (customer) {
              // ATUALIZAÇÃO: Apenas salvamos o texto do endereço se ele veio novo
              // Não tentamos descobrir lat/lng aqui
              if (rawAddress.length > 3) {
                  await tx.customer.update({
                      where: { id: customer.id },
                      data: { 
                          // Salvamos o endereço na estrutura JSON apenas como texto
                          addressDetails: { street: rawAddress, source: 'excel_import' },
                          // location: mantemos o que estava (não zeramos lat/lng)
                          updatedAt: new Date()
                      }
                  });
              }
          } else {
              // CRIAÇÃO: Criamos o cliente apenas com os dados de texto
              const cleanCnpj = del.customerCnpj ? this.cleanString(del.customerCnpj) : '00000000000000';
              customer = await tx.customer.create({
                  data: {
                      legalName: del.customerName, 
                      tradeName: del.customerName,
                      cnpj: cleanCnpj,
                      email: 'pendente@email.com', 
                      phone: '0000000000', 
                      status: 'ACTIVE',
                      tenantId: data.tenantId,
                      // Apenas texto, sem coordenadas
                      addressDetails: { street: rawAddress, source: 'excel_import' },
                      location: { lat: 0, lng: 0, address: rawAddress } 
                  }
              });
          }

          // Criar a Entrega
          const deliveryData: any = {
              invoiceNumber: del.invoiceNumber,
              volume: Number(del.volume), 
              weight: Number(del.weight), 
              value: del.value ? Number(del.value) : 0,
              priority: del.priority, 
              status: 'PENDING',
              routeId: route.id,
              customerId: customer.id,
              driverId: finalDriverId // Vincula o motorista da rota à entrega também
          };

          await tx.delivery.create({ data: deliveryData });
        }

        return route;
      }, { 
        maxWait: 5000, // Tempo esperando conexão do banco
        timeout: 20000 // 20s para processar o lote todo (apenas inserts, deve ser suficiente)
      });
      
      this.logger.log(`✅ Importação concluída com sucesso: Rota ${result.id}`);
      return result;

    } catch (error: any) {
      this.logger.error(`❌ Erro Crítico na Importação: ${error.message}`, error.stack);
      throw error;
    }
  }

  async notifyDriver(driverId: string | null, routeName: string, deliveryCount: number): Promise<void> {
    if (!driverId) return;
    try {
      const driver = await (this.prisma as any).driver.findUnique({ where: { id: driverId } });
      if (!driver?.phone) return;
      const msg = `👋 Olá ${driver.name}! Nova rota "${routeName}" criada com ${deliveryCount} entregas.`;
      this.whatsapp.sendText(driver.phone, msg).catch(e => this.logger.error("Erro WhatsApp", e));
    } catch (error) {
      this.logger.error(`Erro ao notificar motorista: ${error.message}`);
    }
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