# Guia Operacional de Deploy Gerenciado — Render

Este documento detalha o processo de implantação contínua (CD), isolamento de ambientes e procedimento de reversão (rollback) do backend do **MedConnect** hospedado na plataforma em nuvem gerenciada **Render**.

---

## 1. Arquitetura e Ambientes

A plataforma opera com dois ambientes gerenciados completamente isolados:

| Ambiente | Hostname da API | Base de Dados | Acionamento |
|---|---|---|---|
| **Staging** | `https://medconnect-staging.onrender.com` | `PostgreSQL (Staging Instance)` | Automático a cada merge na `main` com CI verde |
| **Produção** | `https://medconnect-api.onrender.com` | `PostgreSQL (Production HA Instance)` | Liberação manual controlada via GitHub Environment `production` |

---

## 2. Configuração do Web Service no Render

No painel do Render (`https://dashboard.render.com`), configure cada Web Service com as seguintes definições:

1. **Environment**: `Node`
2. **Node Version**: `22.x` (definido via variável de ambiente `NODE_VERSION=22`)
3. **Build Command**:
   ```bash
   npm ci --legacy-peer-deps && npm run build:backend
   ```
4. **Pre-Deploy Command (Release Command)**:
   ```bash
   cd backend && npx prisma migrate deploy
   ```
   > ⚠️ **Importante**: O Render executa o *Pre-Deploy Command* em um container efêmero isolado **antes** de inicializar a nova versão do servidor web. Se alguma migração falhar (ex: conflito de schema ou lock), o deploy é automaticamente abortado e o tráfego dos usuários continua sendo atendido pela versão estável anterior sem qualquer indisponibilidade.

5. **Start Command**:
   ```bash
   cd backend && node dist/server.js
   ```

6. **Healthcheck Path**:
   - `/ready` (executa `SELECT 1` no banco via Prisma para validar prontidão)

---

## 3. Variáveis de Ambiente Obrigatórias (Render Environment Variables)

Configure as seguintes variáveis secretas em cada serviço no Render:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://<usuario>:<senha>@<host-render-postgres>:5432/<nome-banco>?sslmode=require
JWT_SECRET=<chave-secreta-minimo-32-caracteres>
CPF_ENCRYPTION_KEY=<chave-hex-64-caracteres-aes-256-gcm>
CORS_ORIGINS=https://alexsander020.github.io,https://medconnect.com.br
SENTRY_DSN=https://<public_key>@o0.ingest.sentry.io/<project_id>
```

---

## 4. Integração Contínua via Deploy Hooks

1. No Render, acesse **Settings > Deploy Hook** do Web Service e gere a URL secreta de Deploy Hook.
2. No repositório do GitHub, adicione os secrets:
   - `RENDER_STAGING_DEPLOY_HOOK_URL` (para a branch `main`)
   - `RENDER_PROD_DEPLOY_HOOK_URL` (para produção)
3. O workflow `.github/workflows/deploy-backend.yml` dispara o deploy hook somente quando todos os 9 jobs do workflow de CI (`ci.yml`) forem concluídos com status de sucesso.

---

## 5. Procedimento de Rollback Imediato (RTO < 30 segundos)

Se uma anomalia for detectada após um deploy:

### Opção A — Rollback Imediato via Dashboard Render (Recomendado):
1. Acesse o painel do Web Service no Render.
2. Na aba **Events** ou **Deploys**, localize o deploy anterior que estava funcionando normalmente.
3. Clique nos três pontinhos (`...`) ao lado do commit e selecione **Rollback to this deploy**.
4. O Render imediatamente roteia o tráfego de volta para a imagem do deploy estável anterior sem necessidade de rebuild.

### Opção B — Reversão via Git:
1. No repositório, faça um `git revert <commit_sha>`.
2. Abra um PR de reversão para a `main`.
3. Uma vez aprovado e com CI verde, o merge dispara o deploy da versão corrigida.

### Padrão de Migração Retrocompatível (Expand & Contract):
Todas as migrações criadas no Prisma devem ser aditivas (colunas novas são `nullable` ou possuem `DEFAULT`). Isso assegura que se o código da aplicação for revertido para o deploy anterior, as consultas antigas continuam executando com 100% de sucesso no banco de dados.
