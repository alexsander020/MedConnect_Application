-- CreateEnum
CREATE TYPE "PrescriptionKind" AS ENUM ('HUMAN', 'VETERINARY');

-- CreateEnum
CREATE TYPE "VetDocumentType" AS ENUM ('MAGISTRAL', 'CONTROLLED_NOTIFICATION');

-- CreateEnum
CREATE TYPE "CapabilityType" AS ENUM ('HUMAN_COMPOUNDING', 'VETERINARY_COMPOUNDING');

-- CreateEnum
CREATE TYPE "CapabilityStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AnimalSpecies" AS ENUM ('DOG', 'CAT', 'BIRD', 'REPTILE', 'SMALL_MAMMAL', 'EQUINE', 'OTHER');

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "controlledNotificationNumber" TEXT,
ADD COLUMN     "kind" "PrescriptionKind" NOT NULL DEFAULT 'HUMAN',
ADD COLUMN     "petId" TEXT,
ADD COLUMN     "prescriberCrmv" TEXT,
ADD COLUMN     "prescriberName" TEXT,
ADD COLUMN     "prescriberUf" TEXT,
ADD COLUMN     "vetDocumentType" "VetDocumentType";

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "estimatedPreparationDays" INTEGER,
ADD COLUMN     "flavoring" TEXT,
ADD COLUMN     "pharmaceuticalForm" TEXT;

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "species" "AnimalSpecies" NOT NULL,
    "breed" TEXT,
    "weightGrams" INTEGER NOT NULL,
    "birthDate" TIMESTAMP(3),
    "isFoodProducing" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyCapability" (
    "id" TEXT NOT NULL,
    "pharmacyId" TEXT NOT NULL,
    "type" "CapabilityType" NOT NULL,
    "status" "CapabilityStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "mapaRegistrationNumber" TEXT,
    "crmvCompanyRegistration" TEXT,
    "crmvCompanyUf" TEXT,
    "technicalResponsibleName" TEXT,
    "technicalResponsibleCrf" TEXT,
    "technicalResponsibleCrfUf" TEXT,
    "evidenceFileKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedByAdminId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Animal_tutorId_deletedAt_idx" ON "Animal"("tutorId", "deletedAt");

-- CreateIndex
CREATE INDEX "PharmacyCapability_pharmacyId_idx" ON "PharmacyCapability"("pharmacyId");

-- CreateIndex
CREATE INDEX "PharmacyCapability_type_status_idx" ON "PharmacyCapability"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyCapability_pharmacyId_type_key" ON "PharmacyCapability"("pharmacyId", "type");

-- CreateIndex
CREATE INDEX "Prescription_kind_status_idx" ON "Prescription"("kind", "status");

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacyCapability" ADD CONSTRAINT "PharmacyCapability_pharmacyId_fkey" FOREIGN KEY ("pharmacyId") REFERENCES "Pharmacy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- CONSTRAINTS DE INTEGRIDADE REGULATÓRIA E DE DOMÍNIO (CHECK CONSTRAINTS)
-- ============================================================================

-- 1. Peso do animal em gramas deve ser estritamente positivo (> 0)
ALTER TABLE "Animal" ADD CONSTRAINT "animal_weight_positive_check" CHECK ("weightGrams" > 0);

-- 2. Coerência do tipo de receita (kind):
--    - Receita VETERINARY exige obrigatoriamente petId, CRMV do prescritor e UF do CRMV
--    - Receita HUMAN exige obrigatoriamente petId nulo
ALTER TABLE "Prescription" ADD CONSTRAINT "prescription_vet_coherence_check" CHECK (
  ("kind" = 'VETERINARY' AND "petId" IS NOT NULL AND "prescriberCrmv" IS NOT NULL AND "prescriberUf" IS NOT NULL)
  OR
  ("kind" = 'HUMAN' AND "petId" IS NULL)
);

-- ============================================================================
-- MIGRAÇÃO DE DADOS (BACKFILL)
-- ============================================================================

-- 1. Garantir que todas as receitas pré-existentes possuem kind = 'HUMAN'
UPDATE "Prescription" SET "kind" = 'HUMAN' WHERE "kind" IS NULL;

-- 2. Backfill de capacidades para farmácias existentes:
--    - Cada farmácia existente recebe a capacidade HUMAN_COMPOUNDING
--    - O status mapeia 1:1 o 'verificationStatus' atual da farmácia
--    - NENHUMA capacidade VETERINARY_COMPOUNDING é criada
INSERT INTO "PharmacyCapability" (
  "id",
  "pharmacyId",
  "type",
  "status",
  "technicalResponsibleName",
  "technicalResponsibleCrf",
  "technicalResponsibleCrfUf",
  "evidenceFileKeys",
  "verifiedByAdminId",
  "verifiedAt",
  "rejectionReason",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  p."id",
  'HUMAN_COMPOUNDING'::"CapabilityType",
  CASE
    WHEN p."verificationStatus"::text = 'VERIFIED' THEN 'VERIFIED'::"CapabilityStatus"
    WHEN p."verificationStatus"::text = 'REJECTED' THEN 'REJECTED'::"CapabilityStatus"
    ELSE 'PENDING_VERIFICATION'::"CapabilityStatus"
  END,
  p."technicalResponsibleName",
  p."technicalResponsibleCrf",
  p."technicalResponsibleUf",
  CASE
    WHEN p."documentUrl" IS NOT NULL AND p."documentUrl" <> '' THEN ARRAY[p."documentUrl"]::text[]
    ELSE ARRAY[]::text[]
  END,
  p."verifiedById",
  p."verifiedAt",
  p."rejectionReason",
  NOW(),
  NOW()
FROM "Pharmacy" p
ON CONFLICT ("pharmacyId", "type") DO NOTHING;

