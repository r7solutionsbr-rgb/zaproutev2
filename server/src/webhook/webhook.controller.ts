import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { ZApiAuthGuard } from '../common/guards/zapi-auth.guard';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import {
  LegacyWhatsappWebhookDto,
  SendpulseWebhookDto,
  ZapiWebhookDto,
} from './dto/webhook.dto';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @ApiOperation({ summary: 'Receber webhook Z-API (WhatsApp)' })
  @Post('zapi')
  @UseGuards(ZApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleZapi(@Body() body: ZapiWebhookDto | Record<string, any>) {
    return this.webhookService.processMessage(
      'payload' in body ? body.payload : body,
    );
  }

  @ApiExcludeEndpoint()
  @Post('whatsapp')
  @UseGuards(ZApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleLegacy(
    @Body() body: LegacyWhatsappWebhookDto | Record<string, any>,
  ) {
    return this.webhookService.processMessage(
      'payload' in body ? body.payload : body,
    );
  }

  @ApiOperation({ summary: 'Receber webhook SendPulse' })
  @Post('sendpulse')
  @HttpCode(HttpStatus.OK)
  async handleSendpulse(@Body() body: SendpulseWebhookDto | any) {
    this.logger.log('🪝 RAW WEBHOOK SENDPULSE: ' + JSON.stringify(body));

    const events = Array.isArray(body)
      ? body
      : body?.events
        ? body.events
        : body?.event
          ? [body.event]
          : null;

    if (events) {
      for (const event of events) {
        await this.webhookService.processSendPulseMessage(event);
      }
      return { status: 'OK' };
    }

    await this.webhookService.processSendPulseMessage(body);
    return { status: 'OK' };
  }
}
