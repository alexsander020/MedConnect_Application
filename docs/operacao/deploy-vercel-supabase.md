# Guia Operacional de Deploy — Vercel + Supabase

Produção atual do **MedConnect**: site e API no mesmo domínio da Vercel, banco e arquivos de receitas no Supabase, ambos em **São Paulo**.

| Item | Valor |
|---|---|
| Site + API | `https://medconnect-ashen.vercel.app` (API em `/api`, Swagger em `/api-docs`) |
| Projeto Vercel | `alexsander020/medconnect` — função `api/index.js` na região `gru1` |
| Projeto Supabase | `medconnect` (`wwfxozmoatqdajmlxcde`) — região `sa-east-1`, Postgres 17 |
| Bucket de receitas | `prescriptions` — privado, 10 MB, só PDF/JPEG/PNG, sem policies |

---

## 1. Arquitetura

- **Mesma origem**: o cookie de refresh usa `SameSite=Strict` em produção, por isso o frontend e a API ficam no mesmo domínio. O `vercel.json` reescreve `/api/*` e `/api-docs/*` para a função serverless e o resto para o `index.html` do SPA.
- **Função serverless** (`api/index.js`): carrega o Express já compilado (`backend/dist`). Na Vercel (`process.env.VERCEL`) o backend não abre servidor HTTP próprio e confia em 1 proxy (`trust proxy`) para obter o IP real do cliente usado no rate limiting.
- **Sem WebSocket**: a Vercel não mantém conexões Socket.IO. O build define `VITE_ENABLE_REALTIME=false`; o aviso instantâneo de "nova cotação" fica desligado e as telas atualizam pelas consultas normais. Para tempo real, hospede o backend num serviço com processo contínuo (ver `deploy-render.md`).
- **Receitas**: gravadas no Supabase Storage (`supabase://<uuid>.<ext>`) pela API REST com a chave secreta; leitura só por URL assinada de 5 minutos, emitida depois da linha em `PrescriptionAccessLog`.
- **Evidências regulatórias das farmácias** (capacidades da vertical veterinária) usam o mesmo bucket privado e URLs assinadas de 5 minutos, com leitura registrada no `AuditLog`.

## 2. Banco de dados (Supabase)

### Papel de conexão dedicado
A API **não** usa o papel `postgres`. Ela conecta como `medconnect_app`:

- `LOGIN`, sem `SUPERUSER`, `BYPASSRLS`, `CREATEROLE` ou `CREATEDB`; `statement_timeout = 25s`;
- dono de todas as tabelas de `public` (as migrations do Prisma rodam com ele), por isso a API não é afetada pelo RLS sem policies (ADR 022);
- sem acesso aos schemas internos do Supabase (`auth`, `storage`, ...);
- `postgres` é membro de `medconnect_app`, então o SQL Editor e o Table Editor continuam enxergando os dados.

A senha foi definida a partir de um verificador SCRAM-SHA-256 (o texto puro nunca passou pelo Supabase nem por logs). Para trocá-la:

```sql
ALTER ROLE medconnect_app PASSWORD '<nova-senha>';
```

Depois atualize `DATABASE_URL` na Vercel e faça um novo deploy.

### Strings de conexão

| Uso | Modo | String |
|---|---|---|
| Runtime (Vercel) | Supavisor transação (6543) | `postgresql://medconnect_app.wwfxozmoatqdajmlxcde:<senha>@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=3` |
| Migrations | Supavisor sessão (5432) | `postgresql://medconnect_app.wwfxozmoatqdajmlxcde:<senha>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require` |

`pgbouncer=true` desliga os prepared statements do Prisma (exigência do modo transação).

### Aplicar migrations
As migrations **não** rodam no build da Vercel. Rode manualmente antes de publicar código que dependa delas:

```bash
cd backend
DATABASE_URL="<string do modo sessão>" npx prisma migrate deploy
```

Toda migration nova continua seguindo o ADR 022: `ENABLE ROW LEVEL SECURITY`, `COMMENT ON TABLE`, CHECKs de domínio. Depois de aplicar, rode os advisors do Supabase (Dashboard → Advisors). O aviso **"RLS Enabled No Policy" (INFO)** é esperado em todas as tabelas: é o bloqueio intencional da Data API.

### Seed
O seed sintético é bloqueado em produção (`NODE_ENV=production`). Contas de administrador de produção devem ser criadas de forma controlada, nunca com a senha padrão do seed.

## 3. Variáveis de ambiente (Vercel → Production)

| Variável | Tipo | Observação |
|---|---|---|
| `NODE_ENV` | `production` | O install usa `npm ci --include=dev` para não perder as devDependencies do build |
| `DATABASE_URL` | Secret | Modo transação (ver acima) |
| `JWT_SECRET` | Secret | ≥ 32 caracteres, aleatório |
| `CPF_ENCRYPTION_KEY` | Secret | 64 hex (AES-256-GCM). **Não perder**: sem ela os CPFs e observações cifradas ficam ilegíveis |
| `SUPABASE_URL` | Config | `https://wwfxozmoatqdajmlxcde.supabase.co` |
| `SUPABASE_SECRET_KEY` | Secret | Chave `sb_secret_...` (Supabase → Settings → API Keys). Exclusiva do servidor |
| `CORS_ORIGINS` | Config | `https://medconnect-ashen.vercel.app` (também usada pela proteção CSRF) |
| `FRONTEND_URL` | Config | `https://medconnect-ashen.vercel.app` (links dos e-mails) |
| `VET_ENABLED` | `false` (padrão) | Vertical veterinária (ADRs 018–021). **Desligada em produção** até o parecer jurídico (`docs/regulatorio/itens-bloqueantes-producao-parecer-juridico.md`). É o kill switch: alterar a variável e fazer redeploy |
| `VET_ALLOW_FOOD_PRODUCING` / `VET_CONTROLLED_ENABLED` | `false` (padrão) | Sub-flags da vertical veterinária |
| `SMTP_*` | opcional | Sem SMTP os e-mails só vão para o log da função |
| `SENTRY_DSN` | opcional | — |

Variáveis do frontend (`VITE_BASE_PATH=/`, `VITE_API_URL=/api`, `VITE_ENABLE_REALTIME=false`, `VITE_VERCEL_ANALYTICS=true`) são fixadas no script `build:vercel` do `package.json` raiz.

**Vercel Web Analytics**: componente `<Analytics />` em `App.jsx`, carregado só no build da Vercel. É sem cookies, e o `beforeSend` (`src/lib/analytics.js`) remove query string e hash das URLs antes do envio, porque os links de redefinição de senha e de verificação de e-mail levam tokens na URL.

Mudou alguma variável? Faça um novo deploy (`vercel deploy --prod`): a Vercel não aplica variáveis a deploys já publicados.

## 4. Deploy

```bash
vercel deploy --prod          # a partir da raiz do repositório (projeto já vinculado em .vercel/)
```

O `.vercelignore` impede o envio de `.env*` locais, `backend/uploads` (receitas de desenvolvimento) e artefatos de build. Para reproduzir o build localmente: `npm run build:vercel`.

Verificação pós-deploy:

```bash
curl -s https://medconnect-ashen.vercel.app/api/health   # liveness
curl -s https://medconnect-ashen.vercel.app/api/ready    # SELECT 1 no Supabase
```

## 5. Rollback

- **Código**: Vercel → Deployments → deploy anterior → **Promote to Production** (instantâneo, sem rebuild). Pelo CLI: `vercel rollback`.
- **Banco**: o plano gratuito do Supabase tem backup diário sem PITR. Para mudanças de schema arriscadas, faça `pg_dump` (modo sessão) antes de migrar — procedimento em `backup-restore.md`. Lembrete do ADR 022: após uma restauração com `--no-privileges`, reaplique o bloco de `REVOKE` da migration de hardening.
