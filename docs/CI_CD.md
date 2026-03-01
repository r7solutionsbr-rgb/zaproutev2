# 🚀 Guia de Configuração CI/CD - ZapRoute v2

## 📋 Visão Geral

Este projeto utiliza **GitHub Actions** para automação de CI/CD, incluindo:
- ✅ Testes automáticos em PRs
- ✅ Build validation
- ✅ Security audit
- ✅ Coverage reporting
- ✅ Deploy automático

---

## 🔧 Workflows Configurados

### 1. CI Pipeline (`ci.yml`)
**Trigger:** Push e Pull Requests para `main`

**Jobs:**
- **backend-validation** - Build e testes do backend
  - Sobe PostgreSQL de teste
  - Executa `npm run build`
  - Executa `npm run test`
  
- **frontend-validation** - Typecheck e build do frontend
  - Executa `npx tsc --noEmit`
  - Executa `npm run build`
  
> Observação: auditoria de segurança e outras checagens podem ser adicionadas
> conforme a maturidade do pipeline.

### 2. Deploy Pipeline (`deploy.yml`)
**Trigger:** Push para `main` ou manual

**Jobs:**
- **deploy** - Deploy para Railway
  - Instala Railway CLI
  - Faz deploy do backend
  - Notifica sucesso/falha

### 3. PR Checks (`pr-checks.yml`)
### 4. Backend Tests + Coverage (`tests.yml`)
**Trigger:** Push e Pull Requests para `main` e `develop`

**Jobs:**
- **test** - Testes com coverage e upload no Codecov
  - Sobe PostgreSQL de teste
  - Executa `npm run test:cov`
  - Faz upload de cobertura
**Trigger:** Pull Requests (opened, synchronize, reopened)

**Jobs:**
- **pr-validation** - Validação de PR
  - Verifica título semântico
  - Checa merge conflicts
  - Comenta no PR

---

## 🔑 Secrets Necessários

Configure os seguintes secrets no GitHub:
**Settings → Secrets and variables → Actions**

### Obrigatórios
```
RAILWAY_TOKEN          # Token de autenticação do Railway
RAILWAY_PROJECT_ID     # ID do projeto no Railway
```

### Opcionais (para Codecov)
```
CODECOV_TOKEN         # Token do Codecov (se repo privado)
```

---

## 📝 Como Obter os Secrets

### Railway Token
```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Gerar token
railway whoami
# Copie o token exibido
```

### Railway Project ID
```bash
# No diretório do projeto
railway link

# O ID será exibido ou você pode ver em:
# https://railway.app/project/YOUR_PROJECT_ID
```

### Codecov Token (Opcional)
1. Acesse https://codecov.io
2. Conecte seu repositório GitHub
3. Copie o token em Settings → General

---

## 🎯 Convenções de Commit

Os PRs devem seguir **Conventional Commits**:

```
feat: adiciona nova funcionalidade
fix: corrige um bug
docs: atualiza documentação
style: formatação de código
refactor: refatoração sem mudança de comportamento
perf: melhoria de performance
test: adiciona ou corrige testes
build: mudanças no build ou dependências
ci: mudanças no CI/CD
chore: outras mudanças (ex: atualizar .gitignore)
revert: reverte um commit anterior
```

**Exemplos:**
```bash
git commit -m "feat: adiciona endpoint de paginação de rotas"
git commit -m "fix: corrige validação de JWT expirado"
git commit -m "docs: atualiza README com instruções de deploy"
```

---

## 🔄 Fluxo de Trabalho

### 1. Desenvolvimento Local
```bash
# Criar branch
git checkout -b feat/nova-funcionalidade

# Fazer commits
git add .
git commit -m "feat: adiciona nova funcionalidade"

# Push
git push origin feat/nova-funcionalidade
```

### 2. Abrir Pull Request
- Título deve seguir Conventional Commits
- Descrição clara do que foi feito
- Marcar reviewers

### 3. CI Automático
- ✅ Testes rodam automaticamente
- ✅ Build é validado
- ✅ Security audit executado
- ✅ Coverage reportado

### 4. Review e Merge
- Aguardar aprovação
- Merge para `develop` ou `main`

### 5. Deploy Automático
- Push para `main` → Deploy para produção
- Push para `develop` → Deploy para staging (se configurado)

---

## 🧪 Rodando Localmente

### Backend Tests
```bash
cd server
npm test
npm run test:cov
```

### Frontend Tests
```bash
cd web
npm test
```

### Build Validation
```bash
# Backend
cd server
npm run build

# Frontend
cd web
npm run build
```

---

## 📊 Monitorando CI/CD

### GitHub Actions
- Acesse: `https://github.com/YOUR_USERNAME/zaproutev2/actions`
- Veja status de todos os workflows
- Logs detalhados de cada job

### Codecov
- Acesse: `https://codecov.io/gh/YOUR_USERNAME/zaproutev2`
- Veja coverage por arquivo
- Histórico de coverage

### Railway
- Acesse: `https://railway.app/project/YOUR_PROJECT_ID`
- Veja logs de deploy
- Monitore aplicação

---

## 🐛 Troubleshooting

### Testes Falhando no CI mas Passando Localmente
```bash
# Limpar cache
rm -rf node_modules package-lock.json
npm install

# Rodar com mesmas variáveis do CI
DATABASE_URL=postgresql://test:test@localhost:5432/zaproute_test \
JWT_SECRET=test-secret-key-with-minimum-32-characters-required \
NODE_ENV=test \
npm test
```

### Build Falhando
```bash
# Verificar TypeScript
npx tsc --noEmit

# Verificar variáveis de ambiente
cat .env.example
```

### Deploy Falhando
```bash
# Verificar secrets no GitHub
# Settings → Secrets → Actions

# Testar Railway CLI localmente
railway login
railway link
railway up
```

---

## 📋 Checklist Antes de Fazer PR

- [ ] Testes passando localmente (`npm test`)
- [ ] Build funcionando (`npm run build`)
- [ ] Linter sem erros (`npm run lint`)
- [ ] Commit message segue Conventional Commits
- [ ] Branch atualizada com `main`/`develop`
- [ ] Código revisado

---

## 🎓 Recursos

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org)
- [Railway Docs](https://docs.railway.app)
- [Codecov Docs](https://docs.codecov.com)

---

**Última atualização:** 15 de fevereiro de 2026
