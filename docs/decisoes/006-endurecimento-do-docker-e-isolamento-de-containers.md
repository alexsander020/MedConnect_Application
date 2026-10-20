# ADR 006: Endurecimento do Docker e Isolamento de Containers

## Status
Aceito

## Contexto
O `Dockerfile` anterior utilizava `node:21-alpine` (fora de suporte), instalava dependências com `npm install`, executava o processo da aplicação como `root` e não contava com multi-stage build nem healthcheck. O `docker-compose.yml` expunha segredos e não possuía banco relacional para suporte ao ciclo de migração.

## Decisão
1. **Regras Estritas de `.dockerignore`**:
   - Criados `.dockerignore` na raiz e em `backend/` para impedir o empacotamento acidental de `.env*`, `*.db*`, `node_modules`, `uploads/`, `tests/` e artefatos de build.
2. **Multi-Stage Build com Imagem Atualizada**:
   - Base migrada para `node:22-alpine` (LTS ativo).
   - Estágio de build (`builder`): executa `npm ci`, gera o Prisma Client e compila TypeScript.
   - Estágio de runtime (`runner`): enxuto, sem dependências de compilação ou devDependencies (`npm prune --production`).
3. **Princípio do Menor Privilégio e Verificação de Saúde**:
   - Processo configurado explicitamente para rodar com `USER node` (UID 1000 não-root).
   - `HEALTHCHECK` periódico nativo via `curl` no endpoint `/health`.
4. **Composição de Serviços (`docker-compose.yml`)**:
   - Serviço de banco PostgreSQL 16 provisionado com volume nomeado e healthcheck (`pg_isready`), pronto para a transição planejada na Fase 1.
   - Variáveis sensíveis geridas via `env_file: [.env]`.
