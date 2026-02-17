# 🧪 Testing & Quality Assurance - ZapRoute v2

Estratégia completa de testes, cobertura de código e boas práticas de QA.

---

## 📊 Estratégia de Testes

### Pirâmide de Testes

```
        ▲
       / \
      /   \  E2E (10%)
     /─────\  Teste full user journey
    /       \
   /  ───────\ Integration (20%)
  /  / API /   \ Testes de componentes integrados
 / /─────────   \
/─/  ───────────\ Unit (70%)
─────────────────  Testes de funções isoladas
```

### Distribuição de Esforço
- **Unit Tests:** 70% (Serviços, utilidades)
- **Integration:** 20% (Controllers, middleware)
- **E2E:** 10% (Fluxos críticos de usuário)

### ✅ Status Atual (Implementado)

**7 Suites de Teste Implementadas:**
- ✅ `auth.service.spec.ts` - Autenticação, JWT, recuperação de senha
- ✅ `routes.service.spec.ts` - Criação e importação de rotas
- ✅ `security.controller.spec.ts` - CSRF, rate limiting
- ✅ `deliveries.service.spec.ts` - Paginação de entregas
- ✅ `occurrences.service.spec.ts` - Listagem de ocorrências
- ✅ `drivers.service.spec.ts` - CRUD, performance, WhatsApp
- ✅ `vehicles.service.spec.ts` - CRUD, importação massiva

**Cobertura Atual:** ~40% (Meta: 80%)

---

## 🧬 Testes Unitários (Jest)

### Configuração (jest.config.js)

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Exemplo: Teste de Serviço

```typescript
// drivers.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DriversService } from './drivers.service';
import { PrismaService } from '../prisma.service';

describe('DriversService', () => {
  let service: DriversService;
  let prisma: PrismaService;

  // Setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        {
          provide: PrismaService,
          useValue: {
            driver: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('findOne', () => {
    it('deve retornar um motorista por ID', async () => {
      const driver = {
        id: '1',
        name: 'João',
        phone: '11999999999',
      };

      jest.spyOn(prisma.driver, 'findUnique').mockResolvedValue(driver);

      const result = await service.findOne('1', 'tenant-1');

      expect(result).toEqual(driver);
      expect(prisma.driver.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('deve lançar erro se motorista não encontrado', async () => {
      jest.spyOn(prisma.driver, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('999', 'tenant-1')).rejects.toThrow(
        'Motorista não encontrado'
      );
    });
  });

  describe('create', () => {
    it('deve criar um novo motorista com dados válidos', async () => {
      const createDto = {
        name: 'Carlos',
        cpf: '12345678901',
        phone: '11998765432',
      };

      const createdDriver = { id: '1', ...createDto };

      jest.spyOn(prisma.driver, 'create').mockResolvedValue(createdDriver);

      const result = await service.create('tenant-1', createDto);

      expect(result).toEqual(createdDriver);
      expect(prisma.driver.create).toHaveBeenCalledWith({
        data: { ...createDto, tenantId: 'tenant-1' },
      });
    });

    it('deve validar CPF antes de criar', async () => {
      const invalidDto = {
        name: 'Carlos',
        cpf: 'invalid',
        phone: '11998765432',
      };

      await expect(service.create('tenant-1', invalidDto)).rejects.toThrow(
        'CPF inválido'
      );
    });
  });
});
```

### Exemplo: Teste de Controller

```typescript
// drivers.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';

describe('DriversController', () => {
  let controller: DriversController;
  let service: DriversService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriversController],
      providers: [
        {
          provide: DriversService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DriversController>(DriversController);
    service = module.get<DriversService>(DriversService);
  });

  describe('GET /drivers', () => {
    it('deve retornar lista de motoristas', async () => {
      const drivers = [
        { id: '1', name: 'João' },
        { id: '2', name: 'Maria' },
      ];

      jest.spyOn(service, 'findAll').mockResolvedValue(drivers);

      const result = await controller.findAll('tenant-1');

      expect(result).toEqual(drivers);
      expect(service.findAll).toHaveBeenCalledWith('tenant-1');
    });
  });

  describe('POST /drivers', () => {
    it('deve criar novo motorista com dados válidos', async () => {
      const createDto = {
        name: 'Carlos',
        cpf: '12345678901',
        phone: '11998765432',
      };

      const request = { user: { tenantId: 'tenant-1' } };

      jest.spyOn(service, 'create').mockResolvedValue({
        id: '1',
        ...createDto,
      });

      const result = await controller.create(createDto, request);

      expect(result.id).toBeDefined();
      expect(service.create).toHaveBeenCalledWith('tenant-1', createDto);
    });
  });
});
```

---

## 🔗 Testes de Integração

### Teste de Fluxo Completo

```typescript
// routes.integration.spec.ts
describe('Routes Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = moduleFixture.get(PrismaService);

    // Setup: criar tenant, usuário e obter token
    const tenant = await prisma.tenant.create({
      data: { name: 'Test Co', cnpj: '12345678000190' },
    });

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed_password',
        name: 'Test User',
        tenantId: tenant.id,
        role: 'ADMIN',
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password',
      });

    jwtToken = loginResponse.body.data.access_token;
  });

  afterAll(async () => {
    // Limpeza
    await prisma.route.deleteMany({});
    await prisma.tenant.deleteMany({});
    await app.close();
  });

  describe('Route Import Flow', () => {
    it('deve importar rota de CSV com sucesso', async () => {
      const csvContent = `
        orderId,date,product,volume,customerName,address,latitude,longitude
        PED-001,2026-02-15,Eletrônicos,5,Empresa 1,Rua A 123,-23.5505,-46.6333
        PED-002,2026-02-15,Roupas,3,Empresa 2,Rua B 456,-23.5510,-46.6340
      `;

      const response = await request(app.getHttpServer())
        .post('/api/routes/import')
        .set('Authorization', `Bearer ${jwtToken}`)
        .attach('file', Buffer.from(csvContent));

      expect(response.status).toBe(201);
      expect(response.body.data.totalDeliveries).toBe(2);
      expect(response.body.data.estimatedDistance).toBeGreaterThan(0);
    });

    it('deve falhar com CSV inválido', async () => {
      const invalidCsv = 'invalid,csv,data';

      const response = await request(app.getHttpServer())
        .post('/api/routes/import')
        .set('Authorization', `Bearer ${jwtToken}`)
        .attach('file', Buffer.from(invalidCsv));

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Complete Delivery Flow', () => {
    it('deve completar fluxo de entrega (criação → execução → conclusão)', async () => {
      // 1. Criar rota
      const routeRes = await request(app.getHttpServer())
        .post('/api/routes')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          date: '2026-02-15',
          tenantId: 'tenant-1',
        });

      const routeId = routeRes.body.data.id;

      // 2. Atribuir motorista
      const assignRes = await request(app.getHttpServer())
        .patch(`/api/routes/${routeId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          status: 'IN_PROGRESS',
          driverId: 'driver-1',
        });

      expect(assignRes.status).toBe(200);
      expect(assignRes.body.data.status).toBe('IN_PROGRESS');

      // 3. Confirmar entrega
      const deliveries = assignRes.body.data.deliveries;
      const firstDelivery = deliveries[0];

      const confirmRes = await request(app.getHttpServer())
        .patch(`/api/routes/deliveries/${firstDelivery.id}/status`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          status: 'DELIVERED',
          latitude: -23.5505,
          longitude: -46.6333,
        });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.data.status).toBe('DELIVERED');
    });
  });
});
```

---

## 🎭 Testes E2E (End-to-End)

**Arquivo:** `test/app.e2e-spec.ts`

```typescript
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Authentication (E2E)', () => {
    it('deve fazer login, acessar recurso e fazer logout', async () => {
      // 1. Login
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'password123',
        })
        .expect(200);

      const { access_token } = loginRes.body.data;

      // 2. Usar token para acessar API
      const resourceRes = await request(app.getHttpServer())
        .get('/api/drivers?tenantId=tenant-1')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(resourceRes.body.data).toBeDefined();

      // 3. Token inválido deve falhar
      await request(app.getHttpServer())
        .get('/api/drivers?tenantId=tenant-1')
        .set('Authorization', 'Bearer invalid')
        .expect(401);
    });
  });

  describe('Security (E2E)', () => {
    it('deve bloquear SQL injection', async () => {
      const malicious = "'; DROP TABLE drivers; --";

      const res = await request(app.getHttpServer())
        .get(`/api/drivers?search=${malicious}`)
        .expect(200);

      // Deve retornar vazio, não quebrar
      expect(res.body.data).toBeDefined();
    });

    it('deve enforçar multi-tenancy', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/drivers?tenantId=other-tenant')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);  // Forbidden

      expect(res.body.error).toBeDefined();
    });
  });

  describe('Rate Limiting (E2E)', () => {
    it('deve bloquear após 100 requisições por minuto', async () => {
      const promises = [];

      // Fazer 101 requisições
      for (let i = 0; i < 101; i++) {
        promises.push(
          request(app.getHttpServer()).get('/api/health')
        );
      }

      const results = await Promise.all(promises);

      // Pelo menos a última deve ser 429 (Too Many Requests)
      const hasRateLimited = results.some(r => r.status === 429);

      expect(hasRateLimited).toBe(true);
    }, 30000);  // 30 segundo timeout
  });
});
```

---

## 📊 Cobertura de Código

### Executar Testes com Coverage

```bash
# Unit tests com coverage
npm run test:cov

# Saída esperada:
# ======== Coverage summary ========
# Statements   : 85% ( 1200/1412 )
# Branches     : 82% ( 156/190 )
# Functions    : 88% ( 120/136 )
# Lines        : 85% ( 1180/1388 )
# =====================================

# Ver relatório HTML
open coverage/index.html
```

### Metas de Cobertura

| Tipo | Meta | Crítica |
|------|------|---------|
| Statements | 80% | 90% |
| Branches | 75% | 85% |
| Functions | 80% | 90% |
| Lines | 80% | 90% |

---

## 🔍 Quality Gates (SonarQube)

### Configuração (sonar-project.properties)

```properties
sonar.projectKey=zaproute
sonar.projectName=ZapRoute
sonar.projectVersion=2.0.0

sonar.sources=src
sonar.tests=src,test
sonar.test.inclusions=**/*.spec.ts,**/*.e2e-spec.ts

sonar.javascript.lcov.reportPaths=coverage/lcov.info

sonar.qualitygate.wait=true
```

### Quality Gate Rules

- ✅ Coverage >= 80%
- ✅ Code Smells < 10
- ✅ Bugs = 0
- ✅ Security Hotspots reviewed
- ✅ Duplicated Code < 5%

---

## 🧹 Linting & Formatting

### ESLint

```bash
# Instalar
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Executar
npm run lint

# Fix automático
npm run lint:fix
```

### Prettier

```bash
# Instalar
npm install --save-dev prettier

# Executar
npm run format

# Verificar
npm run format:check
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint:fix
npm run format
npm test -- --bail
```

---

## 📝 Boas Práticas de Testes

### 1. Padrão AAA (Arrange-Act-Assert)

```typescript
it('deve calcular taxa de sucesso corretamente', () => {
  // Arrange: preparar dados
  const successCount = 95;
  const totalCount = 100;

  // Act: executar função
  const rate = calculateSuccessRate(successCount, totalCount);

  // Assert: validar resultado
  expect(rate).toBe(95);
});
```

### 2. Descrever o Comportamento Esperado

```typescript
// ❌ Errado
it('works', () => { ... });

// ✅ Correto
it('deve retornar motorista com status IDLE quando criado', () => { ... });
```

### 3. Uma Assertion por Teste (quando possível)

```typescript
// ❌ Errado
it('deve fazer múltiplas coisas', () => {
  expect(result.id).toBeDefined();
  expect(result.name).toBe('João');
  expect(result.status).toBe('IDLE');
});

// ✅ Correto
describe('Driver creation', () => {
  it('deve gerar ID único', () => {
    expect(result.id).toBeDefined();
  });

  it('deve armazenar nome corretamente', () => {
    expect(result.name).toBe('João');
  });

  it('deve iniciar com status IDLE', () => {
    expect(result.status).toBe('IDLE');
  });
});
```

### 4. Mockar Dependências Externas

```typescript
// ❌ Errado - faz chamada real
const result = await sendEmail(email);

// ✅ Correto - mocka o serviço
jest.spyOn(mailService, 'send').mockResolvedValue({ success: true });
const result = await mailService.send(email);
```

### 5. Testar Casos de Erro

```typescript
describe('Error Cases', () => {
  it('deve lançar erro quando motorista não existe', async () => {
    await expect(
      service.getDriver('invalid-id', 'tenant-1')
    ).rejects.toThrow('Motorista não encontrado');
  });

  it('deve retornar status 400 para dados inválidos', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/drivers')
      .send({ name: '' });  // Inválido

    expect(response.status).toBe(400);
  });
});
```

---

## 🎯 Checklist de QA

- [ ] Todos os testes passando
- [ ] Coverage >= 80%
- [ ] Sem warnings do linter
- [ ] Código formatado com Prettier
- [ ] Sem console.log em produção
- [ ] Sem comentários de debug
- [ ] Variáveis de ambiente validadas
- [ ] Senhas hasheadas antes de salvar
- [ ] Inputs validados com DTO
- [ ] Erros tratados apropriadamente
- [ ] Logs estruturados
- [ ] Performance aceitável (< 200ms para endpoints)
- [ ] Memory leaks verificados
- [ ] Segurança validada (OWASP)

---

**Última atualização:** 15 de fevereiro de 2026
