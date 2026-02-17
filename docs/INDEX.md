# 📚 Documentação Técnica - ZapRoute v2

Bem-vindo à documentação completa do projeto ZapRoute v2! Este guia foi criado como material de referência para desenvolvimento, manutenção e evolução do sistema.

## 📖 Guia de Navegação

### 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md)
Visão geral da arquitetura do sistema, padrões utilizados, fluxo de dados, diagrama de componentes e decisões arquiteturais.

**Para:** Entender como o projeto está estruturado, decisões de design e relação entre componentes.

---

### 🖥️ [BACKEND.md](BACKEND.md)
Documentação completa do servidor NestJS, incluindo módulos, serviços, controllers, middlewares, validações, autenticação e configurações.

**Para:** Desenvolvedores trabalhando com a API, adicionar novas funcionalidades ou modificar lógica de negócio.

---

### 🌐 [FRONTEND.md](FRONTEND.md)
Documentação da aplicação React, estrutura de componentes, hooks customizados, gerenciamento de estado, styling com Tailwind e integração com a API.

**Para:** Desenvolvedores do frontend, criar novas páginas/componentes ou melhorar a interface.

---

### 🛣️ [API_ROUTES.md](API_ROUTES.md)
Referência completa de todas as rotas disponíveis na API, com exemplos de requisições e respostas esperadas.

**Para:** Integração com outros sistemas, testes de API, documentação de endpoints públicos.

---

### ⚙️ [DATABASE.md](DATABASE.md)
Estrutura completa do banco de dados, modelo relacional, schemas do Prisma, índices, relacionamentos e migrations.

**Para:** Entender a estrutura de dados, executar queries, realizar backup/restore, otimizar queries.

---

### 🎯 [FEATURES.md](FEATURES.md)
Catálogo detalhado de todas as funcionalidades implementadas, casos de uso, fluxos de negócio e regras de negócio.

**Para:** Entender o que o sistema faz, requisitos funcionais, comportamento esperado de cada módulo.

---

### 🚀 [SETUP.md](SETUP.md)
Instruções passo a passo para configuração do ambiente de desenvolvimento, instalação de dependências, variáveis de ambiente e deployment.

**Para:** Novos desenvolvedores, configuração de ambiente de dev/staging/prod, troubleshooting.

---

### 🔐 [SECURITY.md](SECURITY.md)
Guia de segurança, boas práticas, autenticação, autorização, proteção contra vulnerabilidades e compliance.

**Para:** Code review de segurança, implementação de novos endpoints, auditoria de código.

---

### 🧪 [TESTING.md](TESTING.md)
Estratégia de testes, estrutura de testes unitários, testes E2E, coverage e boas práticas de testing.

**Para:** Escrever testes, entender cobertura de código, manter qualidade.

---

### 🔧 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
Problemas comuns, soluções rápidas, logs de erros e como debugar diferentes cenários.

**Para:** Resolver problemas em desenvolvimento ou produção.

---

## 🎯 Como Usar Esta Documentação

### Você é um novo desenvolvedor?
1. Leia [ARCHITECTURE.md](ARCHITECTURE.md) para entender a visão geral
2. Leia [SETUP.md](SETUP.md) para configurar seu ambiente
3. Leia [FEATURES.md](FEATURES.md) para entender o domínio de negócio
4. Leia [BACKEND.md](BACKEND.md) ou [FRONTEND.md](FRONTEND.md) dependendo de sua especialidade

### Você precisa adicionar uma nova funcionalidade?
1. Consulte [FEATURES.md](FEATURES.md) para não duplicar algo já existente
2. Revise [API_ROUTES.md](API_ROUTES.md) para ver endpoints similares
3. Consulte [DATABASE.md](DATABASE.md) para estrutura de dados necessária
4. Leia [SECURITY.md](SECURITY.md) antes de fazer deploy
5. Escreva testes segundo [TESTING.md](TESTING.md)

### Você precisa fazer debugging?
1. Consulte [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Revise logs no [SETUP.md](SETUP.md) - seção logging
3. Use as ferramentas descritas em [BACKEND.md](BACKEND.md) - seção debugging

### Você precisa fazer deploy?
1. Leia [SETUP.md](SETUP.md) - seção deployment
2. Revise checklist de segurança em [SECURITY.md](SECURITY.md)
3. Valide testes em [TESTING.md](TESTING.md)

---

## 📋 Informações do Projeto

| Aspecto | Detalhes |
|--------|----------|
| **Nome** | ZapRoute v2 |
| **Tipo** | SaaS - Gestão Logística Multi-tenant |
| **Backend** | NestJS 11.x + Prisma + PostgreSQL |
| **Frontend** | React 18.2 + TypeScript + Vite |
| **Deploy** | Docker + Docker Compose |
| **Status** | ✅ Produção Ready / Monitorado |

---

## 🔗 Referências Rápidas

### Tecnologias Principais
- [NestJS Docs](https://docs.nestjs.com)
- [Prisma Docs](https://www.prisma.io/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [TailwindCSS Docs](https://tailwindcss.com/docs)

### Padrões e Convenções
- **Backend:** Modular, Clean Architecture, Repository Pattern
- **Frontend:** Component-based, Custom Hooks, Context API
- **Banco:** Migrations versionadas, Índices otimizados
- **Git:** Conventional Commits, Feature branches

---

## 📞 Contato e Suporte

Para dúvidas sobre esta documentação:
- Abra uma issue no repositório
- Consulte o README.md do projeto raiz
- Contate a equipe de desenvolvimento

---

## 📝 Histórico de Documentação

| Data | Versão | Alterações |
|------|--------|-----------|
| 15/02/2026 | 1.0 | Documentação inicial criada |
| 15/02/2026 | 2.0 | Atualização com Swagger, Joi, Testes implementados |
| 15/02/2026 | 3.0 | Monitoramento (Sentry/Winston), Health Checks e UX (Skeletons/ConfirmDialog) |

---

**Última atualização:** 15 de fevereiro de 2026
