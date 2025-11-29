import { Module } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { SellersController } from './sellers.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SellersController],
  providers: [SellersService, PrismaService],
  exports: [SellersService], // Exportamos para poder usar na importação de clientes futuramente
})
export class SellersModule {}