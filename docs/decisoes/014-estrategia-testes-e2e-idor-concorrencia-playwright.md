# 14. Estratégia de Testes: IDOR, Concorrência, RBAC e Playwright Ponta a Ponta

## Status
Aceito

## Contexto
O README e as especificações de negócio do MedConnect prometem garantias críticas de integridade, incluindo:
1. Impossibilidade de vazamento de dados ou alteração indevida de recursos entre usuários distintos (IDOR).
2. Proteção contra criação duplicada de pedidos quando duas aprovações de cotação ocorrem simultaneamente (Concorrência).
3. Matriz estrita de controle de acesso baseado em papel (RBAC: PATIENT, PHARMACY, ADMIN) em todas as rotas protegidas.
4. Bloqueio de farmácias não verificadas pela vigilância/administração.
5. Transições de estados finitos e imutabilidade de pedidos após conclusão.
6. Fluxo completo e simultâneo entre múltiplos navegadores/usuários (Paciente e Farmácia).

## Decisão
Adotamos uma pirâmide de testes estruturada em três camadas integradas:

1. **Camada de Integração Backend (Jest + Supertest + PostgreSQL Oficial)**:
   - **Caminho Feliz Ponta a Ponta (`e2e-happy-path.test.ts`)**: Validação sequencial completa desde o cadastro de paciente e farmácia, upload de receita, envio de orçamento, aprovação transacional e entrega do pedido.
   - **Testes de IDOR (`security-idor.test.ts`)**:
     - Paciente A não aprova cotação do paciente B (retorna `403 Forbidden`).
     - Paciente A não visualiza receitas ou pedidos do paciente B (`403 Forbidden`).
     - Farmácia A não altera status ou detalhes de pedido da farmácia B (`403 Forbidden`).
     - Farmácia não tem acesso ao contato ou nome real do paciente sem cotação previamente aceita (LGPD).
   - **Concorrência Atômica (`concurrency-order.test.ts`)**:
     - Disparo simultâneo (`Promise.all`) de duas aprovações para a mesma cotação utilizando transação serializável/atômica (`$transaction` com verificação de lock e atomicidade no Prisma). Apenas um pedido é gerado (`201`), enquanto a segunda requisição é rejeitada (`409 Conflict` ou `400`).
   - **Matriz de RBAC Parametrizada (`rbac-matrix.test.ts`)**:
     - Tabela de testes cobrindo sistematicamente cada rota protegida contra os papéis `ANONYMOUS`, `PATIENT`, `PHARMACY` e `ADMIN`, garantindo que acessos sem privilégio recebam `401 Unauthorized` ou `403 Forbidden`.
   - **Máquina de Estados e Verificação (`state-machine-and-verification.test.ts`)**:
     - Prova de que saltos inválidos de status (ex: `PENDING` -> `DELIVERED` diretamente) são rejeitados.
     - Prova de que farmácias sem o selo `verified: true` são impedidas de emitir cotações ou receber receitas.
   - **Limite Mínimo de Cobertura (Threshold >= 80%)**:
     - Configuração no `backend/jest.config.js` estabelecendo que linhas e instruções de Controllers e Services devem atingir no mínimo 80%, resultando em falha imediata de compilação/build caso não seja atingido.
2. **Camada de Componentes Frontend (React Testing Library + Jest)**:
   - Cobertura de formulários (Login, Cadastro de Paciente e Farmácia com máscaras de CPF/CNPJ).
   - Estados de erro, indisponibilidade de backend (`Network Error`) e exibição de alertas amigáveis.
3. **Camada Ponta a Ponta E2E (Playwright)**:
   - Arquivo `e2e/medconnect-flow.spec.ts` orquestrando **dois contextos isolados de navegador simultâneos**:
     - `patientContext`: Usuário faz login, anexa receita médica e publica solicitação de cotação.
     - `pharmacyContext`: Farmácia recebe notificação no mural, elabora orçamento detalhado e envia proposta.
     - `patientContext`: Paciente compara propostas, aceita o orçamento e autoriza a produção.
     - `pharmacyContext`: Farmácia inicia manipulação, despacha para entrega e confirma finalização.
     - `patientContext`: Paciente confirma o status finalizado em seus pedidos.

## Consequências
- Certeza matemática e auditável de que as promessas de privacidade, integridade financeira e autorização são cumpridas.
- Nenhuma falha de concorrência ou vulnerabilidade de autorização (OWASP Top 10 API #1 - Broken Object Level Authorization) passa despercebida no pipeline.
