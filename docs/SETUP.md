# 🚀 Setup & Deployment - ZapRoute v2

Guia completo para configuração do ambiente de desenvolvimento, instalação e deployment.

---

## 💻 Pré-requisitos

### Sistema Operacional
- macOS, Linux ou Windows (WSL2)
- Node.js >= 18.x
- npm >= 9.x
- Git

### Serviços Externos (Necessários)
- PostgreSQL 15+ (local ou cloud)
- AWS Account (S3, SES)
- Google Cloud (para Gemini AI)
- WhatsApp Business Account (opcional)

### Desenvolvimento Local
- Docker + Docker Compose (opcional, para PostgreSQL)
- VS Code (recomendado)
- Postman ou Insomnia (para testar API)

---

## 📦 Instalação Local

### 1. Clonar Repositório

```bash
git clone https://github.com/seu-repo/zaproutev2.git
cd zaproutev2
```

### 2. Configurar Backend

```bash
cd server

# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env

# Editar .env com suas credenciais
nano .env
```

### 3. Configurar Frontend

```bash
cd ../web

# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env

# Editar .env
nano .env
```

---

## 🔧 Configuração de Variáveis de Ambiente

### Backend `.env`

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/zaproute

# JWT
JWT_SECRET=sua-chave-super-secreta-aqui-min-32-chars
JWT_EXPIRATION=86400  # 24 horas em segundos

# AWS S3
AWS_ACCESS_KEY_ID=seu-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=zaproute-bucket

# AWS SES (Email)
AWS_SES_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@zaproute.com

# Google Gemini AI
GOOGLE_AI_KEY=sua-chave-gemini-api

# WhatsApp Business API
WHATSAPP_BUSINESS_ACCOUNT_ID=seu-account-id
WHATSAPP_BUSINESS_PHONE_ID=seu-phone-id
WHATSAPP_BUSINESS_TOKEN=seu-business-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu-webhook-token

# Email (Fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app
SMTP_FROM=noreply@zaproute.com

# Aplicação
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Redis (Opcional)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug
```

### Frontend `.env`

```bash
# API
VITE_API_URL=http://localhost:3000/api

# Google Gemini
VITE_GOOGLE_AI_KEY=sua-chave-gemini-api

# App
VITE_APP_NAME=ZapRoute
VITE_APP_VERSION=2.0.0
```

---

## 🗄️ Banco de Dados

### Opção 1: Docker Compose (Recomendado para Dev)

```bash
# Na raiz do projeto
docker-compose up -d

# Aguarde o Postgres iniciar (5 segundos)
sleep 5

# Aplicar migrations
cd server
npm run prisma:push

# Seed inicial (opcional)
npm run seed
```

### Opção 2: PostgreSQL Local

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Linux
sudo apt-get install postgresql-15
sudo systemctl start postgresql

# Criar database
createdb zaproute

# Criar usuário
createuser zaproute_user
psql -U postgres -c "ALTER USER zaproute_user WITH PASSWORD 'senha123';"
psql -U postgres -c "ALTER USER zaproute_user CREATEDB;"

# Ajustar DATABASE_URL no .env
DATABASE_URL=postgresql://zaproute_user:senha123@localhost:5432/zaproute

# Aplicar migrations
cd server
npm run prisma:push
```

### Opção 3: Cloud (Neon, Railway, Supabase)

```bash
# Exemplo com Neon (https://neon.tech)
# 1. Criar conta
# 2. Criar projeto
# 3. Copiar connection string
DATABASE_URL=postgresql://user:password@project.neon.tech/zaproute

# Aplicar migrations
npm run prisma:push
```

---

## 🚀 Desenvolvimento Local

### Iniciar Backend

```bash
cd server
npm run start:dev
```

**Esperado:**
```
🚀 Servidor rodando em: http://localhost:3000/api
```

### Iniciar Frontend

```bash
cd web
npm run dev
```

**Esperado:**
```
VITE v5.1.4  ready in 234 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### Acessar Aplicação

```
http://localhost:5173
```

**Credenciais de Teste:**
- Email: `admin@example.com`
- Senha: `password123`

---

## 🧪 Testes

### Testes Unitários

```bash
cd server

# Executar testes
npm test

# Watch mode
npm run test:watch

# Com coverage
npm run test:cov
```

### Testes E2E

```bash
cd server

# Executar testes E2E
npm run test:e2e
```

### Teste de API

```bash
# Com Postman ou Insomnia
# Importar collection: server/postman_collection.json

# Ou com cURL
curl -X GET http://localhost:3000/api/health
```

---

## 🐳 Docker (Produção)

### Build das Imagens

```bash
# Build da imagem do servidor
docker build -t zaproute-api:latest ./server

# Build da imagem do frontend
docker build -t zaproute-web:latest ./web

# Build com Docker Compose
docker-compose build
```

### Executar com Docker Compose

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Parar
docker-compose down
```

### Dockerfile do Servidor

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código
COPY . .

# Build NestJS
RUN npm run build

# Gerar Prisma
RUN npm run prisma:generate

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["npm", "run", "start:prod"]
```

### Dockerfile do Frontend

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🌐 Deployment

### Opção 1: Railway (Recomendado)

#### Configuração Rápida

```bash
# Instalar CLI do Railway
npm install -g @railway/cli

# Login
railway login

# Iniciar projeto
railway init

# Conectar repositório GitHub
# (segue prompts do CLI)

# Variáveis de ambiente
# Via dashboard Railway, adicionar:
# - DATABASE_URL
# - JWT_SECRET
# - AWS_ACCESS_KEY_ID
# - etc (todas do .env)

# Deploy
git push origin main
# Railway automaticamente faz deploy
```

#### Service.yaml (Railway)

```yaml
services:
  api:
    build:
      context: ./server
      dockerfile: Dockerfile
    port: 3000
    environment:
      DATABASE_URL: $DATABASE_URL
      JWT_SECRET: $JWT_SECRET
      NODE_ENV: production
    depends_on:
      - postgres

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    port: 80
    environment:
      VITE_API_URL: $API_URL

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: $POSTGRES_PASSWORD
      POSTGRES_DB: zaproute
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Opção 2: AWS (EC2 + RDS + S3)

#### Arquitetura

```
┌──────────────────────────────────────────┐
│         CloudFront (CDN)                 │
└──────────────────┬───────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
   S3 (Frontend)        ALB (Load Balancer)
                              │
                              ▼
                    EC2 (NestJS Instances)
                    - API Server 1
                    - API Server 2
                              │
                              ▼
                        RDS PostgreSQL
                        (Multi-AZ)
```

#### Steps

```bash
# 1. Criar RDS
aws rds create-db-instance \
  --db-instance-identifier zaproute \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --allocated-storage 20

# 2. Criar S3 bucket
aws s3 mb s3://zaproute-assets

# 3. Criar EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.small \
  --key-name your-key

# 4. SSH e deploy
ssh -i key.pem ec2-user@instance

# No EC2:
git clone repo
cd zaproutev2
npm install
npm run build
npm start

# 5. Setup ALB
# (Via AWS Console ou CLI)
```

### Opção 3: Heroku (Legado)

```bash
# Login
heroku login

# Criar app
heroku create zaproute

# Adicionar PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Adicionar variáveis de ambiente
heroku config:set JWT_SECRET=xxx
heroku config:set DATABASE_URL=xxx

# Deploy
git push heroku main

# Aplicar migrations
heroku run npm run prisma:push
```

---

## 📋 Checklist de Deploy em Produção

- [ ] Todas as variáveis de ambiente configuradas
- [ ] JWT_SECRET é uma string aleatória forte
- [ ] CORS_ORIGIN apontando para domínio correto
- [ ] Testes passando (100% de cobertura crítica)
- [ ] Testes E2E todos green
- [ ] Database com backup automático ativado
- [ ] S3 bucket com versionamento
- [ ] CloudFront/CDN configurado
- [ ] SSL/HTTPS ativado
- [ ] Rate limiting configurado
- [ ] Logs centralizados (CloudWatch, DataDog, etc)
- [ ] Monitoring e alertas ativados
- [ ] Disaster recovery plan documentado
- [ ] Backup testado (restore funciona)
- [ ] Security headers configurados
- [ ] WAF habilitado (se in AWS)

---

## 🔍 Troubleshooting

### Erro: "DATABASE_URL não definido"

```bash
# Verificar se .env existe
ls -la server/.env

# Se não existir:
cp server/.env.example server/.env

# Editar com credenciais corretas
nano server/.env

# Testar conexão
npm run prisma:generate
```

### Erro: "Cannot find module @nestjs/common"

```bash
# Reinstalar dependências
cd server
rm -rf node_modules package-lock.json
npm install

# Se ainda falhar:
npm cache clean --force
npm install
```

### Erro: "Port 3000 already in use"

```bash
# macOS/Linux
sudo lsof -i :3000
kill -9 PID

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process
```

### Erro: "Database connection failed"

```bash
# Verificar se PostgreSQL está rodando
pg_isready -h localhost -p 5432

# Se usando Docker:
docker ps | grep postgres

# Se não estiver:
docker-compose up -d postgres
```

### Erro: "CORS blocked"

```bash
# Verificar CORS_ORIGIN no .env
# Deve incluir o frontend URL:
CORS_ORIGIN=http://localhost:5173,https://app.zaproute.com

# Reiniciar servidor
npm run start:dev
```

---

## 📊 Monitoramento

### Logs em Desenvolvimento

```bash
# Logs do servidor
npm run start:dev 2>&1 | tee logs/server.log

# Logs do frontend
npm run dev 2>&1 | tee logs/frontend.log
```

### Logs em Produção

```bash
# Se usando Railway
railway logs

# Se usando AWS
aws logs tail /aws/ec2/zaproute --follow

# Se usando Docker
docker-compose logs -f api
```

### Métricas Importantes

- Taxa de erro (HTTP 5xx)
- Response time (p50, p95, p99)
- Database query time
- Memory usage
- CPU usage
- Uptime

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Exemplo)

```yaml
name: CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd server && npm install
        cd ../web && npm install
    
    - name: Run tests
      run: |
        cd server && npm test
        cd server && npm run test:e2e
    
    - name: Build
      run: |
        cd server && npm run build
        cd ../web && npm run build
    
    - name: Deploy to Railway
      if: github.ref == 'refs/heads/main'
      run: |
        npm install -g @railway/cli
        railway deploy
```

---

## 📱 Build da App Móvel (Se Aplicável)

```bash
# Usando React Native
cd mobile

# Instalar dependências
npm install

# Build para iOS
npm run build:ios

# Build para Android
npm run build:android

# Teste local
npm run start
```

---

## 🔐 Variáveis de Ambiente por Ambiente

### Desenvolvimento
```
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:5173
JWT_EXPIRATION=604800  # 7 dias para dev
```

### Staging
```
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=https://staging.zaproute.com
JWT_EXPIRATION=86400  # 24 horas
```

### Produção
```
NODE_ENV=production
LOG_LEVEL=warn
CORS_ORIGIN=https://app.zaproute.com,https://www.zaproute.com
JWT_EXPIRATION=86400  # 24 horas
```

---

## 📝 Scripts Úteis

```bash
# Backup do banco
pg_dump -U postgres zaproute > backup-$(date +%Y%m%d).sql

# Restore
psql -U postgres zaproute < backup-20260215.sql

# Verificar espaço em disco
du -sh ./server node_modules
du -sh ./web node_modules

# Limpar caches
npm cache clean --force
rm -rf node_modules package-lock.json

# Gerar relatório de dependências
npm audit

# Update dependências (cuidado!)
npm update
```

---

**Última atualização:** 15 de fevereiro de 2026
