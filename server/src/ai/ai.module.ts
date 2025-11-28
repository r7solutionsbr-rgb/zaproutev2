import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

@Module({
  providers: [AiService],
  exports: [AiService], // <--- Exporta para outros módulos poderem usar
})
export class AiModule {}