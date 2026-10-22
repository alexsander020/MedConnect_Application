import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { cleanDatabase } from './helpers/dbCleanup';
import { PharmacyVerificationStatus, OrderStatus, PrescriptionStatus, QuoteStatus } from '@prisma/client';

describe('FASE 2 — Funcionalidades de Produto Real', () => {
  const adminId = 'admin-test-phase2';
  const patientId = 'patient-test-phase2';
  const otherPatientId = 'patient-test-phase2-other';
  const pendingPharmacyId = 'pharmacy-pending-phase2';
  const verifiedPharmacyId = 'pharmacy-verified-phase2';
  const rejectedPharmacyId = 'pharmacy-rejected-phase2';

  const adminToken = jwt.sign(
    { id: adminId, email: 'admin@medconnect.com', role: 'ADMIN' },
    env.JWT_SECRET
  );

  const patientToken = jwt.sign(
    { id: patientId, email: 'paciente@test.com', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const otherPatientToken = jwt.sign(
    { id: otherPatientId, email: 'outro.paciente@test.com', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const pendingPharmacyToken = jwt.sign(
    { id: pendingPharmacyId, email: 'pending@farmacia.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const verifiedPharmacyToken = jwt.sign(
    { id: verifiedPharmacyId, email: 'verified@farmacia.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const rejectedPharmacyToken = jwt.sign(
    { id: rejectedPharmacyId, email: 'rejected@farmacia.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Cria Admin
    await prisma.user.create({
      data: {
        id: adminId,
        name: 'Administrador MedConnect',
        email: 'admin@medconnect.com',
        password: 'Password123!',
        role: 'ADMIN'
      }
    });

    // Cria Pacientes
    await prisma.user.create({
      data: {
        id: patientId,
        name: 'Paciente Titular',
        email: 'paciente@test.com',
        password: 'Password123!',
        role: 'PATIENT'
      }
    });

    await prisma.user.create({
      data: {
        id: otherPatientId,
        name: 'Outro Paciente',
        email: 'outro.paciente@test.com',
        password: 'Password123!',
        role: 'PATIENT'
      }
    });

    // Cria Farmácia Pendente
    await prisma.pharmacy.create({
      data: {
        id: pendingPharmacyId,
        name: 'Farmácia Pendente',
        email: 'pending@farmacia.com',
        password: 'Password123!',
        cnpj: '11111111000199',
        verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION,
        verified: false,
        sanitaryLicense: 'CEVS-12345/2026',
        technicalResponsibleName: 'Dra. Luiza CRF',
        technicalResponsibleCrf: 'CRF-SP 54321',
        technicalResponsibleUf: 'SP'
      }
    });

    // Cria Farmácia Verificada
    await prisma.pharmacy.create({
      data: {
        id: verifiedPharmacyId,
        name: 'Farmácia Aprovada',
        email: 'verified@farmacia.com',
        password: 'Password123!',
        cnpj: '22222222000188',
        verificationStatus: PharmacyVerificationStatus.VERIFIED,
        verified: true,
        sanitaryLicense: 'CEVS-99999/2026',
        technicalResponsibleName: 'Dr. Roberto CRF',
        technicalResponsibleCrf: 'CRF-RJ 12345',
        technicalResponsibleUf: 'RJ'
      }
    });

    // Cria Farmácia Rejeitada
    await prisma.pharmacy.create({
      data: {
        id: rejectedPharmacyId,
        name: 'Farmácia Reprovada',
        email: 'rejected@farmacia.com',
        password: 'Password123!',
        cnpj: '33333333000177',
        verificationStatus: PharmacyVerificationStatus.REJECTED,
        verified: false,
        rejectionReason: 'Licença sanitária vencida'
      }
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  describe('TAREFA 2.2 — Verificação de Farmácias e Painel Admin', () => {
    it('bloqueia farmácias PENDING_VERIFICATION e REJECTED de listar receitas disponíveis', async () => {
      const resPending = await request(app)
        .get('/api/prescriptions/available')
        .set('Authorization', `Bearer ${pendingPharmacyToken}`);
      expect(resPending.status).toBe(403);
      expect(resPending.body.error.code).toBe('PHARMACY_NOT_VERIFIED');

      const resRejected = await request(app)
        .get('/api/prescriptions/available')
        .set('Authorization', `Bearer ${rejectedPharmacyToken}`);
      expect(resRejected.status).toBe(403);
      expect(resRejected.body.error.code).toBe('PHARMACY_NOT_VERIFIED');
    });

    it('permite que farmácia VERIFIED liste receitas disponíveis', async () => {
      const resVerified = await request(app)
        .get('/api/prescriptions/available')
        .set('Authorization', `Bearer ${verifiedPharmacyToken}`);
      expect(resVerified.status).toBe(200);
      expect(Array.isArray(resVerified.body)).toBe(true);
    });

    it('bloqueia farmácia PENDING_VERIFICATION de enviar cotação', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: '/uploads/prescriptions/fake.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pendingPharmacyToken}`)
        .send({
          prescriptionId: presc.id,
          price: 55.0,
          estimatedDays: 2
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PHARMACY_NOT_VERIFIED');
    });

    it('impede usuários não-admin de acessar /api/admin/pharmacies/pending', async () => {
      const resPatient = await request(app)
        .get('/api/admin/pharmacies/pending')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(resPatient.status).toBe(403);

      const resPharmacy = await request(app)
        .get('/api/admin/pharmacies/pending')
        .set('Authorization', `Bearer ${verifiedPharmacyToken}`);
      expect(resPharmacy.status).toBe(403);
    });

    it('permite que ADMIN liste farmácias pendentes e aprove uma com registro de auditoria', async () => {
      // 1. Listar pendentes
      const listRes = await request(app)
        .get('/api/admin/pharmacies/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].id).toBe(pendingPharmacyId);

      // 2. Aprovar farmácia
      const approveRes = await request(app)
        .patch(`/api/admin/pharmacies/${pendingPharmacyId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true });
      expect(approveRes.status).toBe(200);
      expect(approveRes.body.verificationStatus).toBe('VERIFIED');
      expect(approveRes.body.verifiedById).toBe(adminId);
      expect(approveRes.body.verifiedAt).toBeTruthy();

      // 3. Confirmar que agora ela consegue listar receitas
      const canListRes = await request(app)
        .get('/api/prescriptions/available')
        .set('Authorization', `Bearer ${pendingPharmacyToken}`);
      expect(canListRes.status).toBe(200);
    });

    it('permite que ADMIN rejeite uma farmácia com motivo registrado', async () => {
      const rejectRes = await request(app)
        .patch(`/api/admin/pharmacies/${pendingPharmacyId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: false, rejectionReason: 'Documentação sanitária vencida' });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.verificationStatus).toBe('REJECTED');
      expect(rejectRes.body.rejectionReason).toBe('Documentação sanitária vencida');
    });
  });

  describe('TAREFA 2.3 — Validação de Magic Bytes e URLs Assinadas de Receita', () => {
    it('rejeita upload de arquivo executável mascarado como .pdf', async () => {
      // Cabeçalho MZ do Windows PE
      const fakeExecutableBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00malicious executable code here');

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', fakeExecutableBuffer, { filename: 'malware.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_FILE_CONTENT');
    });

    it('aceita upload de PDF autêntico (%PDF-)', async () => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', validPdfBuffer, { filename: 'receita.pdf', contentType: 'application/pdf' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeTruthy();
      expect(res.body.patientId).toBe(patientId);
    });

    it('gera URL assinada com expiração para o paciente dono e registra auditoria', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: '/uploads/prescriptions/receita-secreta.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      const res = await request(app)
        .get(`/api/prescriptions/${presc.id}/view-url`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.signedUrl).toBeTruthy();
      expect(res.body.expiresInSeconds).toBe(300); // 5 minutos

      // Verifica log de auditoria
      const logs = await prisma.prescriptionAccessLog.findMany({
        where: { prescriptionId: presc.id }
      });
      expect(logs.length).toBe(1);
      expect(logs[0].accessedById).toBe(patientId);
      expect(logs[0].accessedByType).toBe('PATIENT');
    });

    it('bloqueia terceiro não autorizado de obter URL assinada da receita', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: '/uploads/prescriptions/receita-secreta.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      // Outro paciente tentando acessar
      const resOther = await request(app)
        .get(`/api/prescriptions/${presc.id}/view-url`)
        .set('Authorization', `Bearer ${otherPatientToken}`);

      expect(resOther.status).toBe(403);
      expect(resOther.body.error.code).toBe('FORBIDDEN');

      // Farmácia que não tem cotação aceita tentando acessar
      const resPharm = await request(app)
        .get(`/api/prescriptions/${presc.id}/view-url`)
        .set('Authorization', `Bearer ${verifiedPharmacyToken}`);

      expect(resPharm.status).toBe(403);
      expect(resPharm.body.error.code).toBe('FORBIDDEN');
    });

    it('permite que a farmácia com cotação ACCEPTED obtenha URL assinada', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: '/uploads/prescriptions/receita-secreta.pdf',
          status: PrescriptionStatus.ACCEPTED
        }
      });

      const quote = await prisma.quote.create({
        data: {
          prescriptionId: presc.id,
          pharmacyId: verifiedPharmacyId,
          priceCents: 5000,
          deliveryDays: 1,
          status: QuoteStatus.ACCEPTED
        }
      });

      await prisma.order.create({
        data: {
          quoteId: quote.id,
          status: OrderStatus.PRODUCTION
        }
      });

      const res = await request(app)
        .get(`/api/prescriptions/${presc.id}/view-url`)
        .set('Authorization', `Bearer ${verifiedPharmacyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.signedUrl).toBeTruthy();

      const logs = await prisma.prescriptionAccessLog.findMany({
        where: { prescriptionId: presc.id, accessedById: verifiedPharmacyId }
      });
      expect(logs.length).toBe(1);
      expect(logs[0].accessedByType).toBe('PHARMACY');
    });
  });

  describe('TAREFA 2.4 — Avaliações (Reviews) e Notificações', () => {
    it('permite avaliação apenas quando o pedido foi DELIVERED e pelo paciente titular', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: '/uploads/prescriptions/rec.pdf',
          status: PrescriptionStatus.ACCEPTED
        }
      });

      const quote = await prisma.quote.create({
        data: {
          prescriptionId: presc.id,
          pharmacyId: verifiedPharmacyId,
          priceCents: 8500,
          deliveryDays: 2,
          status: QuoteStatus.ACCEPTED
        }
      });

      const order = await prisma.order.create({
        data: {
          quoteId: quote.id,
          status: OrderStatus.PRODUCTION
        }
      });

      // 1. Tentar avaliar com status PRODUCTION -> 400
      const resInProduction = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          orderId: order.id,
          rating: 5,
          comment: 'Ótimo atendimento!'
        });
      expect(resInProduction.status).toBe(409);
      expect(resInProduction.body.error.code).toBe('ORDER_NOT_DELIVERED');

      // 2. Mudar pedido para DELIVERED
      await prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.DELIVERED }
      });

      // 3. Outro paciente tentando avaliar pedido que não é dele -> 403
      const resOtherPatient = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({
          orderId: order.id,
          rating: 4,
          comment: 'Tentativa de avaliar alheio'
        });
      expect(resOtherPatient.status).toBe(403);
      expect(resOtherPatient.body.error.code).toBe('FORBIDDEN');

      // 4. Paciente titular avalia com sucesso -> 201
      const resSuccess = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          orderId: order.id,
          rating: 5,
          comment: 'Entrega rápida e excelente embalagem!'
        });
      expect(resSuccess.status).toBe(201);
      expect(resSuccess.body.rating).toBe(5);
      expect(resSuccess.body.pharmacyId).toBe(verifiedPharmacyId);

      // 5. Tentar avaliar novamente o mesmo pedido -> 409
      const resDuplicate = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          orderId: order.id,
          rating: 4,
          comment: 'Segunda avaliação duplicada'
        });
      expect(resDuplicate.status).toBe(409);
      expect(resDuplicate.body.error.code).toBe('REVIEW_ALREADY_EXISTS');

      // 6. Listar avaliações públicas da farmácia
      const resReviewsList = await request(app)
        .get(`/api/reviews/pharmacy/${verifiedPharmacyId}`);
      expect(resReviewsList.status).toBe(200);
      expect(resReviewsList.body.length).toBe(1);
      expect(resReviewsList.body[0].rating).toBe(5);
    });

    it('gerencia notificações: listagem e marcação como lida', async () => {
      // Cria duas notificações no banco
      const n1 = await prisma.notification.create({
        data: {
          userId: patientId,
          type: 'QUOTE_RECEIVED',
          title: 'Nova cotação recebida',
          message: 'Você recebeu uma cotação para sua receita.',
          read: false
        }
      });

      const n2 = await prisma.notification.create({
        data: {
          userId: patientId,
          type: 'ORDER_DELIVERED',
          title: 'Pedido entregue',
          message: 'Seu pedido foi entregue com sucesso.',
          read: false
        }
      });

      // 1. Listar notificações
      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(2);

      // 2. Marcar uma como lida
      const readRes = await request(app)
        .patch(`/api/notifications/${n1.id}/read`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.read).toBe(true);

      // 3. Marcar todas como lidas
      const readAllRes = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(readAllRes.status).toBe(200);
      expect(readAllRes.body.updatedCount).toBeGreaterThanOrEqual(1);

      // 4. Confirmar que n2 agora está lida
      const checkN2 = await prisma.notification.findUnique({ where: { id: n2.id } });
      expect(checkN2?.read).toBe(true);
    });
  });

  describe('TAREFA 2.1 — Endpoints de Dados Reais e Estatísticas', () => {
    it('retorna estatísticas reais da farmácia autenticada em GET /api/pharmacy/stats', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: '/uploads/prescriptions/rec-stats.pdf',
          status: PrescriptionStatus.ACCEPTED
        }
      });

      const q1 = await prisma.quote.create({
        data: {
          prescriptionId: presc.id,
          pharmacyId: verifiedPharmacyId,
          priceCents: 15000,
          deliveryDays: 2,
          status: QuoteStatus.ACCEPTED
        }
      });

      await prisma.order.create({
        data: {
          quoteId: q1.id,
          status: OrderStatus.DELIVERED
        }
      });

      const statsRes = await request(app)
        .get('/api/pharmacy/stats')
        .set('Authorization', `Bearer ${verifiedPharmacyToken}`);

      expect(statsRes.status).toBe(200);
      expect(statsRes.body.totalQuotes).toBe(1);
      expect(statsRes.body.acceptedQuotes).toBe(1);
      expect(statsRes.body.totalOrders).toBe(1);
      expect(statsRes.body.deliveredOrders).toBe(1);
      expect(statsRes.body.totalRevenue).toBe('150.00');
    });

    it('permite que o paciente consulte as cotações de sua receita em GET /api/prescriptions/:id/quotes e bloqueia terceiros', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: '/uploads/prescriptions/rec-quotes.pdf',
          status: PrescriptionStatus.QUOTED
        }
      });

      await prisma.quote.create({
        data: {
          prescriptionId: presc.id,
          pharmacyId: verifiedPharmacyId,
          priceCents: 4500,
          deliveryDays: 1,
          status: QuoteStatus.PENDING
        }
      });

      // Paciente titular acessa com sucesso
      const ownerRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/quotes`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.length).toBe(1);
      expect(ownerRes.body[0].price).toBe('45.00');

      // Outro paciente tentando acessar -> 403
      const forbiddenRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/quotes`)
        .set('Authorization', `Bearer ${otherPatientToken}`);
      expect(forbiddenRes.status).toBe(403);
    });
  });
});
