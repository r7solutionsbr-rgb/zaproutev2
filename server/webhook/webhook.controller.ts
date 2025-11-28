import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { WebhookService } from './webhook.service';

// Nota: Webhooks geralmente não enviam Token JWT. 
// Por isso NÃO usamos o @UseGuards(JwtAuthGuard) aqui.
// Futuramente, podemos validar um Token de API na URL ou Header.

@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('whatsapp')
  @HttpCode(HttpStatus.OK) // Retorna 200 OK para a API de WhatsApp não ficar reenviando
  async handleWhatsapp(@Body() body: any) {
    return this.webhookService.processMessage(body);
  }
}