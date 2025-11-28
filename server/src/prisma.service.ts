import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // REMOVIDO: await this.$connect(); 
    // Deixamos o Prisma conectar lazy (sob demanda) na primeira query.
    // Isso garante que o servidor suba e escute a porta 8080 instantaneamente.
    console.log('✅ Serviço do Prisma inicializado (Conexão Lazy)');
  }

  async onModuleDestroy() {
    await (this as any).$disconnect();
  }
}
