# ADR 022: Banco de Dados Gerenciado no Supabase com Hardening de Integridade, Auditoria e Exposição

> Numeração: este ADR foi escrito como **ADR 018** e renumerado para 022 na integração com a vertical veterinária (que publicou os ADRs 018–021 antes). Comentários das migrations já aplicadas (`20261111120000_supabase_hardening`, `20261112041717_management_hours_support`) ainda citam `018-banco-gerenciado-supabase.md`; eles foram mantidos para não alterar o checksum de migrations já aplicadas.

## Status
Aceito

## Contexto
O PostgreSQL de produção passa a ser gerenciado pelo **Supabase** (backups automáticos, PITR, pooler de conexões e painel de observabilidade). A arquitetura da aplicação **não muda**: o backend Express + Prisma continua sendo o único cliente do banco, com autenticação própria (JWT + refresh token rotativo, ADR 012). O frontend nunca fala diretamente com o banco e não usa Supabase Auth nem `supabase-js` (removido na Fase 0).

Ao adotar o Supabase, três riscos ficaram evidentes:

1. **Data API exposta por padrão**: o Supabase publica o schema `public` via PostgREST/GraphQL (`https://<projeto>.supabase.co/rest/v1/...`) para os papéis `anon` e `authenticated`. Tabelas criadas pelo papel `postgres` recebem, por padrão, `GRANT` total para esses papéis. Sem nenhuma medida, a chave pública (publishable/anon) permitiria ler a tabela `"User"` — inclusive o hash de senha — e qualquer outra tabela.
2. **Imutabilidade do `AuditLog` só na aplicação**: a trilha de auditoria (LGPD art. 37/46) era protegida apenas pela ausência de rotas de alteração (HTTP 405). Um script, um seed ou o SQL Editor do Supabase poderiam alterar ou apagar registros.
3. **Invariantes de domínio só na API**: preço positivo, nota de 1 a 5 e "um único dono" de notificações e refresh tokens eram validados apenas no código; o banco aceitava dados inválidos vindos de fora da API.

## Decisão
A migration `backend/prisma/migrations/20261111120000_supabase_hardening/migration.sql` contém **apenas objetos que o Prisma ignora no diff** (CHECK constraints, função, triggers, RLS, privilégios e comentários de catálogo). Nenhuma coluna, tipo, índice ou chave estrangeira do `schema.prisma` é alterado, por isso `prisma migrate dev` não acusa drift.

1. **Integridade de domínio (CHECK constraints)** — espelham validações que a API já faz; o banco vira a última barreira:
   - `Quote.priceCents > 0` e `Quote.deliveryDays IS NULL OR >= 0`;
   - `Review.rating BETWEEN 1 AND 5`;
   - `Notification` e `RefreshToken` com exatamente um dono: `num_nonnulls("userId", "pharmacyId") = 1`.
2. **`AuditLog` somente-inserção no próprio banco**:
   - Função `public.audit_log_prevent_mutation()` (PL/pgSQL, `SET search_path = ''`, `EXECUTE` revogado de `PUBLIC`) que lança `insufficient_privilege` com mensagem explicativa;
   - Trigger `BEFORE UPDATE OR DELETE ... FOR EACH ROW` e trigger `BEFORE TRUNCATE ... FOR EACH STATEMENT`.
   - Efeito: `UPDATE`, `DELETE` e `TRUNCATE` são rejeitados vindos de qualquer origem (API, scripts, SQL Editor). Por isso o helper de testes `cleanDatabase` **não** limpa o `AuditLog` e os testes filtram registros por `resourceId`.
3. **Row Level Security (RLS) em todas as tabelas, sem policies**:
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` em todas as tabelas do domínio (e em `_prisma_migrations`, se existir).
   - O backend conecta como **dono das tabelas** (`postgres` no Supabase; `medconnect_user` no ambiente local). O dono de uma tabela não é submetido ao RLS (a migration não usa `FORCE ROW LEVEL SECURITY`), então o comportamento da API não muda.
   - Qualquer outro papel — em especial `anon` e `authenticated` da Data API — não enxerga nenhuma linha, porque não existe nenhuma policy que libere acesso. Isso é intencional: a única porta de entrada para os dados é a API Express, onde ficam RBAC, anti-IDOR, criptografia de campos e auditoria.
4. **Fechamento da Data API do Supabase (privilégios)**:
   - Quando os papéis `anon` e `authenticated` existem (Supabase), a migration revoga todos os privilégios sobre tabelas, sequências e funções do schema `public` e ajusta os `DEFAULT PRIVILEGES` para que tabelas criadas por migrations futuras também nasçam fechadas.
   - RLS e `REVOKE` são camadas independentes: se um `GRANT` reaparecer por engano, o RLS sem policy continua bloqueando as linhas; se o RLS for desligado por engano, a falta de `GRANT` continua bloqueando a tabela.
5. **Dicionário de dados no catálogo**: `COMMENT ON TABLE/COLUMN` descreve tabelas e colunas sensíveis (campos cifrados, hashes, dados de saúde). Os comentários aparecem no Table Editor do Supabase e em ferramentas de introspecção.
6. **Regra para migrations futuras**: toda tabela nova deve nascer com `ENABLE ROW LEVEL SECURITY`, `COMMENT ON TABLE` e, quando houver, os CHECKs de domínio — no mesmo arquivo de migration gerado pelo Prisma (`prisma migrate dev --create-only` + SQL anexado). A migration `20261112041717_management_hours_support` (ADR 023) já segue esse padrão.

### Limites conhecidos
- **`DISABLE TRIGGER`**: o dono da tabela (ou um superusuário) ainda pode executar `ALTER TABLE "AuditLog" DISABLE TRIGGER ...` e, com privilégio de superusuário, `SET session_replication_role = replica`, contornando a imutabilidade. A operação é DDL e fica registrada nos logs do Postgres (no Supabase, consultáveis no Logs Explorer). Mitigações: restringir quem possui a credencial do papel `postgres`, revisar periodicamente os logs de DDL e, numa evolução futura, fazer a aplicação conectar com um papel de menor privilégio que **não** seja dono das tabelas (o dono passaria a ser usado apenas para migrations).
- **`service_role` e dono ignoram RLS**: a chave `service_role` do Supabase tem `BYPASSRLS`. Ela nunca deve sair do servidor — e o backend sequer a utiliza, pois conecta via string de conexão PostgreSQL.
- **Restauração de backup**: `pg_restore` recria os triggers e o estado de RLS das tabelas, mas uma restauração com `--disable-triggers` não os dispara durante a carga; o procedimento de `docs/operacao/backup-restore.md` não usa essa flag. Ele usa `--no-privileges`: ao restaurar num projeto Supabase novo, os `GRANT` padrão para `anon`/`authenticated` podem reaparecer. O RLS sem policy continua bloqueando as linhas, mas o bloco de `REVOKE` da seção 4 da migration deve ser reaplicado após a restauração.
- **Conexão das migrations**: `prisma migrate deploy` deve usar a conexão direta (porta 5432) ou o pooler em modo sessão; o modo transação do pooler não é adequado para migrations `[A VALIDAR NO DEPLOY]`.

### Portabilidade
A migration roda sem alteração em PostgreSQL puro (Docker local, CI e o fallback `embedded-postgres` do `npm run db:up`) e no Supabase:
- o bloco de privilégios é um `DO $$ ... $$` que só age se `anon` **e** `authenticated` existirem em `pg_roles`;
- `_prisma_migrations` é tratado com `ALTER TABLE IF EXISTS`;
- CHECKs, triggers, RLS e comentários são recursos padrão do PostgreSQL, sem dependência de extensões do Supabase.

## Consequências
- **Positivas**: a chave pública do Supabase não dá acesso a nenhum dado; a trilha de auditoria fica imutável inclusive fora da API; dados inválidos são barrados pelo banco; o comportamento da API e dos testes não muda; nenhuma dependência nova.
- **Negativas**: limpezas manuais de ambiente de teste não podem mais apagar o `AuditLog` (o banco de teste acumula registros de auditoria); toda migration nova precisa lembrar de habilitar RLS e comentar as tabelas; a proteção do `AuditLog` contra o próprio dono é declaratória (auditável, mas contornável), até a separação de papéis de conexão.
