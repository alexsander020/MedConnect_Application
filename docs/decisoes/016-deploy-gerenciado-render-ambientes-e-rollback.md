# 16. Deploy Gerenciado no Render, Ambientes e Política de Rollback

## Status
Aceito

## Contexto
O MedConnect necessita de uma infraestrutura em nuvem gerenciada para hospedar a API backend (Node.js/Express/TypeScript) e o banco de dados relacional (PostgreSQL), atendendo aos seguintes requisitos:
1. Execução automatizada de migrações (`prisma migrate deploy`) antes da inicialização do novo container/versão.
2. Isolamento estrito entre os ambientes de **Staging** (homologação contínua de merges na `main`) e **Produção** (liberação controlada de versões de release).
3. Mecanismo determinístico e documentado de rollback imediato em caso de incidentes operacionais.
4. Suporte a deploy contínuo acionado via CI/CD (Deploy Hooks seguros por token).

Em alinhamento interativo com as diretrizes do projeto (decisão R8), a plataforma gerenciada selecionada foi o **Render**.

## Decisão
1. **Topologia de Infraestrutura no Render**:
   - **Render Web Service (Backend API)**:
     - Runtime: Node.js 22 LTS (ou container Docker multi-stage).
     - **Pre-Deploy Command**: `npm run db:migrate:deploy` (`npx prisma migrate deploy`), garantindo que qualquer alteração de schema seja concluída antes da inicialização do processo web. Se a migration falhar, o deploy é cancelado e o tráfego permanece na versão estável anterior.
     - **Start Command**: `node dist/server.js`.
     - **Healthcheck Path**: `/health` (para liveness) e `/ready` (para validação de banco).
   - **Render Managed PostgreSQL**:
     - Instâncias separadas para Staging e Produção, com backup diário automático retido e criptografia em repouso.
2. **Separação de Ambientes e Variáveis**:
   - **Staging (`medconnect-staging.onrender.com`)**:
     - Acionado automaticamente a cada merge na branch `main` após sucesso no pipeline de CI (`.github/workflows/ci.yml`).
     - Utiliza `DATABASE_URL_STAGING` e `CORS_ORIGINS` apontando para o frontend de staging.
   - **Produção (`medconnect-api.onrender.com`)**:
     - Acionado via workflow manual (`workflow_dispatch`) ou criação de release tag `v*.*.*`.
     - Exige aprovação no GitHub Environment `production` com secrets isolados.
3. **Frontend (Vite/Static Hosting)**:
   - Build estático com injeção de `VITE_API_URL` apontando para a URL do backend de cada ambiente respectivo.
4. **Procedimento de Rollback Documentado**:
   - **Rollback Imediato (Render Console)**: O operador acessa o serviço no Render, seleciona a aba **Deploys**, localiza o último deploy verde e clica em **Rollback to this deploy**. O tráfego é roteado de volta em menos de 30 segundos.
   - **Padrão Expand & Contract**: Migrações de banco são projetadas para serem retrocompatíveis (novas colunas opcionais/nullable), assegurando que uma reversão de código de aplicação não cause erros de incompatibilidade no banco.

## Consequências
- Processo de deploy 100% automatizado, resiliente e protegido contra falhas de migration em runtime.
- Facilidade de operação sem necessidade de gerenciar nós de Kubernetes ou máquinas virtuais diretamente.
- Conformidade auditável com ambientes separados e rastreabilidade total via Git e Render Deploys.
