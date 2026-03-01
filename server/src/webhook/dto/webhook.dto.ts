import { IsArray, IsObject, IsOptional } from 'class-validator';

export class ZapiWebhookDto {
  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsObject()
  meta?: Record<string, any>;
}

export class LegacyWhatsappWebhookDto {
  @IsObject()
  payload: Record<string, any>;
}

export class SendpulseWebhookDto {
  @IsOptional()
  @IsObject()
  event?: Record<string, any>;

  @IsOptional()
  @IsArray()
  events?: Record<string, any>[];
}