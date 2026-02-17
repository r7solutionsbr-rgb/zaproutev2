# 📚 README - Documentação do Projeto ZapRoute v2

Bem-vindo à documentação técnica completa do **ZapRoute v2** - um sistema SaaS de gestão logística com rastreamento em tempo real, integração de IA e suporte a múltiplos clientes.

---

## 📖 Guia Rápido de Navegação

### 🆕 Você é novo no projeto?
**Comece por:**
1. [INDEX.md](INDEX.md) - Visão geral da documentação
2. [ARCHITECTURE.md](ARCHITECTURE.md) - Entender a estrutura
3. [SETUP.md](SETUP.md) - Configurar seu ambiente
4. Escolha: [BACKEND.md](BACKEND.md) ou [FRONTEND.md](FRONTEND.md)

### 🏗️ Você precisa entender a arquitetura?
→ [ARCHITECTURE.md](ARCHITECTURE.md)

**Tópicos:**
- Diagrama de componentes
- Fluxos de dados
- Integrações externas
- Padrões utilizados

---

### 🖥️ Você trabalha com Backend?
→ [BACKEND.md](BACKEND.md)

**Tópicos:**
- Módulos NestJS (Auth, Routes, Drivers, etc)
- Controllers e Services
- DTOs e Validações
- Exemplo: criar novo endpoint

---

### 🌐 Você trabalha com Frontend?
→ [FRONTEND.md](FRONTEND.md)

**Tópicos:**
- Estrutura de componentes React
- Hooks customizados
- Integração com API
- Styling com TailwindCSS
- Context API

---

### 🛣️ Você precisa de referência de APIs?
→ [API_ROUTES.md](API_ROUTES.md)

**Tópicos:**
- Todos os endpoints (POST, GET, PATCH, DELETE)
- Exemplos de requisição/resposta
- Validações esperadas
- Erros e tratamento

---

### 💾 Você trabalha com Banco de Dados?
→ [DATABASE.md](DATABASE.md)

**Tópicos:**
- Schema Prisma completo
- Relacionamentos entre entidades
- Índices de performance
- Migrations
- Consultas de exemplo

---

### 🎯 Você quer entender as funcionalidades?
→ [FEATURES.md](FEATURES.md)

**Tópicos:**
- Descrição de cada feature
- Casos de uso (user stories)
- Fluxos de negócio
- Regras críticas
- Estados e transições

---

### 🚀 Você precisa fazer setup/deploy?
→ [SETUP.md](SETUP.md)

**Tópicos:**
- Instalação local
- Variáveis de ambiente
- Docker & Docker Compose
- Deploy (Railway, AWS, etc)
- CI/CD Pipeline

---

### 🔐 Você trabalha em segurança?
→ [SECURITY.md](SECURITY.md)

**Tópicos:**
- Camadas de segurança (HTTPS, CORS, JWT, etc)
- Vulnerabilidades comuns e mitigação
- Testes de segurança
- Compliance (LGPD, GDPR)
- Checklist pré-deploy

---

### 🧪 Você escreve testes?
→ [TESTING.md](TESTING.md)

**Tópicos:**
- Estratégia de testes (Unit, Integration, E2E)
- Exemplos com Jest
- Cobertura de código
- Boas práticas
- Quality gates

---

### 🔧 Algo deu errado?
→ [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Tópicos:**
- Problemas de inicialização
- Erros de banco de dados
- Autenticação e CORS
- Performance
- Debug em produção

---

## 📊 Estrutura de Documentação

```
docs/
├── INDEX.md                    # Este arquivo (índice principal)
├── ARCHITECTURE.md             # Visão geral da arquitetura
├── BACKEND.md                  # Documentação NestJS
├── FRONTEND.md                 # Documentação React
├── DATABASE.md                 # Schema Prisma & PostgreSQL
├── API_ROUTES.md               # Referência de endpoints
├── FEATURES.md                 # Catálogo de funcionalidades
├── SETUP.md                    # Configuração e deploy
├── SECURITY.md                 # Segurança e compliance
├── TESTING.md                  # Estratégia de testes
└── TROUBLESHOOTING.md          # Solução de problemas
```

---

## 🎯 Informações Principais do Projeto

| Aspecto | Detalhe |
|---------|---------|
| **Nome** | ZapRoute v2 |
| **Tipo** | SaaS - Gestão Logística |
| **Status** | Em Desenvolvimento |
| **Backend** | NestJS 11.x + Prisma 5.7 + PostgreSQL 15 |
| **Frontend** | React 18.2 + TypeScript 5.3 + Vite 5.1 |
| **Styling** | TailwindCSS 3.4 |
| **Deploy** | Docker + Docker Compose |
| **CI/CD** | GitHub Actions (exemplo em SETUP.md) |

---

## 🛠️ Tech Stack

### Backend
```
NestJS 11.1.9
├── Prisma 5.7 (ORM)
├── PostgreSQL 15 (Database)
├── JWT (Autenticação)
├── Passport.js
├── @nestjs/throttler (Rate Limiting)
├── Helmet.js (Security Headers)
├── Nodemailer (Email)
├── @google/generative-ai (Gemini AI)
└── @aws-sdk/client-s3 (Armazenamento)
```

### Frontend
```
React 18.2
├── TypeScript 5.3
├── Vite 5.1 (Build)
├── React Router 6.30 (Navegação)
├── TailwindCSS 3.4 (Styling)
├── Axios (HTTP Client)
├── Leaflet 1.9 (Mapas)
├── Recharts 2.12 (Gráficos)
└── Sonner (Toasts)
```

### Infrastructure
```
Docker & Docker Compose
├── PostgreSQL 15
├── Redis (opcional)
└── Nginx (reverse proxy)

Deployment
├── Railway / Heroku / AWS
└── GitHub Actions (CI/CD)
```

---

## 🚀 Quick Start

### 1. Clone e Setup
```bash
git clone <repo>
cd zaproutev2

# Backend
cd server
npm install
cp .env.example .env  # Editar com credenciais
npm run prisma:push
npm run start:dev

# Frontend (em outro terminal)
cd web
npm install
cp .env.example .env
npm run dev
```

### 2. Acessar
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/api/health

### 3. Credenciais de Teste
```
Email: admin@example.com
Senha: password123
Tenant: tenant-1
```

---

## 📋 Tarefas Comuns

### Adicionar novo endpoint
1. Criar DTO em `src/modulo/dto/`
2. Implementar método em `src/modulo/modulo.service.ts`
3. Adicionar rota em `src/modulo/modulo.controller.ts`
4. Atualizar API_ROUTES.md
5. Escrever testes
6. Fazer code review

**Referência:** [BACKEND.md#exemplo-criar-novo-endpoint](BACKEND.md#-exemplo-criar-novo-endpoint)

---

### Adicionar novo component React
1. Criar arquivo em `src/components/` ou `src/pages/`
2. Implementar componente TypeScript
3. Usar hooks customizados se necessário
4. Estilizar com TailwindCSS
5. Testar responsividade

**Referência:** [FRONTEND.md#-componentes-principais](FRONTEND.md#-componentes-principais)

---

### Deploy em Produção
1. Passar em checklist de segurança
2. Executar testes completos
3. Build Docker
4. Deploy via CI/CD
5. Smoke tests em produção

**Referência:** [SETUP.md#-deployment](SETUP.md#-deployment)

---

### Debugar um erro
1. Ler stack trace completo
2. Consultar [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. Verificar logs do servidor
4. Verificar Network requests (DevTools)
5. Consultar banco de dados com Prisma Studio

---

## 🔗 Links Úteis

### Documentação Externa
- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs)

### Ferramentas
- [Prisma Studio](https://www.prisma.io/studio) - Visualizar banco
- [Postman](https://www.postman.com) - Testar API
- [Docker Hub](https://hub.docker.com) - Imagens Docker

---

## 📞 Contato & Suporte

**Problemas ou dúvidas?**

1. Consulte [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Procure no [GitHub Issues](https://github.com/seu-repo/issues)
3. Contate a equipe de desenvolvimento

---

## 📝 Contribuindo

Ao contribuir com o projeto:
1. Siga o padrão de código definido em [SECURITY.md](SECURITY.md)
2. Escreva testes segundo [TESTING.md](TESTING.md)
3. Faça code review com checklist em [SECURITY.md](SECURITY.md)
4. Atualize documentação se necessário

---

## 🎓 Roteiros de Aprendizado

### Para Backend Developer (NestJS)
1. [ARCHITECTURE.md](ARCHITECTURE.md) - Entender o todo
2. [BACKEND.md](BACKEND.md) - Dominar módulos
3. [DATABASE.md](DATABASE.md) - Queries e migrations
4. [TESTING.md](TESTING.md) - Escrever testes
5. [SECURITY.md](SECURITY.md) - Vulnerabilidades
6. Implementar novo módulo completo

### Para Frontend Developer (React)
1. [ARCHITECTURE.md](ARCHITECTURE.md) - Entender o todo
2. [FRONTEND.md](FRONTEND.md) - Componentes e hooks
3. [API_ROUTES.md](API_ROUTES.md) - Endpoints disponíveis
4. [TESTING.md](TESTING.md) - Testes React
5. Implementar nova página completa

### Para DevOps/Infra
1. [SETUP.md](SETUP.md) - Infraestrutura
2. [DATABASE.md](DATABASE.md) - Backups e monitoring
3. [SECURITY.md](SECURITY.md) - Compliance
4. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Production issues

---

## 📊 Histórico de Documentação

| Data | Versão | Autor | Alterações |
|------|--------|-------|-----------|
| 15/02/2026 | 1.0 | Engineering Team | Documentação inicial criada |

---

## 🎯 Objetivos da Documentação

✅ **Onboarding rápido** de novos desenvolvedores
✅ **Referência técnica** completa
✅ **Guia de segurança** e compliance
✅ **Procedimentos operacionais** padrão
✅ **Solução de problemas** comum
✅ **Mantér o projeto escalável** e sustentável

---

## 🏁 Últimas Atualizações

- ✅ Documentação de arquitetura concluída
- ✅ API routes documentadas
- ✅ Exemplos de código inclusos
- ✅ Guias de deployment
- ✅ Troubleshooting documentation
- ✅ Security guidelines

---

**Última atualização:** 15 de fevereiro de 2026

**Próximas melhorias:**
- [ ] Adicionar diagramas com Mermaid
- [ ] Video tutorials
- [ ] API OpenAPI/Swagger spec
- [ ] Performance benchmarks
- [ ] Casos de uso (use cases)

---

**Esta documentação foi criada com rigor profissional para facilitar o desenvolvimento, manutenção e evolução do ZapRoute v2. Mantenha atualizada! 📚**
