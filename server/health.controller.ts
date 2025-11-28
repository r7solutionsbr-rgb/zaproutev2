import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('db')
  async checkDb() {
    try {
      await (this.prisma as any).$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch (e) {
      return { status: 'error', message: e.message };
    }
  }
}
