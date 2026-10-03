# ADR 002: Arquitetura Backend com Node.js, TypeScript e Prisma ORM

## Status
Aceito

## Contexto
A plataforma MedConnect conecta pacientes, receitas médicas, farmácias de manipulação, orçamentos e pedidos de produção/entrega. Era necessária uma camada de persistência com modelagem relacional clara, tipagem estática ponta a ponta e transações atômicas para evitar inconsistências (ex: aprovar orçamento e gerar pedido simultaneamente).

## Decisão
1. **Node.js com Express e TypeScript**: Para desenvolvimento ágil e integração nativa com o ecossistema JavaScript do frontend.
2. **Prisma ORM**: Facilita migrações declarativas (`schema.prisma`), tipagem estática gerada automaticamente e suporte transparente a múltiplos bancos (SQLite para dev/testes ágeis locais, PostgreSQL para produção).
3. **Transações Atômicas (`prisma.$transaction`)**: Ao paciente aceitar uma cotação (`POST /api/orders`), o status da cotação, da receita e o novo pedido são criados/atualizados em uma transação atômica única, prevenindo pedidos órfãos ou duplicados.
4. **WebSocket (Socket.IO)**: Notificações em tempo real enviadas ao paciente no momento exato em que uma farmácia submete um novo orçamento.
5. **OpenAPI 3.0 (Swagger UI)**: Especificação formal em YAML e UI interativa disponível em `/api-docs` para desenvolvedores e integrações externas.

## Consequências
- Alta produtividade com autocomplete e type-checking no backend.
- Facilidade de rodar testes em CI sem necessidade de containers de banco pesados (usando SQLite in-memory/file).
- Documentação viva da API sincronizada com os endpoints.
