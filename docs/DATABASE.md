# 💾 Database - Prisma & PostgreSQL Documentation

Documentação completa do modelo de dados, schema, índices e relacionamentos do ZapRoute v2.

---

## 🏗️ Visão Geral da Estrutura

**Sistema de Banco de Dados:** PostgreSQL 15+

**ORM:** Prisma 5.7

**Estratégia:**
- Normalização 3NF com índices otimizados
- Soft deletes onde aplicável
- Timestamps em todas as entidades (createdAt, updatedAt)
- Multi-tenancy via `tenantId`

---

## 📊 Diagrama de Entidades

```
┌─────────────────────────────────────────────────────────────┐
│                        Tenant                               │
│  (Cada cliente SaaS isolado)                                │
├─────────────────────────────────────────────────────────────┤
│ id (PK), name, cnpj, logoUrl, primaryColor, config, status  │
└─────────────────┬───────────────────────────────────────────┘
                  │ 1:N
      ┌───────────┼───────────┬────────────────┐
      │           │           │                │
      ▼           ▼           ▼                ▼
   Users       Drivers      Vehicles        Customers
   Sellers     Routes       Deliveries      Occurrences
   ...         ...          ...             ...
```

---

## 📋 Entidades Detalhadas

### 1. **Tenant**
Representa cada cliente SaaS na plataforma.

```prisma
model Tenant {
  id              String   @id @default(uuid())
  name            String   // Nome da empresa
  cnpj            String   @unique
  logoUrl         String?
  primaryColor    String   @default("#3b82f6")  // Cor principal do tema
  config          Json?    // Configurações customizadas
  status          String   @default("ACTIVE")   // ACTIVE, INACTIVE, SUSPENDED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relacionamentos
  customers       Customer[]
  drivers         Driver[]
  users           User[]
  vehicles        Vehicle[]
  sellers         Seller[]
  routes          Route[]
  occurrences     Occurrence[]
  // ... mais relacionamentos

  @@index([status])  // Performance: filtrar por status
  @@map("tenants")
}
```

**Índices:**
- `id` (PK): Chave primária
- `cnpj`: Único, pesquisa

---

### 2. **User**
Usuários do sistema com roles e permissões.

```prisma
model User {
  id                String   @id @default(uuid())
  name              String
  email             String   @unique
  password          String   // Bcrypt hashed
  tenantId          String
  role              String   // SUPER_ADMIN, ADMIN, USER, DRIVER
  avatarUrl         String?
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  resetToken        String?  @unique  // Token para reset de senha
  resetTokenExpires DateTime?

  // Relacionamentos
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  audit_logs        audit_logs[]

  @@index([tenantId])  // Multi-tenancy
  @@index([email])     // Login rápido
  @@map("users")
}
```

**Roles:**
- `SUPER_ADMIN`: Acesso a backoffice, gerenciamento de tenants
- `ADMIN`: Gerenciamento da conta do tenant
- `USER`: Usuário padrão com acesso a funcionalidades
- `DRIVER`: Motorista com acesso limitado

---

### 3. **Driver**
Motoristas cadastrados no sistema.

```prisma
model Driver {
  id                String   @id @default(uuid())
  name              String
  cpf               String?
  email             String?
  phone             String?  // Crítico para webhook WhatsApp
  cnh               String?  // Carteira Nacional de Habilitação
  cnhCategory       String?  // A, B, C, D, E
  cnhExpiration     DateTime?
  avatarUrl         String?
  rating            Float?   @default(5.0)     // 0.0 - 5.0 stars
  totalDeliveries   Int      @default(0)
  externalId        String?  // ID de sistema externo (integração)
  status            String   @default("IDLE")  // IDLE, BUSY, UNAVAILABLE, SUSPENDED
  vehicleId         String?  @unique           // Um motorista por veículo
  tenantId          String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relacionamentos
  tenant            Tenant              @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  vehicles          Vehicle?            @relation(fields: [vehicleId], references: [id])
  deliveries        Delivery[]
  routes            Route[]
  occurrences       Occurrence[]
  journey_events    DriverJourneyEvent[]
  payment_requests  payment_requests[]
  fueling_trans     fueling_transactions[]
  service_orders    service_orders[]

  @@index([tenantId])
  @@index([phone])     // Crítico: webhook do WhatsApp busca por phone
  @@index([cpf])
  @@index([status])    // Filtros de disponibilidade
  @@index([vehicleId])
  @@map("drivers")
}
```

**Status:**
- `IDLE`: Disponível para nova rota
- `BUSY`: Em execução de rota
- `UNAVAILABLE`: Não disponível
- `SUSPENDED`: Suspenso temporariamente

---

### 4. **Vehicle**
Frota de veículos.

```prisma
model Vehicle {
  id                String   @id @default(uuid())
  plate             String   @unique
  model             String?
  brand             String?
  year              Int?
  fuelType          String?  // GASOLINA, DIESEL, GNV, ELETRICO
  capacityWeight    Float?   // Em kg
  capacityVolume    Float?   // Em m³
  mileage           Int?     @default(0)
  lastMaintenance   DateTime?
  nextMaintenance   DateTime?
  status            String   @default("AVAILABLE")  // AVAILABLE, BUSY, MAINTENANCE, RETIRED
  driverId          String?  @unique
  tenantId          String
  externalId        String?  @unique  // Sistema externo
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relacionamentos
  tenant            Tenant                  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  drivers           Driver?
  routes            Route[]
  fueling_trans     fueling_transactions[]
  maintenance_plans maintenance_plans[]
  maintenance_recs  maintenance_records[]
  service_orders    service_orders[]
  tires             tires[]

  @@index([tenantId])
  @@index([plate])        // Busca por placa
  @@index([status])       // Filtro de disponibilidade
  @@map("vehicles")
}
```

---

### 5. **Customer**
Clientes/fornecedores que recebem entregas.

```prisma
model Customer {
  id                    String      @id @default(uuid())
  legalName             String?     // Razão social
  tradeName             String      // Nome fantasia
  cnpj                  String?
  stateRegistration     String?
  email                 String?
  phone                 String?
  whatsapp              String?
  communicationPref     String?     // EMAIL, WHATSAPP, SMS
  segment               String?     // RETAIL, WHOLESALE, etc
  status                String      @default("ACTIVE")
  creditLimit           Float?
  addressDetails        Json?       // { street, number, city, state, zip }
  location              Json?       // { latitude, longitude }
  salesperson           String?
  sellerId              String?
  tenantId              String
  externalId            String?     @unique  // Sistema externo
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  // Relacionamentos
  tenant                Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  seller                Seller?     @relation(fields: [sellerId], references: [id])
  deliveries            Delivery[]
  contracts             contracts[]
  invoices              invoices[]
  tanks                 tanks[]

  @@index([tenantId])
  @@index([cnpj])
  @@index([sellerId])
  @@index([email])
  @@index([tradeName])    // Busca no import
  @@index([legalName])    // Busca no import
  @@index([status])
  @@map("customers")
}
```

---

### 6. **Seller**
Vendedores/agentes de venda.

```prisma
model Seller {
  id        String     @id @default(uuid())
  name      String
  email     String?
  phone     String?
  status    String     @default("ACTIVE")
  tenantId  String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  // Relacionamentos
  tenant    Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  customers Customer[]

  @@map("sellers")
}
```

---

### 7. **Route**
Rotas planejadas para entregas.

```prisma
model Route {
  id                String     @id @default(uuid())
  routeNumber       String     // Identificador único ex: RT-20260215-001
  date              DateTime   // Data da rota
  status            String     @default("PLANNED")  // PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
  driverId          String?
  vehicleId         String?
  estimatedDistance Float?     // Em km
  actualDistance    Float?
  estimatedDuration Int?       // Em minutos
  actualDuration    Int?
  totalDeliveries   Int        @default(0)
  tenantId          String
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  // Relacionamentos
  tenant            Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  driver            Driver?    @relation(fields: [driverId], references: [id])
  vehicle           Vehicle?   @relation(fields: [vehicleId], references: [id])
  deliveries        Delivery[]
  journey_events    DriverJourneyEvent[]

  @@index([tenantId])
  @@index([date])        // Filtros por data
  @@index([status])      // Filtro de status
  @@index([driverId])
  @@map("routes")
}
```

---

### 8. **Delivery**
Entregas individuais dentro de uma rota.

```prisma
model Delivery {
  id                String     @id @default(uuid())
  orderId           String     // ID do pedido do cliente
  date              String
  product           String     // Descrição do produto
  volume            Int        // Peso em kg ou número de unidades
  status            String     // PENDING, IN_TRANSIT, DELIVERED, FAILED, RETURNED
  priority          Priority   @default(NORMAL)  // NORMAL, HIGH
  routeId           String?
  driverId          String?
  customerId        String?
  tenantId          String
  latitude          Float?     // Localização do endereço
  longitude         Float?
  address           String?    // Endereço completo
  notes             String?    // Observações da entrega
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  // Relacionamentos
  tenant            Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  route             Route?     @relation(fields: [routeId], references: [id])
  driver            Driver?    @relation(fields: [driverId], references: [id])
  customer          Customer?  @relation(fields: [customerId], references: [id])
  occurrences       Occurrence[]

  @@index([tenantId])
  @@index([orderId])
  @@index([status])      // Filtro por status
  @@index([routeId])
  @@index([driverId])
  @@index([customerId])
  @@map("deliveries")
}

enum Priority {
  NORMAL
  HIGH
}
```

---

### 9. **Occurrence**
Incidentes/problemas durante entrega.

```prisma
model Occurrence {
  id              String     @id @default(uuid())
  deliveryId      String?
  driverId        String?
  tenantId        String
  type            String     // DELIVERY_FAILURE, DAMAGED, CUSTOMER_NOT_FOUND, etc
  status          String     @default("OPEN")  // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  description     String     @db.Text
  latitude        Float?
  longitude       Float?
  attachments     String[]   // URLs de fotos/evidências
  notes           String?    @db.Text
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  resolvedAt      DateTime?

  // Relacionamentos
  delivery        Delivery?  @relation(fields: [deliveryId], references: [id])
  driver          Driver?    @relation(fields: [driverId], references: [id])
  tenant          Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([deliveryId])
  @@index([driverId])
  @@index([status])
  @@index([type])
  @@map("occurrences")
}
```

**Tipos de Ocorrência:**
- `DELIVERY_FAILURE`: Não conseguiu fazer entrega
- `DAMAGED_PACKAGE`: Pacote danificado
- `INCORRECT_ADDRESS`: Endereço incorreto
- `CUSTOMER_NOT_FOUND`: Cliente não encontrado
- `SYSTEM_FAILURE`: Falha do sistema
- `WRONG_RECIPIENT`: Destinatário errado

---

### 10. **DriverJourneyEvent**
Rastreamento em tempo real das posições do motorista.

```prisma
model DriverJourneyEvent {
  id              String     @id @default(uuid())
  driverId        String
  routeId         String?
  latitude        Float
  longitude       Float
  accuracy        Float?     // Precisão do GPS em metros
  speed           Float?     // Em km/h
  heading         Float?     // Direção em graus (0-360)
  distance        Float?     // Distância do ponto anterior em metros
  timestamp       DateTime   @default(now())
  tenantId        String

  // Relacionamentos
  driver          Driver     @relation(fields: [driverId], references: [id], onDelete: Cascade)
  route           Route?     @relation(fields: [routeId], references: [id])
  tenant          Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([driverId])
  @@index([routeId])
  @@index([timestamp])   // Pesquisa por período
  @@map("driver_journey_events")
}
```

**Nota:** Esta tabela cresce rapidamente. Considere:
- Arquivamento de dados antigos
- Índice composto em (driverId, timestamp)
- Particionamento por data em produção

---

### 11. **audit_logs**
Auditoria de alterações no sistema.

```prisma
model audit_logs {
  id              String     @id @default(uuid())
  userId          String
  action          String     // CREATE, UPDATE, DELETE, LOGIN, EXPORT
  entityType      String     // User, Driver, Route, etc
  entityId        String
  previousData    Json?
  newData         Json?
  ipAddress       String?
  userAgent       String?
  timestamp       DateTime   @default(now())
  tenantId        String

  // Relacionamentos
  user            User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant          Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([userId])
  @@index([action])
  @@index([timestamp])
  @@map("audit_logs")
}
```

---

## 🔑 Relacionamentos Chave

### Multi-tenancy
```
Tenant (1) ──── (N) User
Tenant (1) ──── (N) Driver
Tenant (1) ──── (N) Customer
Tenant (1) ──── (N) Route
... Todos os outros relacionamentos
```

**Regra:** Sempre filtrar por `tenantId` na query

```typescript
// ✅ Correto
await prisma.driver.findMany({
  where: { tenantId: req.user.tenantId }
})

// ❌ Errado - vazamento de dados!
await prisma.driver.findMany()
```

### Route → Delivery
```
Route (1) ──── (N) Delivery
```
Uma rota contém múltiplas entregas.

### Driver → Route
```
Driver (1) ──── (N) Route
```
Um motorista executa múltiplas rotas.

### Driver → Vehicle
```
Driver (1) ──── (1) Vehicle (opcional)
```
Um motorista tem um veículo atribuído.

---

## 🗂️ Migrations

**Localização:** `prisma/migrations/`

### Estrutura de Migration:
```
20260215120000_init_schema/
├── migration.sql       # SQL gerado
└── migration_lock.toml # Lock para evitar conflitos
```

### Operações de Banco:

**Gerar Prisma Client:**
```bash
npm run prisma:generate
```

**Sincronizar schema com BD:**
```bash
npm run prisma:push
```

**Criar nova migration:**
```bash
npx prisma migrate dev --name descricao_mudanca
```

**Executar migrations em produção:**
```bash
npx prisma migrate deploy
```

---

## 📈 Performance & Índices

### Índices Críticos por Tabela:

| Tabela | Índice | Motivo |
|--------|--------|--------|
| drivers | phone | Webhook WhatsApp busca rápido |
| drivers | tenantId | Multi-tenancy |
| routes | date, status | Filtros no dashboard |
| deliveries | status | Filtros de entrega |
| deliveries | routeId | Listar entregas da rota |
| customers | tradeName, legalName | Busca no import |
| audit_logs | timestamp | Relatórios |

### Índices Compostos Importantes:

```sql
-- Busca por período de um motorista
CREATE INDEX idx_driver_journey_driver_timestamp 
ON driver_journey_events(driverId, timestamp DESC);

-- Listar entregas não entregues de uma rota
CREATE INDEX idx_delivery_route_status 
ON deliveries(routeId, status);
```

---

## 🔄 Transações

Para operações que envolvem múltiplas tabelas:

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Criar rota
  const route = await tx.route.create({ data: {...} });

  // Criar entregas
  const deliveries = await tx.delivery.createMany({
    data: deliveries_data
  });

  // Se algo falhar, tudo é revertido
  return { route, deliveries };
});
```

---

## 🧹 Cleanup e Manutenção

### Arquivamento de dados antigos:
```typescript
// Mover journey events antigos (>90 dias) para arquivo
const ninety_days_ago = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

await prisma.driverJourneyEvent.deleteMany({
  where: { timestamp: { lt: ninety_days_ago } }
});
```

### Refresh de estatísticas:
```sql
-- PostgreSQL
VACUUM ANALYZE;
REINDEX TABLE drivers;
```

---

## 📋 Seed Data

**Arquivo:** `prisma/seed.ts`

Popula dados iniciais para desenvolvimento:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Criar tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Demo Company",
      cnpj: "12345678000190"
    }
  });

  // Criar usuário
  const user = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@demo.com",
      password: "hashed_password",
      tenantId: tenant.id,
      role: "ADMIN"
    }
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Executar seed:**
```bash
npm run seed
```

---

## 🔒 Backup & Restore

### Backup PostgreSQL:
```bash
# Backup completo
pg_dump -U postgres zaproute > backup.sql

# Backup em formato customizado (mais comprimido)
pg_dump -U postgres -Fc zaproute > backup.dump
```

### Restore:
```bash
# Restaurar de arquivo SQL
psql -U postgres zaproute < backup.sql

# Restaurar de arquivo dump
pg_restore -U postgres -d zaproute backup.dump
```

---

## 📊 Monitoramento

### Monitorar tamanho do banco:
```sql
SELECT datname, pg_size_pretty(pg_database_size(datname)) 
FROM pg_database 
WHERE datname = 'zaproute';
```

### Monitorar performance de queries:
```sql
-- Queries lentas
SELECT query, calls, mean_exec_time, max_exec_time 
FROM pg_stat_statements 
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### Tamanho de tabelas:
```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## ⚠️ Regras Críticas

1. **Sempre filtrar por tenantId** - Evitar vazamento de dados
2. **Usar transações** - Para operações relacionadas
3. **Validar input** - Antes de salvar no BD
4. **Índices em chaves estrangeiras** - Já feito no schema
5. **Soft deletes** - Quando aplicável, para auditoria
6. **Backup regular** - Diário em produção
7. **Monitor de crescimento** - audit_logs cresce rapidamente

---

**Última atualização:** 15 de fevereiro de 2026
