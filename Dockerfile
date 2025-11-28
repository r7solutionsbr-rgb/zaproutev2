# --- Etapa 1: Instalação de Dependências ---
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

# Copia arquivos de dependência
COPY package*.json ./

# USA npm install (Mais flexível que npm ci para repos em desenvolvimento)
RUN npm install

# --- Etapa 2: Build ---
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl

# Traz as dependências da etapa 1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Gera o Prisma e faz o Build
RUN npx prisma generate
RUN npm run build

# Remove pacotes de desenvolvimento para limpar a imagem
RUN npm prune --production

# --- Etapa 3: Imagem Final (Produção) ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Instala OpenSSL na imagem final
RUN apk add --no-cache openssl

# Copia apenas os artefatos compilados e necessários
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

# Comando único de inicialização
CMD ["node", "dist/server/main.js"]
