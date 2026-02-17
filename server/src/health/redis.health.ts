import { Injectable, Inject } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Tenta um set/get simples para validar a conexão com o Redis
      await this.cacheManager.set('health-check', 'ok', 1000);
      const val = await this.cacheManager.get('health-check');

      if (val === 'ok') {
        return this.getStatus(key, true);
      }
      throw new Error('Redis get value mismatch');
    } catch (e) {
      throw new HealthCheckError(
        'Redis check failed',
        this.getStatus(key, false, { message: e.message }),
      );
    }
  }
}
