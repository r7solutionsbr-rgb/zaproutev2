import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma.service';
import { AiModule } from '../ai/ai.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { NormalizationService } from './services/normalization.service';
import { DriverIdentificationService } from './services/driver-identification.service';
import { RouteCommandService } from './services/route-command.service';
import { MessageResponder } from './services/message-responder.service';

@Module({
  imports: [
    AiModule,
    WhatsappModule
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    PrismaService,
    NormalizationService,
    DriverIdentificationService,
    RouteCommandService,
    MessageResponder
  ],
})
export class WebhookModule { }