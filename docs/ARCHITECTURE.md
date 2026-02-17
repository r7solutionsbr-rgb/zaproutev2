# 🏗️ Arquitetura do Projeto - ZapRoute v2

## 📌 Visão Geral

ZapRoute v2 é uma aplicação SaaS (Software as a Service) para gestão logística com suporte multi-tenant. Utiliza uma arquitetura **cliente-servidor** com separação clara de responsabilidades:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (React/Web)                      │
│  Dashboard | Planejamento de Rotas | Admin | App Motorista │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS REST API
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   SERVIDOR (NestJS)                         │
│  Controllers │ Services │ Guards │ Pipes │ Middlewares     │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   PostgreSQL       Redis/Cache      AWS S3
   (Dados)          (Sessions)       (Storage)
```

---

## 🏛️ Padrões Arquiteturais

### 1. **Clean Architecture**
O projeto segue os princípios de Clean Architecture, organizando código em camadas:

```
src/
├── controllers/    ← 🔌 Interfaces com o Mundo Externo (API)
├── services/       ← 💼 Lógica de Negócio Pura
├── repositories/   ← 📊 Acesso a Dados (Prisma)
├── dto/           ← 📦 Objetos de Transferência de Dados
├── guards/        ← 🔐 Segurança e Autorização
└── common/        ← 🔧 Utilities e Helpers
```

### 2. **Modular Design**
Cada funcionalidade é um módulo independente:

```
routes/
├── routes.controller.ts    ← API HTTP
├── routes.service.ts       ← Lógica de Negócio
├── routes.service.spec.ts  ← Testes
└── dto/
    ├── create-route.dto.ts
    └── update-route.dto.ts
```

### 3. **Multi-tenancy**
Isolamento de dados entre clientes através de `tenantId`:

```typescript
// Toda query filtra por tenantId
await this.prisma.route.findMany({
  where: { tenantId: req.user.tenantId }
})
```

---

## 📦 Estrutura de Módulos

### Backend (NestJS)

#### Módulos Principais:

| Módulo | Responsabilidade | Principais Entidades |
|--------|-----------------|-------------------|
| **Auth** | Autenticação JWT e gerenciamento de sessões | User, Token |
| **Users** | Gerenciamento de usuários do sistema | User, Role |
| **Drivers** | Cadastro e gerenciamento de motoristas | Driver, DriverJourney |
| **Vehicles** | Gestão de frotas de veículos | Vehicle, Maintenance |
| **Customers** | Cadastro de clientes/fornecedores | Customer, Contract |
| **Sellers** | Gerenciamento de vendedores | Seller |
| **Routes** | Planejamento e otimização de rotas | Route, Delivery |
| **Deliveries** | Gerenciamento de entregas | Delivery, Occurrence |
| **Occurrences** | Rastreamento de incidentes | Occurrence |
| **Journey** | Rastreamento em tempo real do motorista | DriverJourneyEvent |
| **WhatsApp** | Integração com WhatsApp Business | WhatsAppMessage |
| **AI** | Integração com Gemini API | AIChat |
| **Mail** | Envio de emails transacionais | Email |
| **Storage** | Upload/Download em AWS S3 | StorageFile |
| **Backoffice** | Painel administrativo | Audit, Reports |
| **Tenants** | Gerenciamento de clientes SaaS | Tenant |

---

## 🔄 Fluxos Principais

### 1. **Fluxo de Autenticação**

```
┌─────────────┐
│   Cliente   │ Email + Senha
└──────┬──────┘
       │ POST /api/auth/login
       ▼
┌──────────────────────────────────────┐
│  auth.controller.ts                  │
│  ├─ Valida credenciais               │
│  └─ Chama auth.service.ts            │
└──────────────────────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  auth.service.ts                     │
│  ├─ Busca user no DB                 │
│  ├─ Compara password (bcrypt)        │
│  └─ Gera JWT Token                   │
└──────────────────────┬───────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Retorna: { access_token, user }        │
│  Cliente armazena em localStorage       │
└─────────────────────────────────────────┘

Próximas requisições:
Authorization: Bearer {jwt_token}
```

### 2. **Fluxo de Planejamento de Rota**

```
┌──────────────────────┐
│  Frontend: RoutePlanner
│  └─ User importa CSV
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  POST /api/routes/import                     │
│  ├─ Valida arquivo                           │
│  └─ Chama routes.service.ts                  │
└──────────────────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────┐
│  routes.service.ts                           │
│  ├─ Parse CSV e valida dados                │
│  ├─ Busca customers e drivers no BD          │
│  ├─ Cria Route com Deliveries                │
│  ├─ Otimiza rota usando geolocalização       │
│  └─ Salva no PostgreSQL                      │
└──────────────────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Retorna Route com Deliveries    │
│  Frontend renderiza mapa         │
└──────────────────────────────────┘
```

### 3. **Fluxo de Rastreamento em Tempo Real**

```
┌─────────────────────────────────────────┐
│  App Motorista (React Native)           │
│  └─ Solicita localização GPS             │
└──────────────┬──────────────────────────┘
              │ POST /api/journey/location
              │ { latitude, longitude }
              ▼
┌──────────────────────────────────────────┐
│  journey.controller.ts                   │
│  └─ Recebe localização                   │
└──────────────┬──────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│  journey.service.ts                      │
│  ├─ Valida localização                   │
│  ├─ Busca rota do motorista               │
│  ├─ Detecta próximas entregas             │
│  └─ Salva evento em cache + BD            │
└──────────────┬──────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────┐
│  Dashboard (WebSocket/Polling)           │
│  └─ Atualiza posição em tempo real        │
└──────────────────────────────────────────┘
```

---

## 🔌 Integrações Externas

### **1. AWS S3**
- **Uso:** Armazenamento de arquivos (fotos de entregas, documentos)
- **Integração:** `@aws-sdk/client-s3`
- **Fluxo:** Upload → S3 → Retorna URL pública

### **2. Google Gemini AI**
- **Uso:** Chat assistente "Leônidas"
- **Integração:** `@google/generative-ai`
- **Fluxo:** User message → Gemini API → Stream response

### **3. WhatsApp Business API**
- **Uso:** Notificações e comunicação com motoristas
- **Integração:** Webhook + HTTP REST
- **Fluxo:** Event trigger → WhatsApp → Notificação motorista

### **4. Email (Nodemailer)**
- **Uso:** Envio de confirmações, relatórios, recuperação de senha
- **Integração:** Nodemailer + Handlebars templates
- **Fluxo:** Trigger → Template → SMTP → Inbox

---

## 🗂️ Estrutura de Diretórios Detalhada

### Backend
```
server/
├── src/
│   ├── app.module.ts                 # Módulo raiz
│   ├── main.ts                       # Bootstrap da aplicação
│   ├── prisma.service.ts             # Gerenciador de BD
│   │
│   ├── auth/                         # 🔐 Autenticação
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt.strategy.ts
│   │   ├── jwt-auth.guard.ts
│   │   └── auth.module.ts
│   │
│   ├── routes/                       # 🗺️ Rotas
│   │   ├── routes.controller.ts
│   │   ├── routes.service.ts
│   │   ├── routes.service.spec.ts
│   │   └── dto/
│   │
│   ├── drivers/                      # 👨‍🚗 Motoristas
│   │   ├── drivers.controller.ts
│   │   ├── drivers.service.ts
│   │   └── jwt-auth.guard.ts
│   │
│   ├── vehicles/                     # 🚚 Veículos
│   │   ├── vehicles.controller.ts
│   │   └── vehicles.service.ts
│   │
│   ├── customers/                    # 🏢 Clientes
│   │   ├── customers.controller.ts
│   │   ├── customers.service.ts
│   │   └── jwt-auth.guard.ts
│   │
│   ├── deliveries/                   # 📦 Entregas
│   │   ├── deliveries.controller.ts
│   │   └── deliveries.service.ts
│   │
│   ├── journey/                      # 📍 Rastreamento
│   │   ├── journey.controller.ts
│   │   ├── journey.service.ts
│   │   └── journey.module.ts
│   │
│   ├── ai/                          # 🤖 IA
│   │   ├── ai.controller.ts
│   │   ├── ai.service.ts
│   │   └── ai.module.ts
│   │
│   ├── whatsapp/                    # 💬 WhatsApp
│   │   └── whatsapp.module.ts
│   │
│   ├── mail/                        # 📧 Email
│   │   ├── mail.service.ts
│   │   └── mail.module.ts
│   │
│   ├── storage/                     # 📁 Armazenamento
│   │   └── storage.module.ts
│   │
│   ├── backoffice/                  # 📊 Admin
│   │   ├── backoffice.controller.ts
│   │   ├── backoffice.service.ts
│   │   ├── backoffice.module.ts
│   │   └── super-admin.guard.ts
│   │
│   ├── common/                      # 🔧 Utilities
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   └── ...
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/
│   │   ├── validators.ts
│   │   └── ...
│   │
│   ├── config/                      # ⚙️ Configuração
│   │   └── env.validation.ts
│   │
│   └── scripts/                      # 🛠️ Utilitários
│       ├── create-super-admin.ts
│       └── ...
│
├── prisma/
│   ├── schema.prisma                # 📋 Esquema do BD
│   ├── seed.ts                      # 🌱 Seed data
│   └── migrations/                  # 🔄 Histórico de BD
│
└── test/                             # 🧪 Testes E2E
    ├── jest-e2e.json
    └── *.e2e-spec.ts
```

### Frontend
```
web/
├── src/
│   ├── App.tsx                      # Componente raiz
│   ├── main.tsx                     # Bootstrap
│   ├── index.css                    # Estilos globais
│   │
│   ├── components/                  # 🧩 Componentes Reutilizáveis
│   │   ├── Sidebar.tsx
│   │   ├── AiChatWidget.tsx
│   │   └── ...
│   │
│   ├── pages/                       # 📄 Páginas
│   │   ├── Dashboard.tsx
│   │   ├── RoutePlanner.tsx
│   │   ├── RouteList.tsx
│   │   ├── DriverList.tsx
│   │   ├── admin/
│   │   │   └── AdminDashboard.tsx
│   │   └── ...
│   │
│   ├── services/                    # 🔌 APIs
│   │   └── api.ts                   # Cliente HTTP (Axios)
│   │
│   ├── contexts/                    # 🌐 Context API
│   │   └── DataContext.tsx
│   │
│   ├── hooks/                       # 🎣 Custom Hooks
│   │   └── ...
│   │
│   ├── utils/                       # 🔧 Utilities
│   │   └── ...
│   │
│   ├── configs/                     # ⚙️ Configuração
│   │   └── ...
│   │
│   ├── types.ts                     # 📝 TypeScript types
│   └── constants.ts                 # 🔤 Constantes
│
├── public/                          # 📁 Assets estáticos
│   ├── logo.png
│   └── ...
│
├── index.html                       # Entry point HTML
├── vite.config.ts                   # Vite config
├── tailwind.config.js               # Tailwind config
└── tsconfig.json                    # TypeScript config
```

---

## 🔐 Segurança em Camadas

```
┌─────────────────────────────────────────────────────┐
│ 1. HTTPS + TLS (Transporte)                        │
├─────────────────────────────────────────────────────┤
│ 2. CORS (Cross-Origin Resource Sharing)            │
├─────────────────────────────────────────────────────┤
│ 3. Helmet.js (Security Headers)                    │
├─────────────────────────────────────────────────────┤
│ 4. CSRF Protection (Token Validation)              │
├─────────────────────────────────────────────────────┤
│ 5. JWT Authentication (Stateless)                  │
├─────────────────────────────────────────────────────┤
│ 6. Role-Based Access Control (RBAC)                │
├─────────────────────────────────────────────────────┤
│ 7. Input Validation (DTO + class-validator)        │
├─────────────────────────────────────────────────────┤
│ 8. Rate Limiting (@nestjs/throttler)               │
├─────────────────────────────────────────────────────┤
│ 9. Bcrypt Password Hashing                         │
├─────────────────────────────────────────────────────┤
│ 10. Multi-tenancy Isolation (tenantId)             │
└─────────────────────────────────────────────────────┘
```

---

## 💾 Banco de Dados

**Sistema:** PostgreSQL 15+

**Principais Tabelas:**
- `tenants` - Clientes SaaS
- `users` - Usuários do sistema
- `drivers` - Motoristas
- `vehicles` - Veículos
- `customers` - Clientes/fornecedores
- `routes` - Rotas planejadas
- `deliveries` - Entregas
- `occurrences` - Incidentes
- `driver_journey_events` - Rastreamento em tempo real

**Indices Críticos:**
- `tenantId` - Multi-tenancy
- `status` - Filtros rápidos
- `createdAt` - Ordenação
- `phone` - Webhook de WhatsApp

---

## 📊 Fluxo de Dados

```
Browser (React)
    │
    ├─ localStorage → JWT Token
    ├─ localStorage → User Data
    └─ Context API → App State
    
    │ HTTP + JWT
    ▼
    
REST API (NestJS)
    ├─ Request → Controller
    ├─ Controller → Service
    ├─ Service → Prisma (ORM)
    └─ Response → Browser
    
    │ Queries
    ▼
    
PostgreSQL
    ├─ SELECT/INSERT/UPDATE/DELETE
    ├─ Transactions
    └─ Indices para performance
    
Redis (Optional)
    ├─ Cache de sessões
    ├─ Rate limiting
    └─ Cache de queries
```

---

## 🚀 Performance e Escalabilidade

### Estratégias Implementadas:

1. **Paginação**: Rotas retornam dados paginados
2. **Índices de BD**: Críticos em `tenantId`, `status`, `phone`
3. **Cache com Redis**: Sessões e dados frequentes
4. **Lazy Loading**: Componentes React carregam sob demanda
5. **Compressão**: Assets Vite otimizados
6. **Rate Limiting**: 100 req/min por padrão
7. **Connection Pooling**: Prisma gerencia pool de conexões

---

## 🔄 Continuous Integration & Deployment

```
Código → Git Push
         │
         ▼
GitHub Actions / CI Pipeline
         │
         ├─ npm test (Jest)
         ├─ npm run build
         ├─ Lint (ESLint)
         └─ Type check (TypeScript)
         │
         ▼
Docker Build
         │
         ├─ Build server image
         └─ Build web image
         │
         ▼
Deploy (Railway / Docker)
         │
         ├─ postgres:15
         ├─ zaproute_api:latest
         └─ nginx (static files)
         │
         ▼
Production
```

---

## 📝 Notas Importantes

1. **Isolamento de Tenants**: Sempre filtrar queries por `tenantId`
2. **Async Operations**: Usar `async/await`, não Promises aninhadas
3. **Error Handling**: Controllers usam `HttpException`
4. **Validation**: DTOs usam `class-validator`
5. **Testing**: Escrever testes para lógica crítica de negócio

---

**Última atualização:** 15 de fevereiro de 2026
