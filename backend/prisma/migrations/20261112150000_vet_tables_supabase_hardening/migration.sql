-- =============================================================================
-- Hardening Supabase (ADR 022 — banco gerenciado) para as tabelas da vertical
-- veterinária criadas em 20261028233455_vet_model_and_capabilities.
--
-- Essa migration veterinária nasceu em paralelo à 20261111120000_supabase_hardening,
-- que habilita RLS numa lista fixa de tabelas. Aqui aplicamos o mesmo padrão a
-- "Animal" e "PharmacyCapability". Idempotente e portável (PostgreSQL puro e Supabase).
-- Só objetos que o Prisma ignora no diff (RLS, privilégios, comentários).
-- =============================================================================

-- 1. Row Level Security sem policies: só o dono das tabelas (papel de conexão da
--    API) enxerga linhas; a Data API do Supabase fica fechada.
ALTER TABLE "Animal"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PharmacyCapability" ENABLE ROW LEVEL SECURITY;

-- 2. Sem GRANT para os papéis da Data API (camada independente do RLS)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE "Animal"             FROM anon, authenticated;
    REVOKE ALL ON TABLE "PharmacyCapability" FROM anon, authenticated;
  END IF;
END
$$;

-- 3. Dicionário de dados no catálogo
COMMENT ON TABLE "Animal" IS 'Animais cadastrados pelo tutor (vertical veterinária, VET_ENABLED). Não são titulares na LGPD, mas são vinculados a um titular (tutorId). Exclusão lógica por deletedAt.';
COMMENT ON COLUMN "Animal"."tutorId" IS 'User (PATIENT) dono do animal. ON DELETE CASCADE.';
COMMENT ON COLUMN "Animal"."weightGrams" IS 'Peso em gramas inteiros (> 0, CHECK) usado no cálculo de dose.';
COMMENT ON COLUMN "Animal"."isFoodProducing" IS 'Animal de produção (corte, leite, ovos): exige VET_ALLOW_FOOD_PRODUCING e controle de carência (MAPA).';
COMMENT ON COLUMN "Animal"."deletedAt" IS 'Exclusão lógica pelo tutor; o registro é preservado só para pedidos pré-existentes.';

COMMENT ON TABLE "PharmacyCapability" IS 'Capacidades regulatórias da farmácia (HUMAN_COMPOUNDING / VETERINARY_COMPOUNDING) e seu estado de verificação pelo ADMIN.';
COMMENT ON COLUMN "PharmacyCapability"."evidenceFileKeys" IS 'Identificadores privados dos documentos de evidência (supabase://, cloudinary:// ou local://). Nunca URLs públicas: leitura só por URL assinada e auditada.';
COMMENT ON COLUMN "PharmacyCapability"."mapaRegistrationNumber" IS 'Registro do estabelecimento no MAPA (validação de formato, sem integração externa).';
COMMENT ON COLUMN "PharmacyCapability"."rejectionReason" IS 'Motivo obrigatório informado pelo ADMIN ao recusar ou suspender.';
