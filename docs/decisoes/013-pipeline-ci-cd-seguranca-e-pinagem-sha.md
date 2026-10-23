# 13. Pipeline de CI/CD, Segurança e Pinagem por SHA

## Status
Aceito

## Contexto
O projeto MedConnect contava com múltiplos workflows legados e desarticulados no GitHub Actions (como `deploy-pages.yml` e scripts não consolidados), sem orquestração centralizada de testes, análise de vulnerabilidades de dependências, detecção de segredos em código ou verificação de integridade estática do compilador TypeScript.
Além disso, workflows sem restrição explícita de permissões (`GITHUB_TOKEN`) ou que utilizam tags mutáveis de actions (como `@v4` ou `@main`) são vulneráveis a ataques de Supply Chain e envenenamento de pipeline.

## Decisão
1. **Consolidação em `.github/workflows/ci.yml`**:
   - Um único workflow orquestrador abrangendo as etapas essenciais de qualidade e segurança:
     - **Lint**: Verificação estática de código no frontend e backend (`eslint`).
     - **Typecheck**: Verificação de tipos TypeScript sem geração de arquivos (`tsc --noEmit`) no backend.
     - **Testes Backend com Postgres de Serviço**: Inicialização de container oficial `postgres:15-alpine`, aplicação de migrations via `prisma migrate deploy` e execução da suíte completa de testes com Jest + Supertest e bloqueio estrito de cobertura mínima de 80% nos controllers e services.
     - **Testes Frontend & E2E**: Testes unitários/componentes (React Testing Library) e fluxo ponta a ponta com Playwright.
     - **Build**: Compilação e empacotamento do frontend (Vite com injeção segura de `VITE_API_URL`) e compilação do backend (`tsc`).
     - **Auditoria de Segurança**: Execução de `npm audit --omit=dev`, varredura de credenciais com Gitleaks e análise estática avançada com GitHub CodeQL (SAST).
2. **Defesa em Profundidade na Configuração do CI**:
   - **Permissões Mínimas**: Declaração explícita de `permissions: contents: read` nos jobs regulares e apenas permissões necessárias no job de segurança (`security-events: write` para upload SARIF no CodeQL).
   - **Pinagem Estrita por Commit SHA**: Todas as GitHub Actions são referenciadas exclusivamente pelo SHA completo de 40 caracteres do commit do Git, eliminando risco de sequestro de tags mutáveis.
   - **Node.js 22 LTS & Cache**: Padronização do runtime Node.js 22 com cache integrado de dependências (`cache: 'npm'`).
   - **Dependabot Ativo**: Configuração de `.github/dependabot.yml` para varredura semanal de atualizações de dependências npm e actions do GitHub.

## Consequências
- Garantia de que nenhum commit é integrado à branch principal sem verificação rigorosa de tipos, lint, segurança e cobertura.
- Proteção robusta contra ataques de cadeia de suprimentos no ambiente de automação.
- Histórico de auditoria e relatórios de segurança centralizados na aba Security do GitHub.
