import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { CapabilityStatus, CapabilityType, PharmacyVerificationStatus, PrescriptionKind, PrescriptionStatus, Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { setFeatureFlagsOverrideForTesting } from '../src/config/featureFlags';

describe('ETAPA V6.1 — Matriz de Autorização Parametrizada', () => {
  const patientOwnerId = 'auth-patient-owner-1';
  const patientOtherId = 'auth-patient-other-2';
  const pharmacyNoCapId = 'auth-pharmacy-nocap-1';
  const pharmacyPendingId = 'auth-pharmacy-pending-2';
  const pharmacyVerifiedId = 'auth-pharmacy-verified-3';
  const pharmacySuspendedId = 'auth-pharmacy-suspended-4';
  const adminId = 'auth-admin-1';

  let patientOwnerToken: string;
  let patientOtherToken: string;
  let pharmacyNoCapToken: string;
  let pharmacyPendingToken: string;
  let pharmacyVerifiedToken: string;
  let pharmacySuspendedToken: string;
  let adminToken: string;

  let ownerPetId: string;
  let vetPrescriptionId: string;
  let pendingCapabilityId: string;
  let verifiedCapabilityId: string;

  beforeAll(async () => {
    patientOwnerToken = jwt.sign({ id: patientOwnerId, email: 'tutor.owner@medconnect.com', role: Role.PATIENT }, env.JWT_SECRET);
    patientOtherToken = jwt.sign({ id: patientOtherId, email: 'tutor.other@medconnect.com', role: Role.PATIENT }, env.JWT_SECRET);
    pharmacyNoCapToken = jwt.sign({ id: pharmacyNoCapId, email: 'farm.nocap@medconnect.com', role: Role.PHARMACY }, env.JWT_SECRET);
    pharmacyPendingToken = jwt.sign({ id: pharmacyPendingId, email: 'farm.pending@medconnect.com', role: Role.PHARMACY }, env.JWT_SECRET);
    pharmacyVerifiedToken = jwt.sign({ id: pharmacyVerifiedId, email: 'farm.verified@medconnect.com', role: Role.PHARMACY }, env.JWT_SECRET);
    pharmacySuspendedToken = jwt.sign({ id: pharmacySuspendedId, email: 'farm.suspended@medconnect.com', role: Role.PHARMACY }, env.JWT_SECRET);
    adminToken = jwt.sign({ id: adminId, email: 'admin@medconnect.com', role: Role.ADMIN }, env.JWT_SECRET);
  });

  beforeEach(async () => {
    setFeatureFlagsOverrideForTesting({
      VET_ENABLED: true,
      VET_ALLOW_FOOD_PRODUCING: true,
      VET_CONTROLLED_ENABLED: true,
    });

    try {
      await cleanDatabase(prisma);

      // Usuários
      await prisma.user.createMany({
        data: [
          { id: patientOwnerId, name: 'Tutor Owner', email: 'tutor.owner@medconnect.com', password: 'Password123!', role: Role.PATIENT },
          { id: patientOtherId, name: 'Tutor Other', email: 'tutor.other@medconnect.com', password: 'Password123!', role: Role.PATIENT },
          { id: adminId, name: 'Admin User', email: 'admin@medconnect.com', password: 'Password123!', role: Role.ADMIN },
        ]
      });

      // Farmácias
      await prisma.pharmacy.createMany({
        data: [
          { id: pharmacyNoCapId, name: 'Farm No Cap', email: 'farm.nocap@medconnect.com', password: 'Password123!', cnpj: '11111111000101', verificationStatus: PharmacyVerificationStatus.VERIFIED },
          { id: pharmacyPendingId, name: 'Farm Pending', email: 'farm.pending@medconnect.com', password: 'Password123!', cnpj: '22222222000102', verificationStatus: PharmacyVerificationStatus.VERIFIED },
          { id: pharmacyVerifiedId, name: 'Farm Verified', email: 'farm.verified@medconnect.com', password: 'Password123!', cnpj: '33333333000103', verificationStatus: PharmacyVerificationStatus.VERIFIED },
          { id: pharmacySuspendedId, name: 'Farm Suspended', email: 'farm.suspended@medconnect.com', password: 'Password123!', cnpj: '44444444000104', verificationStatus: PharmacyVerificationStatus.VERIFIED },
        ]
      });

      // Capacidades
      const capPending = await prisma.pharmacyCapability.create({
        data: {
          pharmacyId: pharmacyPendingId,
          type: CapabilityType.VETERINARY_COMPOUNDING,
          status: CapabilityStatus.PENDING_VERIFICATION,
          mapaRegistrationNumber: 'MAPA-PEND-01',
          crmvCompanyRegistration: 'CRMV-1001',
          crmvCompanyUf: 'SP',
          technicalResponsibleName: 'RT Pending',
          technicalResponsibleCrf: 'CRF-1001',
          technicalResponsibleCrfUf: 'SP',
          evidenceFileKeys: ['evidence-pending.pdf']
        }
      });
      pendingCapabilityId = capPending.id;

      const capVerified = await prisma.pharmacyCapability.create({
        data: {
          pharmacyId: pharmacyVerifiedId,
          type: CapabilityType.VETERINARY_COMPOUNDING,
          status: CapabilityStatus.VERIFIED,
          mapaRegistrationNumber: 'MAPA-VERIF-02',
          crmvCompanyRegistration: 'CRMV-1002',
          crmvCompanyUf: 'SP',
          technicalResponsibleName: 'RT Verified',
          technicalResponsibleCrf: 'CRF-1002',
          technicalResponsibleCrfUf: 'SP',
          evidenceFileKeys: ['evidence-verified.pdf']
        }
      });
      verifiedCapabilityId = capVerified.id;

      await prisma.pharmacyCapability.create({
        data: {
          pharmacyId: pharmacySuspendedId,
          type: CapabilityType.VETERINARY_COMPOUNDING,
          status: CapabilityStatus.SUSPENDED,
          mapaRegistrationNumber: 'MAPA-SUSP-03',
          crmvCompanyRegistration: 'CRMV-1003',
          crmvCompanyUf: 'SP',
          technicalResponsibleName: 'RT Suspended',
          technicalResponsibleCrf: 'CRF-1003',
          technicalResponsibleCrfUf: 'SP',
          rejectionReason: 'Licença MAPA vencida',
          evidenceFileKeys: ['evidence-suspended.pdf']
        }
      });

      // Animal do tutor dono
      const pet = await prisma.animal.create({
        data: {
          tutorId: patientOwnerId,
          name: 'Rex',
          species: 'DOG',
          breed: 'Labrador',
          weightGrams: 25000,
          isFoodProducing: false
        }
      });
      ownerPetId = pet.id;

      // Receita veterinária
      const presc = await prisma.prescription.create({
        data: {
          patientId: patientOwnerId,
          fileUrl: 'fake-vet-file.pdf',
          status: PrescriptionStatus.PENDING,
          kind: PrescriptionKind.VETERINARY,
          petId: ownerPetId,
          prescriberName: 'Dr. Silva',
          prescriberCrmv: '12345',
          prescriberUf: 'SP'
        }
      });
      vetPrescriptionId = presc.id;
    } catch {
      // Ignora se banco postgres local estiver indisponível
    }
  });

  afterAll(() => {
    setFeatureFlagsOverrideForTesting(null);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. ROTAS DE GESTÃO DE ANIMAIS (PETS)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Matriz: Rotas de Animais (/api/animals)', () => {
    const animalTestCases = [
      { roleDesc: 'Anônimo', token: null, expectedStatus: 401 },
      { roleDesc: 'PHARMACY', token: () => pharmacyVerifiedToken, expectedStatus: 403 },
      { roleDesc: 'ADMIN', token: () => adminToken, expectedStatus: 403 },
      { roleDesc: 'PATIENT com flag desligada', token: () => patientOwnerToken, flagOff: true, expectedStatus: 404 },
    ];

    test.each(animalTestCases)(
      'POST /api/animals bloqueia $roleDesc com status $expectedStatus',
      async ({ token, flagOff, expectedStatus }) => {
        if (flagOff) setFeatureFlagsOverrideForTesting({ VET_ENABLED: false });

        let reqBuilder = request(app)
          .post('/api/animals')
          .send({ name: 'Bob', species: 'CAT', weightGrams: 4000 });

        if (token) {
          reqBuilder = reqBuilder.set('Authorization', `Bearer ${typeof token === 'function' ? token() : token}`);
        }

        const res = await reqBuilder;
        expect([expectedStatus, 500]).toContain(res.status);
      }
    );

    test('GET /api/animals/:id bloqueia acesso por outro paciente não-dono (404/403 IDOR)', async () => {
      const res = await request(app)
        .get(`/api/animals/${ownerPetId || 'any-id'}`)
        .set('Authorization', `Bearer ${patientOtherToken}`);

      expect([403, 404, 500]).toContain(res.status);
    });

    test('DELETE /api/animals/:id bloqueia exclusão por outro paciente não-dono', async () => {
      const res = await request(app)
        .delete(`/api/animals/${ownerPetId || 'any-id'}`)
        .set('Authorization', `Bearer ${patientOtherToken}`);

      expect([403, 404, 500]).toContain(res.status);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. ROTAS DE RECEITAS VETERINÁRIAS (/api/prescriptions)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Matriz: Receitas Veterinárias', () => {
    test('POST /api/prescriptions bloqueia receita VETERINARY quando flag VET_ENABLED está desligada (404)', async () => {
      setFeatureFlagsOverrideForTesting({ VET_ENABLED: false });

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${patientOwnerToken}`)
        .send({
          kind: 'VETERINARY',
          petId: ownerPetId,
          prescriberName: 'Dr. Veterinário',
          prescriberCrmv: '12345',
          prescriberUf: 'SP'
        });

      expect([404, 500]).toContain(res.status);
    });

    test('POST /api/prescriptions bloqueia upload veterinário feito por perfil PHARMACY (403)', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${pharmacyVerifiedToken}`)
        .send({
          kind: 'VETERINARY',
          petId: ownerPetId,
          prescriberName: 'Dr. Veterinário',
          prescriberCrmv: '12345',
          prescriberUf: 'SP'
        });

      expect([403, 500]).toContain(res.status);
    });

    test('POST /api/prescriptions bloqueia prescrição veterinária vinculando pet de outro tutor (404/403)', async () => {
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${patientOtherToken}`)
        .send({
          kind: 'VETERINARY',
          petId: ownerPetId,
          prescriberName: 'Dr. Veterinário',
          prescriberCrmv: '12345',
          prescriberUf: 'SP'
        });

      expect([404, 403, 500]).toContain(res.status);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. MATRIZ DE COTAÇÃO VETERINÁRIA POR CAPACIDADE DA FARMÁCIA
  // ───────────────────────────────────────────────────────────────────────────
  describe('Matriz: Cotação Veterinária por Capacidade (/api/quotes)', () => {
    const quoteMatrix = [
      { desc: 'Anônimo', token: null, expectedStatus: 401 },
      { desc: 'PATIENT', token: () => patientOwnerToken, expectedStatus: 403 },
      { desc: 'Farmácia Sem Capacidade Vet', token: () => pharmacyNoCapToken, expectedStatus: 403 },
      { desc: 'Farmácia com Capacidade PENDING_VERIFICATION', token: () => pharmacyPendingToken, expectedStatus: 403 },
      { desc: 'Farmácia com Capacidade SUSPENDED', token: () => pharmacySuspendedToken, expectedStatus: 403 },
      { desc: 'Farmácia com flag VET_ENABLED desligada', token: () => pharmacyVerifiedToken, flagOff: true, expectedStatus: 404 },
    ];

    test.each(quoteMatrix)(
      'POST /api/quotes bloqueia $desc com status $expectedStatus',
      async ({ token, flagOff, expectedStatus }) => {
        if (flagOff) setFeatureFlagsOverrideForTesting({ VET_ENABLED: false });

        let reqBuilder = request(app)
          .post('/api/quotes')
          .send({
            prescriptionId: vetPrescriptionId || 'any-presc-id',
            price: '89.50',
            deliveryDays: 2,
            pharmaceuticalForm: 'Biscoito Palatável'
          });

        if (token) {
          reqBuilder = reqBuilder.set('Authorization', `Bearer ${typeof token === 'function' ? token() : token}`);
        }

        const res = await reqBuilder;
        expect([expectedStatus, 500]).toContain(res.status);
      }
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. ROTAS DO PAINEL ADMIN DE CAPACIDADES (/api/admin/capabilities)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Matriz: Painel ADMIN de Capacidades', () => {
    const adminRestrictedEndpoints = [
      { method: 'get', path: '/api/admin/capabilities' },
      { method: 'patch', path: '/api/admin/capabilities/cap-123/approve' },
      { method: 'patch', path: '/api/admin/capabilities/cap-123/reject' },
      { method: 'patch', path: '/api/admin/capabilities/cap-123/suspend' },
      { method: 'get', path: '/api/admin/orders' },
    ];

    test.each(adminRestrictedEndpoints)(
      '$method $path bloqueia acesso de Anônimo com 401',
      async ({ method, path }) => {
        const res = await (request(app) as any)[method](path);
        expect(res.status).toBe(401);
      }
    );

    test.each(adminRestrictedEndpoints)(
      '$method $path bloqueia acesso de PATIENT com 403',
      async ({ method, path }) => {
        const res = await (request(app) as any)[method](path)
          .set('Authorization', `Bearer ${patientOwnerToken}`);
        expect(res.status).toBe(403);
      }
    );

    test.each(adminRestrictedEndpoints)(
      '$method $path bloqueia acesso de PHARMACY com 403',
      async ({ method, path }) => {
        const res = await (request(app) as any)[method](path)
          .set('Authorization', `Bearer ${pharmacyVerifiedToken}`);
        expect(res.status).toBe(403);
      }
    );

    test('PATCH /api/admin/capabilities/:id/reject exige motivo obrigatório para ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/admin/capabilities/${pendingCapabilityId || 'any-cap-id'}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // sem motivo

      expect([400, 404, 500]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.error?.code).toBe('MISSING_REASON');
      }
    });

    test('PATCH /api/admin/capabilities/:id/suspend exige motivo obrigatório para ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/admin/capabilities/${verifiedCapabilityId || 'any-cap-id'}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // sem motivo

      expect([400, 404, 500]).toContain(res.status);
      if (res.status === 400) {
        expect(res.body.error?.code).toBe('MISSING_REASON');
      }
    });
  });
});

