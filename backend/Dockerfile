# ----------------------------------------------------
# Stage 1: Build (devDependencies, prisma generate e build TS)
# ----------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Dependências do sistema para compatibilidade de build
RUN apk add --no-cache libc6-compat

# Copia manifestos de pacotes
COPY package*.json ./
COPY prisma ./prisma/

# Instalação rigorosa e imutável de todas as dependências
RUN npm ci

# Gera Prisma Client para runtime
ENV DATABASE_URL="file:./temp.db"
RUN npx prisma generate

# Copia arquivos de código-fonte
COPY tsconfig.json ./
COPY src ./src/

# Compilação TypeScript para JavaScript puro em dist/
RUN npm run build

# Remove devDependencies preservando apenas pacotes de produção
RUN npm prune --production

# ----------------------------------------------------
# Stage 2: Runtime (imagem final enxuta e segura)
# ----------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# curl para o HEALTHCHECK nativo
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3000

# Prepara diretório de runtime com dono 'node' (UID 1000)
RUN mkdir -p /app/uploads /app/prisma && chown -R node:node /app

# Copia apenas os artefatos necessários com permissão do usuário node
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/src/docs ./dist/docs
COPY --from=builder --chown=node:node /app/src/docs ./src/docs

# Executa com usuário não-root (princípio do menor privilégio)
USER node

EXPOSE 3000

# Verificação de integridade periódica
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
