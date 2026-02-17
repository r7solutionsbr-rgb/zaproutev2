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

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @ApiOperation({ summary: 'Receber webhook Z-API (WhatsApp)' })
  @Post('zapi')
  @UseGuards(ZApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleZapi(@Body() body: any) {
    return this.webhookService.processMessage(body);
  }

  @ApiExcludeEndpoint()
  @Post('whatsapp')
  @UseGuards(ZApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async handleLegacy(@Body() body: any) {
    return this.webhookService.processMessage(body);
  }

  @ApiOperation({ summary: 'Receber webhook SendPulse' })
  @Post('sendpulse')
  @HttpCode(HttpStatus.OK)
  async handleSendpulse(@Body() body: any) {
    this.logger.log('🪝 RAW WEBHOOK SENDPULSE: ' + JSON.stringify(body));

    if (Array.isArray(body)) {
      for (const event of body) {
        await this.webhookService.processSendPulseMessage(event);
      }
      return { status: 'OK' };
    }

    await this.webhookService.processSendPulseMessage(body);
    return { status: 'OK' };
  }
}
