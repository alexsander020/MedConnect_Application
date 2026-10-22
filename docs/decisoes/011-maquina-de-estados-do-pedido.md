# ADR 011: Máquina de Estados do Pedido, Trilha de Auditoria e Integridade Transacional

## Status
Aceito

## Contexto
No fluxo de manipulação farmacêutica, a integridade da progressão de pedidos e o controle transacional são indispensáveis:
1. Na Fase 0, a atualização de status de pedidos aceitava alterações arbitrárias sem validar a ordem cronológica ou a viabilidade da transição (ex.: pedidos entregues podiam voltar para produção ou ser cancelados indevidamente).
2. Não existia registro histórico das transições, inviabilizando auditoria interna e rastreabilidade sanitária.
3. Os enums de status eram compartilhados de forma genérica entre receitas, cotações e pedidos, gerando confusão semântica.
4. Faltava garantia de isolamento transacional na conversão de cotação em pedido, permitindo race conditions onde duas requisições concorrentes poderiam aprovar a mesma cotação ou aceitar múltiplas cotações para uma mesma receita.

## Decisão
1. **Separação Rígida de Enums de Domínio**:
   - `PrescriptionStatus`: `PENDING`, `QUOTED`, `ACCEPTED`, `CANCELLED`.
   - `QuoteStatus`: `PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`.
   - `OrderStatus`: `PRODUCTION`, `DELIVERY`, `DELIVERED`, `CANCELLED`.
2. **Máquina de Estados Finita (`orderStateMachine.ts`)**:
   - Implementado o módulo de domínio `backend/src/domain/orderStateMachine.ts` definindo as transições estritamente válidas:
     - `PRODUCTION` -> `DELIVERY`
     - `DELIVERY` -> `DELIVERED`
     - `PRODUCTION` -> `CANCELLED`
   - Qualquer tentativa de transição fora dessa matriz é rejeitada com código HTTP 409 Conflict e mensagem informativa padronizada.
3. **Auditoria Transacional com `OrderStatusHistory`**:
   - Criada a tabela de banco de dados `OrderStatusHistory` com as colunas: `id`, `orderId`, `fromStatus`, `toStatus`, `changedByType`, `changedById`, `createdAt`.
   - Cada transição de status gera compulsoriamente um registro nesta tabela dentro da mesma transação Prisma em que o status do pedido é alterado.
4. **Regras de Autorização**:
   - Somente a farmácia que emitiu a cotação aceita tem autorização para alterar o status do pedido (incluindo o cancelamento durante `PRODUCTION`).
   - O paciente titular tem permissão apenas de leitura e acompanhamento do progresso do pedido, sem prerrogativa de alteração direta de estado.
5. **Conversão Atômica Cotação -> Pedido com Isolamento Serializable**:
   - A rota `POST /api/orders` executa todas as etapas dentro de uma única transação atômica (`prisma.$transaction` com isolamento `Serializable`):
     a) Valida posse da cotação e da receita pelo paciente autenticado;
     b) Rejeita com 409 caso a receita já esteja `ACCEPTED` ou `CANCELLED`;
     c) Cria o pedido em status `PRODUCTION`;
     d) Atualiza a cotação escolhida para `ACCEPTED`;
     e) Atualiza em lote todas as demais cotações concorrentes da mesma receita para `REJECTED`;
     f) Atualiza o status da receita para `ACCEPTED`;
     g) Insere o registro inicial na tabela `OrderStatusHistory`.
   - Violações de unicidade (`Order.quoteId` @unique / erro Prisma P2002) são interceptadas e convertidas em HTTP 409 Conflict.

## Consequências
- **Positivas**: Prevenção absoluta de race conditions na aprovação de cotações; ciclo de vida do pedido rigorosamente controlado; conformidade e rastreabilidade completa via histórico de auditoria.
- **Negativas**: Requer que clientes respeitem rigorosamente o fluxo de status progressivo sem pular etapas intermediárias.
