import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { Role, PrescriptionStatus, PharmacyVerificationStatus } from '@prisma/client';

describe('ETAPA V1 — Testes do Modelo de Dados, Constraints e Migração Veterinária', () => {
  const tutorId = 'tutor-vet-test-1';
  const pharmacyId = 'pharmacy-vet-test-1';

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Cria usuário tutor
    await prisma.user.create({
      data: {
        id: tutorId,
        name: 'Tutor Teste Vet',
        email: 'tutor.vet@test.com',
        password: 'Password123!',
        role: Role.PATIENT
      }
    });

    // Cria farmácia para testes
    await prisma.pharmacy.create({
      data: {
        id: pharmacyId,
        name: 'Farmácia Vet Test',
        email: 'farmacia.vet@test.com',
        password: 'Password123!',
        cnpj: '22222222000122',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED,
        technicalResponsibleName: 'Dra. Silva',
        technicalResponsibleCrf: '12345',
        technicalResponsibleUf: 'SP'
      }
    });
  });

  describe('1. Modelo Animal e Validação de Peso', () => {
    it('deve cadastrar animal com dados válidos e peso em gramas positivo', async () => {
      const animal = await (prisma as any).animal.create({
        data: {
          tutorId,
          name: 'Rex',
          species: 'DOG',
          breed: 'Golden Retriever',
          weightGrams: 28500, // 28.5 kg
          isFoodProducing: false,
          notes: 'Alérgico a dipirona'
        }
      });

      expect(animal.id).toBeDefined();
      expect(animal.name).toBe('Rex');
      expect(animal.species).toBe('DOG');
      expect(animal.weightGrams).toBe(28500);
      expect(animal.isFoodProducing).toBe(false);
      expect(animal.deletedAt).toBeNull();
    });

    it('deve rejeitar no banco animal com peso <= 0 pela constraint de integridade', async () => {
      await expect(
        (prisma as any).animal.create({
          data: {
            tutorId,
            name: 'Rex Zero',
            species: 'DOG',
            weightGrams: 0
          }
        })
      ).rejects.toThrow();

      await expect(
        (prisma as any).animal.create({
          data: {
            tutorId,
            name: 'Rex Negativo',
            species: 'DOG',
            weightGrams: -1500
          }
        })
      ).rejects.toThrow();
    });

    it('deve suportar exclusão lógica via deletedAt preservando histórico', async () => {
      const animal = await (prisma as any).animal.create({
        data: {
          tutorId,
          name: 'Mimi',
          species: 'CAT',
          weightGrams: 4200
        }
      });

      const updated = await (prisma as any).animal.update({
        where: { id: animal.id },
        data: { deletedAt: new Date() }
      });

      expect(updated.deletedAt).not.toBeNull();
    });
  });

  describe('2. Modelo Prescription e Coerência Veterinária vs Humana', () => {
    it('deve criar receita humana com kind HUMAN por padrão e petId nulo', async () => {
      const prescription = await prisma.prescription.create({
        data: {
          patientId: tutorId,
          fileUrl: 'local://receita-humana.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      expect((prescription as any).kind).toBe('HUMAN');
      expect((prescription as any).petId).toBeNull();
    });

    it('deve rejeitar receita HUMAN caso petId seja preenchido (violação da CHECK constraint)', async () => {
      const animal = await (prisma as any).animal.create({
        data: {
          tutorId,
          name: 'Bob',
          species: 'DOG',
          weightGrams: 10000
        }
      });

      await expect(
        (prisma as any).prescription.create({
          data: {
            patientId: tutorId,
            fileUrl: 'local://receita-invalida.pdf',
            kind: 'HUMAN',
            petId: animal.id
          }
        })
      ).rejects.toThrow();
    });

    it('deve rejeitar receita VETERINARY caso petId seja nulo', async () => {
      await expect(
        (prisma as any).prescription.create({
          data: {
            patientId: tutorId,
            fileUrl: 'local://receita-vet-invalida.pdf',
            kind: 'VETERINARY',
            prescriberName: 'Dr. Veterinário',
            prescriberCrmv: 'CRMV-SP 12345',
            prescriberUf: 'SP'
          }
        })
      ).rejects.toThrow();
    });

    it('deve rejeitar receita VETERINARY se faltar CRMV ou UF do prescritor', async () => {
      const animal = await (prisma as any).animal.create({
        data: {
          tutorId,
          name: 'Pipoca',
          species: 'BIRD',
          weightGrams: 90
        }
      });

      await expect(
        (prisma as any).prescription.create({
          data: {
            patientId: tutorId,
            fileUrl: 'local://receita-vet-sem-crmv.pdf',
            kind: 'VETERINARY',
            petId: animal.id,
            prescriberName: 'Dra. Vet'
            // sem crmv e uf
          }
        })
      ).rejects.toThrow();
    });

    it('deve aceitar receita VETERINARY completa e válida', async () => {
      const animal = await (prisma as any).animal.create({
        data: {
          tutorId,
          name: 'Thor',
          species: 'DOG',
          weightGrams: 32000
        }
      });

      const prescription = await (prisma as any).prescription.create({
        data: {
          patientId: tutorId,
          fileUrl: 'local://receita-vet-thor.pdf',
          kind: 'VETERINARY',
          petId: animal.id,
          prescriberName: 'Dr. Pedro Alvares',
          prescriberCrmv: '99887',
          prescriberUf: 'SP',
          vetDocumentType: 'MAGISTRAL'
        }
      });

      expect(prescription.kind).toBe('VETERINARY');
      expect(prescription.petId).toBe(animal.id);
      expect(prescription.prescriberCrmv).toBe('99887');
      expect(prescription.prescriberUf).toBe('SP');
      expect(prescription.vetDocumentType).toBe('MAGISTRAL');
    });
  });

  describe('3. Modelo PharmacyCapability e Unicidade por Tipo', () => {
    it('deve permitir criar capacidade HUMAN_COMPOUNDING e VETERINARY_COMPOUNDING para a mesma farmácia', async () => {
      const capHuman = await (prisma as any).pharmacyCapability.create({
        data: {
          pharmacyId,
          type: 'HUMAN_COMPOUNDING',
          status: 'VERIFIED',
          technicalResponsibleName: 'Dra. Silva',
          technicalResponsibleCrf: '12345',
          technicalResponsibleCrfUf: 'SP'
        }
      });

      const capVet = await (prisma as any).pharmacyCapability.create({
        data: {
          pharmacyId,
          type: 'VETERINARY_COMPOUNDING',
          status: 'PENDING_VERIFICATION',
          mapaRegistrationNumber: 'SP-001234-5',
          crmvCompanyRegistration: 'CRMV-SP-PJ 8899',
          crmvCompanyUf: 'SP',
          evidenceFileKeys: ['local://mapa-cert.pdf']
        }
      });

      expect(capHuman.id).toBeDefined();
      expect(capVet.id).toBeDefined();
      expect(capVet.evidenceFileKeys).toEqual(['local://mapa-cert.pdf']);
    });

    it('deve rejeitar capacidade duplicada do mesmo tipo para a mesma farmácia (@@unique)', async () => {
      await (prisma as any).pharmacyCapability.create({
        data: {
          pharmacyId,
          type: 'HUMAN_COMPOUNDING',
          status: 'VERIFIED'
        }
      });

      await expect(
        (prisma as any).pharmacyCapability.create({
          data: {
            pharmacyId,
            type: 'HUMAN_COMPOUNDING',
            status: 'PENDING_VERIFICATION'
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('4. Modelo Quote com Campos Veterinários', () => {
    it('deve registrar cotação com forma farmacêutica, sabor e prazo estimado mantendo preço em centavos', async () => {
      const animal = await (prisma as any).animal.create({
        data: {
          tutorId,
          name: 'Luna',
          species: 'CAT',
          weightGrams: 3500
        }
      });

      const prescription = await (prisma as any).prescription.create({
        data: {
          patientId: tutorId,
          fileUrl: 'local://receita-luna.pdf',
          kind: 'VETERINARY',
          petId: animal.id,
          prescriberName: 'Dr. Veterinário',
          prescriberCrmv: '54321',
          prescriberUf: 'SP'
        }
      });

      const quote = await prisma.quote.create({
        data: {
          prescriptionId: prescription.id,
          pharmacyId,
          priceCents: 8550, // R$ 85,50
          deliveryDays: 2,
          notes: 'Pasta oral sabor carne com aplicador dosador graduado.',
          pharmaceuticalForm: 'PASTA_ORAL',
          flavoring: 'Carne',
          estimatedPreparationDays: 1
        } as any
      });

      expect(quote.priceCents).toBe(8550);
      expect((quote as any).pharmaceuticalForm).toBe('PASTA_ORAL');
      expect((quote as any).flavoring).toBe('Carne');
      expect((quote as any).estimatedPreparationDays).toBe(1);
    });
  });
});
