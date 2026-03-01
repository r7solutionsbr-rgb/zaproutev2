import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  cnpj?: string;

  @IsString()
  @IsOptional()
  plan?: string;

  @IsString()
  adminName: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(6)
  adminPassword: string;
}

export class UpdateTenantStatusDto {
  @IsString()
  status: string;
}

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;
}