import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Module({
  providers: [WhatsappService],
  exports: [WhatsappService], // <--- CRUCIAL: Permite que outros módulos usem este serviço
})
export class WhatsappModule {}