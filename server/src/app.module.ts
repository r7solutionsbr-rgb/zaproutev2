import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaService } from './prisma.service';

// --- MÓDULOS (Funcionalidades Isoladas) ---
import { AuthModule } from './auth/auth.module';
import { WebhookModule } from './webhook/webhook.module';
import { AiModule } from './ai/ai.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { SellersModule } from './sellers/sellers.module'; // <--- Importe do SellersModule
import { JourneyModule } from './journey/journey.module';
import { BackofficeModule } from './backoffice/backoffice.module';
import { StorageModule } from './storage/storage.module';
import { MailModule } from './mail/mail.module'; // <--- Importe do MailModule

// --- CONTROLADORES (Rotas da API) ---
import { RoutesController } from './routes/routes.controller';
import { SetupController } from './setup.controller';
import { HealthModule } from './health/health.module';
import { DriversController } from './drivers/drivers.controller';
import { VehiclesController } from './vehicles/vehicles.controller';
import { CustomersController } from './customers/customers.controller';
import { TenantsController } from './tenants/tenants.controller';
import { UsersController } from './users/users.controller';
import { SellersController } from './sellers/sellers.controller'; // <--- Importe do SellersController
import { SecurityController } from './security.controller'; // <--- Security Controller
import { DeliveriesController } from './deliveries/deliveries.controller'; // <--- NOVO
import { OccurrencesController } from './occurrences/occurrences.controller'; // <--- NOVO

// --- SERVIÇOS (Lógica de Negócio) ---
import { RoutesService } from './routes/routes.service';
import { DriversService } from './drivers/drivers.service';
import { VehiclesService } from './vehicles/vehicles.service';
import { CustomersService } from './customers/customers.service';
import { TenantsService } from './tenants/tenants.service';
import { UsersService } from './users/users.service';
import { SellersService } from './sellers/sellers.service'; // <--- Importe do SellersService
import { DeliveriesService } from './deliveries/deliveries.service'; // <--- NOVO
import { OccurrencesService } from './occurrences/occurrences.service'; // <--- NOVO

import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true, // Permite variáveis não definidas no schema
        abortEarly: false, // Mostra todos os erros de uma vez
      },
    }),
    // Rate Limiting Global
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // Time to live: 60 segundos
        limit: 100, // Máximo 100 requisições por minuto
      },
    ]),
    // Cache Global (Redis ou Memória)
    CacheModule,
    // Serve o Frontend (React/Vite)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'dist', 'client'),
      exclude: ['/api/{*path}'], // Exclui rotas da API para não dar conflito
    }),
    // Módulos de Funcionalidade
    AuthModule,
    WebhookModule,
    AiModule,
    WhatsappModule,
    SellersModule, // <--- Adição do SellersModule
    JourneyModule,
    BackofficeModule,
    StorageModule,
    MailModule,
    HealthModule,
  ],
  controllers: [
    // Endpoints
    RoutesController,
    SetupController,
    DriversController,
    VehiclesController,
    CustomersController,
    TenantsController,
    UsersController,
    SecurityController, // <--- Security Controller
    DeliveriesController, // <--- NOVO
    OccurrencesController, // <--- NOVO
  ],
  providers: [
    // Serviços Globais e de Entidades
    PrismaService,
    RoutesService,
    DriversService,
    VehiclesService,
    CustomersService,
    TenantsService,
    UsersService,
    SellersService,
    DeliveriesService, // <--- NOVO
    OccurrencesService, // <--- NOVO
  ],
})
export class AppModule {}
