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

// --- CONTROLADORES (Rotas da API) ---
import { RoutesController } from './routes/routes.controller';
import { SetupController } from './setup.controller';
import { HealthController } from './health.controller';
import { DriversController } from './drivers/drivers.controller';
import { VehiclesController } from './vehicles/vehicles.controller';
import { CustomersController } from './customers/customers.controller';
import { TenantsController } from './tenants/tenants.controller';
import { UsersController } from './users/users.controller';
import { SellersController } from './sellers/sellers.controller'; // <--- Importe do SellersController 

// --- SERVIÇOS (Lógica de Negócio) ---
import { RoutesService } from './routes/routes.service';
import { DriversService } from './drivers/drivers.service';
import { VehiclesService } from './vehicles/vehicles.service';
import { CustomersService } from './customers/customers.service';
import { TenantsService } from './tenants/tenants.service';
import { UsersService } from './users/users.service';
import { SellersService } from './sellers/sellers.service'; // <--- Importe do SellersService

@Module({
  imports: [
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
  ],
  controllers: [
    // Endpoints
    RoutesController,
    SetupController,
    HealthController,
    DriversController,
    VehiclesController,
    CustomersController,
    TenantsController,
    UsersController

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
    SellersService
  ],
})
export class AppModule { }