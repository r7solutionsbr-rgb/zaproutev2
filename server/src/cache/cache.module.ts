import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');

        // Se não tem Redis configurado, usa cache em memória
        if (!redisUrl) {
          return {
            ttl: 300000, // 5 minutos em ms
            max: 100, // máximo 100 items em memória
          };
        }

        // Produção: Redis
        const { redisStore } = await import('cache-manager-redis-yet');
        return {
          store: redisStore,
          url: redisUrl,
          ttl: 300000, // 5 minutos
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
