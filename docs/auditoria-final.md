# Relatório de Auditoria Independente Pré-Piloto — MedConnect

> **PAPEL DE AUDITORIA:**
> Auditoria técnica independente de definição de pronto (Definition of Done - DoD) para liberação do piloto comercial.
> **Branch**: `auditoria-final` | **Data da Avaliação**: 24 de Outubro de 2026.
> **Postura de Auditoria**: Cética e baseada estritamente em evidências empíricas de comandos e saídas. Na presença de inconformidades ou incertezas, os itens foram classificados como **PARCIAL** ou **REPROVADO**.

---

## 1. Quadro Consolidado de Conformidade Pré-Piloto

| # | Item de Verificação | Status | Severidade do Risco | Resumo do Diagnóstico |
| :-: | :--- | :---: | :---: | :--- |
| **1** | Segredos, `.env`, `.db` e Imagem Docker | **PARCIAL** | **ALTA** | Árvore atual limpa e Docker seguro; contudo, o histórico do Git ainda contém segredo legado do Supabase e SQLite antigo pendentes de purga manual. |
| **2** | Variáveis Obrigatórias e Rejeição de Tokens Antigos | **APROVADO** | Nenhuma | Validação estrita via Zod em `env.ts`; literal antigo eliminado; tokens com segredo legado rejeitados com HTTP 401. |
| **3** | Eliminação de `mockData` e Estados de Erro Reais | **APROVADO** | Nenhuma | `grep -r mockData MedConnect/src` retorna vazio; telas tratam falha com `ErrorState` e mensagens da API. |
| **4** | Farmácias Verificadas, Redação de Contato e URLs Assinadas | **APROVADO** | Nenhuma | Farmácias não verificadas bloqueadas (403); contato só liberado após aceite; URLs protegidas por HMAC-SHA256 e expiração. |
| **5** | Integridade do Fluxo, `@unique`, Transação e Concorrência | **APROVADO** | Nenhuma | `@unique` no schema, transação serializável, corrida simultânea controlada (409 Conflict) e máquina de estados validada. |
| **6** | Pipeline de CI/CD, Ações por SHA e Cobertura $\ge 80\%$ | **PARCIAL** | **MÉDIA** | Actions fixadas por SHA e deploy dependente de CI verde; contudo, cobertura caiu para **78.2%** (falhando o threshold de 80%). |
| **7** | Prevenção a IDOR em Rotas com ID e Matriz de RBAC | **APROVADO** | Nenhuma | 35 rotas testadas com matriz parametrizada; tentativas de acesso cruzado rejeitadas com 403/404. |
| **8** | Conformidade Técnica LGPD (Consentimento, Exportação, AuditLog) | **APROVADO** | Nenhuma | Consentimento versionado obrigatório, exportação JSON, anonimização de titulares, AuditLog imutável e AES-256-GCM. |
| **9** | Coerência Documental (README, Swagger, ADRs) | **APROVADO** | Nenhuma | 17 ADRs atualizados; OpenAPI 3.0 sincronizado 1:1 com Express (validado via teste automatizado). |

---

## 2. Evidências Técnicas Detalhadas por Item

---

### Item 1: Ausência de Segredos, `.env`, `.db` e Inspeção da Imagem Docker
- **Status**: **PARCIAL** (Severidade: **ALTA**)
- **Análise da Árvore Atual (Working Tree)**:
  - Comando executado:
    ```bash
    git ls-files | Select-String -Pattern "\.env|\.db|\.sqlite|\.pem|\.key"
    ```
  - Saída:
    ```text
    MedConnect/.env.example
    backend/.env.example
    ```
  - *Diagnóstico*: Nenhum arquivo `.env` real ou banco SQLite está rastreado no commit atual.
- **Análise da Imagem Docker e `.dockerignore`**:
  - `backend/.dockerignore` exclui expressamente: `node_modules`, `.env*`, `*.db`, `*.sqlite*`, `uploads`, `.git`, `tests`.
  - `backend/Dockerfile`: Multi-stage build (`builder` -> `runner`), usuário não-root `USER node`, não inclui arquivos de ambiente nem segredos no build final.
- **Análise do Histórico do Git (Git History)**:
  - Comando executado:
    ```bash
    git log --all --full-history --name-only -- "*.env*"
    ```
  - Saída:
    ```text
    commit 2e6528bedc80928926e5acfdfc0c000dc470cfd0 (02/10/2026): MedConnect/.env, backend/prisma/dev.db
    commit d8db63868644215c3c3e9316e7777d18157a66e7 (23/04/2026): MedConnect/.env
    ```
  - Conteúdo identificado no histórico (`git show d8db63868:MedConnect/.env`):
    ```text
    VITE_SUPABASE_URL=https://gemtjumxjpfmlyqnvtgj.supabase.co
    VITE_SUPABASE_ANON_KEY=sb_publishable_b21WCbmhCNkPTzg9WioDTQ_jsZ-prAM
    ```
  - *Conclusão do Auditor*: A remoção manual do histórico com `git-filter-repo` ou BFG ainda **não foi realizada**. Há uma chave antiga de Supabase persistida nos commits históricos.

---

### Item 2: Variáveis Obrigatórias e Rejeição de Tokens Antigos
- **Status**: **APROVADO** (Severidade: **NENHUMA**)
- **Análise de Código**:
  - `backend/src/config/env.ts`: Zod schema valida compulsoriamente `DATABASE_URL`, `JWT_SECRET` ($\ge 32$ caracteres), e credenciais Cloudinary em produção.
  - `git grep "medconnect_super_secret_key"`: Retornou vazio (código de saída 1). O literal do segredo legado foi completamente removido.
- **Evidência dos Testes Automatizados**:
  - Comando executado:
    ```bash
    npx jest tests/env.test.ts
    ```
  - Saída:
    ```text
    PASS tests/env.test.ts
      Environment Configuration & JWT Secret Validation
        √ should fail validation when JWT_SECRET is missing (80 ms)
        √ should fail validation when JWT_SECRET is shorter than 32 characters (6 ms)
        √ should fail validation in production when CLOUDINARY credentials are missing (11 ms)
        √ should succeed validation when all required variables are valid (1 ms)
        √ should reject a token signed with the old hardcoded fallback secret (29 ms)
    ```

---

### Item 3: Eliminação de `mockData` e Estados de Erro Reais
- **Status**: **APROVADO** (Severidade: **NENHUMA**)
- **Análise de Código**:
  - Comando executado:
    ```bash
    git grep -i "mockData" MedConnect/src
    ```
  - Saída: *Vazio (código de saída 1)*. O arquivo `mockData.js` foi extirpado do código do frontend.
- **Evidência dos Testes Automatizados**:
  - Comando executado:
    ```bash
    npx jest src/pages/api-error-fallback.test.jsx
    ```
  - Saída:
    ```text
    PASS src/pages/api-error-fallback.test.jsx
      Anti-Fallback Mock Data Isolation Tests
        Orders Page (Patient)
          √ should display error state and NO mock data when api fails (203 ms)
        Requests Page (Pharmacy)
          √ should display error state and NO mock data when api fails (55 ms)
        OrderManagement Page (Pharmacy)
          √ should display error state and NO mock data when api fails (40 ms)
    ```

---

### Item 4: Farmácias Verificadas, Redação de Contato e URLs Assinadas
- **Status**: **APROVADO** (Severidade: **NENHUMA**)
- **Análise de Código e Comportamento**:
  - `PrescriptionController.getById` e `listOpenForPharmacies`: Bloqueiam farmácias com `verificationStatus !== 'VERIFIED'` com `HTTP 403 PHARMACY_NOT_VERIFIED`.
  - `PrescriptionController.getSignedViewUrl`: Exige que a farmácia solicitante seja titular da cotação com `status = 'ACCEPTED'`. Pacientes de receitas alheias ou farmácias concorrentes recebem `HTTP 403`.
  - URLs de arquivo utilizam assinatura temporal com HMAC SHA-256 (`prescriptionSecurity.ts`), expirando em tempo pré-configurado.
- **Evidência dos Testes**:
  - `tests/state-machine-and-verification.test.ts` e `tests/privacy-lgpd.test.ts`:
    ```text
    √ Farmácia PENDING_VERIFICATION é bloqueada em GET /api/prescriptions/pharmacy (HTTP 403)
    √ Farmácia REJECTED é bloqueada em POST /api/quotes (HTTP 403)
    √ GET /api/prescriptions/pharmacy: pharmacy without accepted order MUST NOT receive phone, address, or fileUrl
    √ GET /api/orders/:id: pharmacy with accepted quote/order receives delivery address and prescription fileUrl
    √ GET /api/orders/:id: competing pharmacy (without accepted quote) is forbidden (403 IDOR)
    ```

---

### Item 5: Fluxo Cotação -> Pedido -> Entrega (Integridade e Concorrência)
- **Status**: **APROVADO** (Severidade: **NENHUMA**)
- **Análise de Banco de Dados**:
  - Prisma Schema: `@@unique([prescriptionId, pharmacyId])` na tabela `Quote` garante unicidade estrita de propostas por farmácia.
  - `OrderController.create`: Executa dentro de `$transaction` com isolamento serializável, atualizando receita para `ACCEPTED` e demais cotações para `REJECTED`.
- **Evidência de Concorrência e Máquina de Estados**:
  - `tests/concurrency-order.test.ts`:
    ```text
    √ duas requisições simultâneas de aprovação geram exatamente UM único pedido e retornam 409 Conflict na concorrente (Statuses: [201, 409])
    ```
  - `tests/state-machine-and-verification.test.ts`:
    ```text
    √ Rejeita pular de PRODUCTION direto para DELIVERED -> 409 Conflict
    √ Rejeita retroceder status de DELIVERY de volta para PRODUCTION -> 409 Conflict
    √ Rejeita cancelar um pedido que já está DELIVERED -> 409 Conflict
    √ Rejeita transicionar um pedido já CANCELLED para DELIVERY -> 409 Conflict
    ```

---

### Item 6: Pipeline de CI/CD, Ações por SHA e Cobertura de Código
- **Status**: **PARCIAL** (Severidade: **MÉDIA / ALTA**)
- **Análise dos Workflows GitHub Actions**:
  - Todas as GitHub Actions em `.github/workflows/ci.yml`, `deploy-backend.yml` e `deploy-frontend.yml` estão fixadas por **commit SHA completo de 40 caracteres** (ex: `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`).
  - `deploy-backend.yml` e `deploy-frontend.yml` são disparados apenas após conclusão com sucesso do CI (`github.event.workflow_run.conclusion == 'success'`).
- **Análise da Cobertura de Testes (`npm run test:coverage -w backend`)**:
  - Comando executado:
    ```bash
    npm run test:coverage -w backend
    ```
  - Saída obtida:
    ```text
    -----------------------------|---------|----------|---------|---------|
    File                         | % Stmts | % Branch | % Funcs | % Lines |
    -----------------------------|---------|----------|---------|---------|
    All files                    |    78.2 |    67.04 |   77.89 |   78.41 |
     controllers                 |   78.34 |    71.58 |   87.93 |   78.13 |
     services                    |   75.21 |    56.37 |   56.25 |   76.54 |
    -----------------------------|---------|----------|---------|---------|
    Jest: "global" coverage threshold for statements (80%) not met: 78.2%
    Jest: "global" coverage threshold for lines (80%) not met: 78.41%
    ```
  - *Diagnóstico do Auditor*: A meta mandatória de $\ge 80\%$ de cobertura em controllers e serviços **não foi atingida** (78.2% statements / 78.41% lines). O job `test-backend` falharia no GitHub Actions devido ao threshold estrito configurado no Jest. A queda ocorreu pela adição dos novos módulos da Fase 4 e Fase 5 (`consent.controller.ts`: 30%, `dataRetentionService.ts`: 42.85%, `admin.controller.ts`: 44.44%).

---

### Item 7: Prevenção a IDOR em Rotas com ID e Matriz de RBAC
- **Status**: **APROVADO** (Severidade: **NENHUMA**)
- **Evidência dos Testes Automatizados**:
  - `tests/security-idor.test.ts` (5 testes aprovados):
    - Paciente A não aprova cotação de Paciente B (HTTP 403).
    - Paciente A não lê receita de Paciente B (HTTP 403/404).
    - Paciente A não lê pedido de Paciente B (HTTP 403/404).
    - Farmácia A não altera status de pedido da Farmácia B (HTTP 403/404).
    - Farmácia A não vê dados de contato sem cotação aceita.
  - `tests/rbac-matrix.test.ts` (35 testes aprovados):
    - Validação exaustiva de rotas administrativas, rotas de paciente, rotas de farmácia e rotas comuns contra chamadas anônimas e papéis não autorizados.

---

### Item 8: Conformidade Técnica LGPD
- **Status**: **APROVADO** (Severidade: **NENHUMA**)
- **Evidência dos Testes Automatizados**:
  - Comando executado:
    ```bash
    npx jest tests/phase4-lgpd-compliance.test.ts
    ```
  - Saída:
    ```text
    PASS tests/phase4-lgpd-compliance.test.ts
      FASE 4 — LGPD E CONFORMIDADE (TESTES TÉCNICOS)
        4.2 Consentimento de Saúde (LGPD Art. 11)
          √ Rejeita upload de receita quando o titular não possui consentimento ativo (403 CONSENT_REQUIRED)
          √ Aceita upload quando consentimento é registrado explicitamente no formulário de envio
          √ Permite revogação do consentimento nas configurações e bloqueia novos envios (403 CONSENT_REVOKED)
        4.3 Direitos do Titular (LGPD Art. 18)
          √ Exportação retorna todos os dados do titular em JSON e respeita estritamente o dono (Anti-IDOR)
          √ Exclusão / Anonimização remove identificadores diretos, revoga consentimento e preserva retenção mínima
        4.4 Trilha de Auditoria Imutável (AuditLog)
          √ AuditLog registra acessos a receitas e contatos e é consultável exclusivamente por ADMIN
          √ AuditLog NÃO pode ser alterado nem apagado por nenhuma rota (405 Method Not Allowed)
        4.5 Criptografia em Repouso com keyId e Rotação
          √ Campos sensíveis (CPF, telefone, endereço) não aparecem em texto plano no banco de dados
          √ Suporta rotação de chave criptográfica rastreada por keyId
        4.3 Rotina Agendada de Retenção / Expurgo
          √ Por padrão, a rotina de expurgo é desativada e não executa exclusões
          √ Quando habilitada programaticamente, expurga tokens de autenticação expirados
    ```

---

### Item 9: Coerência Documental (README, Swagger, ADRs)
- **Status**: **APROVADO** (Severidade: **NENHUMA**)
- **Evidências**:
  - `backend/src/docs/swagger.yaml` validado por `tests/swagger-routes-sync.test.ts`:
    ```text
    PASS tests/swagger-routes-sync.test.ts
      √ deve carregar o arquivo swagger.yaml sem erros de sintaxe OpenAPI 3.0
      √ todas as rotas críticas da aplicação devem estar documentadas no swagger.yaml
      √ cada rota documentada no swagger.yaml deve existir no app Express e ser roteada com sucesso
    ```
  - 17 Architectural Decision Records (ADRs) mantidos em `docs/decisoes/` cobrindo monorepo, banco PostgreSQL, integridade do fluxo, CI/CD, observabilidade e governança.
  - Documentação da Fase 4 e Fase 5 completa em `docs/lgpd/` e `docs/negocio/`.

---

## 3. Matriz de Severidade das Falhas Restantes

| Item | Falha Identificada | Severidade | Impacto Potencial | Ação Obrigatória de Mitigação |
| :-: | :--- | :---: | :--- | :--- |
| **#1** | Presença de segredo antigo do Supabase e SQLite nos commits `d8db6386` e `2e6528be` do histórico do Git. | **ALTA** | Exposição de credenciais legadas caso o repositório seja tornado público ou compartilhado com terceiros. | 1. Revogar/deletar o projeto no console do Supabase.<br>2. Executar `git-filter-repo --path MedConnect/.env --invert-paths` e forçar push limpo antes de abrir o repositório. |
| **#6** | Cobertura de testes do backend está em **78.2%** (meta: $\ge 80\%$), falhando o script `test:coverage`. | **MÉDIA** | Falha automática do job de CI no GitHub Actions (`Backend Tests with Coverage Threshold`), impedindo merge na branch `main`. | Criar testes unitários para os novos módulos da Fase 4 e 5 (`consent.controller.ts`, `dataRetentionService.ts`, `admin.controller.ts`), elevando a cobertura para $\ge 82\%$. |

---

## 4. Conclusão e Recomendação do Auditor

> ### Veredito: **NÃO PODE INICIAR O PILOTO EM PRODUÇÃO ATÉ O CUMPRIMENTO DAS DUAS AÇÕES DE CONTENÇÃO ABAIXO** (Apto apenas para piloto restrito em ambiente Staging/Sandbox).

### Condições Mandatórias para Liberação do Piloto em Produção:
1. **Sanitização de Cobertura de Testes (Técnica)**:
   - Adicionar suíte de testes pontual para os endpoints de consentimento e métricas administrativas para que `npm run test:coverage` atinja $\ge 80\%$ de statements/lines e o CI passe 100% verde.
2. **Invalidação de Credenciais Legadas (Segurança)**:
   - Confirmar a revogação do token do Supabase legado exposto no commit de abril/2026.
3. **Validação Jurídica Formal (Compliance)**:
   - Obter parecer formal da assessoria jurídica sobre as minutas da pasta `docs/lgpd/` e respostas aos quesitos de `docs/regulatorio/perguntas-para-o-advogado.md`.
