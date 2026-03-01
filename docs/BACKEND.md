# 🖥️ Backend - NestJS Documentation

## 📌 Visão Geral

O backend de ZapRoute v2 é uma API REST construída com **NestJS 11.x**, um framework Node.js progressivo que utiliza TypeScript e padrões de design empresariais.

### Stack Tecnológico:
- **Framework:** NestJS 11.1.9
- **Linguagem:** TypeScript 5.3
- **ORM:** Prisma 5.7
- **Banco:** PostgreSQL 15
- **Autenticação:** JWT (Passport.js)
- **Validação:** class-validator + class-transformer
- **Rate Limiting:** @nestjs/throttler
- **Cache:** Redis / In-Memory

---

## 🏛️ Estrutura de Módulos

### 1. **Módulo de Autenticação (Auth)**

**Localização:** `src/auth/`

**Responsabilidades:**
- Login de usuários
- Geração de JWT tokens
- Validação de credenciais
- Estratégia Passport JWT
- Guard de autenticação

**Arquivos:**
```typescript
// auth.controller.ts
@Post('login')
async login(@Body() loginDto: LoginDto)
  → Email + Password → JWT Token + User

@Post('logout')
async logout(@Req() req: any)
  → Invalida session

// auth.service.ts
async validateUser(email: string, password: string)
  → Valida credenciais contra bcrypt hash

async generateToken(user: User)
  → Cria JWT com exp: 24h, sub: userId

// jwt.strategy.ts
async validate(payload: any)
  → Extrai userId do JWT e busca user no BD

// jwt-auth.guard.ts
canActivate(context: ExecutionContext)
  → Valida presença de JWT válido
```

**DTOs:**
```typescript
// LoginDto
{
  email: string;      // @IsEmail()
  password: string;   // @MinLength(6)
}

// Response
{
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'DRIVER';
    tenantId: string;
  }
}
```

**Fluxo de Autenticação:**
```
1. POST /api/auth/login { email, password }
2. auth.service valida contra bcrypt
3. Se válido, gera JWT token
4. Cliente armazena em localStorage
5. Próximas requests: Authorization: Bearer {token}
6. JwtAuthGuard valida token em cada request
```

---

### 2. **Módulo de Usuários (Users)**

**Localização:** `src/users/`

**Responsabilidades:**
- CRUD de usuários
- Gerenciamento de roles e permissões
- Ativação/desativação de usuários
- Reset de senha

**Endpoints:**
```typescript
GET    /api/users                    // Listar todos
GET    /api/users/:id                // Detalhes
POST   /api/users                    // Criar novo
PATCH  /api/users/:id                // Atualizar
DELETE /api/users/:id                // Deletar
POST   /api/users/:id/change-password // Trocar senha
```

**Modelo de Dados:**
```typescript
User {
  id: UUID
  name: string
  email: string (unique)
  password: string (hashed)
  tenantId: UUID
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'DRIVER'
  avatarUrl?: string
  isActive: boolean
  createdAt: DateTime
  updatedAt: DateTime
  resetToken?: string (para recuperação de senha)
  resetTokenExpires?: DateTime
}
```

---

### 3. **Módulo de Motoristas (Drivers)**

**Localização:** `src/drivers/`

**Responsabilidades:**
- Cadastro de motoristas
- Gerenciamento de documentos (CNH, CPF)
- Monitoramento de status
- Rating e performance

**Endpoints:**
```typescript
GET    /api/drivers                          // Listar
GET    /api/drivers/:id                      // Detalhes
POST   /api/drivers                          // Criar
PATCH  /api/drivers/:id                      // Atualizar
DELETE /api/drivers/:id                      // Deletar
GET    /api/drivers/:id/routes               // Rotas do motorista
GET    /api/drivers/:id/deliveries           // Entregas do motorista
POST   /api/drivers/:id/location             // Registrar localização
```

**Modelo de Dados:**
```typescript
Driver {
  id: UUID
  name: string
  cpf: string
  email: string
  phone: string                    // Crítico para WhatsApp webhook
  cnh: string                      // Carteira Nacional de Habilitação
  cnhCategory: string              // A, B, C, D, E
  cnhExpiration: DateTime
  avatarUrl: string
  rating: float                    // 0.0 - 5.0
  totalDeliveries: int
  status: 'IDLE' | 'BUSY' | 'UNAVAILABLE'
  vehicleId: UUID (optional)
  tenantId: UUID
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

### 4. **Módulo de Veículos (Vehicles)**

**Localização:** `src/vehicles/`

**Responsabilidades:**
- Cadastro de frotas
- Rastreamento de manutenção
- Monitoramento de consumo de combustível
- Status operacional

**Endpoints:**
```typescript
GET    /api/vehicles                  // Listar
GET    /api/vehicles/:id              // Detalhes
POST   /api/vehicles                  // Criar
PATCH  /api/vehicles/:id              // Atualizar
DELETE /api/vehicles/:id              // Deletar
POST   /api/vehicles/:id/maintenance  // Registrar manutenção
GET    /api/vehicles/:id/history      // Histórico de manutenções
```

**Modelo de Dados:**
```typescript
Vehicle {
  id: UUID
  plate: string                    // Placa do veículo (unique)
  model: string                    // Modelo
  brand: string                    // Marca
  year: int
  fuelType: string                 // 'GASOLINA' | 'DIESEL' | 'GNV'
  capacityWeight: float            // Em kg
  capacityVolume: float            // Em m³
  lastMaintenance: DateTime
  nextMaintenance: DateTime
  mileage: int                     // Quilometragem
  status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE' | 'RETIRED'
  driverId: UUID (optional)        // Motorista atribuído
  tenantId: UUID
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

### 5. **Módulo de Clientes (Customers)**

**Localização:** `src/customers/`

**Responsabilidades:**
- Cadastro de clientes/fornecedores
- Gerenciamento de endereços
- Histórico de entregas
- Contatos e preferências

**Endpoints:**
```typescript
GET    /api/customers                  // Listar
GET    /api/customers/:id              // Detalhes
POST   /api/customers                  // Criar
PATCH  /api/customers/:id              // Atualizar
DELETE /api/customers/:id              // Deletar
POST   /api/customers/import           // Importar de CSV
GET    /api/customers/:id/deliveries   // Histórico de entregas
GET    /api/customers/search?q=        // Busca rápida
```

**Modelo de Dados:**
```typescript
Customer {
  id: UUID
  legalName: string              // Razão social
  tradeName: string              // Nome fantasia
  cnpj: string                   // CNPJ (unique)
  stateRegistration: string      // Inscrição estadual
  email: string
  phone: string
  whatsapp: string
  communicationPreference: string // 'EMAIL' | 'WHATSAPP' | 'SMS'
  segment: string                // Tipo de cliente
  status: 'ACTIVE' | 'INACTIVE'
  creditLimit: float             // Limite de crédito
  addressDetails: JSON           // Estrutura de endereço
  location: JSON                 // { latitude, longitude }
  sellerId: UUID                 // Vendedor responsável
  tenantId: UUID
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

### 6. **Módulo de Rotas (Routes)**

**Localização:** `src/routes/`

**Responsabilidades:**
- Planejamento de rotas
- Otimização de trajetos
- Importação de entregas
- Atribuição de motoristas

**Endpoints:**
```typescript
GET    /api/routes                      // Listar rotas
GET    /api/routes/:id                  // Detalhes da rota
POST   /api/routes/import               // Importar de CSV
PATCH  /api/routes/:id                  // Atualizar rota
DELETE /api/routes/:id                  // Deletar rota
GET    /api/routes/dashboard            // Stats do dashboard
GET    /api/routes/paginated            // Rotas paginadas
PATCH  /api/routes/deliveries/:id/status // Atualizar status entrega
```

**Modelo de Dados:**
```typescript
Route {
  id: UUID
  routeNumber: string            // Identificação da rota
  date: DateTime                 // Data da rota
  driverId: UUID (optional)
  vehicleId: UUID (optional)
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  estimatedDistance: float       // Em km
  actualDistance: float
  estimatedDuration: int         // Em minutos
  actualDuration: int
  totalDeliveries: int
  tenantId: UUID
  createdAt: DateTime
  updatedAt: DateTime
  deliveries: Delivery[]         // Entregas incluídas
}

Delivery {
  id: UUID
  orderId: string                // ID do pedido
  date: string
  product: string
  volume: int                    // Peso ou volume
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED'
  priority: 'NORMAL' | 'HIGH'
  routeId: UUID
  driverId: UUID
  customerId: UUID
  tenantId: UUID
  createdAt: DateTime
  updatedAt: DateTime
}
```

**Lógica de Otimização:**
```typescript
// Algoritmo simplificado (Nearest Neighbor)
1. Inicia no primeiro ponto (base/depot)
2. Para cada parada seguinte:
   - Calcula distância para todas as próximas paradas
   - Vai para a mais próxima
   - Marca como visitada
3. Retorna à base no final

// Para otimização avançada: usar API como OR-Tools, Mapbox, Google Maps
```

---

### 7. **Módulo de Entregas (Deliveries)**

**Localização:** `src/deliveries/`

**Responsabilidades:**
- Gerenciamento do ciclo de vida de entregas
- Registros de entrega
- Assinatura/confirmação
- Foto de comprovante

**Endpoints:**
```typescript
GET    /api/deliveries                    // Listar
GET    /api/deliveries/:id                // Detalhes
POST   /api/deliveries/:id/confirm        // Confirmar entrega
POST   /api/deliveries/:id/photo          // Upload de foto
GET    /api/deliveries/:id/proof          // Comprovante
PATCH  /api/deliveries/:id/status         // Atualizar status
```

---

### 8. **Módulo de Incidentes (Occurrences)**

**Localização:** `src/occurrences/`

**Responsabilidades:**
- Registro de problemas durante entregas
- Rastreamento de devoluções
- Justificativas de atrasos
- Comunicação de problemas

**Endpoints:**
```typescript
GET    /api/occurrences                   // Listar
POST   /api/occurrences                   // Criar incidente
GET    /api/occurrences/:id               // Detalhes
PATCH  /api/occurrences/:id               // Atualizar status
DELETE /api/occurrences/:id               // Deletar
```

**Tipos de Ocorrências:**
- DELIVERY_FAILURE (não entregue)
- INCORRECT_ADDRESS (endereço errado)
- DAMAGED_PACKAGE (pacote danificado)
- CUSTOMER_NOT_FOUND (cliente não encontrado)
- SYSTEM_FAILURE (falha do sistema)

---

### 9. **Módulo de Rastreamento (Journey)**

**Localização:** `src/journey/`

**Responsabilidades:**
- Registrar localização em tempo real
- Detecção de chegada em pontos
- Histórico de trajeto
- Análise de performance

**Endpoints:**
```typescript
POST   /api/journey/location              // Registrar localização
GET    /api/journey/:driverId/current     // Localização atual
GET    /api/journey/:driverId/history     // Histórico do dia
GET    /api/journey/:routeId/track        // Rastreamento de rota
```

**Modelo de Dados:**
```typescript
DriverJourneyEvent {
  id: UUID
  driverId: UUID
  latitude: float
  longitude: float
  accuracy: float                // Precisão do GPS
  timestamp: DateTime
  speed: float                   // Em km/h
  heading: float                 // Direção em graus
  distance: float                // Distância do ponto anterior
  routeId: UUID (optional)
}
```

---

### 10. **Módulo de IA (AI)**

**Localização:** `src/ai/`

**Responsabilidades:**
- Chat com assistente Gemini
- Geração de relatórios
- Análise de dados
- Sugestões de otimização

**Endpoints:**
```typescript
POST   /api/ai/chat                       // Enviar mensagem
POST   /api/ai/stream-chat                // Chat com stream
GET    /api/ai/conversation/:id           // Histórico de conversa
POST   /api/ai/analyze-route              // Analisar rota
POST   /api/ai/suggest-optimization       // Sugerir otimizações
```

**Integração Google Gemini:**
```typescript
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const chat = model.startChat({
  history: [
    // Histórico anterior de mensagens
  ],
  generationConfig: {
    maxOutputTokens: 1024,
    temperature: 0.7,
  },
});

const result = await chat.sendMessage(userMessage);
```

---

### 11. **Módulo WhatsApp**

**Localização:** `src/whatsapp/`

**Responsabilidades:**
- Integração com WhatsApp Business API
- Envio de mensagens
- Recebimento de webhooks
- Gerenciamento de estado de entrega

**Fluxo:**
```
1. Evento em Delivery (ex: status = DELIVERED)
2. Dispara função sendWhatsAppMessage()
3. Envia via WhatsApp Business API
4. Motorista recebe notificação
5. Pode responder (webhook)
6. Sistema processa resposta
```

**Webhook:**
```typescript
POST /api/webhook/whatsapp
  → Recebe updates de status de mensagens
  → Processa respostas de motoristas
```

---

### 12. **Módulo de Email (Mail)**

**Localização:** `src/mail/`

**Responsabilidades:**
- Envio de confirmações
- Notificações
- Relatórios em PDF
- Recuperação de senha

**Serviço:**
```typescript
async sendConfirmationEmail(to: string, routeCode: string)
async sendReportEmail(to: string, pdf: Buffer)
async sendPasswordResetEmail(to: string, resetLink: string)
```

**Template:**
```html
<!-- Handlebars template -->
<h1>Confirmação de Entrega</h1>
<p>Rota: {{routeCode}}</p>
<p>Data: {{date}}</p>
<a href="{{link}}">Confirmar Entrega</a>
```

---

### 13. **Módulo de Armazenamento (Storage)**

**Localização:** `src/storage/`

**Responsabilidades:**
- Upload para AWS S3
- Download de arquivos
- Deleção de arquivos
- Geração de URLs presignadas

**Serviço:**
```typescript
async uploadFile(file: Express.Multer.File): Promise<string>
async deleteFile(key: string): Promise<void>
async generatePresignedUrl(key: string): Promise<string>
```

**Uso:**
```typescript
// Upload de foto de entrega
POST /api/storage/upload
  Body: multipart/form-data { file }
  Response: { url: "https://s3.amazonaws.com/..." }
```

---

### 14. **Módulo Backoffice (Admin)**

**Localização:** `src/backoffice/`

**Responsabilidades:**
- Dashboard administrativo
- Gerenciamento de tenants
- Auditoria de ações
- Relatórios executivos

**Endpoints:**
```typescript
GET    /api/backoffice/dashboard        // Stats globais
GET    /api/backoffice/tenants          // Lista de tenants
POST   /api/backoffice/tenants          // Criar novo tenant
GET    /api/backoffice/audit-logs       // Logs de auditoria
GET    /api/backoffice/reports          // Relatórios
```

**Guard:**
```typescript
@UseGuards(SuperAdminGuard)  // Apenas SUPER_ADMIN
```

---

### 15. **Módulo de Tenants**

**Localização:** `src/tenants/`

**Responsabilidades:**
- Criação de novos clientes SaaS
- Configuração por tenant
- Isolamento de dados

**Modelo:**
```typescript
Tenant {
  id: UUID
  name: string              // Nome da empresa
  cnpj: string (unique)
  logoUrl: string
  primaryColor: string      // Cor principal da UI
  config: JSON              // Configurações customizadas
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## 📊 Monitoramento e Observabilidade

Para garantir a confiabilidade em produção, o backend implementa três camadas de monitoramento:

### 1. Logs Estruturados (Winston)
Substituímos o console padrão por logs estruturados e rotacionados.
- **Transports:** Console (colorido) e File (JSON).
- **Rotação:** Logs diários em `/logs`, mantidos por 14 dias.
- **Níveis:** `error` (arquivo separado), `warn`, `info`, `debug`.

### 2. Monitoring (Sentry)
Integração nativa para captura de erros e performance.
- **Error Tracking:** Captura automática de exceções globais.
- **Performance:** Rastreamento de latência e transações.
- **Profiling:** Monitoramento de uso de CPU em tempo hábil.

### 3. Métricas (Prometheus)
Endpoint `GET /metrics` com métricas padrão do Node.js e latência HTTP.
- **Proteção opcional:** header `x-metrics-token` quando `METRICS_TOKEN` definido.
- **Desabilitar:** `METRICS_ENABLED=false`.

### 4. Health Checks (@nestjs/terminus)
Endpoint `GET /api/health` para monitoramento de disponibilidade.
- **Database:** Verifica conexão Prisma.
- **Redis:** Verifica disponibilidade do cache.

### 5. Otimizações de Performance
- **Compressão HTTP:** respostas com gzip/br via middleware `compression`.

---

## 🔐 Guards e Autenticação

### JwtAuthGuard
```typescript
@UseGuards(JwtAuthGuard)
// Valida JWT token na request
// Popula req.user com payload do token
```

### SuperAdminGuard
```typescript
@UseGuards(SuperAdminGuard)
// Verifica se user.role === 'SUPER_ADMIN'
```

### TenantGuard (Custom)
```typescript
// Validar que usuário pertence ao tenant solicitado
if (!req.user) return false;
if (req.user.role === 'SUPER_ADMIN') return true;

const requestTenantId =
  req.params?.tenantId || req.query?.tenantId || req.body?.tenantId;
if (requestTenantId && req.user.tenantId !== requestTenantId) {
  throw new ForbiddenException('Acesso negado a outro tenant');
}
```

---

## 🔄 Padrão de Requisição/Resposta

### Padrão de Requisição:
```typescript
// Headers obrigatórios
{
  "Authorization": "Bearer eyJhbGc...",
  "Content-Type": "application/json"
}

// Body (exemplo)
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999"
}
```

### Padrão de Resposta Sucesso (200):
```typescript
{
  "data": {
    "id": "uuid-123",
    "name": "João Silva",
    "email": "joao@example.com",
    "createdAt": "2026-02-15T10:00:00Z"
  },
  "message": "Recurso criado com sucesso",
  "statusCode": 200
}
```

### Padrão de Resposta Erro (4xx/5xx):
```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email já cadastrado",
    "details": [
      {
        "field": "email",
        "message": "Email deve ser único"
      }
    ]
  },
  "statusCode": 400,
  "timestamp": "2026-02-15T10:00:00Z"
}
```

---

## 🛠️ Variáveis de Ambiente

**Arquivo:** `.env`

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/zaproute

# JWT
JWT_SECRET=sua-chave-secreta-aqui
JWT_EXPIRATION=86400  # 24 horas em segundos

# AWS S3
AWS_ACCESS_KEY_ID=seu-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=zaproute-bucket

# Google AI
GOOGLE_AI_KEY=sua-chave-gemini

# WhatsApp
WHATSAPP_BUSINESS_ACCOUNT_ID=seu-account-id
WHATSAPP_BUSINESS_PHONE_ID=seu-phone-id
WHATSAPP_BUSINESS_TOKEN=seu-token

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha
SMTP_FROM=noreply@zaproute.com

# App
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Redis (opcional)
REDIS_URL=redis://localhost:6379
```

---

## 🚀 Comandos Principais

```bash
# Desenvolvimento
npm run start:dev       # Dev com reload automático
npm run start:debug     # Dev com debugger ativo

# Build e Produção
npm run build           # Compila TypeScript
npm run start:prod      # Inicia em produção

# Banco de Dados
npm run prisma:generate # Gera Prisma Client
npm run prisma:push    # Aplica schema ao BD
npm run seed           # Popula dados iniciais

# Testes
npm test               # Jest unit tests
npm run test:watch     # Watch mode
npm run test:cov       # Com coverage
npm run test:e2e       # Testes E2E

# Qualidade
npm run lint           # ESLint
npm run format         # Prettier
```

---

## 📝 Exemplo: Criar Novo Endpoint

### 1. Criar DTO
```typescript
// src/sellers/dto/create-seller.dto.ts
import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateSellerDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
```

### 2. Criar Service
```typescript
// src/sellers/sellers.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSellerDto } from './dto/create-seller.dto';

@Injectable()
export class SellersService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createDto: CreateSellerDto) {
    return this.prisma.seller.create({
      data: {
        ...createDto,
        tenantId,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.seller.findMany({
      where: { tenantId },
    });
  }
}
```

### 3. Criar Controller
```typescript
// src/sellers/sellers.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SellersService } from './sellers.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sellers')
@UseGuards(JwtAuthGuard)
export class SellersController {
  constructor(private sellersService: SellersService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.sellersService.findAll(req.user.tenantId);
  }

  @Post()
  async create(@Body() createDto: CreateSellerDto, @Req() req: any) {
    return this.sellersService.create(req.user.tenantId, createDto);
  }
}
```

### 4. Registrar Módulo
```typescript
// src/app.module.ts
import { SellersController } from './sellers/sellers.controller';
import { SellersService } from './sellers/sellers.service';

@Module({
  controllers: [SellersController],
  providers: [SellersService],
})
export class AppModule {}
```

---

**Última atualização:** 15 de fevereiro de 2026
