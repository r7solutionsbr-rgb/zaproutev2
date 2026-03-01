import { IsEmail, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  tradeName: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  communicationPreference?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @IsOptional()
  @IsObject()
  addressDetails?: Record<string, any>;

  @IsOptional()
  @IsObject()
  location?: Record<string, any>;

  @IsOptional()
  @IsString()
  salesperson?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsOptional()
  @IsString()
  stateRegistration?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsString()
  communicationPreference?: string;

  @IsOptional()
  @IsString()
  segment?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @IsOptional()
  @IsObject()
  addressDetails?: Record<string, any>;

  @IsOptional()
  @IsObject()
  location?: Record<string, any>;

  @IsOptional()
  @IsString()
  salesperson?: string;

  @IsOptional()
  @IsString()
  sellerId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}
