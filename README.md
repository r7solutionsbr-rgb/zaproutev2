# 🚚 ZapRoute v2

[![CI - ZapRoute v2](https://github.com/r7solutionsbr-rgb/zaproutev2/actions/workflows/ci.yml/badge.svg)](https://github.com/r7solutionsbr-rgb/zaproutev2/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/r7solutionsbr-rgb/zaproutev2/branch/main/graph/badge.svg)](https://codecov.io/gh/r7solutionsbr-rgb/zaproutev2)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://www.typescriptlang.org)

Sistema completo de gestão de rotas e entregas multi-tenant, com integração de IA, WhatsApp e rastreamento em tempo real.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Como Executar](#como-executar)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Funcionalidades](#funcionalidades)
- [Deploy](#deploy)
- [Contribuindo](#contribuindo)

## 🎯 Sobre o Projeto

ZapRoute v2 é uma plataforma SaaS para gestão logística que oferece:

- 🗺️ **Planejamento de Rotas**: Otimização inteligente de entregas
- 📱 **App Mobile para Motoristas**: Interface simplificada para execução de rotas
- 🤖 **IA Integrada (Gemini)**: Assistente virtual "Leônidas" para suporte
- 💬 **WhatsApp Integration**: Comunicação automatizada com motoristas
- 📊 **Dashboard Analítico**: Métricas e KPIs em tempo real
- 🏢 **Multi-tenancy**: Suporte a múltiplos clientes isolados
- 🔐 **Autenticação JWT**: Sistema seguro de login e autorização

## 🛠️ Tecnologias

### Backend
- **NestJS** 11.x - Framework Node.js progressivo
- **Prisma** 5.7 - ORM moderno para PostgreSQL
- **PostgreSQL** 15 - Banco de dados relacional
- **JWT** - Autenticação e autorização
- **AWS S3** - Armazenamento de arquivos
- **Gemini AI** - Inteligência artificial
- **Nodemailer** - Envio de emails

### Frontend
- **React** 18.2 - Biblioteca UI
- **TypeScript** 5.3 - Tipagem estática
- **Vite** 5.1 - Build tool ultrarrápido
- **TailwindCSS** 3.4 - Framework CSS utility-first
- **Leaflet** - Mapas interativos
- **Recharts** - Gráficos e visualizações
- **React Router** 6 - Navegação SPA

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração local

## 📦 Pré-requisitos

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** >= 20.x (opcional, para desenvolvimento local)
- **PostgreSQL** 15+ (se não usar Docker)

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone <repository-url>
cd zaproutev2
```

### 2. Instale as dependências

#### Backend
```bash
cd server
npm install
```

#### Frontend
```bash
cd web
npm install
```

## 🔐 Configuração

### 1. Configure as variáveis de ambiente

#### Backend

```bash
cd server
cp .env.example .env
```

Edite o arquivo `.env` e preencha as variáveis obrigatórias:

**Variáveis OBRIGATÓRIAS:**
- `DATABASE_URL` - String de conexão PostgreSQL
- `JWT_SECRET` - Chave secreta para JWT (min 32 caracteres)
- `POSTGRES_USER` - Usuário do banco (para Docker)
- `POSTGRES_PASSWORD` - Senha do banco (para Docker)

**Variáveis OPCIONAIS (mas recomendadas):**
- `GEMINI_API_KEY` - Para funcionalidade de IA
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - Para upload de arquivos
- `ZAPI_CLIENT_TOKEN`, `ZAPI_INSTANCE_ID` - Para integração WhatsApp
- `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD` - Para envio de emails

> 💡 **Dica**: Use `openssl rand -base64 32` para gerar um JWT_SECRET seguro

### 2. Configure o ambiente Docker (se for usar)

Crie um arquivo `.env` na RAIZ do projeto para configurar o Docker Compose:

```bash
# Na raiz do projeto
echo "POSTGRES_USER=admin" >> .env
echo "POSTGRES_PASSWORD=secure_password" >> .env
```

### 2. Configure o banco de dados

#### Opção A: Usando Docker (Recomendado)

```bash
# Na raiz do projeto
docker-compose up -d postgres
```

#### Opção B: PostgreSQL local

Certifique-se de que o PostgreSQL está rodando e atualize a `DATABASE_URL` no `.env`

### 3. Execute as migrações do Prisma

```bash
cd server
npm run prisma:generate
npm run prisma:push
```

### 4. (Opcional) Popule o banco com dados iniciais

```bash
npm run seed
```

## ▶️ Como Executar

### Desenvolvimento Local

#### Opção 1: Com Docker (Tudo junto)

```bash
# Na raiz do projeto
docker-compose up
```

Acesse:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api

#### Opção 2: Manualmente (Recomendado para desenvolvimento)

**Terminal 1 - Backend:**
```bash
cd server
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd web
npm run dev
```

**Terminal 3 - Banco de dados (se usar Docker):**
```bash
docker-compose up postgres
```

### Produção

```bash
# Backend
cd server
npm run build
npm run start:prod

# Frontend
cd web
npm run build
npm run preview
```

## 📁 Estrutura do Projeto

```
zaproutev2/
├── server/                 # Backend NestJS
│   ├── prisma/            # Schema e migrations
│   ├── src/
│   │   ├── auth/          # Autenticação JWT
│   │   ├── ai/            # Integração Gemini AI
│   │   ├── whatsapp/      # Integração WhatsApp
│   │   ├── webhook/       # Webhooks externos
│   │   ├── journey/       # Jornada de motoristas
│   │   ├── drivers/       # Gestão de motoristas
│   │   ├── vehicles/      # Gestão de veículos
│   │   ├── customers/     # Gestão de clientes
│   │   ├── routes/        # Gestão de rotas
│   │   ├── sellers/       # Gestão de vendedores
│   │   ├── storage/       # Upload de arquivos (S3)
│   │   ├── mail/          # Envio de emails
│   │   └── config/        # Configurações e validação
│   └── package.json
│
├── web/                   # Frontend React
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── services/      # API clients
│   │   ├── contexts/      # Context API
│   │   ├── utils/         # Utilitários
│   │   └── types.ts       # Tipos TypeScript
│   └── package.json
│
├── docker-compose.yml     # Orquestração Docker
└── README.md
```

## ✨ Funcionalidades

### Para Gestores
- ✅ Dashboard com métricas em tempo real
- ✅ Planejamento e otimização de rotas
- ✅ Gestão de motoristas, veículos e clientes
- ✅ Relatórios e análises
- ✅ Controle de ocorrências
- ✅ Rastreamento de entregas

### Para Motoristas
- ✅ App simplificado com rotas do dia
- ✅ Navegação integrada
- ✅ Registro de jornada (início, refeição, descanso)
- ✅ Comprovante de entrega (foto)
- ✅ Comunicação via WhatsApp

### Recursos Técnicos
- ✅ Multi-tenancy com isolamento completo
- ✅ Autenticação JWT com refresh tokens
- ✅ Upload de arquivos para S3
- ✅ Integração com IA (Gemini)
- ✅ Webhooks para sistemas externos
- ✅ Notificações por email e WhatsApp
- ✅ Monitoramento com Sentry e Winston
- ✅ Health Checks completos (Prisma/Redis)
- ✅ UX Premium com Skeleton Loaders e ConfirmDialog

## 🚀 Deploy

### Railway / Render / Heroku

1. Configure as variáveis de ambiente no painel
2. Conecte o repositório Git
3. Configure o build command:
   ```bash
   cd server && npm install && npm run build
   ```
4. Configure o start command:
   ```bash
   cd server && npm run start:prod
   ```

### Docker

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é proprietário e confidencial.

## 🔒 Segurança

- ⚠️ **NUNCA** commite o arquivo `.env` no Git
- ⚠️ Use senhas fortes e únicas para produção
- ⚠️ Rotacione secrets regularmente
- ⚠️ Configure CORS adequadamente para produção
- ⚠️ Use HTTPS em produção

## 📞 Suporte

Para suporte, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para otimizar a logística**
