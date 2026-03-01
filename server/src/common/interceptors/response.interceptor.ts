import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = _context.switchToHttp();
    const request = http.getRequest();
    const url: string = request?.url || '';

    if (url.startsWith('/api/webhook') || url.startsWith('/api/whatsapp')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          (Object.prototype.hasOwnProperty.call(data, 'data') ||
            Object.prototype.hasOwnProperty.call(data, 'statusCode'))
        ) {
          return data;
        }

        return { data };
      }),
    );
  }
}
