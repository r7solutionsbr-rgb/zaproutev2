import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';

import { WinstonLoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      integrations: [nodeProfilingIntegration()],
      // Performance Monitoring
      tracesSampleRate: 1.0, //  Capture 100% of the transactions
      // Set sampling rate for profiling - this is relative to tracesSampleRate
      profilesSampleRate: 1.0,
      environment: process.env.NODE_ENV || 'development',
    });
  }

  const logger = new WinstonLoggerService();
  logger.setContext('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: logger,
  });

  // Hide framework signature
  const appInstance = app.getHttpAdapter().getInstance();
  if (appInstance?.disable) {
    appInstance.disable('x-powered-by');
  }

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // 1. AUMENTAR O LIMITE DE UPLOAD (Para aceitar Excels grandes)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 1.1 COMPRESSÃO HTTP (gzip/br)
  app.use(compression());

  // 2. SECURITY HEADERS (Helmet.js)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 ano
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // 3. CSRF PROTECTION - DESABILITADO TEMPORARIAMENTE PARA DEBUG
  app.use(cookieParser());
  // app.use(csurf({
  //   cookie: {
  //     httpOnly: true,
  //     secure: process.env.NODE_ENV === 'production',
  //     sameSite: 'strict',
  //   }
  // }));

  // 4. Configurações Básicas
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  const corsOrigin = process.env.CORS_ORIGIN || allowedOrigins || '*';
  const parsedOrigins =
    corsOrigin === '*'
      ? '*'
      : corsOrigin.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: parsedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders:
      'Content-Type, Accept, Authorization, x-admin-key, x-csrf-token',
    credentials: true, // Necessário para CSRF cookies
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 5. Filtro Global de Exceções
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  // --- SWAGGER CONFIG ---
  const config = new DocumentBuilder()
    .setTitle('ZapRoute API')
    .setDescription('API de gestão de rotas e entregas')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  // ----------------------

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  // Diagnóstico de Rotas
  const server = app.getHttpAdapter();
  const router = server.getInstance();

  logger.log(
    `🚀 Servidor rodando em: http://localhost:${port}/${globalPrefix}`,
  );

  // --- DEBUG DEPLOY (Manter para verificar arquivos no Railway) ---
  const fs = require('fs');
  const path = require('path');
  const staticPath = path.join(process.cwd(), 'dist', 'client');
  if (!fs.existsSync(staticPath)) {
    logger.warn(
      `⚠️ Frontend não encontrado em: ${staticPath} (Normal em Localhost)`,
    );
  }
  // ---------------------------------------------------------------

  if (router._router && router._router.stack) {
    logger.log('👇 LISTA DE ROTAS REGISTRADAS 👇');
    router._router.stack
      .filter((layer: any) => layer.route)
      .map((layer: any) => ({
        path: layer.route.path,
        method: Object.keys(layer.route.methods)[0].toUpperCase(),
      }))
      .forEach((route: any) =>
        logger.log(`📍 [${route.method}] ${globalPrefix}${route.path}`),
      );
  }
}
bootstrap();
