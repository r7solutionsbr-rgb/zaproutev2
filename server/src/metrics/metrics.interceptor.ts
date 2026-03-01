import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const start = Date.now();
    const method = (request.method || 'UNKNOWN').toUpperCase();
    const routePath = request.route?.path
      ? `${request.baseUrl || ''}${request.route.path}`
      : (request.originalUrl || request.url || 'unknown').split('?')[0];

    return next.handle().pipe(
      finalize(() => {
        const statusCode = response?.statusCode || 500;
        const duration = Date.now() - start;
        this.metricsService.observeHttpRequest(
          method,
          routePath,
          statusCode,
          duration,
        );
      }),
    );
  }
}
