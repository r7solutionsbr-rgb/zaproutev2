import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma.service';
import { AiModule } from '../ai/ai.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module'; // <--- Importar o arquivo

@Module({
  imports: [
    AiModule, 
    WhatsappModule // <--- CRUCIAL: Adicionar aqui para ter acesso ao WhatsappService
  ],
  controllers: [WebhookController],
  providers: [WebhookService, PrismaService],
})
export class WebhookModule {}