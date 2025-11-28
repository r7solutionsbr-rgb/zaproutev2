import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma.service'; // <--- Importar

@Module({
  providers: [AiService, PrismaService], // <--- Adicionar PrismaService aqui
  exports: [AiService]
})
export class AiModule {}