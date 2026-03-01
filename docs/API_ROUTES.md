# 🗣️ API Routes & Endpoints Documentation

Referência completa de todas as rotas disponíveis na API REST de ZapRoute v2.

---

## 📋 Padrões Gerais

### Autenticação
Todas as rotas (exceto login) requerem:
```
Header: Authorization: Bearer {jwt_token}
```

### Tenant
O `tenantId` é derivado automaticamente do usuário logado (via JWT).
Somente endpoints administrativos/backoffice podem aceitar `tenantId` explícito.

### Paginação
```
GET /api/endpoint?page=1&limit=20&sort=createdAt&order=desc
Response: {
  data: [...],
  meta: {
    total: 100,
    page: 1,
    limit: 20,
    totalPages: 5,
    hasNext: true,
    hasPrev: false
  }
}
```

### Erros
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descrição do erro"
  },
  "statusCode": 400,
  "timestamp": "2026-02-15T10:00:00Z"
}
```

---

## 🔐 Authentication (Auth)

### POST /api/auth/login
Autentica usuário e retorna JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "data": {
    "access_token": "eyJhbGc...",
    "user": {
      "id": "uuid-123",
      "email": "user@example.com",
      "name": "João Silva",
      "role": "ADMIN",
      "tenantId": "tenant-uuid",
      "avatarUrl": "https://...",
      "createdAt": "2026-02-15T10:00:00Z"
    }
  },
  "statusCode": 200
}
```

**Erros:**
- 401: Email ou senha incorretos
- 400: Validação falhou

---

### POST /api/auth/logout
Realiza logout do usuário (opcional no frontend).

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "message": "Logout realizado com sucesso",
  "statusCode": 200
}
```

---

## 👥 Users

### GET /api/users
Lista todos os usuários do tenant.

**Query Params:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `search` (optional): busca por nome/email
- `role` (optional): filtrar por role

**Response (200):**
```json
{
  "data": [
    {
      "id": "user-1",
      "name": "João Silva",
      "email": "joao@example.com",
      "role": "ADMIN",
      "isActive": true,
      "createdAt": "2026-02-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### GET /api/users/:id
Retorna detalhes de um usuário específico.

**Response (200):**
```json
{
  "data": {
    "id": "user-1",
    "name": "João Silva",
    "email": "joao@example.com",
    "role": "ADMIN",
    "tenantId": "tenant-1",
    "avatarUrl": "https://...",
    "isActive": true,
    "createdAt": "2026-02-15T10:00:00Z",
    "updatedAt": "2026-02-15T10:00:00Z"
  }
}
```

---

### POST /api/users
Cria um novo usuário.

**Request:**
```json
{
  "name": "Maria Santos",
  "email": "maria@example.com",
  "password": "senha123",
  "role": "USER"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "user-new",
    "name": "Maria Santos",
    "email": "maria@example.com",
    "role": "USER",
    "tenantId": "tenant-1",
    "isActive": true,
    "createdAt": "2026-02-15T10:00:00Z"
  }
}
```

**Erros:**
- 400: Email já cadastrado / dados inválidos
- 403: Sem permissão para criar usuário

---

### PATCH /api/users/:id
Atualiza informações de um usuário.

**Request:**
```json
{
  "name": "Maria Santos Silva",
  "avatarUrl": "https://avatar.url",
  "isActive": true
}
```

**Response (200):** Usuário atualizado

---

### DELETE /api/users/:id
Deleta um usuário.

**Response (204):** Sem conteúdo

---

### POST /api/users/:id/change-password
Altera a senha do usuário.

**Request:**
```json
{
  "currentPassword": "senha123",
  "newPassword": "novaSenha123"
}
```

**Response (200):**
```json
{
  "message": "Senha alterada com sucesso"
}
```

---

## 🚗 Drivers (Motoristas)

### GET /api/drivers
Lista todos os motoristas.

**Query Params:**
- `page`, `limit`, `sort`
- `status` (optional): IDLE, BUSY, UNAVAILABLE
- `search` (optional): por nome ou CPF

**Response (200):**
```json
{
  "data": [
    {
      "id": "driver-1",
      "name": "Carlos Roberto",
      "cpf": "12345678901",
      "email": "carlos@example.com",
      "phone": "11999999999",
      "cnh": "9876543210",
      "cnhCategory": "B",
      "cnhExpiration": "2026-12-31",
      "rating": 4.8,
      "totalDeliveries": 342,
      "status": "IDLE",
      "vehicleId": "vehicle-1",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### GET /api/drivers/:id
Detalhes de um motorista específico.

---

### POST /api/drivers
Cria um novo motorista.

**Request:**
```json
{
  "name": "Pedro Oliveira",
  "cpf": "12345678901",
  "email": "pedro@example.com",
  "phone": "11998765432",
  "cnh": "9876543210",
  "cnhCategory": "B",
  "cnhExpiration": "2026-12-31"
}
```

---

### PATCH /api/drivers/:id
Atualiza motorista.

---

### DELETE /api/drivers/:id
Deleta motorista.

---

### GET /api/drivers/:id/routes
Lista rotas de um motorista.

**Response:**
```json
{
  "data": [
    {
      "id": "route-1",
      "routeNumber": "RT-001",
      "date": "2026-02-15",
      "status": "COMPLETED",
      "totalDeliveries": 15,
      "estimatedDistance": 45.5,
      "actualDistance": 47.2
    }
  ]
}
```

---

### POST /api/drivers/:id/location
Registra a localização atual do motorista (GPS).

**Request:**
```json
{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "accuracy": 5.5,
  "speed": 45.5,
  "heading": 90
}
```

**Response (201):**
```json
{
  "data": {
    "id": "location-event-1",
    "driverId": "driver-1",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "timestamp": "2026-02-15T10:30:00Z",
    "speed": 45.5
  }
}
```

---

## 🚚 Vehicles (Veículos)

### GET /api/vehicles
Lista todos os veículos.

**Query Params:**
- `status` (optional): AVAILABLE, BUSY, MAINTENANCE
- `search` (optional): por placa

**Response (200):**
```json
{
  "data": [
    {
      "id": "vehicle-1",
      "plate": "ABC1234",
      "model": "Sprinter",
      "brand": "Mercedes",
      "year": 2023,
      "fuelType": "DIESEL",
      "capacityWeight": 3500,
      "capacityVolume": 12.5,
      "mileage": 15420,
      "status": "AVAILABLE",
      "driverId": "driver-1",
      "lastMaintenance": "2026-01-20T10:00:00Z",
      "nextMaintenance": "2026-03-20T10:00:00Z",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST /api/vehicles
Cria novo veículo.

**Request:**
```json
{
  "plate": "XYZ9876",
  "model": "Fiorino",
  "brand": "Fiat",
  "year": 2023,
  "fuelType": "GASOLINA",
  "capacityWeight": 1500,
  "capacityVolume": 5.2
}
```

---

### PATCH /api/vehicles/:id/maintenance
Registra manutenção.

**Request:**
```json
{
  "type": "PREVENTIVA",
  "description": "Revisão dos 20.000 km",
  "cost": 850.00,
  "nextScheduled": "2026-05-15T10:00:00Z"
}
```

---

## 🏢 Customers (Clientes)

### GET /api/customers
Lista clientes.

**Query Params:**
- `tenantId` (required)
- `status` (optional): ACTIVE, INACTIVE
- `segment` (optional): tipo de cliente
- `search` (optional): por nome/CNPJ

**Response (200):**
```json
{
  "data": [
    {
      "id": "customer-1",
      "legalName": "Empresa Exemplo LTDA",
      "tradeName": "Exemplo Shop",
      "cnpj": "12345678000190",
      "stateRegistration": "123.456.789.012",
      "email": "contato@exemplo.com",
      "phone": "1133334444",
      "whatsapp": "11999999999",
      "communicationPreference": "WHATSAPP",
      "segment": "RETAIL",
      "status": "ACTIVE",
      "creditLimit": 50000.00,
      "location": {
        "latitude": -23.5505,
        "longitude": -46.6333
      },
      "sellerId": "seller-1",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### POST /api/customers/import
Importa clientes de arquivo CSV.

**Request:**
```
Content-Type: multipart/form-data

file: <arquivo CSV>
```

**CSV Format:**
```
legalName,tradeName,cnpj,email,phone,whatsapp,segment
Empresa 1,Shop 1,12345678000190,contato1@example.com,1133334444,11999999999,RETAIL
Empresa 2,Shop 2,12345678000191,contato2@example.com,1133334445,11999999998,WHOLESALE
```

**Response (201):**
```json
{
  "data": {
    "imported": 2,
    "failed": 0,
    "errors": []
  }
}
```

---

### GET /api/customers/:id/deliveries
Histórico de entregas de um cliente.

**Response:**
```json
{
  "data": [
    {
      "id": "delivery-1",
      "orderId": "PED-001",
      "date": "2026-02-15",
      "product": "Eletrônicos",
      "volume": 5,
      "status": "DELIVERED",
      "routeId": "route-1"
    }
  ]
}
```

---

## 📦 Routes (Rotas)

### GET /api/routes
Lista rotas.

**Query Params:**
- `tenantId` (required)
- `days` (optional): últimos N dias
- `status` (optional): PLANNED, IN_PROGRESS, COMPLETED

**Response (200):**
```json
{
  "data": [
    {
      "id": "route-1",
      "routeNumber": "RT-20260215-001",
      "date": "2026-02-15",
      "status": "IN_PROGRESS",
      "driverId": "driver-1",
      "vehicleId": "vehicle-1",
      "totalDeliveries": 12,
      "estimatedDistance": 45.5,
      "actualDistance": null,
      "estimatedDuration": 180,
      "actualDuration": null,
      "createdAt": "2026-02-15T08:00:00Z",
      "deliveries": [
        {
          "id": "delivery-1",
          "orderId": "PED-001",
          "status": "IN_TRANSIT",
          "customerId": "customer-1",
          "priority": "NORMAL"
        }
      ]
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### GET /api/routes/:id
Detalhes de uma rota.

**Response (200):**
```json
{
  "data": {
    "id": "route-1",
    "routeNumber": "RT-20260215-001",
    "date": "2026-02-15",
    "status": "IN_PROGRESS",
    "driverId": "driver-1",
    "driver": {
      "id": "driver-1",
      "name": "Carlos Roberto",
      "phone": "11999999999"
    },
    "vehicleId": "vehicle-1",
    "vehicle": {
      "id": "vehicle-1",
      "plate": "ABC1234",
      "model": "Sprinter"
    },
    "totalDeliveries": 12,
    "estimatedDistance": 45.5,
    "estimatedDuration": 180,
    "deliveries": [
      {
        "id": "delivery-1",
        "orderId": "PED-001",
        "status": "IN_TRANSIT",
        "customerId": "customer-1",
        "customerName": "Empresa Exemplo",
        "address": "Rua das Flores, 123",
        "latitude": -23.5505,
        "longitude": -46.6333,
        "priority": "NORMAL",
        "product": "Eletrônicos",
        "volume": 5
      }
    ],
  }
}
```

---

### POST /api/routes/import
Importa e cria uma nova rota a partir de arquivo CSV.

**Request:**
```
Content-Type: multipart/form-data

file: <arquivo CSV>
```

**CSV Format:**
```
orderId,date,product,volume,customerName,address,latitude,longitude,priority
PED-001,2026-02-15,Eletrônicos,5,Empresa 1,Rua A 123,-23.5505,-46.6333,NORMAL
PED-002,2026-02-15,Roupas,3,Empresa 2,Rua B 456,-23.5510,-46.6340,HIGH
```

**Response (201):**
```json
{
  "data": {
    "id": "route-1",
    "routeNumber": "RT-20260215-001",
    "totalDeliveries": 2,
    "estimatedDistance": 12.5,
    "estimatedDuration": 60,
    "deliveries": [
      {
        "id": "delivery-1",
        "orderId": "PED-001",
        "status": "PENDING"
      },
      {
        "id": "delivery-2",
        "orderId": "PED-002",
        "status": "PENDING"
      }
    ]
  }
}
```

---

### GET /api/routes/dashboard
Estatísticas do dashboard.

**Query Params:**
- `tenantId` (required)
- `days` (optional, default: 7)

**Response (200):**
```json
{
  "data": {
    "routesToday": 5,
    "routesThisWeek": 28,
    "totalDeliveries": 342,
    "successRate": 96.5,
    "averageDistance": 45.2,
    "averageDuration": 165,
    "totalDrivers": 12,
    "totalVehicles": 10,
    "totalCustomers": 87,
    "dailyDeliveries": [
      {
        "date": "2026-02-15",
        "count": 45,
        "success": 43,
        "failed": 2
      }
    ],
    "routeStatus": [
      {
        "status": "COMPLETED",
        "count": 20,
        "percentage": 71.4
      },
      {
        "status": "IN_PROGRESS",
        "count": 5,
        "percentage": 17.9
      },
      {
        "status": "PLANNED",
        "count": 3,
        "percentage": 10.7
      }
    ]
  }
}
```

---

### PATCH /api/routes/:id
Atualiza uma rota.

**Request:**
```json
{
  "status": "IN_PROGRESS",
  "driverId": "driver-1",
  "vehicleId": "vehicle-1"
}
```

---

### DELETE /api/routes/:id
Deleta uma rota.

**Response (204):** Sem conteúdo

---

### PATCH /api/routes/deliveries/:id/status
Atualiza o status de uma entrega.

**Request:**
```json
{
  "status": "DELIVERED",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "notes": "Entregue com sucesso",
  "photo": "base64-encoded-image" (opcional)
}
```

**Response (200):**
```json
{
  "data": {
    "id": "delivery-1",
    "orderId": "PED-001",
    "status": "DELIVERED",
    "deliveredAt": "2026-02-15T14:30:00Z",
    "latitude": -23.5505,
    "longitude": -46.6333
  }
}
```

---

## 📋 Deliveries (Entregas)

### GET /api/deliveries
Lista entregas.

**Query Params:**
- `tenantId` (required)
- `status` (optional): PENDING, IN_TRANSIT, DELIVERED, FAILED
- `routeId` (optional): filtrar por rota
- `driverId` (optional): filtrar por motorista

---

### GET /api/deliveries/:id
Detalhes de uma entrega.

---

### POST /api/deliveries/:id/confirm
Confirma uma entrega.

**Request:**
```json
{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "signature": "base64-image",
  "notes": "Entregue sem problemas"
}
```

---

### POST /api/deliveries/:id/photo
Upload de foto de comprovante.

**Request:**
```
Content-Type: multipart/form-data

photo: <image file>
```

**Response (201):**
```json
{
  "data": {
    "url": "https://s3.amazonaws.com/bucket/..."
  }
}
```

---

## 🚨 Occurrences (Incidentes)

### GET /api/occurrences
Lista incidentes.

**Query Params:**
- `tenantId` (required)
- `status` (optional)
- `deliveryId` (optional)
- `driverId` (optional)

---

### POST /api/occurrences
Cria novo incidente.

**Request:**
```json
{
  "deliveryId": "delivery-1",
  "driverId": "driver-1",
  "type": "DELIVERY_FAILURE",
  "description": "Cliente não encontrado no endereço",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "attachments": ["url1", "url2"]
}
```

**Response (201):**
```json
{
  "data": {
    "id": "occurrence-1",
    "deliveryId": "delivery-1",
    "type": "DELIVERY_FAILURE",
    "status": "OPEN",
    "createdAt": "2026-02-15T14:30:00Z"
  }
}
```

---

## 📍 Journey (Rastreamento)

### POST /api/journey/location
Registra localização do motorista.

**Request:**
```json
{
  "latitude": -23.5505,
  "longitude": -46.6333,
  "accuracy": 5.5,
  "speed": 45.5,
  "heading": 90
}
```

---

### GET /api/journey/:driverId/current
Localização atual de um motorista.

**Response (200):**
```json
{
  "data": {
    "driverId": "driver-1",
    "latitude": -23.5505,
    "longitude": -46.6333,
    "accuracy": 5.5,
    "speed": 45.5,
    "heading": 90,
    "timestamp": "2026-02-15T14:30:00Z"
  }
}
```

---

### GET /api/journey/:driverId/history
Histórico de movimentação.

**Query Params:**
- `from` (optional): data inicial (YYYY-MM-DD)
- `to` (optional): data final (YYYY-MM-DD)
- `limit` (optional, default: 1000)

---

### GET /api/journey/:routeId/track
Rastreamento em tempo real de uma rota.

**Response (200):**
```json
{
  "data": {
    "routeId": "route-1",
    "driver": {
      "id": "driver-1",
      "name": "Carlos Roberto",
      "latitude": -23.5505,
      "longitude": -46.6333,
      "speed": 45.5
    },
    "nextDelivery": {
      "id": "delivery-1",
      "orderId": "PED-001",
      "latitude": -23.5510,
      "longitude": -46.6340,
      "distance": 2.1,
      "estimatedTime": 5
    }
  }
}
```

---

## 🤖 AI (Inteligência Artificial)

### POST /api/ai/chat
Envia mensagem para chat com Gemini.

**Request:**
```json
{
  "message": "Qual foi a taxa de sucesso das entregas esta semana?",
  "conversationId": "conv-1" (optional)
}
```

**Response (200):**
```json
{
  "data": {
    "conversationId": "conv-1",
    "response": "A taxa de sucesso das entregas esta semana foi de 96.5%, com um total de 342 entregas realizadas...",
    "timestamp": "2026-02-15T14:30:00Z"
  }
}
```

---

### POST /api/ai/stream-chat
Chat com stream (para respostas longas).

**Request:**
```json
{
  "message": "Analise as rotas de hoje e sugira otimizações",
  "conversationId": "conv-1"
}
```

**Response:** Stream de texto (Content-Type: text/event-stream)

---

### POST /api/ai/analyze-route
Análise inteligente de uma rota.

**Request:**
```json
{
  "routeId": "route-1"
}
```

**Response (200):**
```json
{
  "data": {
    "routeId": "route-1",
    "analysis": "A rota possui paradas muito distantes...",
    "suggestions": [
      "Reorganizar entregas por proximidade",
      "Considerar usar dois motoristas para esta rota"
    ],
    "estimatedImprovement": "15% redução de tempo"
  }
}
```

---

## 💬 WhatsApp / Webhooks

### Webhook: POST /api/webhook/zapi
Recebe mensagens da Z-API (WhatsApp).

**Request (exemplo):**
```json
{
  "payload": {
    "messageId": "msg_id",
    "phone": "5511999999999",
    "text": "Entrega confirmada"
  }
}
```

> Observação: o endpoint também aceita payload direto sem o wrapper `payload`.

**Bot por papel (resumo):**
- **Motorista**: comandos operacionais (entrega, falha, pausa, jornada, etc.)
- **Motorista Terceiro**: comandos operacionais limitados (início, entrega/falha, chegada/descarga, resumo/lista)
- **Supervisor/Transportador**: resumo, listar pendentes, status/detalhes de nota
- **Vendedor**: status/detalhes e lista de pendentes
- **Cliente**: status/detalhes da nota

**Configuração de papéis no tenant:**
```json
{
  "whatsappRoles": {
    "supervisorPhones": ["5511999999999"],
    "transporterPhones": ["5511888888888"]
  }
}
```

**Exemplos de mensagens aceitas:**
- "Entreguei a nota 123" (Motorista)
- "Status da nota 123" (Cliente/Vendedor/Supervisor/Transportador)
- "Resumo" (Motorista/Supervisor/Transportador)

---

### Webhook: POST /api/webhook/whatsapp
Endpoint legado (compatibilidade). Aceita o mesmo formato de `/webhook/zapi`.

---

### Webhook: POST /api/webhook/sendpulse
Recebe eventos do SendPulse.

**Request (exemplo):**
```json
{
  "events": [
    { "event": "message", "from": "5511999999999", "text": "Oi" }
  ]
}
```

**Response (200):**
```json
{
  "status": "OK"
}
```

---

## 📧 Email

### POST /api/mail/send
Envia email (endpoint interno).

**Request:**
```json
{
  "to": "user@example.com",
  "subject": "Confirmação de Entrega",
  "template": "delivery-confirmation",
  "context": {
    "orderId": "PED-001",
    "customerName": "João Silva"
  }
}
```

---

## 📁 Storage (AWS S3)

### POST /api/storage/upload
Upload de arquivo.

**Request:**
```
Content-Type: multipart/form-data

file: <arquivo>
```

**Response (201):**
```json
{
  "data": {
    "url": "https://zaproute-bucket.s3.amazonaws.com/...",
    "key": "uploads/2026/02/file.jpg",
    "size": 524288
  }
}
```

---

### GET /api/storage/presigned-url
Gera URL presignada para download.

**Query Params:**
- `key` (required): chave do arquivo

**Response (200):**
```json
{
  "data": {
    "url": "https://zaproute-bucket.s3.amazonaws.com/...?X-Amz-Signature=..."
  }
}
```

---

## 📊 Backoffice (Admin)

### GET /api/backoffice/dashboard
Dashboard administrativo.

**Response (200):**
```json
{
  "data": {
    "totalTenants": 45,
    "activeTenants": 42,
    "totalRoutes": 3450,
    "totalDeliveries": 45320,
    "globalSuccessRate": 97.2,
    "topTenants": [
      {
        "id": "tenant-1",
        "name": "Empresa A",
        "routes": 450,
        "deliveries": 5200,
        "successRate": 98.5
      }
    ]
  }
}
```

---

### GET /api/backoffice/audit-logs
Logs de auditoria.

**Query Params:**
- `tenantId` (optional)
- `action` (optional): CREATE, UPDATE, DELETE
- `from` (optional): data inicial
- `to` (optional): data final

---

### GET /api/backoffice/reports
Relatórios executivos.

**Query Params:**
- `type` (required): monthly, weekly, custom
- `from`, `to` (optional para custom)

---

## 🔍 Health Check

### GET /api/health
Status da aplicação.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-02-15T14:30:00Z",
  "database": "connected",
  "redis": "connected"
}
```

---

## 📑 Sellers (Vendedores)

### GET /api/sellers
Lista vendedores.

**Query Params:**
- `status` (optional): ACTIVE, INACTIVE

---

### POST /api/sellers
Cria vendedor.

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "11999999999"
}
```

---

**Última atualização:** 15 de fevereiro de 2026
