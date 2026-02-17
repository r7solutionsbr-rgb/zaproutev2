import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';
import { PrismaService } from '../prisma.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [TerminusModule, CacheModule],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, PrismaService],
})
export class HealthModule {}
