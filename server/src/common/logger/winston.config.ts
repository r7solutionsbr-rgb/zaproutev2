import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const winstonConfig = {
  transports: [
    // 1. Console Transport (Desenvolvimento - Colorido e Legível)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, context, stack }) => {
            return `[ZapRoute] ${timestamp} ${level}: [${context || 'App'}] ${message} ${stack || ''}`;
          },
        ),
      ),
    }),
    // 2. File Transport (Produção - Rotação Diária e JSON)
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    // 3. Error File Transport (Apenas Erros Críticos)
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
};
