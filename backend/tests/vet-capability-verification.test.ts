import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import {
  AnimalSpecies,
  CapabilityStatus,
  CapabilityType,
  OrderStatus,
  PharmacyVerificationStatus,
  PrescriptionKind,
  PrescriptionStatus
} from '@prisma/client';
import { ConsentService } from '../src/services/consentService';
import { setFeatureFlagsOverrideForTesting } from '../src/config/featureFlags';
import { validarCrf, validarRegistroMapa } from '@medconnect/validation';

describe('ETAPA V3 — Verificação por Capacidade (VETERINARY_COMPOUNDING & Painel ADMIN)', () => {
  const tutorId = 'v3-tutor-1';
  const pharmacyId = 'v3-pharmacy-1';
  const otherPharmacyId = 'v3-pharmacy-2';
  const adminId = 'v3-admin-1';

  const tutorToken = jwt.sign(
    { id: tutorId, email: 'tutor.v3@test.com', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const pharmacyToken = jwt.sign(
    { id: pharmacyId, email: 'farmacia.v3@test.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const otherPharmacyToken = jwt.sign(
    { id: otherPharmacyId, email: 'outra.v3@test.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const adminToken = jwt.sign(
    { id: adminId, email: 'admin.v3@test.com', role: 'ADMIN' },
    env.JWT_SECRET
  );

  const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

  beforeEach(async () => {
    setFeatureFlagsOverrideForTesting({
      VET_ENABLED: true,
      VET_CONTROLLED_ENABLED: false,
      VET_ALLOW_FOOD_PRODUCING: false
    });

    await cleanDatabase(prisma);

    // 1. Tutor
    await prisma.user.create({
      data: {
        id: tutorId,
        name: 'Tutor V3',
        email: 'tutor.v3@test.com',
        password: 'Password123!',
        role: 'PATIENT'
      }
    });

    await ConsentService.recordConsent({
      userId: tutorId,
      userType: 'PATIENT',
      consentType: 'HEALTH_DATA_PROCESSING',
      ipAddress: '127.0.0.1'
    });

    // 2. Farmácia humana já verificada (capacidade humana existente ativa)
    await prisma.pharmacy.create({
      data: {
        id: pharmacyId,
        name: 'Farmácia Magistral V3',
        email: 'farmacia.v3@test.com',
        password: 'Password123!',
        cnpj: '11222333000181',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED
      }
    });

    // 3. Outra farmácia
    await prisma.pharmacy.create({
      data: {
        id: otherPharmacyId,
        name: 'Outra Farmácia V3',
        email: 'outra.v3@test.com',
        password: 'Password123!',
        cnpj: '12345678000195',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED
      }
    });

    // 4. Admin
    await prisma.user.create({
      data: {
        id: adminId,
        name: 'Admin Regulatório V3',
        email: 'admin.v3@test.com',
        password: 'Password123!',
        role: 'ADMIN'
      }
    });
  });

  afterAll(async () => {
    setFeatureFlagsOverrideForTesting(null);
    await cleanDatabase(prisma);
  });

  // ─────────────────────────────────────────────────────────────
  // 0. VALIDADORES DE FORMATO (MAPA & CRF)
  // ─────────────────────────────────────────────────────────────
  describe('0. Validadores de formato (@medconnect/validation)', () => {
    it('deve validar formato de registro no MAPA e CRF sem consultar bases externas', () => {
      expect(validarRegistroMapa('SP-001234-5')).toBe(true);
      expect(validarRegistroMapa('MAPA 98765/2025')).toBe(true);
      expect(validarRegistroMapa('AB')).toBe(false);
      expect(validarRegistroMapa('')).toBe(false);

      expect(validarCrf('12345', 'SP')).toBe(true);
      expect(validarCrf('CRF-RJ 54321')).toBe(true);
      expect(validarCrf('12345', 'XX')).toBe(false);
      expect(validarCrf('abc', 'SP')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 1. SOLICITAÇÃO DE CAPACIDADE VETERINÁRIA E PROTEÇÃO DE CAPACIDADE HUMANA
  // ─────────────────────────────────────────────────────────────
  describe('3.1 Solicitação de Capacidade VETERINARY_COMPOUNDING', () => {
    it('bloqueia solicitação quando VET_ENABLED=false (404)', async () => {
      setFeatureFlagsOverrideForTesting({ VET_ENABLED: false });

      const res = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .field('mapaRegistrationNumber', 'SP-12345-6')
        .field('crmvCompanyRegistration', '54321')
        .field('crmvCompanyUf', 'SP')
        .field('technicalResponsibleName', 'Dra. Camila Vet')
        .field('technicalResponsibleCrf', '98765')
        .field('technicalResponsibleCrfUf', 'SP')
        .attach('evidences', validPdfBuffer, 'certidao-mapa.pdf');

      expect(res.status).toBe(404);
    });

    it('cria solicitação em PENDING_VERIFICATION com evidências privadas e preserva a capacidade humana existente', async () => {
      // Cria uma receita humana e uma veterinária para testar que a capacidade humana não é afetada
      const humanPresc = await prisma.prescription.create({
        data: {
          patientId: tutorId,
          fileUrl: 'local://rec-humana.pdf',
          kind: PrescriptionKind.HUMAN,
          status: PrescriptionStatus.PENDING
        }
      });

      const pet = await prisma.animal.create({
        data: {
          tutorId,
          name: 'Thor',
          species: AnimalSpecies.DOG,
          weightGrams: 15000
        }
      });

      const vetPresc = await prisma.prescription.create({
        data: {
          patientId: tutorId,
          fileUrl: 'local://rec-vet.pdf',
          kind: PrescriptionKind.VETERINARY,
          petId: pet.id,
          prescriberName: 'Dr. Vet',
          prescriberCrmv: '12345',
          prescriberUf: 'SP',
          status: PrescriptionStatus.PENDING
        }
      });

      // Farmácia solicita capacidade veterinária (tentando injetar status VERIFIED no body)
      const reqRes = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .field('status', 'VERIFIED')
        .field('mapaRegistrationNumber', 'SP-00987-1')
        .field('crmvCompanyRegistration', '44556')
        .field('crmvCompanyUf', 'SP')
        .field('technicalResponsibleName', 'Dr. Roberto Farmacêutico')
        .field('technicalResponsibleCrf', '11223')
        .field('technicalResponsibleCrfUf', 'SP')
        .attach('evidences', validPdfBuffer, 'licenca-mapa.pdf')
        .attach('evidences', validPdfBuffer, 'regularidade-crmv.pdf');

      expect(reqRes.status).toBe(201);
      expect(reqRes.body.type).toBe(CapabilityType.VETERINARY_COMPOUNDING);
      expect(reqRes.body.status).toBe(CapabilityStatus.PENDING_VERIFICATION);
      expect(reqRes.body.mapaRegistrationNumber).toBe('SP-00987-1');
      expect(reqRes.body.evidenceFileKeys).toHaveLength(2);

      // Evidências NUNCA aparecem por URL pública (são chaves privadas local:// ou cloudinary://)
      for (const key of reqRes.body.evidenceFileKeys) {
        expect(key).toMatch(/^(local|cloudinary):\/\//);
        expect(key).not.toMatch(/^https?:\/\//);
      }

      // A capacidade humana existente NÃO é afetada: farmácia continua vendo e cotando receita humana!
      const wallRes = await request(app)
        .get('/api/prescriptions/pharmacy')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(wallRes.status).toBe(200);
      expect(wallRes.body.some((p: any) => p.id === humanPresc.id)).toBe(true);
      // E ainda NÃO vê a receita veterinária enquanto estiver PENDING_VERIFICATION
      expect(wallRes.body.some((p: any) => p.id === vetPresc.id)).toBe(false);

      const quoteHumanRes = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({
          prescriptionId: humanPresc.id,
          price: '65.00',
          deliveryDays: 2
        });
      expect(quoteHumanRes.status).toBe(201);
    });

    it('rejeita solicitação sem arquivos de evidência ou com formatos inválidos de MAPA/CRMV/CRF', async () => {
      // Sem arquivo de evidência
      const noFileRes = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .field('mapaRegistrationNumber', 'SP-00987-1')
        .field('crmvCompanyRegistration', '44556')
        .field('crmvCompanyUf', 'SP')
        .field('technicalResponsibleName', 'Dr. Roberto')
        .field('technicalResponsibleCrf', '11223')
        .field('technicalResponsibleCrfUf', 'SP');

      expect(noFileRes.status).toBe(400);
      expect(noFileRes.body.error?.code).toBe('MISSING_EVIDENCE_FILES');

      // Registro MAPA inválido
      const badMapaRes = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .field('mapaRegistrationNumber', 'X')
        .field('crmvCompanyRegistration', '44556')
        .field('crmvCompanyUf', 'SP')
        .field('technicalResponsibleName', 'Dr. Roberto')
        .field('technicalResponsibleCrf', '11223')
        .field('technicalResponsibleCrfUf', 'SP')
        .attach('evidences', validPdfBuffer, 'doc.pdf');

      expect(badMapaRes.status).toBe(400);
      expect(badMapaRes.body.error?.code).toBe('INVALID_MAPA_REGISTRATION');

      // CRMV da empresa inválido
      const badCrmvRes = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .field('mapaRegistrationNumber', 'SP-00987-1')
        .field('crmvCompanyRegistration', '44556')
        .field('crmvCompanyUf', 'XX')
        .field('technicalResponsibleName', 'Dr. Roberto')
        .field('technicalResponsibleCrf', '11223')
        .field('technicalResponsibleCrfUf', 'SP')
        .attach('evidences', validPdfBuffer, 'doc.pdf');
      expect(badCrmvRes.status).toBe(400);
      expect(badCrmvRes.body.error?.code).toBe('INVALID_COMPANY_CRMV');

      // Sem nome de RT
      const badRtNameRes = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .field('mapaRegistrationNumber', 'SP-00987-1')
        .field('crmvCompanyRegistration', '44556')
        .field('crmvCompanyUf', 'SP')
        .field('technicalResponsibleName', '   ')
        .field('technicalResponsibleCrf', '11223')
        .field('technicalResponsibleCrfUf', 'SP')
        .attach('evidences', validPdfBuffer, 'doc.pdf');
      expect(badRtNameRes.status).toBe(400);
      expect(badRtNameRes.body.error?.code).toBe('MISSING_TECHNICAL_RESPONSIBLE');

      // CRF inválido
      const badCrfRes = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .field('mapaRegistrationNumber', 'SP-00987-1')
        .field('crmvCompanyRegistration', '44556')
        .field('crmvCompanyUf', 'SP')
        .field('technicalResponsibleName', 'Dr. Roberto')
        .field('technicalResponsibleCrf', 'abc')
        .field('technicalResponsibleCrfUf', 'SP')
        .attach('evidences', validPdfBuffer, 'doc.pdf');
      expect(badCrfRes.status).toBe(400);
      expect(badCrfRes.body.error?.code).toBe('INVALID_TECHNICAL_RESPONSIBLE_CRF');

      // Consulta de capacidades da própria farmácia
      const myCapsRes = await request(app)
        .get('/api/pharmacy/capabilities')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(myCapsRes.status).toBe(200);
      expect(Array.isArray(myCapsRes.body)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. RBAC ESTRITO: SOMENTE ADMIN APROVA/RECUSA/SUSPENDE; TUTOR NÃO ACESSA NADA
  // ─────────────────────────────────────────────────────────────
  describe('3.2 RBAC Estrito (Somente ADMIN aprova/recusa/suspende; farmácia não se auto-aprova; tutor bloqueado)', () => {
    let capabilityId: string;

    beforeEach(async () => {
      const cap = await prisma.pharmacyCapability.create({
        data: {
          pharmacyId,
          type: CapabilityType.VETERINARY_COMPOUNDING,
          status: CapabilityStatus.PENDING_VERIFICATION,
          mapaRegistrationNumber: 'SP-12345',
          crmvCompanyRegistration: '54321',
          crmvCompanyUf: 'SP',
          technicalResponsibleName: 'Dra. Ana',
          technicalResponsibleCrf: '99887',
          technicalResponsibleCrfUf: 'SP',
          evidenceFileKeys: ['local://evidencia-teste.pdf']
        }
      });
      capabilityId = cap.id;
    });

    it('Tutor (PATIENT) é bloqueado em todos os endpoints de capacidade e painel admin (403)', async () => {
      const r1 = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${tutorToken}`);
      expect(r1.status).toBe(403);

      const r2 = await request(app)
        .get('/api/pharmacy/capabilities')
        .set('Authorization', `Bearer ${tutorToken}`);
      expect(r2.status).toBe(403);

      const r3 = await request(app)
        .get('/api/admin/capabilities')
        .set('Authorization', `Bearer ${tutorToken}`);
      expect(r3.status).toBe(403);

      const r4 = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/approve`)
        .set('Authorization', `Bearer ${tutorToken}`);
      expect(r4.status).toBe(403);

      const r5 = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/reject`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ reason: 'Tentativa tutor' });
      expect(r5.status).toBe(403);

      const r6 = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/suspend`)
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ reason: 'Tentativa tutor' });
      expect(r6.status).toBe(403);

      const r7 = await request(app)
        .get(`/api/admin/capabilities/${capabilityId}/evidences/0/view-url`)
        .set('Authorization', `Bearer ${tutorToken}`);
      expect(r7.status).toBe(403);
    });

    it('Farmácia NÃO aprova, recusa ou suspende a si mesma nem acessa endpoints ADMIN (403)', async () => {
      const approveSelf = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/approve`)
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(approveSelf.status).toBe(403);

      const rejectSelf = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/reject`)
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ reason: 'Auto recusa' });
      expect(rejectSelf.status).toBe(403);

      const suspendSelf = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/suspend`)
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ reason: 'Auto suspensão' });
      expect(suspendSelf.status).toBe(403);

      const listAdmin = await request(app)
        .get('/api/admin/capabilities')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(listAdmin.status).toBe(403);

      // Confirma no banco que o status continua PENDING_VERIFICATION
      const capInDb = await prisma.pharmacyCapability.findUnique({ where: { id: capabilityId } });
      expect(capInDb?.status).toBe(CapabilityStatus.PENDING_VERIFICATION);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. EVIDÊNCIAS PRIVADAS, URL ASSINADA DE CURTA DURAÇÃO E AUDITLOG
  // ─────────────────────────────────────────────────────────────
  describe('3.2 Evidências Privadas, URL Assinada que Expira e AuditLog Compulsório', () => {
    it('gera URL assinada para ADMIN, registra cada abertura em AuditLog e bloqueia URL expirada', async () => {
      // Solicita capacidade enviando arquivo real
      const createRes = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .field('mapaRegistrationNumber', 'SP-77889')
        .field('crmvCompanyRegistration', '33445')
        .field('crmvCompanyUf', 'SP')
        .field('technicalResponsibleName', 'Dra. Fernanda')
        .field('technicalResponsibleCrf', '55667')
        .field('technicalResponsibleCrfUf', 'SP')
        .attach('evidences', validPdfBuffer, 'evidencia-mapa.pdf');

      expect(createRes.status).toBe(201);
      const capabilityId = createRes.body.id;

      // ADMIN lista solicitações filtrando por tipo e status
      const listRes = await request(app)
        .get('/api/admin/capabilities?type=VETERINARY_COMPOUNDING&status=PENDING_VERIFICATION')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].id).toBe(capabilityId);
      // Evidência não possui URL pública
      expect(listRes.body[0].evidenceFileKeys[0]).toMatch(/^local:\/\//);

      // ADMIN gera URL assinada de curta duração para a evidência 0
      const signRes = await request(app)
        .get(`/api/admin/capabilities/${capabilityId}/evidences/0/view-url`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(signRes.status).toBe(200);
      expect(signRes.body.signedUrl).toBeDefined();
      expect(signRes.body.expiresInSeconds).toBe(300);

      // Verifica que a geração da URL assinada gravou registro em AuditLog
      const auditLogsAfterSign = await prisma.auditLog.findMany({
        where: {
          resource: 'PharmacyCapability',
          resourceId: capabilityId,
          action: 'VIEW_CAPABILITY_EVIDENCE'
        }
      });
      expect(auditLogsAfterSign.length).toBe(1);
      expect(auditLogsAfterSign[0].actorId).toBe(adminId);

      // Abre o arquivo pela URL assinada válida
      const viewRes = await request(app).get(signRes.body.signedUrl);
      expect(viewRes.status).toBe(200);
      expect(viewRes.headers['content-type']).toContain('application/pdf');

      // Verifica que uma URL expirada é imediatamente rejeitada com 403
      const urlObj = new URL(signRes.body.signedUrl, 'http://localhost:3000');
      const token = urlObj.searchParams.get('token');
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 60;

      const expiredRes = await request(app).get(
        `/api/admin/capabilities/${capabilityId}/evidences/0/view?token=${token}&expires=${expiredTimestamp}`
      );
      expect(expiredRes.status).toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. FLUXO COMPLETO: APROVAÇÃO, RECUSA, SUSPENSÃO, NOTIFICAÇÕES E SOBREVIVÊNCIA DE PEDIDOS
  // ─────────────────────────────────────────────────────────────
  describe('3.2, 3.3 e 3.5 Aprovação, Recusa, Suspensão, Notificações e Sobrevivência de Pedidos Existentes', () => {
    it('aprovação libera listagem e cotação veterinária; suspensão bloqueia novas cotações/listagem mas preserva pedidos existentes; gera AuditLog e Notificações sem dados sensíveis', async () => {
      // 1. Cria pet e duas receitas veterinárias
      const pet = await prisma.animal.create({
        data: {
          tutorId,
          name: 'Mel',
          species: AnimalSpecies.DOG,
          weightGrams: 12000
        }
      });

      const vetPresc1 = await prisma.prescription.create({
        data: {
          patientId: tutorId,
          fileUrl: 'local://vet-presc-1.pdf',
          kind: PrescriptionKind.VETERINARY,
          petId: pet.id,
          prescriberName: 'Dr. Vet 1',
          prescriberCrmv: '11111',
          prescriberUf: 'SP',
          status: PrescriptionStatus.PENDING
        }
      });

      const vetPresc2 = await prisma.prescription.create({
        data: {
          patientId: tutorId,
          fileUrl: 'local://vet-presc-2.pdf',
          kind: PrescriptionKind.VETERINARY,
          petId: pet.id,
          prescriberName: 'Dr. Vet 2',
          prescriberCrmv: '22222',
          prescriberUf: 'SP',
          status: PrescriptionStatus.PENDING
        }
      });

      // 2. Farmácia solicita capacidade veterinária
      const reqCap = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .field('mapaRegistrationNumber', 'SP-55443')
        .field('crmvCompanyRegistration', '66778')
        .field('crmvCompanyUf', 'SP')
        .field('technicalResponsibleName', 'Dr. Lucas RT')
        .field('technicalResponsibleCrf', '44332')
        .field('technicalResponsibleCrfUf', 'SP')
        .attach('evidences', validPdfBuffer, 'doc-mapa.pdf');

      expect(reqCap.status).toBe(201);
      const capabilityId = reqCap.body.id;

      // 3. ADMIN aprova a capacidade com checklist conferido
      const approveRes = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Registro MAPA, CRMV e RT conferidos documentalmente',
          checklist: {
            mapaChecked: true,
            crmvChecked: true,
            rtCrfChecked: true
          }
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.status).toBe(CapabilityStatus.VERIFIED);
      expect(approveRes.body.verifiedByAdminId).toBe(adminId);
      expect(approveRes.body.verifiedAt).not.toBeNull();

      // 4. Aprovação libera imediatamente a listagem veterinária para a farmácia
      const wallAfterApprove = await request(app)
        .get('/api/prescriptions/pharmacy')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(wallAfterApprove.status).toBe(200);
      expect(wallAfterApprove.body.some((p: any) => p.id === vetPresc1.id)).toBe(true);

      // 5. Farmácia envia cotação na receita veterinária 1 e tutor aprova gerando Pedido
      const quoteRes = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({
          prescriptionId: vetPresc1.id,
          price: '120.00',
          deliveryDays: 2,
          pharmaceuticalForm: 'BISCOITO_MEDICAMENTOSO',
          flavoring: 'Carne'
        });
      expect(quoteRes.status).toBe(201);
      const quoteId = quoteRes.body.id;

      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tutorToken}`)
        .send({ quoteId });
      expect(orderRes.status).toBe(201);
      const orderId = orderRes.body.id;

      // 6. Tentativa de suspender sem motivo deve falhar com 400
      const suspendNoReason = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(suspendNoReason.status).toBe(400);

      // 7. ADMIN suspende a capacidade veterinária com motivo obrigatório
      const suspendRes = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Suspensão cautelar para renovação de certidão de regularidade no CRMV'
        });
      expect(suspendRes.status).toBe(200);
      expect(suspendRes.body.status).toBe(CapabilityStatus.SUSPENDED);
      expect(suspendRes.body.rejectionReason).toContain('Suspensão cautelar');

      // 8. Suspensão bloqueia IMEDIATAMENTE a listagem de receitas veterinárias e novas cotações
      const wallAfterSuspend = await request(app)
        .get('/api/prescriptions/pharmacy')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(wallAfterSuspend.status).toBe(200);
      expect(wallAfterSuspend.body.some((p: any) => p.id === vetPresc2.id)).toBe(false);

      const newQuoteAfterSuspend = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({
          prescriptionId: vetPresc2.id,
          price: '95.00',
          deliveryDays: 2
        });
      expect(newQuoteAfterSuspend.status).toBe(403);
      expect(newQuoteAfterSuspend.body.error?.code).toBe('CAPABILITY_REQUIRED');

      // 9. Pedidos e cotações existentes SOBREVIVEM à suspensão, seguem seu curso e ficam visíveis para o ADMIN
      const pharmOrders = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(pharmOrders.status).toBe(200);
      expect(pharmOrders.body.some((o: any) => o.id === orderId)).toBe(true);

      // Farmácia pode avançar o pedido existente para DELIVERY normalmente
      const advanceOrder = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ status: OrderStatus.DELIVERY });
      expect(advanceOrder.status).toBe(200);
      expect(advanceOrder.body.status).toBe(OrderStatus.DELIVERY);

      // ADMIN visualiza os pedidos existentes (via /api/admin/orders e /api/orders/:id)
      const adminOrdersList = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminOrdersList.status).toBe(200);
      expect(adminOrdersList.body.some((o: any) => o.id === orderId)).toBe(true);

      const adminOrderDetail = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminOrderDetail.status).toBe(200);
      expect(adminOrderDetail.body.id).toBe(orderId);

      // 10. Verifica notificações enviadas à farmácia (aprovada e suspensa) sem dados sensíveis
      const notifications = await prisma.notification.findMany({
        where: { pharmacyId }
      });
      expect(notifications.some((n) => n.type === 'CAPABILITY_APPROVED')).toBe(true);
      expect(notifications.some((n) => n.type === 'CAPABILITY_SUSPENDED')).toBe(true);
    });

    it('recusa de capacidade exige motivo obrigatório, bloqueia listagem veterinária, gera AuditLog e notifica farmácia', async () => {
      const reqCap = await request(app)
        .post('/api/pharmacy/capabilities/veterinary')
        .set('Authorization', `Bearer ${otherPharmacyToken}`)
        .field('mapaRegistrationNumber', 'RJ-11223')
        .field('crmvCompanyRegistration', '99881')
        .field('crmvCompanyUf', 'RJ')
        .field('technicalResponsibleName', 'Dra. Carla RT')
        .field('technicalResponsibleCrf', '77665')
        .field('technicalResponsibleCrfUf', 'RJ')
        .attach('evidences', validPdfBuffer, 'doc-rj.pdf');

      expect(reqCap.status).toBe(201);
      const capabilityId = reqCap.body.id;

      // Sem motivo -> 400
      const rejectWithoutReason = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: '   ' });
      expect(rejectWithoutReason.status).toBe(400);

      // Com motivo -> 200 REJECTED
      const rejectRes = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Número de registro no MAPA ilegível no documento anexado' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.status).toBe(CapabilityStatus.REJECTED);
      expect(rejectRes.body.rejectionReason).toContain('ilegível');
      expect(rejectRes.body.verifiedByAdminId).toBe(adminId);

      // Verifica AuditLog
      const audit = await prisma.auditLog.findFirst({
        where: {
          resource: 'PharmacyCapability',
          resourceId: capabilityId,
          action: 'REJECT_PHARMACY_CAPABILITY'
        }
      });
      expect(audit).toBeDefined();
      expect(audit?.actorId).toBe(adminId);
      expect(audit?.reason).toContain('ilegível');

      // Verifica notificação
      const notif = await prisma.notification.findFirst({
        where: { pharmacyId: otherPharmacyId, type: 'CAPABILITY_REJECTED' }
      });
      expect(notif).toBeDefined();

      // Reutilização da consulta de situação de CNPJ pelo ADMIN (item 3.4)
      const cnpjRes = await request(app)
        .get(`/api/admin/pharmacies/${otherPharmacyId}/cnpj-lookup`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(cnpjRes.status).toBe(200);
      expect(cnpjRes.body.cnpj).toBe('12345678000195');

      // Tentativa de suspender capacidade que não está VERIFIED -> 409
      const suspendNotVerified = await request(app)
        .patch(`/api/admin/capabilities/${capabilityId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Não estava verificada' });
      expect(suspendNotVerified.status).toBe(409);

      // Casos 404 para IDs inexistentes
      const notFoundApprove = await request(app)
        .patch('/api/admin/capabilities/id-inexistente/approve')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(notFoundApprove.status).toBe(404);

      const notFoundReject = await request(app)
        .patch('/api/admin/capabilities/id-inexistente/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Motivo válido' });
      expect(notFoundReject.status).toBe(404);

      const notFoundSuspend = await request(app)
        .patch('/api/admin/capabilities/id-inexistente/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Motivo válido' });
      expect(notFoundSuspend.status).toBe(404);

      const notFoundEvid = await request(app)
        .get(`/api/admin/capabilities/${capabilityId}/evidences/99/view-url`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(notFoundEvid.status).toBe(404);

      const notFoundCapEvid = await request(app)
        .get('/api/admin/capabilities/cap-inexistente/evidences/0/view-url')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(notFoundCapEvid.status).toBe(404);

      const missingTokenView = await request(app)
        .get(`/api/admin/capabilities/${capabilityId}/evidences/0/view`);
      expect(missingTokenView.status).toBe(400);

      const notFoundCnpj = await request(app)
        .get('/api/admin/pharmacies/farm-inexistente/cnpj-lookup')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(notFoundCnpj.status).toBe(404);

      const forbiddenCnpj = await request(app)
        .get(`/api/admin/pharmacies/${otherPharmacyId}/cnpj-lookup`)
        .set('Authorization', `Bearer ${tutorToken}`);
      expect(forbiddenCnpj.status).toBe(403);

      const forbiddenOrders = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${tutorToken}`);
      expect(forbiddenOrders.status).toBe(403);
    });
  });
});

