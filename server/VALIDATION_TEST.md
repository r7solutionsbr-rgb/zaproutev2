# Teste de Validação de Variáveis de Ambiente

## Como Testar

### 1. Teste com Variáveis Válidas (Atual)

```bash
cd server
npm run start:dev
```

✅ **Resultado Esperado**: Servidor inicia normalmente

### 2. Teste sem JWT_SECRET

```bash
# Temporariamente renomeie o .env
mv .env .env.backup
echo "DATABASE_URL=postgresql://test" > .env

# Tente iniciar
npm run start:dev
```

❌ **Resultado Esperado**: Erro claro indicando que JWT_SECRET é obrigatório

### 3. Teste com JWT_SECRET Curto

```bash
echo "DATABASE_URL=postgresql://test" > .env
echo "JWT_SECRET=short" >> .env

npm run start:dev
```

❌ **Resultado Esperado**: Erro indicando que JWT_SECRET deve ter no mínimo 32 caracteres

### 4. Restaurar Configuração

```bash
mv .env.backup .env
```

## Variáveis Validadas

### Obrigatórias ⚠️

- `DATABASE_URL`: URL PostgreSQL válida
- `JWT_SECRET`: Mínimo 32 caracteres

### Opcionais com Padrões ✓

- `PORT`: 3000
- `NODE_ENV`: 'development'
- `CORS_ORIGIN`: '\*'

### Features Opcionais 🔧

- **Email**: EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS
- **Storage**: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
- **WhatsApp**: ZAPI_INSTANCE_ID, ZAPI_TOKEN, ZAPI_CLIENT_TOKEN
- **AI**: GEMINI_API_KEY, API_KEY
- **Redis**: REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TTL

## Mensagens de Erro

A validação Joi fornece mensagens claras e específicas:

```
❌ Environment validation failed!

"DATABASE_URL" is required
"JWT_SECRET" is required
"JWT_SECRET" length must be at least 32 characters long
```

## Benefícios da Validação

1. ✅ **Falha Rápida**: Erros detectados antes do servidor iniciar
2. ✅ **Mensagens Claras**: Indica exatamente qual variável está faltando ou inválida
3. ✅ **Type Safety**: Valida tipos (string, number, email, uri, hostname)
4. ✅ **Documentação Implícita**: O schema serve como documentação das variáveis necessárias
5. ✅ **Prevenção de Erros**: Evita erros em runtime por configuração incorreta
