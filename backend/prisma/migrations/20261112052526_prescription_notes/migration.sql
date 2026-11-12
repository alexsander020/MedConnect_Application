-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "notes" TEXT;

-- Observações do paciente são dado pessoal sensível de saúde (LGPD art. 11): a aplicação grava o texto
-- cifrado (AES-256-GCM, formato keyId:iv:tag:ciphertext). O limite de 1000 caracteres em claro é validado
-- na API; aqui só garantimos que nunca chegue texto vazio.
ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_notes_not_blank_check" CHECK ("notes" IS NULL OR char_length("notes") > 0);

COMMENT ON COLUMN "Prescription"."notes" IS 'Observações do paciente sobre a fórmula — cifradas (AES-256-GCM). Visíveis ao dono e a farmácias verificadas na cotação; nunca ao ADMIN. Apagadas na anonimização.';
