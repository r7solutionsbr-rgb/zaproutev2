import { NestFactory, HttpAdapterHost } from '@nestjs/core'; // Import HttpAdapterHost
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AllExceptionsFilter } from './common/filters/http-exception.filter'; // Import Filter

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // 1. AUMENTAR O LIMITE DE UPLOAD (Para aceitar Excels grandes)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // 2. Configurações Básicas
  app.enableCors({
    origin: '*', // Em produção, idealmente seria [process.env.FRONTEND_URL], mas * resolve agora
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization, x-admin-key',
  });
  app.useGlobalPipes(new ValidationPipe());

  // 3. Filtro Global de Exceções
  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  // Diagnóstico de Rotas
  const server = app.getHttpAdapter();
  const router = server.getInstance();

  logger.log(`🚀 Servidor rodando em: http://localhost:${port}/${globalPrefix}`);

  // --- DEBUG DEPLOY ---
  const fs = require('fs');
  const path = require('path');
  const staticPath = path.join(process.cwd(), 'dist', 'client');
  logger.log(`📂 Verificando arquivos estáticos em: ${staticPath}`);
  if (fs.existsSync(staticPath)) {
    logger.log(`✅ Pasta encontrada! Conteúdo: ${fs.readdirSync(staticPath).join(', ')}`);
  } else {
    logger.error(`❌ Pasta NÃO encontrada! O Frontend não foi copiado corretamente.`);
    logger.log(`Conteúdo de dist: ${fs.readdirSync(path.join(process.cwd(), 'dist')).join(', ')}`);
  }
  // --------------------

  if (router._router && router._router.stack) {
    // logger.log('👇 LISTA DE ROTAS REGISTRADAS 👇'); // Comentei para não poluir o log com 1200 linhas se fosse verbose
    // ... (código de log opcional mantido ou removido, o importante é o limite acima)
  }
}
bootstrap();