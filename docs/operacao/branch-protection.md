# Governança de Código e Proteção da Branch Principal (`main`)

## 1. Visão Geral e Princípios
A branch `main` representa o código em estado potencialmente entregável para produção e staging.
Para manter a estabilidade, segurança e conformidade da plataforma **MedConnect**, nenhuma alteração direta pode ser feita na branch `main` (`push` direto desabilitado). Todas as alterações devem ser propostas via Pull Request (PR) e aprovadas pelo pipeline de Integração Contínua (CI).

---

## 2. Regras Recomendadas de Branch Protection (GitHub)

### Configuração no GitHub (`Settings > Branches > Branch protection rules > Branch name pattern: main`):

1. **Require a pull request before merging (PR Obrigatório)**:
   - **Require approvals**: Mínimo de **1 aprovação** de revisor técnico (Peer Review).
   - **Dismiss stale pull request approvals when new commits are pushed**: Ativado (qualquer novo commit invalida aprovações prévias, exigindo re-revisão).
   - **Require review from Code Owners**: Ativado (se CODEOWNERS estiver configurado).

2. **Require status checks to pass before merging (CI Obrigatório)**:
   - **Require branches to be up to date before merging**: Ativado (garante que o código do PR foi testado em conjunto com o HEAD mais recente da `main`).
   - **Status checks obrigatórios que devem estar VERDES**:
     - `ci / lint` (ESLint frontend e backend)
     - `ci / typecheck` (`tsc --noEmit` no backend TypeScript)
     - `ci / test-backend-coverage` (Testes Jest + Supertest com PostgreSQL de teste e cobertura mínima de 80% nos controllers e services)
     - `ci / test-frontend` (Testes unitários e de componente com React Testing Library)
     - `ci / test-e2e` (Playwright ponta a ponta com múltiplos contextos de navegador)
     - `ci / build` (Build de produção do frontend e compilação do backend)
     - `ci / security-audit` (`npm audit --omit=dev`, Gitleaks secret detection, CodeQL SAST)

3. **Require conversation resolution before merging**:
   - Ativado (todas as threads de comentários e discussões no PR devem ser explicitamente resolvidas).

4. **Require signed commits**:
   - Recomendado (garante autoria criptográfica dos commits via GPG/SSH).

5. **Require linear history**:
   - Recomendado (evita commits de merge desordenados, preferindo Squash & Merge ou Rebase).

6. **Do not allow bypassing the above settings**:
   - Ativado para todos os usuários (inclusive administradores de repositório, garantindo conformidade com auditoria e SOC2/ISO 27001).

7. **Do not allow force pushes (`--force`)**:
   - Bloqueado (impede reescrita de histórico na branch `main`).

8. **Do not allow deletions**:
   - Bloqueado (impede que a branch `main` seja excluída acidentalmente).

---

## 3. Critérios de Aceite e Fluxo de Entrega Contínua

| Evento | Condição do CI | Comportamento do GitHub | Ação de Deploy |
|---|---|---|---|
| **Pull Request aberto para `main`** | ❌ Qualquer job quebrado ou cobertura < 80% | **Merge Bloqueado** pelo GitHub | Nenhuma |
| **Pull Request aberto para `main`** | ✅ Todos os status checks verdes | **Merge Liberado** (após aprovação humana) | Nenhuma |
| **Merge realizado na `main`** | ✅ CI verde na `main` | Commit integrado no histórico linear | **Deploy automático em Staging** (Render Web Service + Prisma Migration) |
| **Release Tag / Promoção manual** | ✅ Staging validado | Tag de versão gerada (`vX.Y.Z`) | **Deploy em Produção** com aprovação manual no GitHub Environment |

---

## 4. Política de Rollback Emergencial
Em caso de incidente crítico detectado em Staging ou Produção:
1. **Reversão via Git (`Revert PR`)**:
   - Crie um PR de reversão direta pelo botão "Revert" do GitHub.
   - O PR de reversão roda os status checks e é mesclado de imediato.
2. **Rollback Imediato na Nuvem (Render Console/CLI)**:
   - No painel do Render Web Service, clique em **Deploy History** e selecione o último deploy estável -> **Rollback to this deploy**.
   - O tráfego de usuários é revertido em menos de 30 segundos enquanto a causa raiz é investigada.
