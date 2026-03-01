import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import * as Sentry from '@sentry/node';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;
    const rawMessage =
      (exceptionResponse as any)?.message ||
      exceptionResponse ||
      'Internal Server Error';

    const message = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : JSON.stringify(rawMessage);

    const code =
      (exceptionResponse as any)?.code ||
      (exceptionResponse as any)?.errorCode ||
      (exception instanceof HttpException ? exception.name : 'INTERNAL_ERROR');

    const responseBody = {
      error: {
        code,
        message,
      },
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
    };

    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Critical Error: ${message}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
        'AllExceptionsFilter',
      );
      // Captura no Sentry apenas erros 500 (Críticos)
      Sentry.captureException(exception);
    } else {
      this.logger.warn(`Http Exception: ${message}`, 'AllExceptionsFilter');
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
