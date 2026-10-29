import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { cleanDatabase } from './helpers/dbCleanup';
import { setFeatureFlagsOverrideForTesting } from '../src/config/featureFlags';
import {
  Role,
  PrescriptionStatus,
  PharmacyVerificationStatus,
  CapabilityType,
  CapabilityStatus,
  AnimalSpecies,
  PrescriptionKind,
  VetDocumentType
} from '@prisma/client';
import path from 'path';

describe('ETAPA V2 — Backend e Regras de Negócio Veterinárias', () => {
  const tutor1Id = 'tutor-vet-backend-1';
  const tutor2Id = 'tutor-vet-backend-2';
  const pharmacyHumanOnlyId = 'pharm-human-only';
  const pharmacyVetVerifiedId = 'pharm-vet-verified';
  const pharmacyVetPendingId = 'pharm-vet-pending';
  const pharmacyDualId = 'pharm-dual-verified';

  const tutor1Token = jwt.sign({ id: tutor1Id, email: 'tutor1@test.com', role: 'PATIENT' }, env.JWT_SECRET);
  const tutor2Token = jwt.sign({ id: tutor2Id, email: 'tutor2@test.com', role: 'PATIENT' }, env.JWT_SECRET);
  const pharmHumanToken = jwt.sign({ id: pharmacyHumanOnlyId, email: 'human@pharm.com', role: 'PHARMACY' }, env.JWT_SECRET);
  const pharmVetToken = jwt.sign({ id: pharmacyVetVerifiedId, email: 'vet@pharm.com', role: 'PHARMACY' }, env.JWT_SECRET);
  const pharmPendingToken = jwt.sign({ id: pharmacyVetPendingId, email: 'pending@pharm.com', role: 'PHARMACY' }, env.JWT_SECRET);
  const pharmDualToken = jwt.sign({ id: pharmacyDualId, email: 'dual@pharm.com', role: 'PHARMACY' }, env.JWT_SECRET);

  beforeEach(async () => {
    setFeatureFlagsOverrideForTesting({
      VET_ENABLED: true,
      VET_ALLOW_FOOD_PRODUCING: false,
      VET_CONTROLLED_ENABLED: false
    });

    await cleanDatabase(prisma);

    // Cria tutores
    await prisma.user.createMany({
      data: [
        { id: tutor1Id, name: 'Tutor Um', email: 'tutor1@test.com', password: 'Password123!', role: Role.PATIENT, phone: '11999991111', address: 'Rua Um, 100' },
        { id: tutor2Id, name: 'Tutor Dois', email: 'tutor2@test.com', password: 'Password123!', role: Role.PATIENT, phone: '11999992222', address: 'Rua Dois, 200' }
      ]
    });

    // Cria consentimento de saúde para os tutores
    await prisma.consent.createMany({
      data: [
        { userId: tutor1Id, userType: Role.PATIENT, consentType: 'HEALTH_DATA_PROCESSING', textVersion: '1.0' },
        { userId: tutor2Id, userType: Role.PATIENT, consentType: 'HEALTH_DATA_PROCESSING', textVersion: '1.0' }
      ]
    });

    // Cria farmácias
    await prisma.pharmacy.createMany({
      data: [
        { id: pharmacyHumanOnlyId, name: 'Farmácia Humana', email: 'human@pharm.com', password: 'Password123!', cnpj: '11111111000101', verified: true, verificationStatus: PharmacyVerificationStatus.VERIFIED },
        { id: pharmacyVetVerifiedId, name: 'Farmácia Vet Verificada', email: 'vet@pharm.com', password: 'Password123!', cnpj: '22222222000102', verified: true, verificationStatus: PharmacyVerificationStatus.VERIFIED },
        { id: pharmacyVetPendingId, name: 'Farmácia Vet Pendente', email: 'pending@pharm.com', password: 'Password123!', cnpj: '33333333000103', verified: false, verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION },
        { id: pharmacyDualId, name: 'Farmácia Dual Habilitada', email: 'dual@pharm.com', password: 'Password123!', cnpj: '44444444000104', verified: true, verificationStatus: PharmacyVerificationStatus.VERIFIED }
      ]
    });

    // Associa capacidades
    await prisma.pharmacyCapability.createMany({
      data: [
        { pharmacyId: pharmacyHumanOnlyId, type: CapabilityType.HUMAN_COMPOUNDING, status: CapabilityStatus.VERIFIED },
        { pharmacyId: pharmacyVetVerifiedId, type: CapabilityType.VETERINARY_COMPOUNDING, status: CapabilityStatus.VERIFIED, mapaRegistrationNumber: 'SP-001', crmvCompanyRegistration: '1234-SP' },
        { pharmacyId: pharmacyVetPendingId, type: CapabilityType.VETERINARY_COMPOUNDING, status: CapabilityStatus.PENDING_VERIFICATION },
        { pharmacyId: pharmacyDualId, type: CapabilityType.HUMAN_COMPOUNDING, status: CapabilityStatus.VERIFIED },
        { pharmacyId: pharmacyDualId, type: CapabilityType.VETERINARY_COMPOUNDING, status: CapabilityStatus.VERIFIED, mapaRegistrationNumber: 'SP-002', crmvCompanyRegistration: '5678-SP' }
      ]
    });
  });

  afterAll(() => {
    setFeatureFlagsOverrideForTesting(null);
  });

  describe('1. Comportamento com Feature Flag Desligada (VET_ENABLED = false)', () => {
    beforeEach(() => {
      setFeatureFlagsOverrideForTesting({ VET_ENABLED: false });
    });

    it('deve retornar 404 em todas as rotas de animais quando VET_ENABLED for false', async () => {
      const resPost = await request(app)
        .post('/api/animals')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .send({ name: 'Rex', species: 'DOG', weightGrams: 15000 });
      expect(resPost.status).toBe(404);

      const resGet = await request(app)
        .get('/api/animals')
        .set('Authorization', `Bearer ${tutor1Token}`);
      expect(resGet.status).toBe(404);
    });

    it('deve rejeitar criação de receita com kind VETERINARY quando flag estiver desligada', async () => {
      const dummyPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 1\ntrailer<</Root 1 0 R>>\nstartxref\n50\n%%EOF');

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .field('kind', 'VETERINARY')
        .field('petId', 'qualquer-id')
        .field('prescriberName', 'Dr. Vet')
        .field('prescriberCrmv', '12345')
        .field('prescriberUf', 'SP')
        .field('consent', 'true')
        .attach('file', dummyPdfBuffer, 'receita.pdf');

      expect(res.status).toBe(404);
    });
  });

  describe('2. CRUD de Animais e Prevenção a IDOR (/api/animals)', () => {
    it('deve criar e listar animais do tutor autenticado', async () => {
      const resCreate = await request(app)
        .post('/api/animals')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .send({
          name: 'Pipoca',
          species: 'DOG',
          breed: 'Poodle',
          weightGrams: 6500,
          birthDate: '2022-01-15T00:00:00.000Z',
          isFoodProducing: false,
          notes: 'Dócil e alérgico a pulgas'
        });

      expect(resCreate.status).toBe(201);
      expect(resCreate.body.id).toBeDefined();
      expect(resCreate.body.tutorId).toBe(tutor1Id);
      expect(resCreate.body.weightGrams).toBe(6500);

      const resList = await request(app)
        .get('/api/animals')
        .set('Authorization', `Bearer ${tutor1Token}`);

      expect(resList.status).toBe(200);
      expect(resList.body).toHaveLength(1);
      expect(resList.body[0].name).toBe('Pipoca');
    });

    it('deve rejeitar criação com peso inválido ou espécie não permitida', async () => {
      const resPesoInvalido = await request(app)
        .post('/api/animals')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .send({ name: 'Rex', species: 'DOG', weightGrams: 0 });
      expect(resPesoInvalido.status).toBe(400);

      const resEspecieInvalida = await request(app)
        .post('/api/animals')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .send({ name: 'Rex', species: 'DRAGON', weightGrams: 5000 });
      expect(resEspecieInvalida.status).toBe(400);
    });

    it('IDOR: Tutor 2 não pode ler, alterar nem excluir animal do Tutor 1 (retorna 404 sem vazar existência)', async () => {
      const animalTutor1 = await prisma.animal.create({
        data: {
          tutorId: tutor1Id,
          name: 'Thor',
          species: AnimalSpecies.DOG,
          weightGrams: 30000
        }
      });

      // Tutor 2 tenta ler animal do Tutor 1
      const resGetOther = await request(app)
        .get(`/api/animals/${animalTutor1.id}`)
        .set('Authorization', `Bearer ${tutor2Token}`);
      expect(resGetOther.status).toBe(404);

      // Tutor 2 tenta alterar animal do Tutor 1
      const resPatchOther = await request(app)
        .patch(`/api/animals/${animalTutor1.id}`)
        .set('Authorization', `Bearer ${tutor2Token}`)
        .send({ name: 'Hackeado' });
      expect(resPatchOther.status).toBe(404);

      // Tutor 2 tenta deletar animal do Tutor 1
      const resDeleteOther = await request(app)
        .delete(`/api/animals/${animalTutor1.id}`)
        .set('Authorization', `Bearer ${tutor2Token}`);
      expect(resDeleteOther.status).toBe(404);
    });

    it('deve suportar exclusão lógica via DELETE /api/animals/:id', async () => {
      const animal = await prisma.animal.create({
        data: {
          tutorId: tutor1Id,
          name: 'Mimi',
          species: AnimalSpecies.CAT,
          weightGrams: 3500
        }
      });

      const resDelete = await request(app)
        .delete(`/api/animals/${animal.id}`)
        .set('Authorization', `Bearer ${tutor1Token}`);
      expect(resDelete.status).toBe(200);

      // Listagem não deve mais trazer o animal deletado
      const resList = await request(app)
        .get('/api/animals')
        .set('Authorization', `Bearer ${tutor1Token}`);
      expect(resList.body).toHaveLength(0);
    });
  });

  describe('3. Envio de Receita Veterinária e Regras Sanitárias (POST /api/prescriptions)', () => {
    const dummyPdfBuffer = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 1\ntrailer<</Root 1 0 R>>\nstartxref\n50\n%%EOF');

    it('IDOR: deve rejeitar envio de receita se o animal pertencer a outro tutor', async () => {
      const animalTutor1 = await prisma.animal.create({
        data: { tutorId: tutor1Id, name: 'Cão 1', species: AnimalSpecies.DOG, weightGrams: 10000 }
      });

      // Tutor 2 tenta criar receita usando o animal do Tutor 1
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${tutor2Token}`)
        .field('kind', 'VETERINARY')
        .field('petId', animalTutor1.id)
        .field('prescriberName', 'Dr. Vet')
        .field('prescriberCrmv', '12345')
        .field('prescriberUf', 'SP')
        .field('consent', 'true')
        .attach('file', dummyPdfBuffer, 'receita.pdf');

      expect(res.status).toBe(404);
    });

    it('deve rejeitar receita se o CRMV tiver formato inválido', async () => {
      const animal = await prisma.animal.create({
        data: { tutorId: tutor1Id, name: 'Cão', species: AnimalSpecies.DOG, weightGrams: 10000 }
      });

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .field('kind', 'VETERINARY')
        .field('petId', animal.id)
        .field('prescriberName', 'Dr. Vet')
        .field('prescriberCrmv', 'CRMV-INVALIDO-COM-MUITOS-DIGITOS-123456789')
        .field('prescriberUf', 'SP')
        .field('consent', 'true')
        .attach('file', dummyPdfBuffer, 'receita.pdf');

      expect(res.status).toBe(400);
      expect(res.body.error?.message).toMatch(/CRMV/i);
    });

    it('deve bloquear animal de produção com 422 quando VET_ALLOW_FOOD_PRODUCING estiver false', async () => {
      setFeatureFlagsOverrideForTesting({ VET_ENABLED: true, VET_ALLOW_FOOD_PRODUCING: false });

      const animalProducao = await prisma.animal.create({
        data: {
          tutorId: tutor1Id,
          name: 'Mimosa',
          species: AnimalSpecies.OTHER,
          weightGrams: 450000,
          isFoodProducing: true
        }
      });

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .field('kind', 'VETERINARY')
        .field('petId', animalProducao.id)
        .field('prescriberName', 'Dr. Veterinário Rural')
        .field('prescriberCrmv', '45678')
        .field('prescriberUf', 'MG')
        .field('consent', 'true')
        .attach('file', dummyPdfBuffer, 'receita.pdf');

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe('ANIMAL_FOOD_PRODUCING_NOT_SUPPORTED');
    });

    it('deve bloquear controlado com 422 quando VET_CONTROLLED_ENABLED estiver false', async () => {
      setFeatureFlagsOverrideForTesting({ VET_ENABLED: true, VET_CONTROLLED_ENABLED: false });

      const animal = await prisma.animal.create({
        data: { tutorId: tutor1Id, name: 'Cão', species: AnimalSpecies.DOG, weightGrams: 12000 }
      });

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .field('kind', 'VETERINARY')
        .field('petId', animal.id)
        .field('prescriberName', 'Dra. Vet')
        .field('prescriberCrmv', '99887')
        .field('prescriberUf', 'SP')
        .field('vetDocumentType', 'CONTROLLED_NOTIFICATION')
        .field('consent', 'true')
        .attach('file', dummyPdfBuffer, 'receita.pdf');

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe('CONTROLLED_NOT_SUPPORTED');
    });

    it('deve permitir controlado quando VET_CONTROLLED_ENABLED estiver true e exigir número da notificação', async () => {
      setFeatureFlagsOverrideForTesting({ VET_ENABLED: true, VET_CONTROLLED_ENABLED: true });

      const animal = await prisma.animal.create({
        data: { tutorId: tutor1Id, name: 'Cão', species: AnimalSpecies.DOG, weightGrams: 12000 }
      });

      // Sem o número da notificação -> 400
      const resSemNumero = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .field('kind', 'VETERINARY')
        .field('petId', animal.id)
        .field('prescriberName', 'Dra. Vet')
        .field('prescriberCrmv', '99887')
        .field('prescriberUf', 'SP')
        .field('vetDocumentType', 'CONTROLLED_NOTIFICATION')
        .field('consent', 'true')
        .attach('file', dummyPdfBuffer, 'receita.pdf');

      expect(resSemNumero.status).toBe(400);

      // Com número da notificação -> 201 e requiresManualDocumentCheck = true
      const resComNumero = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .field('kind', 'VETERINARY')
        .field('petId', animal.id)
        .field('prescriberName', 'Dra. Vet')
        .field('prescriberCrmv', '99887')
        .field('prescriberUf', 'SP')
        .field('vetDocumentType', 'CONTROLLED_NOTIFICATION')
        .field('controlledNotificationNumber', 'SIPEAGRO-2026-999')
        .field('consent', 'true')
        .attach('file', dummyPdfBuffer, 'receita.pdf');

      expect(resComNumero.status).toBe(201);
      expect(resComNumero.body.kind).toBe('VETERINARY');
      expect(resComNumero.body.requiresManualDocumentCheck).toBe(true);
    });
  });

  describe('4. Listagem e Mural para Farmácias por Capacidade (/api/prescriptions/pharmacy)', () => {
    let receitaHumanaId: string;
    let receitaVetId: string;

    beforeEach(async () => {
      const animal = await prisma.animal.create({
        data: { tutorId: tutor1Id, name: 'Max', species: AnimalSpecies.DOG, weightGrams: 25000, birthDate: new Date('2020-05-01') }
      });

      const recH = await prisma.prescription.create({
        data: { patientId: tutor1Id, fileUrl: 'local://receita-humana.pdf', kind: PrescriptionKind.HUMAN, status: PrescriptionStatus.PENDING }
      });
      receitaHumanaId = recH.id;

      const recV = await prisma.prescription.create({
        data: {
          patientId: tutor1Id,
          fileUrl: 'local://receita-vet.pdf',
          kind: PrescriptionKind.VETERINARY,
          petId: animal.id,
          prescriberName: 'Dr. Silva Vet',
          prescriberCrmv: '12345',
          prescriberUf: 'SP',
          vetDocumentType: VetDocumentType.MAGISTRAL,
          status: PrescriptionStatus.PENDING
        }
      });
      receitaVetId = recV.id;
    });

    it('farmácia só humana NUNCA vê receitas veterinárias', async () => {
      const res = await request(app)
        .get('/api/prescriptions/pharmacy')
        .set('Authorization', `Bearer ${pharmHumanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.some((p: any) => p.id === receitaHumanaId)).toBe(true);
      expect(res.body.some((p: any) => p.id === receitaVetId)).toBe(false);
    });

    it('farmácia só veterinária NUNCA vê receitas humanas', async () => {
      const res = await request(app)
        .get('/api/prescriptions/pharmacy')
        .set('Authorization', `Bearer ${pharmVetToken}`);

      expect(res.status).toBe(200);
      expect(res.body.some((p: any) => p.id === receitaHumanaId)).toBe(false);
      expect(res.body.some((p: any) => p.id === receitaVetId)).toBe(true);

      const vetItem = res.body.find((p: any) => p.id === receitaVetId);
      expect(vetItem.kind).toBe('VETERINARY');
      expect(vetItem.animal.species).toBe('DOG');
      expect(vetItem.animal.weightGrams).toBe(25000);
      expect(vetItem.prescriber.crmv).toBe('12345');
      // Privacidade: sem dados diretos de tutor nem arquivo
      expect(vetItem.tutor).toBeUndefined();
      expect(vetItem.fileUrl).toBeUndefined();
    });

    it('farmácia com capacidade pendente/rejeitada não acessa mural (403)', async () => {
      const res = await request(app)
        .get('/api/prescriptions/pharmacy')
        .set('Authorization', `Bearer ${pharmPendingToken}`);

      expect(res.status).toBe(403);
    });

    it('farmácia dual habilitada (humana + vet) vê ambos os murais', async () => {
      const res = await request(app)
        .get('/api/prescriptions/pharmacy')
        .set('Authorization', `Bearer ${pharmDualToken}`);

      expect(res.status).toBe(200);
      expect(res.body.some((p: any) => p.id === receitaHumanaId)).toBe(true);
      expect(res.body.some((p: any) => p.id === receitaVetId)).toBe(true);
    });
  });

  describe('5. Cotação por Capacidade e Campos Novos (/api/quotes)', () => {
    let receitaVetId: string;

    beforeEach(async () => {
      const animal = await prisma.animal.create({
        data: { tutorId: tutor1Id, name: 'Luna', species: AnimalSpecies.CAT, weightGrams: 4000 }
      });
      const rec = await prisma.prescription.create({
        data: {
          patientId: tutor1Id,
          fileUrl: 'local://receita-luna.pdf',
          kind: PrescriptionKind.VETERINARY,
          petId: animal.id,
          prescriberName: 'Dra. Vet',
          prescriberCrmv: '54321',
          prescriberUf: 'SP'
        }
      });
      receitaVetId = rec.id;
    });

    it('farmácia só humana é barrada com 403 ao tentar cotar receita veterinária', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmHumanToken}`)
        .send({
          prescriptionId: receitaVetId,
          price: '85.50',
          deliveryDays: 2
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('CAPABILITY_REQUIRED');
    });

    it('farmácia veterinária habilitada cria cotação com forma farmacêutica e sabor', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmVetToken}`)
        .send({
          prescriptionId: receitaVetId,
          price: '92.00',
          deliveryDays: 3,
          pharmaceuticalForm: 'PASTA_ORAL',
          flavoring: 'Peixe',
          estimatedPreparationDays: 1,
          notes: 'Aplicador dosador graduado'
        });

      expect(res.status).toBe(201);
      expect(res.body.price).toBe('92.00');
      expect(res.body.pharmaceuticalForm).toBe('PASTA_ORAL');
      expect(res.body.flavoring).toBe('Peixe');
    });
  });

  describe('6. Aprovação, Pedido e Detalhe com Dados do Animal (/api/orders)', () => {
    it('deve converter cotação vet em pedido e exibir resumo do animal e dados de contato para a farmácia contratada', async () => {
      const animal = await prisma.animal.create({
        data: { tutorId: tutor1Id, name: 'Bob', species: AnimalSpecies.DOG, weightGrams: 18000 }
      });

      const rec = await prisma.prescription.create({
        data: {
          patientId: tutor1Id,
          fileUrl: 'local://receita-bob.pdf',
          kind: PrescriptionKind.VETERINARY,
          petId: animal.id,
          prescriberName: 'Dr. Vet',
          prescriberCrmv: '12345',
          prescriberUf: 'SP'
        }
      });

      const quote = await prisma.quote.create({
        data: {
          prescriptionId: rec.id,
          pharmacyId: pharmacyVetVerifiedId,
          priceCents: 15000,
          deliveryDays: 2
        }
      });

      // Tutor aprova cotação e cria pedido
      const resOrder = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tutor1Token}`)
        .send({ quoteId: quote.id });

      expect(resOrder.status).toBe(201);
      const orderId = resOrder.body.id;

      // Farmácia contratada consulta o pedido
      const resDetail = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${pharmVetToken}`);

      expect(resDetail.status).toBe(200);
      expect(resDetail.body.quote.prescription.kind).toBe('VETERINARY');
      expect(resDetail.body.animal).toBeDefined();
      expect(resDetail.body.animal.name).toBe('Bob');
      expect(resDetail.body.tutor.phone).toBe('11999991111');

      // Outra farmácia tenta acessar pedido -> 403 IDOR
      const resIdor = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${pharmHumanToken}`);
      expect(resIdor.status).toBe(403);
    });
  });
});
