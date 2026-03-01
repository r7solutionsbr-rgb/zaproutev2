import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateVehicleDto } from './vehicle.dto';

export class ImportVehiclesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVehicleDto)
  vehicles: CreateVehicleDto[];
}