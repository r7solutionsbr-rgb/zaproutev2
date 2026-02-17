import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { winstonConfig } from './winston.config';

@Injectable({ scope: Scope.TRANSIENT })
export class WinstonLoggerService implements LoggerService {
  private readonly logger: winston.Logger;
  private context?: string;

  constructor() {
    this.logger = winston.createLogger(winstonConfig);
  }

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: any, stack?: string, context?: string) {
    this.logger.error(message, { stack, context: context || this.context });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context: context || this.context });
  }
}
