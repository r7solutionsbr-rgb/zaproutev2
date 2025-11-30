import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaService } from '../prisma.service'; // <--- Importar

@Module({
  controllers: [AiController],
  providers: [AiService, PrismaService], // <--- Adicionar PrismaService aqui
  exports: [AiService]
})
export class AiModule { }