# --- Dockerfile na Raiz (Monorepo Strategy) ---
# Este arquivo assume que o contexto de build é a RAIZ do repositório.

# Etapa 1: Instalação de Dependências
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# Copia package.json da pasta SERVER para a raiz do container
COPY server/package*.json ./

# Instala dependências
RUN npm install

# --- Etapa 2: Build ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

# Traz node_modules da etapa anterior
COPY --from=deps /app/node_modules ./node_modules

# Copia TODO o código da pasta SERVER para o container
COPY server/ .

# Gera o Prisma e faz o Build
RUN npx prisma generate
RUN npm run build

# Limpa dependências de dev
RUN npm prune --production

# --- Etapa 3: Runner (Produção) ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN apk add --no-cache openssl

# Copia os artefatos finais
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

CMD ["node", "dist/main.js"]
