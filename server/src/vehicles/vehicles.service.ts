import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  // Função auxiliar para limpar datas
  private sanitizeDate(date: any): Date | null {
    if (!date || date === '') return null;
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
  }

  async findAll(tenantId: string) {
    if (!tenantId) return [];
    return (this.prisma as any).vehicle.findMany({
      where: { tenantId },
      orderBy: { plate: 'asc' }
    });
  }

  // Criação Individual (Corrigida)
  async create(data: any) {
    const { tenantId, ...rest } = data;

    // Sanitiza os dados antes de criar
    const vehicleData = {
        ...rest,
        lastMaintenance: this.sanitizeDate(rest.lastMaintenance),
        nextMaintenance: this.sanitizeDate(rest.nextMaintenance),
        // Garante valores numéricos
        year: rest.year ? Number(rest.year) : new Date().getFullYear(),
        capacityWeight: rest.capacityWeight ? Number(rest.capacityWeight) : 0,
        capacityVolume: rest.capacityVolume ? Number(rest.capacityVolume) : 0,
        status: rest.status || 'AVAILABLE',
        tenant: { connect: { id: tenantId } }
    };

    return (this.prisma as any).vehicle.create({
      data: vehicleData
    });
  }

  // Edição (Corrigida)
  async update(id: string, data: any) {
    const { id: _id, tenantId, tenant, drivers, routes, ...cleanData } = data;

    // Sanitiza datas se estiverem presentes no payload
    if ('lastMaintenance' in cleanData) cleanData.lastMaintenance = this.sanitizeDate(cleanData.lastMaintenance);
    if ('nextMaintenance' in cleanData) cleanData.nextMaintenance = this.sanitizeDate(cleanData.nextMaintenance);
    
    // Sanitiza números
    if (cleanData.year) cleanData.year = Number(cleanData.year);
    if (cleanData.capacityWeight) cleanData.capacityWeight = Number(cleanData.capacityWeight);
    if (cleanData.capacityVolume) cleanData.capacityVolume = Number(cleanData.capacityVolume);

    return (this.prisma as any).vehicle.update({
      where: { id },
      data: cleanData,
    });
  }

  // Importação Massiva
  async importMassive(tenantId: string, vehicles: any[]) {
    const results = [];
    
    for (const v of vehicles) {
      if (!v.plate) continue;

      const cleanPlate = v.plate.toUpperCase().trim();

      const existingVehicle = await (this.prisma as any).vehicle.findFirst({
        where: { 
            plate: cleanPlate,
            tenantId: tenantId 
        }
      });

      const vehicleData = {
          plate: cleanPlate,
          model: v.model,
          brand: v.brand,
          year: v.year ? parseInt(v.year) : new Date().getFullYear(),
          capacityWeight: v.capacityWeight ? parseFloat(v.capacityWeight) : 0,
          capacityVolume: v.capacityVolume ? parseFloat(v.capacityVolume) : 0,
          fuelType: v.fuelType || 'DIESEL',
          lastMaintenance: this.sanitizeDate(v.lastMaintenance),
          nextMaintenance: this.sanitizeDate(v.nextMaintenance)
      };

      if (existingVehicle) {
        const updated = await (this.prisma as any).vehicle.update({
          where: { id: existingVehicle.id },
          data: vehicleData
        });
        results.push(updated);
      } else {
        const created = await (this.prisma as any).vehicle.create({
          data: {
              ...vehicleData,
              status: 'AVAILABLE',
              tenant: { connect: { id: tenantId } }
          }
        });
        results.push(created);
      }
    }
    return results;
  }
}