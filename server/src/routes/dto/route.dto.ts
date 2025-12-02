import { IsString, IsArray, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateRouteDto {
  @IsString()
  tenantId: string;

  @IsString()
  name: string;

  @IsString()
  date: string;

  @IsString()
  @IsOptional()
  driverId?: string;

  @IsString()
  @IsOptional()
  driverCpf?: string;

  @IsString()
  @IsOptional()
  driverPhone?: string; // <--- NOVO

  @IsString()
  @IsOptional()
  driverExternalId?: string; // <--- NOVO

  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @IsString()
  @IsOptional()
  vehicleId?: string;

  @IsArray()
  deliveries: CreateDeliveryDto[];
}

export class CreateDeliveryDto {
  @IsString()
  invoiceNumber: string;

  @IsString()
  customerName: string;

  @IsString()
  @IsOptional()
  customerCnpj?: string;

  @IsString()
  customerAddress: string;

  @IsNumber()
  volume: number;

  @IsNumber()
  weight: number;

  @IsString()
  priority: 'NORMAL' | 'HIGH' | 'URGENT';

  @IsNumber()
  @IsOptional()
  value?: number;

  // --- NOVOS CAMPOS ---
  @IsString()
  @IsOptional()
  product?: string;

  @IsString()
  @IsOptional()
  salesperson?: string;
}

export class UpdateDeliveryStatusDto {
  @IsEnum(['PENDING', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'RETURNED'])
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'RETURNED';

  @IsString()
  @IsOptional()
  proofUrl?: string;

  @IsString()
  @IsOptional()
  failureReason?: string;

  @IsNumber()
  @IsOptional()
  locationLat?: number;

  @IsNumber()
  @IsOptional()
  locationLng?: number;

  // --- NOVOS CAMPOS DE AUDITORIA ---
  @IsString()
  @IsOptional()
  arrivedAt?: string;

  @IsString()
  @IsOptional()
  unloadingStartedAt?: string;

  @IsString()
  @IsOptional()
  unloadingEndedAt?: string;
}