# 🔧 Troubleshooting & Common Issues - ZapRoute v2

Guia para resolver problemas comuns em desenvolvimento, staging e produção.

---

## 🚀 Problemas de Inicialização

### Backend não inicia

**Sintoma:** `Error: cannot find module @nestjs/common`

**Solução:**
```bash
cd server
rm -rf node_modules package-lock.json
npm install

# Se persistir:
npm cache clean --force
npm install

# Verificar Node.js version
node --version  # Deve ser >= 18
```

---

**Sintoma:** `Port 3000 already in use`

**Solução:**
```bash
# macOS/Linux
lsof -i :3000
kill -9 <PID>

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Usar porta diferente
PORT=3001 npm run start:dev
```

---

**Sintoma:** `DATABASE_URL not found`

**Solução:**
```bash
# Criar .env na pasta server/
cat > server/.env << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/zaproute
JWT_SECRET=sua-chave-secreta
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
EOF

# Reiniciar
npm run start:dev
```

---

### Frontend não inicia

**Sintoma:** `ERR! code ERESOLVE`

**Solução:**
```bash
cd web
npm install --legacy-peer-deps

# Ou forçar resolução
npm install --force
```

---

**Sintoma:** Mapa Leaflet em branco

**Solução:**
```typescript
// Verificar se CSS do Leaflet está importado (index.css)
import 'leaflet/dist/leaflet.css';

// Ou via index.html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
```

---

## 💾 Problemas de Banco de Dados

### Connection refused

**Sintoma:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solução:**
```bash
# Verificar se PostgreSQL está rodando
psql -U postgres -c "SELECT 1"

# macOS - iniciar serviço
brew services start postgresql@15

# Linux
sudo systemctl start postgresql

# Docker
docker-compose up -d postgres
```

---

### Database does not exist

**Sintoma:** `error: database "zaproute" does not exist`

**Solução:**
```bash
# Criar database
createdb zaproute

# Ou via SQL
psql -U postgres -c "CREATE DATABASE zaproute;"

# Verificar
psql -l | grep zaproute
```

---

### Permission denied

**Sintoma:** `FATAL: Ident authentication failed for user`

**Solução:**
```bash
# Resetar password do usuário
psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'new_password';"

# Atualizar DATABASE_URL no .env
DATABASE_URL=postgresql://postgres:new_password@localhost:5432/zaproute

# Reiniciar servidor
npm run start:dev
```

---

### Migration failed

**Sintoma:** `An instance of PrismaClient was already instantiated`

**Solução:**
```bash
cd server

# Limpar Prisma Client
npm run prisma:generate

# Aplicar migrations novamente
npm run prisma:push

# Se quiser resetar tudo (desenvolvimento)
npx prisma migrate reset
```

---

**Sintoma:** `Migration lock detected`

**Solução:**
```bash
# Ver arquivo de lock
cat prisma/migrations/migration_lock.toml

# Forçar release (cuidado!)
npx prisma migrate resolve --rolled-back <migration_name>
```

---

## 🔐 Problemas de Autenticação

### Login sempre falha

**Sintoma:** `Email ou senha incorretos` (mesmo com credenciais corretas)

**Solução:**
```typescript
// Verificar se usuário existe no BD
// No Prisma Studio
npx prisma studio

// Ou query direta
SELECT email, password FROM users WHERE email = 'admin@example.com';

// Se não existe, criar:
const hashedPassword = await bcrypt.hash('password123', 10);
INSERT INTO users (id, email, password, tenantId, role, name)
VALUES ('uuid', 'admin@example.com', 'hashed', 'tenant-1', 'ADMIN', 'Admin');
```

---

### Token sempre inválido

**Sintoma:** `401 Unauthorized` em todos os endpoints

**Solução:**
```bash
# Verificar JWT_SECRET no .env
echo $JWT_SECRET

# Deve ser uma string aleatória longa (>32 caracteres)
# Gerar novo:
openssl rand -base64 32

# Copiar para .env e reiniciar
JWT_SECRET=seu-novo-secret-aqui
npm run start:dev
```

---

### CORS error "Origin not allowed"

**Sintoma:** Browser: `Access to XMLHttpRequest... blocked by CORS policy`

**Solução:**
```bash
# Verificar CORS_ORIGIN no .env
echo $CORS_ORIGIN

# Deve incluir o frontend URL
CORS_ORIGIN=http://localhost:5173,https://app.zaproute.com

# Reiniciar servidor
npm run start:dev

# Verificar headers na response
curl -H "Origin: http://localhost:5173" -v http://localhost:3000/api/health
```

---

## 🗺️ Problemas de Mapa

### Mapa não carrega

**Sintoma:** Tela branca onde mapa deveria estar

**Verificação:**
```typescript
// 1. Verificar se Leaflet está instalado
import { MapContainer, TileLayer } from 'react-leaflet';

// 2. Verificar CSS
import 'leaflet/dist/leaflet.css';

// 3. Verificar container tem altura
<div style={{ height: '600px' }}>
  <MapContainer center={[lat, lng]} zoom={12} style={{ height: '100%' }}>
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  </MapContainer>
</div>

// 4. Verificar coordenadas válidas
if (latitude < -90 || latitude > 90) {
  console.error('Latitude inválida');
}
```

---

### Marcadores não aparecem

**Sintoma:** Mapa carrega mas sem pontos

**Solução:**
```typescript
// Verificar se dados estão chegando
console.log('Drivers:', drivers);

// Verificar coordenadas válidas
drivers.forEach(d => {
  if (!d.latitude || !d.longitude) {
    console.warn('Driver sem coordenadas:', d.id);
  }
});

// Adicionar marcadores com erro handling
{drivers.map(driver => (
  <Marker 
    key={driver.id}
    position={[driver.latitude, driver.longitude]}
  >
    <Popup>{driver.name}</Popup>
  </Marker>
))}
```

---

## 🚨 Problemas de Requisições HTTP

### 404 Not Found

**Sintoma:** GET /api/drivers → 404

**Solução:**
```bash
# Verificar se rota está registrada
curl -v http://localhost:3000/api/health

# Ver rotas disponíveis (em development)
# Logs do NestJS mostram todas as rotas

# Verificar controller e module estão importados em app.module.ts
```

---

### 400 Bad Request (Validação falha)

**Sintoma:** `Validation failed`

**Solução:**
```typescript
// Verificar o DTO
@Post()
create(@Body() createDto: CreateDriverDto) { ... }

// Body enviado deve validar contra:
class CreateDriverDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsMobilePhone()
  phone: string;
}

// Verificar campos obrigatórios e tipos
// Exemplo correto:
{
  "name": "João Silva",
  "email": "joao@example.com",
  "phone": "+5511999999999"
}
```

---

### 413 Payload Too Large

**Sintoma:** Upload de arquivo grande falha

**Solução:**
```typescript
// Aumentar limite em main.ts
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true, limit: '50mb' }));

// Ou configurar específico por endpoint
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(
  @UploadedFile() file: Express.Multer.File,
) {
  // file.size
}
```

---

### 429 Too Many Requests

**Sintoma:** Rate limit hit

**Solução:**
```bash
# Esse é o comportamento esperado
# Para development, aumentar limite:

# Em app.module.ts
ThrottlerModule.forRoot([{
  ttl: 60000,
  limit: 1000,  // Aumentar para dev
}]),
```

---

## 🐛 Bugs Comuns em Runtime

### Undefined is not a function

**Sintoma:** `TypeError: this.routesService.findOne is not a function`

**Solução:**
```typescript
// Verificar se serviço está injetado no controller
constructor(private readonly routesService: RoutesService) {}

// Verificar se serviço está exportado no module
@Module({
  controllers: [RoutesController],
  providers: [RoutesService],  // Aqui!
  exports: [RoutesService],   // Se usado em outro módulo
})
export class RoutesModule {}

// Verificar sintaxe do método
async findOne(id: string, tenantId: string) {
  return this.prisma.route.findUnique({
    where: { id }
  });
}
```

---

### Maximum call stack exceeded

**Sintoma:** Stack overflow

**Solução:**
```typescript
// Geralmente é circular dependency
// Verificar imports em modelos

// ❌ Errado: A imports B, B imports A
// ✅ Correto: Usar forwardRef
@Module({
  imports: [forwardRef(() => OtherModule)]
})
```

---

### Cannot read property 'length' of undefined

**Sintoma:** Erro ao acessar array

**Solução:**
```typescript
// Sempre validar antes de usar
const drivers = data?.drivers || [];
const count = drivers.length;  // Seguro

// Ou optional chaining
const count = data?.drivers?.length ?? 0;
```

---

## 📊 Problemas de Performance

### Requisição lenta (> 1s)

**Solução:**
```typescript
// 1. Verificar query do Prisma
const drivers = await this.prisma.driver.findMany({
  where: { tenantId },
  // Usar paginação
  take: 20,
  skip: (page - 1) * 20,
});

// 2. Adicionar índices no BD
// driver.phone é índice crítico para WhatsApp webhook
@@index([phone])

// 3. Usar cache
import { Cache } from '@nestjs/cache-manager';

@Get()
@Cacheable()  // Cachear resultado
async findAll(@Query('tenantId') tenantId: string) { ... }

// 4. Profile com query analyzer
EXPLAIN ANALYZE SELECT * FROM drivers WHERE tenantId = 'xxx';
```

---

### Memory leak

**Solução:**
```bash
# Monitorar memory usage
node --inspect dist/main.js

# Abrir DevTools: chrome://inspect

# Procurar por:
# - Event listeners não removidos
# - Timers não clearados
# - Subscriptions não unsubscribed
```

---

## 🐳 Problemas com Docker

### Container não inicia

**Solução:**
```bash
# Ver logs
docker-compose logs api

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up

# Verificar Dockerfile
# Está rodando npm install?
# Está gerando Prisma?
```

---

**Sintoma:** `Database host not found`

**Solução:**
```yaml
# docker-compose.yml
services:
  api:
    depends_on:
      - postgres  # Aguardar postgres
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/zaproute
      # Use nome do serviço "postgres", não "localhost"
```

---

## 📱 Problemas em Produção

### Erro: JWT secret not found

**Solução:**
```bash
# Adicionar variável de ambiente
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
railway set JWT_SECRET=$(openssl rand -base64 32)
```

---

### Database connection pooling exhausted

**Solução:**
```typescript
// Aumentar pool size no .env
DATABASE_URL=postgresql://user:password@host/db?schema=public&pool_size=20

// Ou em datasource do Prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Já é ajustado pela URI
}
```

---

### Out of Memory

**Solução:**
```bash
# Aumentar memory limit
NODE_OPTIONS=--max-old-space-size=2048 npm run start:prod

# Ou em Dockerfile
ENV NODE_OPTIONS=--max-old-space-size=2048
CMD ["npm", "run", "start:prod"]
```

---

## 🆘 Quando tudo falha

### Reset completo do desenvolvimento

```bash
# Kill todos os processos Node
pkill -f "node"

# Limpar diretórios
rm -rf server/node_modules web/node_modules
rm -rf server/dist server/coverage

# Limpar banco de dados
dropdb zaproute
createdb zaproute

# Reinstalar
cd server && npm install && npm run prisma:push
cd ../web && npm install

# Iniciar fresh
npm run start:dev  # Em server/
npm run dev        # Em web/
```

---

### Onde procurar ajuda

1. **Logs do servidor**
   ```bash
   npm run start:dev 2>&1 | tee logs.txt
   grep "Error" logs.txt
   ```

2. **Network requests** (DevTools F12)
   - Aba Network
   - Procurar por requests que falharam
   - Ver response body do erro

3. **Database**
   ```bash
   npx prisma studio  # UI visual do BD
   ```

4. **Git history**
   ```bash
   git log --oneline | head -20
   git diff HEAD~1     # Ver última mudança
   ```

5. **Stack Overflow**
   - Buscar erro exato
   - Incluir stack trace

---

**Última atualização:** 15 de fevereiro de 2026
