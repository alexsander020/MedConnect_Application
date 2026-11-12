-- =============================================================================
-- MedConnect — Hardening do banco (integridade, auditoria e exposição no Supabase)
-- -----------------------------------------------------------------------------
-- Esta migration NÃO altera nenhum objeto modelado no schema.prisma (colunas,
-- tipos, índices, chaves estrangeiras). Ela só adiciona objetos que o Prisma
-- ignora no diff: CHECK constraints, trigger, comentários de catálogo, RLS e
-- privilégios. Por isso não gera drift em `prisma migrate dev`.
--
-- É portável: roda em PostgreSQL puro (dev local / CI) e no Supabase. O bloco de
-- privilégios só age quando os papéis `anon` e `authenticated` existem (Supabase).
-- Ver docs/decisoes/018-banco-gerenciado-supabase.md.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Integridade de domínio
--    Espelham validações que a API já faz; o banco vira a última barreira contra
--    dados inválidos vindos de scripts, seeds ou futuras rotas.
-- -----------------------------------------------------------------------------
ALTER TABLE "Quote"
  ADD CONSTRAINT "Quote_priceCents_positive_check" CHECK ("priceCents" > 0);

ALTER TABLE "Quote"
  ADD CONSTRAINT "Quote_deliveryDays_nonnegative_check"
  CHECK ("deliveryDays" IS NULL OR "deliveryDays" >= 0);

ALTER TABLE "Review"
  ADD CONSTRAINT "Review_rating_range_check" CHECK ("rating" BETWEEN 1 AND 5);

-- Notificações e refresh tokens pertencem a exatamente UM dono (paciente/admin OU farmácia).
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_single_recipient_check"
  CHECK (num_nonnulls("userId", "pharmacyId") = 1);

ALTER TABLE "RefreshToken"
  ADD CONSTRAINT "RefreshToken_single_owner_check"
  CHECK (num_nonnulls("userId", "pharmacyId") = 1);

-- -----------------------------------------------------------------------------
-- 2. AuditLog somente-inserção (LGPD art. 37/46)
--    Antes, a imutabilidade era garantida só pela aplicação (nenhuma rota faz
--    UPDATE/DELETE). Agora o próprio banco rejeita UPDATE, DELETE e TRUNCATE,
--    inclusive vindos de scripts ou do SQL Editor.
--    Limite conhecido: o dono da tabela ainda pode desativar o trigger com
--    ALTER TABLE ... DISABLE TRIGGER — essa ação fica registrada nos logs do Postgres.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_log_prevent_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog é somente-inserção: operação % não é permitida', TG_OP
    USING ERRCODE = 'insufficient_privilege',
          HINT = 'A trilha de auditoria é imutável. Registre um novo evento em vez de alterar ou apagar.';
END;
$$;

REVOKE ALL ON FUNCTION public.audit_log_prevent_mutation() FROM PUBLIC;

CREATE TRIGGER "AuditLog_block_update_delete"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_prevent_mutation();

CREATE TRIGGER "AuditLog_block_truncate"
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION public.audit_log_prevent_mutation();

-- -----------------------------------------------------------------------------
-- 3. Row Level Security em todas as tabelas
--    O backend conecta como dono das tabelas (papel `postgres` no Supabase,
--    `medconnect_user` local), que ignora RLS — o comportamento da API não muda.
--    Sem nenhuma policy, qualquer outro papel (anon/authenticated da Data API do
--    Supabase) não enxerga nenhuma linha. Isso é intencional: o frontend fala só
--    com o backend Express, nunca direto com o banco.
-- -----------------------------------------------------------------------------
ALTER TABLE "User"                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pharmacy"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Prescription"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Quote"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderStatusHistory"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PrescriptionAccessLog"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Consent"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4. Fechar a Data API do Supabase (REST/GraphQL) para o schema public
--    No Supabase, toda tabela criada pelo papel `postgres` em `public` recebe por
--    padrão GRANT total para `anon` e `authenticated`. Sem esta seção, a chave
--    pública (publishable/anon) poderia ler a tabela "User" — incluindo o hash
--    de senha — via https://<projeto>.supabase.co/rest/v1/User.
--    Os default privileges garantem que tabelas criadas por migrations futuras
--    também nasçam fechadas.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 5. Dicionário de dados no catálogo (aparece no Table Editor do Supabase)
-- -----------------------------------------------------------------------------
COMMENT ON TABLE "User" IS 'Pacientes e administradores. Dados de contato e CPF cifrados em repouso (AES-256-GCM, formato keyId:iv:tag:ciphertext).';
COMMENT ON COLUMN "User"."password" IS 'Hash bcrypt. Nunca exposto pela API.';
COMMENT ON COLUMN "User"."phone" IS 'Cifrado (AES-256-GCM) pela aplicação.';
COMMENT ON COLUMN "User"."address" IS 'Cifrado (AES-256-GCM) pela aplicação.';
COMMENT ON COLUMN "User"."cpfEncrypted" IS 'CPF cifrado (AES-256-GCM).';
COMMENT ON COLUMN "User"."cpfHash" IS 'HMAC-SHA256 do CPF: garante unicidade sem guardar o CPF em claro.';
COMMENT ON COLUMN "User"."cpfLastDigits" IS 'Somente os últimos dígitos, para exibição mascarada.';
COMMENT ON COLUMN "User"."keyId" IS 'Versão da chave de criptografia usada nos campos cifrados (rotação de chave).';
COMMENT ON COLUMN "User"."isAnonymized" IS 'true após o titular exercer o direito de eliminação (LGPD art. 18, VI).';

COMMENT ON TABLE "Pharmacy" IS 'Farmácias de manipulação. Só operam (ver receitas, cotar) com verificationStatus = VERIFIED.';
COMMENT ON COLUMN "Pharmacy"."password" IS 'Hash bcrypt. Nunca exposto pela API.';
COMMENT ON COLUMN "Pharmacy"."cnpj" IS 'Somente dígitos (14), validado e consultado na BrasilAPI no cadastro.';
COMMENT ON COLUMN "Pharmacy"."cnpjData" IS 'JSON (texto) com a evidência da consulta de CNPJ.';
COMMENT ON COLUMN "Pharmacy"."verifiedById" IS 'Id do User ADMIN que aprovou/reprovou a farmácia.';

COMMENT ON TABLE "Prescription" IS 'Receitas médicas enviadas pelo paciente — DADO PESSOAL SENSÍVEL DE SAÚDE (LGPD art. 11).';
COMMENT ON COLUMN "Prescription"."fileUrl" IS 'Localização do arquivo (Cloudinary/uploads). Servido só via URL assinada HMAC com expiração.';

COMMENT ON TABLE "Quote" IS 'Cotação de uma farmácia para uma receita. No máximo uma por par (receita, farmácia).';
COMMENT ON COLUMN "Quote"."priceCents" IS 'Preço em centavos (inteiro, sem ponto flutuante).';

COMMENT ON TABLE "Order" IS 'Pedido gerado quando o paciente aceita uma cotação. Um pedido por cotação.';
COMMENT ON TABLE "OrderStatusHistory" IS 'Trilha de transições de status do pedido (máquina de estados em src/domain/orderStateMachine.ts).';
COMMENT ON TABLE "Review" IS 'Avaliação (1 a 5) de um pedido entregue. Uma por pedido.';
COMMENT ON TABLE "Notification" IS 'Notificações in-app/tempo real. Destinatário: userId OU pharmacyId (exatamente um).';
COMMENT ON TABLE "PrescriptionAccessLog" IS 'Registro de cada acesso ao arquivo de uma receita.';
COMMENT ON TABLE "RefreshToken" IS 'Refresh tokens rotativos (somente hash SHA-256). familyId detecta reuso de token roubado.';
COMMENT ON TABLE "PasswordResetToken" IS 'Tokens de redefinição de senha (hash SHA-256, uso único, expiração curta).';
COMMENT ON TABLE "EmailVerificationToken" IS 'Tokens de verificação de e-mail (hash SHA-256, uso único).';
COMMENT ON TABLE "Consent" IS 'Consentimentos versionados (LGPD art. 8º e 11). Revogação preenche revokedAt.';
COMMENT ON TABLE "AuditLog" IS 'Trilha de auditoria imutável (somente INSERT; UPDATE/DELETE/TRUNCATE bloqueados por trigger). Consulta restrita a ADMIN.';
