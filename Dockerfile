# --- Dockerfile Híbrido (Back + Front) ---

# Etapa 1: Instalação de Dependências (Backend)
FROM node:20-alpine AS deps-back
WORKDIR /app/server
RUN apk add --no-cache openssl libc6-compat
COPY server/package*.json ./
RUN npm install

# Etapa 2: Instalação de Dependências (Frontend)
FROM node:20-alpine AS deps-front
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install

# Etapa 3: Build do Backend
FROM node:20-alpine AS builder-back
WORKDIR /app/server
RUN apk add --no-cache openssl
COPY --from=deps-back /app/server/node_modules ./node_modules
COPY server/ .
RUN npx prisma generate
RUN npm run build
RUN npm prune --production

# Etapa 4: Build do Frontend
FROM node:20-alpine AS builder-front
WORKDIR /app/web
COPY --from=deps-front /app/web/node_modules ./node_modules
COPY web/ .
# Importante: VITE_API_URL deve ser relativa para funcionar no mesmo domínio
ENV VITE_API_URL=/api
RUN npm run build

# Etapa 5: Runner (Produção)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN apk add --no-cache openssl

# Copia Backend
COPY --from=builder-back /app/server/node_modules ./node_modules
COPY --from=builder-back /app/server/package*.json ./
COPY --from=builder-back /app/server/dist ./dist
COPY --from=builder-back /app/server/prisma ./prisma

# Copia Frontend para a pasta que o NestJS espera (dist/client)
COPY --from=builder-front /app/web/dist ./dist/client

EXPOSE 8080

CMD ["node", "dist/main.js"]
