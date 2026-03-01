import { IsOptional, IsString } from 'class-validator';

export class CreateCarrierDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateCarrierDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
