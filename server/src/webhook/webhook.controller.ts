import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ZApiAuthGuard } from '../common/guards/zapi-auth.guard';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) { }

  @Post('whatsapp')
  @UseGuards(ZApiAuthGuard)
  @HttpCode(HttpStatus.OK) // Retorna 200 OK para a API de WhatsApp não ficar reenviando
  async handleWhatsapp(@Body() body: any) {
    return this.webhookService.processMessage(body);
  }
}