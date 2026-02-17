# 🔐 Security & Best Practices - ZapRoute v2

Guia de segurança, boas práticas e compliance para o projeto.

---

## 🛡️ Camadas de Segurança

### 1. Transporte (HTTPS/TLS)
- ✅ HTTPS obrigatório em produção
- ✅ TLS 1.3 mínimo
- ✅ Certificados com renovação automática (Let's Encrypt)
- ✅ HSTS headers habilitados

**Configuração (main.ts):**
```typescript
app.use(helmet({
  hsts: {
    maxAge: 31536000, // 1 ano
    includeSubDomains: true,
    preload: true,
  },
}));
```

### 2. CORS (Cross-Origin)
- ✅ Apenas domínios autorizados
- ✅ Métodos explicitamente permitidos
- ✅ Credentials habilitado

**Configuração:**
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(','),
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Content-Type, Accept, Authorization, x-csrf-token',
  credentials: true,
});
```

### 3. CSRF Protection
- ✅ CSRF token em cookies httpOnly
- ✅ Validação em POST, PATCH, DELETE
- ✅ SameSite=Strict

**Middleware (main.ts):**
```typescript
app.use(csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  }
}));
```

### 4. Helmet.js (Security Headers)
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection
- ✅ Content-Security-Policy

**Configuração:**
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
```

### 5. Input Validation
- ✅ DTO com class-validator
- ✅ Tipos TypeScript
- ✅ Sanitização de entrada

**Exemplo:**
```typescript
export class CreateDriverDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsPhoneNumber()
  phone: string;

  @IsCpf()  // Custom validator
  cpf: string;
}
```

### 6. Rate Limiting
- ✅ 100 requisições/minuto por IP
- ✅ Proteção contra força bruta
- ✅ Limites customizados por endpoint

**Configuração (app.module.ts):**
```typescript
ThrottlerModule.forRoot([{
  ttl: 60000,     // 60 segundos
  limit: 100,     // 100 requisições
}]),

// Custom para login:
@Throttle(5, 60000)  // 5 tentativas por minuto
@Post('login')
async login(@Body() loginDto: LoginDto) { ... }
```

### 7. Autenticação JWT
- ✅ Tokens com expiração (24h padrão)
- ✅ Refresh token (rotação automática)
- ✅ Validação de assinatura

**Estratégia JWT (jwt.strategy.ts):**
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    // Validação da payload do token
    return { userId: payload.sub, tenantId: payload.tenantId };
  }
}
```

### 8. Password Security
- ✅ Bcrypt com salt rounds 10
- ✅ Mínimo 8 caracteres
- ✅ Complexidade obrigatória
- ✅ Hash antes de salvar

**Serviço (auth.service.ts):**
```typescript
async hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

async validatePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### 9. Multi-tenancy Isolation
- ✅ Filtro obrigatório de tenantId
- ✅ Guard customizado para tenants
- ✅ Teste de penetração entre tenants

**Guard (tenant.guard.ts):**
```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const userTenantId = request.user.tenantId;
    const queryTenantId = request.query.tenantId;

    if (userTenantId !== queryTenantId) {
      throw new ForbiddenException('Acesso negado a outro tenant');
    }

    return true;
  }
}
```

### 10. Logging & Monitoring
- ✅ Logs de acesso (IP, endpoint, status)
- ✅ Logs de erro (stack trace)
- ✅ Auditoria de ações sensíveis
- ✅ Sem senhas em logs

**Filter Global (http-exception.filter.ts):**
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ExecutionContext) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // Log sem informações sensíveis
    console.error(`[${request.method}] ${request.url} - Error`);

    // Não enviar stack trace em produção
    const httpStatus = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    httpAdapter.reply(response, {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
    }, httpStatus);
  }
}
```

---

## 🚫 Vulnerabilidades Comuns & Mitigação

### SQL Injection
**Risco:** Uso de string interpolation em queries SQL

**❌ Errado:**
```typescript
const results = await this.prisma.driver.findMany({
  where: {
    name: `%${userInput}%`  // Perigoso!
  }
});
```

**✅ Correto (Prisma):**
```typescript
const results = await this.prisma.driver.findMany({
  where: {
    name: { contains: userInput }  // Parametrizado
  }
});
```

### XSS (Cross-Site Scripting)
**Risco:** Injeção de JavaScript no HTML

**❌ Errado:**
```tsx
<div dangerouslySetInnerHTML={{ __html: userContent }} />
```

**✅ Correto (React padrão):**
```tsx
<div>{userContent}</div>  // Automaticamente escapado
```

### CSRF (Cross-Site Request Forgery)
**Risco:** Requisição indesejada em nome do usuário

**✅ Mitigação:**
- Token CSRF em cookies httpOnly
- Validação em POST/PATCH/DELETE
- SameSite=Strict

### Broken Authentication
**Risco:** Senha fraca, token expirado não invalidado

**✅ Mitigação:**
- JWT com expiração
- Rate limiting em login
- Validação de senha forte
- Logout deve invalidar token

### Sensitive Data Exposure
**Risco:** Dados sensíveis em logs, responses

**❌ Errado:**
```typescript
console.log(`Login: ${email}, ${password}`);
return { password: user.password };
```

**✅ Correto:**
```typescript
console.log(`Login attempt: ${email}`);
return { id: user.id, name: user.name };
```

### API Injection
**Risco:** Manipulação de parâmetros de query/body

**✅ Mitigação:**
- Validação com DTO
- Tipo TypeScript
- Whitelist de campos

### Broken Access Control
**Risco:** Usuário acessa recursos de outro usuário

**✅ Mitigação:**
```typescript
@Get(':id')
async getDriver(@Param('id') id: string, @Req() req: any) {
  const driver = await this.driverService.findOne(id);
  
  // Validar ownership
  if (driver.tenantId !== req.user.tenantId) {
    throw new ForbiddenException();
  }
  
  return driver;
}
```

---

## 🔍 Testes de Segurança

### OWASP Top 10 Checks

```typescript
describe('Security Tests', () => {
  // 1. Injections
  it('should prevent SQL injection', async () => {
    const malicious = "'; DROP TABLE drivers; --";
    const result = await api.drivers.search(malicious);
    expect(result).toBeDefined();  // Não quebra
  });

  // 2. Broken Authentication
  it('should reject invalid JWT', async () => {
    const response = await api.get('/drivers', {
      headers: { Authorization: 'Bearer invalid' }
    });
    expect(response.status).toBe(401);
  });

  // 3. Sensitive Data Exposure
  it('should not expose password in response', async () => {
    const user = await api.users.get(userId);
    expect(user.password).toBeUndefined();
  });

  // 4. XXE & CSRF
  it('should reject requests without CSRF token', async () => {
    const response = await api.post('/routes', {}, {
      headers: { 'x-csrf-token': 'invalid' }
    });
    expect(response.status).toBe(403);
  });

  // 5. Access Control
  it('should not allow user to access another tenant', async () => {
    const response = await api.drivers.list(otherTenantId);
    expect(response.status).toBe(403);
  });
});
```

---

## 🔒 Boas Práticas de Código

### 1. Never Trust User Input
```typescript
// ❌ Errado
const data = JSON.parse(userInput);

// ✅ Correto
const data = JSON.parse(userInput);
if (!CreateRouteDto.isValid(data)) {
  throw new ValidationException();
}
```

### 2. Use Environment Variables
```typescript
// ❌ Errado
const secret = 'hardcoded-secret';

// ✅ Correto
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET não definido');
```

### 3. Logging Seguro
```typescript
// ❌ Errado
console.log('User login:', { email, password, token });

// ✅ Correto
console.log('User login:', { email, success: true });
```

### 4. Error Handling
```typescript
// ❌ Errado
catch (error) {
  return { error: error.message };  // Expõe detalhes
}

// ✅ Correto
catch (error) {
  logger.error(error);  // Log seguro
  return { error: 'Erro interno do servidor' };
}
```

### 5. Dependency Updates
```bash
# Verificar vulnerabilidades
npm audit

# Atualizar dependências
npm update

# Atualizar major versions com cuidado
npm outdated
```

---

## 📋 Compliance & Regulações

### LGPD (Lei Geral de Proteção de Dados)
- ✅ Consentimento para coleta de dados
- ✅ Direito a ser esquecido (delete account)
- ✅ Portabilidade de dados
- ✅ Breach notification (72h)

### GDPR (Se aplicável)
- ✅ Privacy by Design
- ✅ Data Processing Agreement
- ✅ Subprocessor management

### ISO 27001
- ✅ Controles de acesso
- ✅ Criptografia em trânsito e repouso
- ✅ Auditoria e logging
- ✅ Disaster recovery

---

## 🔐 Criptografia

### Em Trânsito
```typescript
// ✅ HTTPS obrigatório
// ✅ TLS 1.3
// ✅ Sem dados sensíveis em URL
```

### Em Repouso
```typescript
// Senhas com Bcrypt
const hashedPassword = await bcrypt.hash(password, 10);

// Tokens sensíveis encrypted
const encrypted = await encrypt(sensitiveData);

// S3 com server-side encryption
{
  ServerSideEncryption: 'AES256'
}
```

---

## 🚨 Incident Response

### Em Caso de Breach
1. **Imediatamente:**
   - Isolar sistema afetado
   - Coletar evidências
   - Notificar time de segurança

2. **Dentro de 24h:**
   - Investigação inicial
   - Patch/mitigação
   - Notificar afetados

3. **Dentro de 72h (LGPD):**
   - Relatório completo
   - Ações corretivas
   - Comunicado público

---

## 🛠️ Ferramentas de Segurança

### Scanning
```bash
# OWASP Dependency Check
npm install -g snyk
snyk test

# ESLint Security
npm install --save-dev eslint-plugin-security
```

### Penetration Testing
```bash
# Testar CORS
curl -H "Origin: http://evil.com" \
     -H "Access-Control-Request-Method: GET" \
     http://localhost:3000

# Testar Rate Limiting
for i in {1..150}; do
  curl http://localhost:3000/api/routes
done
```

---

## 📞 Security Policy

**Email de Segurança:** security@zaproute.com

**Processo:**
1. Reporte vulnerabilidade via email
2. Time confirma em 24h
3. Patch em 7-30 dias
4. Disclosure responsável

**Bug Bounty:** Disponível em [plataforma]

---

## ✅ Checklist de Segurança Pré-Deploy

- [ ] Todas as senhas são bcrypt hashed
- [ ] JWT_SECRET é uma string aleatória forte (>32 chars)
- [ ] Nenhuma credencial em .git
- [ ] HTTPS ativado
- [ ] CORS restrito a domínios específicos
- [ ] Rate limiting ativado
- [ ] CSRF protection ativado
- [ ] Headers de segurança (Helmet) ativados
- [ ] Logs não contêm informações sensíveis
- [ ] Todos os endpoints têm autenticação
- [ ] Multi-tenancy isolamento testado
- [ ] SQL injection testado
- [ ] XSS testado
- [ ] Breach testing/pentest realizado
- [ ] Plano de incident response documentado
- [ ] Backup testado
- [ ] Disaster recovery plano documentado

---

**Última atualização:** 15 de fevereiro de 2026
