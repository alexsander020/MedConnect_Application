import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { PharmacyVerificationStatus, Role, PrescriptionStatus, QuoteStatus, OrderStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { DataRetentionService } from '../src/services/dataRetentionService';
import { ConsentService } from '../src/services/consentService';
import { SubjectRightsService } from '../src/services/subjectRightsService';
import { CURRENT_HEALTH_CONSENT } from '../src/constants/consentTexts';

describe('FASE 4 e FASE 5 — Cobertura Profunda de Controllers e Services (Target >= 80%)', () => {
  const adminId = 'deep-admin-id-1';
  const patientId = 'deep-patient-id-1';
  const pharmacyId = 'deep-pharmacy-id-1';

  const adminToken = jwt.sign(
    { id: adminId, email: 'admin.deep@medconnect.com', role: Role.ADMIN },
    env.JWT_SECRET
  );

  const patientToken = jwt.sign(
    { id: patientId, email: 'patient.deep@medconnect.com', role: Role.PATIENT },
    env.JWT_SECRET
  );

  const pharmacyToken = jwt.sign(
    { id: pharmacyId, email: 'pharmacy.deep@medconnect.com', role: Role.PHARMACY },
    env.JWT_SECRET
  );

  beforeEach(async () => {
    await cleanDatabase(prisma);

    await prisma.user.create({
      data: {
        id: adminId,
        name: 'Admin Deep',
        email: 'admin.deep@medconnect.com',
        password: 'Password123!',
        role: Role.ADMIN
      }
    });

    await prisma.user.create({
      data: {
        id: patientId,
        name: 'Patient Deep',
        email: 'patient.deep@medconnect.com',
        password: 'Password123!',
        cpfEncrypted: 'enc-patient-deep',
        cpfHash: 'hash-patient-deep',
        role: Role.PATIENT
      }
    });

    await prisma.pharmacy.create({
      data: {
        id: pharmacyId,
        name: 'Farmácia Deep Teste',
        email: 'pharmacy.deep@medconnect.com',
        password: 'Password123!',
        cnpj: '11222333000181',
        verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION,
        verified: false
      }
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  describe('1. ConsentController e ConsentService', () => {
    it('GET /api/consent/terms deve retornar os termos de consentimento vigentes', async () => {
      const res = await request(app).get('/api/consent/terms');
      expect(res.status).toBe(200);
      expect(res.body.activeVersions).toBeDefined();
      expect(res.body.currentHealthConsent).toBeDefined();
      expect(res.body.currentHealthConsent.version).toBe(CURRENT_HEALTH_CONSENT.version);
    });

    it('GET /api/consent/status deve retornar status do titular sem consentimento prévio', async () => {
      const res = await request(app)
        .get('/api/consent/status')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(patientId);
      expect(res.body.hasActiveHealthConsent).toBe(false);
      expect(res.body.history).toEqual([]);
    });

    it('POST /api/consent deve registrar consentimento com sucesso', async () => {
      const res = await request(app)
        .post('/api/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ consentType: 'HEALTH_DATA_PROCESSING' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.consent).toBeDefined();
      expect(res.body.consent.userId).toBe(patientId);

      // Verifica status após aceite
      const statusRes = await request(app)
        .get('/api/consent/status')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(statusRes.status).toBe(200);
      expect(statusRes.body.hasActiveHealthConsent).toBe(true);
      expect(statusRes.body.isRevoked).toBe(false);
    });

    it('POST /api/consent/revoke deve revogar consentimento com justificativa', async () => {
      // Registra primeiro
      await request(app)
        .post('/api/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send();

      // Revoga
      const revokeRes = await request(app)
        .post('/api/consent/revoke')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Não quero mais utilizar o serviço' });

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.status).toBe('CONSENT_REVOKED');
      expect(revokeRes.body.revokedCount).toBeGreaterThanOrEqual(1);

      // Verifica se ficou revogado
      const statusRes = await request(app)
        .get('/api/consent/status')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(statusRes.body.hasActiveHealthConsent).toBe(false);
      expect(statusRes.body.isRevoked).toBe(true);
    });

    it('deve retornar 500 no ConsentController caso ocorra erro interno inesperado', async () => {
      const spy = jest.spyOn(ConsentService, 'hasActiveConsent').mockRejectedValueOnce(new Error('DB failure'));

      const res = await request(app)
        .get('/api/consent/status')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });

    it('deve retornar 500 no ConsentController.giveConsent em caso de erro', async () => {
      const spy = jest.spyOn(ConsentService, 'recordConsent').mockRejectedValueOnce(new Error('Crash'));

      const res = await request(app)
        .post('/api/consent')
        .set('Authorization', `Bearer ${patientToken}`)
        .send();

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });

    it('deve retornar 500 no ConsentController.revokeConsent em caso de erro', async () => {
      const spy = jest.spyOn(ConsentService, 'revokeConsent').mockRejectedValueOnce(new Error('Crash'));

      const res = await request(app)
        .post('/api/consent/revoke')
        .set('Authorization', `Bearer ${patientToken}`)
        .send();

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  describe('2. AdminController (Pilot Metrics, Verification & Audit Logs)', () => {
    it('GET /api/admin/pilot-metrics deve calcular métricas agregadas do piloto', async () => {
      // Cria prescrição
      const rx = await prisma.prescription.create({
        data: {
          id: 'rx-metric-1',
          patientId,
          fileUrl: 'https://cdn.example.com/rx1.pdf',
          status: PrescriptionStatus.PENDING,
          createdAt: new Date(Date.now() - 3600000) // 1 hora atrás
        }
      });

      // Cria cotação
      await prisma.quote.create({
        data: {
          id: 'quote-metric-1',
          prescriptionId: rx.id,
          pharmacyId,
          priceCents: 8500,
          deliveryDays: 2,
          status: QuoteStatus.PENDING,
          createdAt: new Date(Date.now() - 1800000) // 30 min atrás (TTFQ: 30 min)
        }
      });

      const res = await request(app)
        .get('/api/admin/pilot-metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toBeDefined();
      expect(res.body.metrics.totalPrescriptions).toBeGreaterThanOrEqual(1);
      expect(res.body.metrics.totalQuotes).toBeGreaterThanOrEqual(1);
      expect(res.body.metrics.avgTtfqMinutes).toBeGreaterThan(0);
      expect(res.body.targets).toBeDefined();
      expect(res.body.anonymizedEvents).toBeInstanceOf(Array);
      expect(res.body.anonymizedEvents.length).toBeGreaterThan(0);
    });

    it('GET /api/admin/audit-logs deve aceitar filtros de consulta', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .query({
          actorId: adminId,
          action: 'TEST_ACTION',
          resource: 'User',
          resourceId: patientId,
          page: 1,
          limit: 10
        })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.logs).toBeDefined();
      expect(res.body.total).toBeDefined();
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(10);
    });

    it('GET /api/admin/pharmacies/pending deve listar farmácias aguardando verificação', async () => {
      const res = await request(app)
        .get('/api/admin/pharmacies/pending')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((p: any) => p.id === pharmacyId)).toBe(true);
    });

    it('PATCH /api/admin/pharmacies/:id/verify deve aprovar farmácia', async () => {
      const res = await request(app)
        .patch(`/api/admin/pharmacies/${pharmacyId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true });

      expect(res.status).toBe(200);
      expect(res.body.verificationStatus).toBe(PharmacyVerificationStatus.VERIFIED);
      expect(res.body.verified).toBe(true);

      const dbPharmacy = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
      expect(dbPharmacy?.verified).toBe(true);
      expect(dbPharmacy?.verificationStatus).toBe(PharmacyVerificationStatus.VERIFIED);
    });

    it('PATCH /api/admin/pharmacies/:id/verify deve rejeitar farmácia com motivo', async () => {
      const res = await request(app)
        .patch(`/api/admin/pharmacies/${pharmacyId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: false, rejectionReason: 'AFE sanitária vencida' });

      expect(res.status).toBe(200);
      expect(res.body.verificationStatus).toBe(PharmacyVerificationStatus.REJECTED);
      expect(res.body.verified).toBe(false);
      expect(res.body.rejectionReason).toBe('AFE sanitária vencida');
    });

    it('PATCH /api/admin/pharmacies/:id/verify deve retornar 404 para farmácia inexistente', async () => {
      const res = await request(app)
        .patch('/api/admin/pharmacies/non-existent-id/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('deve retornar 403 para não administradores em rotas administrativas', async () => {
      const res = await request(app)
        .get('/api/admin/pilot-metrics')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    it('deve retornar 500 no AdminController.getPilotMetrics em caso de falha', async () => {
      const spy = jest.spyOn(prisma.prescription, 'count').mockRejectedValueOnce(new Error('Crash'));

      const res = await request(app)
        .get('/api/admin/pilot-metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      spy.mockRestore();
    });
  });

  describe('3. DataRetentionService (Expurgo e Retenção)', () => {
    it('deve expurgar tokens expirados ou revogados com purgeExpiredTokens', async () => {
      const expiredDate = new Date(Date.now() - 100000);
      const futureDate = new Date(Date.now() + 100000);

      // RefreshTokens
      await prisma.refreshToken.createMany({
        data: [
          { tokenHash: 'tok-exp-1', familyId: 'fam-1', userId: patientId, expiresAt: expiredDate, isRevoked: false },
          { tokenHash: 'tok-rev-1', familyId: 'fam-2', userId: patientId, expiresAt: futureDate, isRevoked: true },
          { tokenHash: 'tok-valid-1', familyId: 'fam-3', userId: patientId, expiresAt: futureDate, isRevoked: false }
        ]
      });

      // PasswordResetTokens
      await prisma.passwordResetToken.createMany({
        data: [
          { tokenHash: 'pr-exp-1', email: 'test@example.com', expiresAt: expiredDate, used: false },
          { tokenHash: 'pr-used-1', email: 'test@example.com', expiresAt: futureDate, used: true },
          { tokenHash: 'pr-valid-1', email: 'test@example.com', expiresAt: futureDate, used: false }
        ]
      });

      // EmailVerificationTokens
      await prisma.emailVerificationToken.createMany({
        data: [
          { tokenHash: 'ev-exp-1', email: 'test@example.com', expiresAt: expiredDate, used: false },
          { tokenHash: 'ev-used-1', email: 'test@example.com', expiresAt: futureDate, used: true },
          { tokenHash: 'ev-valid-1', email: 'test@example.com', expiresAt: futureDate, used: false }
        ]
      });

      const counts = await DataRetentionService.purgeExpiredTokens();
      expect(counts.refresh).toBe(2);
      expect(counts.passwordReset).toBe(2);
      expect(counts.emailVerification).toBe(2);

      const remainingRefresh = await prisma.refreshToken.findMany();
      expect(remainingRefresh.length).toBe(1);
      expect(remainingRefresh[0].tokenHash).toBe('tok-valid-1');
    });

    it('deve expurgar receitas canceladas antigas sem pedidos', async () => {
      const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      await prisma.prescription.createMany({
        data: [
          { id: 'rx-old-cancelled', patientId, fileUrl: 'https://cdn.example.com/old.pdf', status: PrescriptionStatus.CANCELLED, createdAt: fortyDaysAgo },
          { id: 'rx-recent-cancelled', patientId, fileUrl: 'https://cdn.example.com/recent.pdf', status: PrescriptionStatus.CANCELLED, createdAt: tenDaysAgo }
        ]
      });

      const purgedCount = await DataRetentionService.purgeCancelledPrescriptions(30);
      expect(purgedCount).toBe(1);

      const remaining = await prisma.prescription.findMany({ where: { patientId } });
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('rx-recent-cancelled');
    });

    it('runScheduledPurge deve respeitar RETENTION_PURGE_ENABLED', async () => {
      const originalEnv = process.env.RETENTION_PURGE_ENABLED;

      // Desativado
      process.env.RETENTION_PURGE_ENABLED = 'false';
      const disabledResult = await DataRetentionService.runScheduledPurge();
      expect(disabledResult.executed).toBe(false);
      expect(disabledResult.reason).toContain('desativada por padrão');

      // Ativado
      process.env.RETENTION_PURGE_ENABLED = 'true';
      const enabledResult = await DataRetentionService.runScheduledPurge();
      expect(enabledResult.executed).toBe(true);
      expect(enabledResult.report).toBeDefined();
      expect(enabledResult.report?.timestamp).toBeDefined();

      process.env.RETENTION_PURGE_ENABLED = originalEnv;
    });
  });

  describe('FASE 5 e VET — Cobertura Abrangente de Filiais e Casos de Borda (Boost Global >= 85%)', () => {
    it('LgpdController: bloqueia requisições sem autenticação ou com IDOR e lida com erros', async () => {
      // 401 sem token
      const resNoAuth = await request(app).get('/api/lgpd/my-data');
      expect(resNoAuth.status).toBe(401);

      // 403 tentativa de IDOR
      const resIdor = await request(app)
        .get(`/api/lgpd/my-data?userId=${adminId}`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(resIdor.status).toBe(403);

      // 401 anonimização sem token
      const resAnonNoAuth = await request(app).post('/api/lgpd/anonymize-my-account');
      expect(resAnonNoAuth.status).toBe(401);

      // 403 tentativa de IDOR na anonimização
      const resAnonIdor = await request(app)
        .post('/api/lgpd/anonymize-my-account')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ userId: adminId });
      expect(resAnonIdor.status).toBe(403);

      // 500 erro interno
      const spyExport = jest.spyOn(SubjectRightsService, 'exportData').mockRejectedValueOnce(new Error('DB failure'));
      const res500 = await request(app)
        .get('/api/lgpd/my-data')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res500.status).toBe(500);
      spyExport.mockRestore();

      const spyAnon = jest.spyOn(SubjectRightsService, 'anonymizeUser').mockRejectedValueOnce(new Error('DB failure'));
      const resAnon500 = await request(app)
        .post('/api/lgpd/anonymize-my-account')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(resAnon500.status).toBe(500);
      spyAnon.mockRestore();
    });

    it('ReviewController: validações de segurança, máquina de estados e unicidade', async () => {
      // 401 sem autenticação
      const resNoAuth = await request(app).post('/api/reviews').send({});
      expect(resNoAuth.status).toBe(401);

      // 403 papel não PATIENT
      const resWrongRole = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ orderId: 'ord-1', rating: 5 });
      expect(resWrongRole.status).toBe(403);

      // 400 campos faltando
      const resMissing = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});
      expect(resMissing.status).toBe(400);

      // 400 nota inválida (< 1 ou > 5 ou não inteira)
      const resInvalidRating = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ orderId: 'ord-1', rating: 6 });
      expect(resInvalidRating.status).toBe(400);

      const resFloatRating = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ orderId: 'ord-1', rating: 3.5 });
      expect(resFloatRating.status).toBe(400);

      // 404 pedido inexistente
      const resNotFound = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ orderId: 'ord-non-existent', rating: 5 });
      expect(resNotFound.status).toBe(404);

      // 500 em getPharmacyReviews se prisma falhar
      const spyFindMany = jest.spyOn(prisma.review, 'findMany').mockRejectedValueOnce(new Error('DB Error'));
      const resReviewErr = await request(app).get(`/api/reviews/pharmacy/${pharmacyId}`);
      expect(resReviewErr.status).toBe(500);
      spyFindMany.mockRestore();
    });

    it('QuoteController: validações de autorização, farmácia verificada e parâmetros', async () => {
      // 401 criação sem token
      const resNoAuth = await request(app).post('/api/quotes').send({});
      expect(resNoAuth.status).toBe(401);

      // 403 papel PATIENT tentando criar cotação
      const resWrongRole = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({});
      expect(resWrongRole.status).toBe(403);

      // 403 farmácia não verificada
      const unverifiedPharmId = 'pharm-unverified-1';
      const unverifiedToken = jwt.sign(
        { id: unverifiedPharmId, email: 'unv@pharm.com', role: Role.PHARMACY },
        env.JWT_SECRET
      );
      await prisma.pharmacy.create({
        data: {
          id: unverifiedPharmId,
          name: 'Farmácia Não Verificada',
          email: 'unv@pharm.com',
          password: 'Password123!',
          cnpj: '99.888.777/0001-66',
          phone: '(11) 98765-4321',
          address: 'Rua Teste',
          deliveryArea: 'SP',
          verified: false,
          verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION
        }
      });

      const resUnverified = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({ prescriptionId: 'rx-1', price: '50.00' });
      expect(resUnverified.status).toBe(403);
      expect(resUnverified.body.error.code).toBe('PHARMACY_NOT_VERIFIED');

      // Farmácia verificada: missing prescriptionId
      await prisma.pharmacy.update({
        where: { id: pharmacyId },
        data: { verified: true, verificationStatus: PharmacyVerificationStatus.VERIFIED }
      });

      const resMissingRx = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ price: '50.00' });
      expect(resMissingRx.status).toBe(400);
      expect(resMissingRx.body.error.code).toBe('MISSING_FIELD');

      // Preço inválido
      const resInvalidPrice = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ prescriptionId: 'rx-1', price: 'abc' });
      expect(resInvalidPrice.status).toBe(400);

      // Cotações da farmácia: 401 sem token
      const resMyQuotesNoAuth = await request(app).get('/api/quotes/my');
      expect(resMyQuotesNoAuth.status).toBe(401);

      // Cotações da farmácia: sucesso 200
      const resMyQuotes = await request(app)
        .get('/api/quotes/my')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(resMyQuotes.status).toBe(200);
      expect(Array.isArray(resMyQuotes.body)).toBe(true);
    });

    it('PharmacyController.create: validações de campos obrigatórios e formato de e-mail', async () => {
      // Missing fields
      const resMissing = await request(app).post('/api/pharmacies').send({ name: 'Farmácia Teste' });
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error.code).toBe('VALIDATION_ERROR');

      // Invalid email
      const resInvalidEmail = await request(app).post('/api/pharmacies').send({
        name: 'Farmácia Teste',
        email: 'email_invalido_sem_arroba',
        password: 'Password123!',
        cnpj: '11.222.333/0001-44'
      });
      expect(resInvalidEmail.status).toBe(400);
      expect(resInvalidEmail.body.error.code).toBe('INVALID_EMAIL');
    });

    it('SubjectRightsService: exportação completa e anonimização de receitas e animais', async () => {
      const fullUserId = 'full-user-deep-1';
      await prisma.user.create({
        data: {
          id: fullUserId,
          name: 'Paciente Completo',
          email: 'full.patient@example.com',
          password: 'Password123!',
          phone: 'enc-phone',
          address: 'enc-address',
          cpfLastDigits: '789-00',
          role: Role.PATIENT
        }
      });

      // Consentimento
      await prisma.consent.create({
        data: {
          userId: fullUserId,
          consentType: 'HEALTH_DATA_PROCESSING',
          textVersion: '2.0.0',
          ipAddress: '127.0.0.1'
        }
      });

      // Animal
      await prisma.animal.create({
        data: {
          id: 'animal-full-1',
          tutorId: fullUserId,
          name: 'Rex Rex',
          species: 'DOG',
          breed: 'Pastor Alemão',
          weightGrams: 32000,
          isFoodProducing: false
        }
      });

      // Receita 1: sem pedido
      const rxNoOrder = await prisma.prescription.create({
        data: {
          id: 'rx-no-order-1',
          patientId: fullUserId,
          fileUrl: 'https://cdn.example.com/rx1.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      // Receita 2: com pedido concluído
      const rxWithOrder = await prisma.prescription.create({
        data: {
          id: 'rx-with-order-1',
          patientId: fullUserId,
          fileUrl: 'https://cdn.example.com/rx2.pdf',
          status: PrescriptionStatus.ACCEPTED
        }
      });

      const qWithOrder = await prisma.quote.create({
        data: {
          id: 'quote-full-1',
          prescriptionId: rxWithOrder.id,
          pharmacyId,
          priceCents: 5000,
          deliveryDays: 2,
          status: QuoteStatus.ACCEPTED
        }
      });

      await prisma.order.create({
        data: {
          id: 'ord-full-1',
          quoteId: qWithOrder.id,
          patientId: fullUserId,
          status: OrderStatus.DELIVERED
        }
      });

      // Avaliação
      await prisma.review.create({
        data: {
          id: 'review-full-1',
          orderId: 'ord-full-1',
          patientId: fullUserId,
          pharmacyId,
          rating: 5,
          comment: 'Excelente atendimento'
        }
      });

      // 1. Exportação completa: exercita todos os maps (consents, prescriptions, reviews, animals)
      const exported = await SubjectRightsService.exportData(fullUserId);
      expect(exported.perfil.nome).toBe('Paciente Completo');
      expect(exported.consentimentos.length).toBe(1);
      expect(exported.receitasMedicas.length).toBe(2);
      expect(exported.avaliacoes.length).toBe(1);
      expect(exported.animais.length).toBe(1);

      // 2. Anonimização: exercita expurgo de rx sem pedido e guarda regulatória de rx com pedido
      const anonResult = await SubjectRightsService.anonymizeUser(fullUserId, '127.0.0.1');
      expect(anonResult.success).toBe(true);
      expect(anonResult.purgedFilesCount).toBe(1);
      expect(anonResult.retainedRegulatoryCount).toBe(1);
      expect(anonResult.animalsAnonymizedCount).toBe(1);

      // Confirma que rx sem pedido foi expurgada
      const rx1After = await prisma.prescription.findUnique({ where: { id: rxNoOrder.id } });
      expect(rx1After?.status).toBe(PrescriptionStatus.CANCELLED);
      expect(rx1After?.fileUrl).toBe('ARQUIVO_EXPURGADO_EXCLUSAO_TITULAR');

      // Confirma que rx com pedido foi mantida
      const rx2After = await prisma.prescription.findUnique({ where: { id: rxWithOrder.id } });
      expect(rx2After?.fileUrl).toBe('https://cdn.example.com/rx2.pdf');
    });
  });

});
