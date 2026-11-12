-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportTicketCategory" AS ENUM ('GENERAL', 'ORDER', 'PRESCRIPTION', 'PHARMACY_ONBOARDING', 'PRIVACY', 'TECHNICAL');

-- AlterTable
ALTER TABLE "Pharmacy" ADD COLUMN     "city" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- CreateTable
CREATE TABLE "PharmacyBusinessHour" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opensAt" INTEGER NOT NULL,
    "closesAt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyBusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "requesterType" "Role",
    "userId" TEXT,
    "pharmacyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "category" "SupportTicketCategory" NOT NULL DEFAULT 'GENERAL',
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "handledById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PharmacyBusinessHour_pharmacyId_idx" ON "PharmacyBusinessHour"("pharmacyId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyBusinessHour_pharmacyId_dayOfWeek_opensAt_key" ON "PharmacyBusinessHour"("pharmacyId", "dayOfWeek", "opensAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_protocol_key" ON "SupportTicket"("protocol");

-- CreateIndex
CREATE INDEX "SupportTicket_status_createdAt_idx" ON "SupportTicket"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_idx" ON "SupportTicket"("userId");

-- CreateIndex
CREATE INDEX "SupportTicket_pharmacyId_idx" ON "SupportTicket"("pharmacyId");

-- CreateIndex
CREATE INDEX "Pharmacy_verificationStatus_status_idx" ON "Pharmacy"("verificationStatus", "status");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- AddForeignKey
ALTER TABLE "PharmacyBusinessHour" ADD CONSTRAINT "PharmacyBusinessHour_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- MedConnect — Fase 6: gestão de contas, horários de atendimento e suporte
-- -----------------------------------------------------------------------------
-- Objetos abaixo NÃO são modelados pelo Prisma (CHECKs, RLS, privilégios e
-- comentários de catálogo) e por isso não geram drift em `prisma migrate dev`.
-- Mesmo padrão da migration 20261111120000_supabase_hardening
-- (ver docs/decisoes/018-banco-gerenciado-supabase.md e
-- docs/decisoes/019-gestao-contas-horarios-atendimento.md).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Integridade de domínio — horários de atendimento
--    Minutos desde 00:00 no fuso da farmácia. "24:00" (1440) só como fechamento.
-- -----------------------------------------------------------------------------
ALTER TABLE "PharmacyBusinessHour"
  ADD CONSTRAINT "PharmacyBusinessHour_dayOfWeek_range_check"
  CHECK ("dayOfWeek" BETWEEN 0 AND 6);

ALTER TABLE "PharmacyBusinessHour"
  ADD CONSTRAINT "PharmacyBusinessHour_opensAt_range_check"
  CHECK ("opensAt" >= 0 AND "opensAt" < 1440);

ALTER TABLE "PharmacyBusinessHour"
  ADD CONSTRAINT "PharmacyBusinessHour_closesAt_range_check"
  CHECK ("closesAt" > "opensAt" AND "closesAt" <= 1440);

-- -----------------------------------------------------------------------------
-- 2. Integridade de domínio — chamados de suporte
--    Um chamado pertence a no máximo UM titular (paciente/admin OU farmácia);
--    visitantes anônimos não têm dono.
-- -----------------------------------------------------------------------------
ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_single_owner_check"
  CHECK (num_nonnulls("userId", "pharmacyId") <= 1);

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_subject_length_check"
  CHECK (char_length("subject") BETWEEN 3 AND 160);

ALTER TABLE "SupportTicket"
  ADD CONSTRAINT "SupportTicket_message_length_check"
  CHECK (char_length("message") BETWEEN 10 AND 5000);

-- -----------------------------------------------------------------------------
-- 3. Integridade de domínio — farmácia e suspensão de contas
-- -----------------------------------------------------------------------------
ALTER TABLE "Pharmacy"
  ADD CONSTRAINT "Pharmacy_state_uf_check"
  CHECK ("state" IS NULL OR "state" ~ '^[A-Z]{2}$');

-- status = SUSPENDED se, e somente se, suspendedAt estiver preenchido.
ALTER TABLE "User"
  ADD CONSTRAINT "User_suspension_consistency_check"
  CHECK (("status" = 'SUSPENDED') = ("suspendedAt" IS NOT NULL));

ALTER TABLE "Pharmacy"
  ADD CONSTRAINT "Pharmacy_suspension_consistency_check"
  CHECK (("status" = 'SUSPENDED') = ("suspendedAt" IS NOT NULL));

-- -----------------------------------------------------------------------------
-- 4. Row Level Security nas tabelas novas (sem policies: só o dono das tabelas,
--    usado pelo backend, enxerga linhas; a Data API do Supabase fica fechada).
-- -----------------------------------------------------------------------------
ALTER TABLE "PharmacyBusinessHour" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SupportTicket"        ENABLE ROW LEVEL SECURITY;

-- Redundante com os default privileges da migration anterior, mas explícito:
-- garante que as tabelas novas nasçam sem GRANT para anon/authenticated.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "PharmacyBusinessHour" FROM anon, authenticated;
    REVOKE ALL ON TABLE "SupportTicket"        FROM anon, authenticated;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 5. Dicionário de dados no catálogo
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN "User"."status" IS 'ACTIVE ou SUSPENDED. Conta suspensa não faz login nem renova sessão (refresh tokens revogados na suspensão).';
COMMENT ON COLUMN "User"."suspendedAt" IS 'Preenchido se e somente se status = SUSPENDED (CHECK).';
COMMENT ON COLUMN "User"."suspensionReason" IS 'Motivo informado pelo ADMIN ao suspender. Limpo na reativação; histórico fica no AuditLog.';
COMMENT ON COLUMN "User"."lastLoginAt" IS 'Data/hora do último login bem-sucedido.';

COMMENT ON COLUMN "Pharmacy"."status" IS 'ACTIVE ou SUSPENDED (independente de verificationStatus). Suspensa: sem login, fora da listagem pública.';
COMMENT ON COLUMN "Pharmacy"."suspendedAt" IS 'Preenchido se e somente se status = SUSPENDED (CHECK).';
COMMENT ON COLUMN "Pharmacy"."suspensionReason" IS 'Motivo informado pelo ADMIN ao suspender. Limpo na reativação; histórico fica no AuditLog.';
COMMENT ON COLUMN "Pharmacy"."lastLoginAt" IS 'Data/hora do último login bem-sucedido.';
COMMENT ON COLUMN "Pharmacy"."description" IS 'Apresentação pública da farmácia (até 600 caracteres).';
COMMENT ON COLUMN "Pharmacy"."city" IS 'Cidade de atendimento (exibida na listagem pública).';
COMMENT ON COLUMN "Pharmacy"."state" IS 'UF com 2 letras maiúsculas (CHECK).';
COMMENT ON COLUMN "Pharmacy"."timezone" IS 'Fuso IANA usado para interpretar PharmacyBusinessHour (ex.: America/Sao_Paulo).';
COMMENT ON COLUMN "Pharmacy"."services" IS 'Serviços oferecidos (até 12 itens de até 40 caracteres), exibidos publicamente.';
COMMENT ON COLUMN "Pharmacy"."termsAcceptedAt" IS 'Aceite do Termo de Adesão de farmácias no cadastro.';
COMMENT ON COLUMN "Pharmacy"."termsVersion" IS 'Versão do Termo de Adesão aceito (ex.: v1.0.0).';

COMMENT ON TABLE "PharmacyBusinessHour" IS 'Intervalos semanais de atendimento da farmácia. Minutos desde 00:00 no fuso Pharmacy.timezone. Vários intervalos por dia (pausa de almoço); dia sem linhas = fechado.';
COMMENT ON COLUMN "PharmacyBusinessHour"."dayOfWeek" IS '0 = domingo … 6 = sábado (igual a Date.getDay()).';
COMMENT ON COLUMN "PharmacyBusinessHour"."opensAt" IS 'Abertura em minutos desde 00:00 (0..1439).';
COMMENT ON COLUMN "PharmacyBusinessHour"."closesAt" IS 'Fechamento em minutos desde 00:00 (1..1440, maior que opensAt). 1440 = 24:00.';

COMMENT ON TABLE "SupportTicket" IS 'Chamados de suporte. Podem conter dados pessoais e de saúde relatados pelo titular: leitura por ADMIN é registrada no AuditLog.';
COMMENT ON COLUMN "SupportTicket"."protocol" IS 'Protocolo legível MC-AAAAMMDD-XXXXX informado ao solicitante.';
COMMENT ON COLUMN "SupportTicket"."requesterType" IS 'Papel do solicitante autenticado; NULL = visitante anônimo.';
COMMENT ON COLUMN "SupportTicket"."email" IS 'E-mail de retorno (da conta, quando autenticado).';
COMMENT ON COLUMN "SupportTicket"."message" IS 'Texto livre do solicitante (10 a 5000 caracteres). Pode conter dado sensível de saúde.';
COMMENT ON COLUMN "SupportTicket"."handledById" IS 'Id do User ADMIN que tratou o chamado.';
COMMENT ON COLUMN "SupportTicket"."resolvedAt" IS 'Preenchido quando o status passa a RESOLVED ou CLOSED.';
