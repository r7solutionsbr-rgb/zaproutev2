import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Logger } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ZApiAuthGuard } from '../common/guards/zapi-auth.guard';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) { }

  @Post('zapi')
  @UseGuards(ZApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleZapi(@Body() body: any) {
    // Z-API já envia no formato que o service espera, mas vamos garantir
    // O service já tem lógica para extrair do Z-API (payload.phone, payload.text.message, etc)
    return this.webhookService.processMessage(body);
  }

  // Alias para manter compatibilidade temporária se necessário, ou remover.
  // O usuário pediu para separar, então vamos manter o antigo redirecionando ou duplicando a lógica
  @Post('whatsapp')
  @UseGuards(ZApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleLegacy(@Body() body: any) {
    return this.webhookService.processMessage(body);
  }

  @Post('sendpulse')
  @HttpCode(HttpStatus.OK)
  async handleSendpulse(@Body() body: any) {
    this.logger.log('🪝 RAW WEBHOOK SENDPULSE: ' + JSON.stringify(body));

    // SendPulse envia um array de eventos
    if (Array.isArray(body)) {
      for (const event of body) {
        await this.webhookService.processSendPulseMessage(event);
      }
      return { status: 'OK' };
    }

    // Fallback se não for array (embora a doc diga que é)
    await this.webhookService.processSendPulseMessage(body);
    return { status: 'OK' };
  }
}