import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  plate: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsNumber()
  capacityWeight?: number;

  @IsOptional()
  @IsNumber()
  capacityVolume?: number;

  @IsOptional()
  @IsString()
  lastMaintenance?: string;

  @IsOptional()
  @IsString()
  nextMaintenance?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsNumber()
  mileage?: number;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsNumber()
  capacityWeight?: number;

  @IsOptional()
  @IsNumber()
  capacityVolume?: number;

  @IsOptional()
  @IsString()
  lastMaintenance?: string;

  @IsOptional()
  @IsString()
  nextMaintenance?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsNumber()
  mileage?: number;
}
