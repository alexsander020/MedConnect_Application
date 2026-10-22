# ADR 010: Migração para PostgreSQL com Versionamento de Migrations e Isolamento de Testes

## Status
Aceito

## Contexto
Na Fase 0, a aplicação utilizava SQLite (`file:./dev.db`) em ambiente de desenvolvimento. O SQLite impunha limitações técnicas severas para um ecossistema de saúde e e-commerce farmacêutico:
1. Ausência de suporte a tipos `enum` nativos do banco de dados, necessitando emulações em nível de aplicação.
2. Limitações em concorrência e ausência de níveis estritos de isolamento transacional (`Serializable`), essenciais para prevenir condições de corrida em operações críticas como aprovação concorrente de cotações.
3. Risco de drift de schema entre desenvolvimento e produção.
4. Falta de migrations SQL versionadas e auditáveis sob controle de versão.

## Decisão
1. **Adoção do PostgreSQL como SGBD Padrão**:
   - Atualizado o provider do Prisma em `backend/prisma/schema.prisma` de `sqlite` para `postgresql`.
   - Criada a migration inicial versionada (`backend/prisma/migrations/20261021235746_init/migration.sql`), registrando a estrutura completa das tabelas, enums nativos, restrições `@unique` e índices compostos.
2. **Orquestração e Execução de Banco Local**:
   - Atualizado o `docker-compose.yml` para provisionar o serviço PostgreSQL 16 com volume nomeado persistente.
   - Criado o script `backend/scripts/db-up.js` acessível via `npm run db:up`. O script tenta iniciar o container via Docker Compose e, caso o daemon do Docker não esteja presente no host, ativa transparentemente uma instância gerenciada de PostgreSQL local (`embedded-postgres`) na porta padrão 5432.
   - Criados scripts padronizados no `package.json`: `db:up`, `db:migrate`, `db:seed`, `db:studio`.
3. **Seed Sintético com Proteção de Ambiente**:
   - Desenvolvido `backend/prisma/seed.ts` para popular dados sintéticos consistentes (1 administrador, 2 pacientes com CPFs válidos e criptografados, 2 farmácias verificadas com CNPJs válidos, receitas e cotações de exemplo).
   - O seed possui bloqueio rígido impedindo execução quando `NODE_ENV === 'production'`.
4. **Isolamento de Banco de Testes**:
   - Os testes de integração são executados contra um banco dedicado (`medconnect_test`), separado do banco de desenvolvimento (`medconnect`).
   - Implementado `backend/tests/globalSetup.ts` que provisiona o banco de teste automaticamente e aplica as migrations antes da execução das suítes.
   - Cada teste limpa as tabelas afetadas via hook `beforeEach` (`cleanDatabase`), garantindo idenficiência e isolamento sem corromper dados de desenvolvimento.
   - Remoção completa de referências e dependências de SQLite no código e na documentação.

## Consequências
- **Positivas**: Paridade completa entre desenvolvimento, testes e produção; suporte a transações concorrentes ACID com isolamento `Serializable`; enums e índices nativos eficientes; histórico rastreável de evolução do schema.
- **Trade-offs**: Exigência de serviço PostgreSQL ativo para desenvolvimento e testes locais, mitigada pelo script de conveniência `npm run db:up`.
