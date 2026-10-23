import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { OrderStatus, PharmacyVerificationStatus, PrescriptionStatus, QuoteStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { generateRefreshTokenData, hashToken } from '../src/lib/authTokens';

describe('TAREFA 3.1 — Cobertura Profunda de Controladores (Controllers >= 80%)', () => {
  const patientId = 'cov-patient-1';
  const pharmacyId = 'cov-pharmacy-1';
  const adminId = 'cov-admin-1';

  const patientToken = jwt.sign(
    { id: patientId, email: 'cov.paciente@test.com', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const pharmacyToken = jwt.sign(
    { id: pharmacyId, email: 'cov.farmacia@test.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const adminToken = jwt.sign(
    { id: adminId, email: 'cov.admin@test.com', role: 'ADMIN' },
    env.JWT_SECRET
  );

  beforeEach(async () => {
    await cleanDatabase(prisma);

    await prisma.user.create({
      data: {
        id: patientId,
        name: 'Paciente Cobertura',
        email: 'cov.paciente@test.com',
        password: 'Password123!',
        cpfEncrypted: 'enc-cov-cpf',
        cpfHash: 'hash-cov-cpf',
        role: 'PATIENT'
      }
    });

    await prisma.pharmacy.create({
      data: {
        id: pharmacyId,
        name: 'Farmácia Cobertura',
        email: 'cov.farmacia@test.com',
        password: 'Password123!',
        cnpj: '12345678000195',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED
      }
    });

    await prisma.user.create({
      data: {
        id: adminId,
        name: 'Admin Cobertura',
        email: 'cov.admin@test.com',
        password: 'Password123!',
        role: 'ADMIN'
      }
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  describe('User & Pharmacy Creation Edge Cases', () => {
    it('deve rejeitar cadastro de usuário com email inválido ou senha fraca ou cpf inválido', async () => {
      // Email inválido
      const res1 = await request(app).post('/api/users').send({
        name: 'Teste',
        email: 'email-invalido',
        password: 'SenhaForte#123',
        cpf: '52998224725'
      });
      expect(res1.status).toBe(400);

      // CPF inválido
      const res2 = await request(app).post('/api/users').send({
        name: 'Teste',
        email: 'teste.cpf@valido.com',
        password: 'SenhaForte#123',
        cpf: '11111111111'
      });
      expect(res2.status).toBe(400);

      // Senha fraca
      const res3 = await request(app).post('/api/users').send({
        name: 'Teste',
        email: 'teste.senha@valido.com',
        password: 'fraca',
        cpf: '52998224725'
      });
      expect(res3.status).toBe(400);

      // Campos faltantes
      const res4 = await request(app).post('/api/users').send({});
      expect(res4.status).toBe(400);
    });

    it('deve listar todas as farmácias em GET /api/pharmacies', async () => {
      const res = await request(app).get('/api/pharmacies');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Auth Controller Edge Cases (Tokens, Refresh, Reset, Verify Email)', () => {
    it('deve rejeitar refresh com token expirado', async () => {
      const refreshData = generateRefreshTokenData();
      await prisma.refreshToken.create({
        data: {
          userId: patientId,
          tokenHash: refreshData.tokenHash,
          familyId: refreshData.familyId,
          expiresAt: new Date(Date.now() - 10000) // Expirado no passado
        }
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: refreshData.rawToken });

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('REFRESH_TOKEN_EXPIRED');
    });

    it('deve realizar logout revogando a família de refresh tokens', async () => {
      const refreshData = generateRefreshTokenData();
      await prisma.refreshToken.create({
        data: {
          userId: patientId,
          tokenHash: refreshData.tokenHash,
          familyId: refreshData.familyId,
          expiresAt: refreshData.expiresAt
        }
      });

      const res = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: refreshData.rawToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logout');

      const tokenInDb = await prisma.refreshToken.findUnique({ where: { tokenHash: refreshData.tokenHash } });
      expect(tokenInDb?.isRevoked).toBe(true);
    });

    it('deve verificar e-mail do usuário com token válido', async () => {
      const rawToken = 'verification-token-12345';
      const tokenHash = hashToken(rawToken);

      await prisma.emailVerificationToken.create({
        data: {
          email: 'cov.paciente@test.com',
          tokenHash,
          expiresAt: new Date(Date.now() + 3600000)
        }
      });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verificado com sucesso');

      const user = await prisma.user.findUnique({ where: { id: patientId } });
      expect(user?.emailVerified).toBe(true);
    });

    it('deve rejeitar verificação de e-mail com token inexistente ou expirado', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'non-existent-token' });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('deve redefinir senha para farmácia via reset token', async () => {
      const rawToken = 'pharmacy-reset-token-xyz';
      const tokenHash = hashToken(rawToken);

      await prisma.passwordResetToken.create({
        data: {
          email: 'cov.farmacia@test.com',
          tokenHash,
          expiresAt: new Date(Date.now() + 3600000)
        }
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          newPassword: 'NovaSenhaForte#2026'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Senha redefinida com sucesso');
    });
  });

  describe('Admin Controller Edge Cases', () => {
    it('deve permitir admin listar farmácias pendentes e rejeitar com motivo', async () => {
      const pendingPharm = await prisma.pharmacy.create({
        data: {
          name: 'Farmácia Para Rejeitar',
          email: 'rejeitar@farmacia.com',
          password: 'Password123!',
          cnpj: '99888777000111',
          verified: false,
          verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION
        }
      });

      // Listar pendentes
      const listRes = await request(app)
        .get('/api/admin/pharmacies/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.some((p: any) => p.id === pendingPharm.id)).toBe(true);

      // Rejeitar farmácia
      const rejectRes = await request(app)
        .patch(`/api/admin/pharmacies/${pendingPharm.id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: false,
          rejectionReason: 'Documentação do responsável técnico ausente'
        });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.verificationStatus).toBe('REJECTED');
      expect(rejectRes.body.rejectionReason).toContain('responsável técnico');
    });

    it('deve retornar 404 ao verificar farmácia inexistente', async () => {
      const res = await request(app)
        .patch('/api/admin/pharmacies/id-inexistente/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approved: true });

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('Prescription Controller Views & Signed URLs', () => {
    it('deve permitir paciente titular visualizar suas próprias receitas e detalhes', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: 'https://storage.medconnect.com/rec-cov.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      const listRes = await request(app)
        .get('/api/prescriptions/my')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.some((p: any) => p.id === presc.id)).toBe(true);

      const getRes = await request(app)
        .get(`/api/prescriptions/${presc.id}`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(presc.id);

      // Gerar signed view url
      const viewUrlRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/view-url`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(viewUrlRes.status).toBe(200);
      expect(viewUrlRes.body.signedUrl).toBeDefined();
    });

    it('deve retornar 404 ao buscar receita inexistente', async () => {
      const res = await request(app)
        .get('/api/prescriptions/presc-nao-existe')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Quote Controller Edge Cases', () => {
    it('deve permitir farmácia consultar suas cotações enviadas em /api/quotes/my', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: 'https://storage.medconnect.com/rec.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      await prisma.quote.create({
        data: {
          prescriptionId: presc.id,
          pharmacyId,
          priceCents: 15000,
          status: QuoteStatus.PENDING
        }
      });

      const res = await request(app)
        .get('/api/quotes/my')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('deve rejeitar cotação duplicada da mesma farmácia para a mesma receita (409)', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: 'https://storage.medconnect.com/rec.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      await prisma.quote.create({
        data: {
          prescriptionId: presc.id,
          pharmacyId,
          priceCents: 15000,
          status: QuoteStatus.PENDING
        }
      });

      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({
          prescriptionId: presc.id,
          price: '160.00'
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('QUOTE_ALREADY_EXISTS');
    });
  });

  describe('Order Controller Edge Cases', () => {
    it('deve permitir listar pedidos em /api/orders/my para paciente e farmácia', async () => {
      const presc = await prisma.prescription.create({
        data: { patientId, fileUrl: 'rec.pdf', status: PrescriptionStatus.ACCEPTED }
      });
      const quote = await prisma.quote.create({
        data: { prescriptionId: presc.id, pharmacyId, priceCents: 10000, status: QuoteStatus.ACCEPTED }
      });
      await prisma.order.create({
        data: { quoteId: quote.id, status: OrderStatus.PRODUCTION }
      });

      const resPatient = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(resPatient.status).toBe(200);
      expect(resPatient.body.length).toBeGreaterThanOrEqual(1);

      const resPharm = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(resPharm.status).toBe(200);
      expect(resPharm.body.length).toBeGreaterThanOrEqual(1);
    });

    it('deve permitir cancelar um pedido em PRODUCTION', async () => {
      const presc = await prisma.prescription.create({
        data: { patientId, fileUrl: 'rec.pdf', status: PrescriptionStatus.ACCEPTED }
      });
      const quote = await prisma.quote.create({
        data: { prescriptionId: presc.id, pharmacyId, priceCents: 10000, status: QuoteStatus.ACCEPTED }
      });
      const order = await prisma.order.create({
        data: { quoteId: quote.id, status: OrderStatus.PRODUCTION }
      });

      const res = await request(app)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ status: OrderStatus.CANCELLED });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(OrderStatus.CANCELLED);
    });
  });

  describe('Review Controller Edge Cases', () => {
    it('deve listar avaliações públicas da farmácia', async () => {
      const res = await request(app).get(`/api/reviews/pharmacy/${pharmacyId}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('deve rejeitar avaliação com nota fora da faixa de 1 a 5 (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          orderId: 'any-order',
          rating: 6
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Notification Controller', () => {
    it('deve listar notificações, marcar como lida e marcar todas como lidas', async () => {
      const notif = await prisma.notification.create({
        data: {
          userId: patientId,
          type: 'TEST_NOTICE',
          title: 'Aviso Teste',
          message: 'Mensagem de teste'
        }
      });

      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBeGreaterThanOrEqual(1);

      // Marcar uma como lida
      const readRes = await request(app)
        .patch(`/api/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(readRes.status).toBe(200);
      expect(readRes.body.read).toBe(true);

      // Marcar todas como lidas
      const readAllRes = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(readAllRes.status).toBe(200);
      expect(readAllRes.body.updatedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Prescription Controller Deep Coverage', () => {
    it('deve listar receitas do próprio paciente autenticado (getMyPrescriptions)', async () => {
      await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: 'local://my-presc.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      const res = await request(app)
        .get('/api/prescriptions/my')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('deve listar receitas disponíveis para farmácia verificada e mascarar dados sensíveis', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: 'local://avail.pdf',
          status: PrescriptionStatus.PENDING
        }
      });

      const res = await request(app)
        .get('/api/prescriptions/available')
        .set('Authorization', `Bearer ${pharmacyToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((p: any) => p.id === presc.id);
      expect(found).toBeDefined();
      expect(found.patient.anonymousId).toMatch(/^Paciente #/);
      // LGPD: arquivo e dados pessoais diretos não são expostos
      expect(found.fileUrl).toBeUndefined();
    });

    it('deve rejeitar acesso a mural de receitas se usuário não for farmácia ou farmácia não verificada', async () => {
      const patientRes = await request(app)
        .get('/api/prescriptions/available')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(patientRes.status).toBe(403);

      const unverifiedPharm = await prisma.pharmacy.create({
        data: {
          name: 'Farmacia Pendente',
          email: 'pendente@farmacia.com',
          password: 'Password123!',
          cnpj: '99888777000166',
          verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION
        }
      });
      const unverifiedToken = jwt.sign(
        { id: unverifiedPharm.id, email: unverifiedPharm.email, role: 'PHARMACY' },
        env.JWT_SECRET
      );

      const unverifiedRes = await request(app)
        .get('/api/prescriptions/available')
        .set('Authorization', `Bearer ${unverifiedToken}`);
      expect(unverifiedRes.status).toBe(403);
      expect(unverifiedRes.body.error.code).toBe('PHARMACY_NOT_VERIFIED');
    });

    it('deve buscar cotações da receita apenas se o solicitante for o paciente dono ou admin', async () => {
      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: 'local://quotes-presc.pdf',
          status: PrescriptionStatus.QUOTED
        }
      });
      await prisma.quote.create({
        data: {
          prescriptionId: presc.id,
          pharmacyId,
          priceCents: 8550
        }
      });

      // Paciente dono busca cotações: sucesso
      const ownerRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/quotes`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body[0].price).toBe('85.50');

      // Admin busca cotações: sucesso
      const adminRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/quotes`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);

      // Outro paciente busca cotações: 403 Forbidden
      const otherPatient = await prisma.user.create({
        data: {
          name: 'Outro Paciente',
          email: 'outro.pac@test.com',
          password: 'Password123!',
          cpfEncrypted: 'enc-other',
          cpfHash: 'hash-other',
          role: 'PATIENT'
        }
      });
      const otherToken = jwt.sign(
        { id: otherPatient.id, email: otherPatient.email, role: 'PATIENT' },
        env.JWT_SECRET
      );

      const otherRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/quotes`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(otherRes.status).toBe(403);

      // Receita inexistente: 404
      const notFoundRes = await request(app)
        .get('/api/prescriptions/non-existent-id/quotes')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(notFoundRes.status).toBe(404);
    });

    it('deve gerar URL assinada e servir arquivo local seguro (serveLocalView)', async () => {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const testFileName = `test-serve-${Date.now()}.pdf`;
      const testFilePath = path.join(uploadsDir, testFileName);
      fs.writeFileSync(testFilePath, '%PDF-1.4\nTeste de Servico de Arquivo Seguro');

      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: `local://${testFileName}`,
          status: PrescriptionStatus.PENDING
        }
      });

      // 1. Obter URL assinada
      const signRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/view-url`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(signRes.status).toBe(200);
      expect(signRes.body.signedUrl).toBeDefined();

      const signedUrl = signRes.body.signedUrl;
      const urlObj = new URL(signedUrl, 'http://localhost:3000');
      const token = urlObj.searchParams.get('token');
      const expires = urlObj.searchParams.get('expires');

      // 2. Chamar serveLocalView com parâmetros corretos
      const viewRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/view?token=${token}&expires=${expires}`);
      expect(viewRes.status).toBe(200);
      expect(viewRes.headers['content-type']).toContain('application/pdf');

      // 3. Chamar sem token ou expires: 400
      const missingParamRes = await request(app).get(`/api/prescriptions/${presc.id}/view`);
      expect(missingParamRes.status).toBe(400);

      // 4. Chamar com token adulterado: 403
      const tamperedRes = await request(app).get(`/api/prescriptions/${presc.id}/view?token=fake&expires=${expires}`);
      expect(tamperedRes.status).toBe(403);

      // 5. Chamar com id inexistente: 404
      const notFoundPrescRes = await request(app).get(`/api/prescriptions/nao-existe/view?token=${token}&expires=${expires}`);
      expect(notFoundPrescRes.status).toBe(404);

      // Limpeza do arquivo de teste
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    });
  });

  describe('Pharmacy Controller Deep Coverage', () => {
    it('deve listar todas as farmácias cadastradas (getAll)', async () => {
      const res = await request(app).get('/api/pharmacies');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('deve rejeitar cadastro de farmácia com dados faltantes, email inválido ou senha fraca', async () => {
      // Faltando CNPJ
      const res1 = await request(app).post('/api/pharmacies').send({
        name: 'Farmacia Incompleta',
        email: 'inc@farmacia.com',
        password: 'Password123!'
      });
      expect(res1.status).toBe(400);

      // Email inválido
      const res2 = await request(app).post('/api/pharmacies').send({
        name: 'Farmacia Email Ruim',
        email: 'email-errado',
        password: 'Password123!',
        cnpj: '11222333000181'
      });
      expect(res2.status).toBe(400);

      // Senha fraca
      const res3 = await request(app).post('/api/pharmacies').send({
        name: 'Farmacia Senha Fraca',
        email: 'senha@farmacia.com',
        password: '123',
        cnpj: '11222333000181'
      });
      expect(res3.status).toBe(400);
    });

    it('deve rejeitar cadastro com CNPJ ou email já existente (409 Conflict)', async () => {
      const res = await request(app).post('/api/pharmacies').send({
        name: 'Farmacia Duplicada',
        email: 'cov.farmacia@test.com',
        password: 'Password123!',
        cnpj: '12345678000195'
      });
      expect(res.status).toBe(409);
    });
  });

  describe('Order Controller Additional Coverage', () => {
    it('deve listar pedidos da farmácia logada (getMyOrders)', async () => {
      const presc = await prisma.prescription.create({
        data: { patientId, fileUrl: 'local://p.pdf', status: PrescriptionStatus.ACCEPTED }
      });
      const quote = await prisma.quote.create({
        data: { prescriptionId: presc.id, pharmacyId, priceCents: 5000, status: QuoteStatus.ACCEPTED }
      });
      await prisma.order.create({
        data: { quoteId: quote.id, status: OrderStatus.PRODUCTION }
      });

      const res = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${pharmacyToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('deve retornar 400 se status não for fornecido em updateStatus e 404 se pedido não existir', async () => {
      const noStatusRes = await request(app)
        .patch('/api/orders/order-123/status')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({});
      expect(noStatusRes.status).toBe(400);

      const notFoundRes = await request(app)
        .patch('/api/orders/non-existent-order/status')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ status: OrderStatus.DELIVERY });
      expect(notFoundRes.status).toBe(404);
    });
  });

  describe('Quote Controller Additional Coverage', () => {
    it('deve listar cotações da farmácia autenticada', async () => {
      const res = await request(app)
        .get('/api/quotes/my')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('deve retornar 409 se a farmácia tentar cotar duas vezes a mesma receita', async () => {
      const presc = await prisma.prescription.create({
        data: { patientId, fileUrl: 'local://double-quote.pdf', status: PrescriptionStatus.PENDING }
      });
      await prisma.quote.create({
        data: { prescriptionId: presc.id, pharmacyId, priceCents: 4500 }
      });

      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({
          prescriptionId: presc.id,
          price: 45.00
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('QUOTE_ALREADY_EXISTS');
    });
  });

  describe('Review Controller Additional Coverage', () => {
    it('deve rejeitar segunda avaliação para o mesmo pedido com 409 Conflict', async () => {
      const presc = await prisma.prescription.create({
        data: { patientId, fileUrl: 'local://rev.pdf', status: PrescriptionStatus.ACCEPTED }
      });
      const quote = await prisma.quote.create({
        data: { prescriptionId: presc.id, pharmacyId, priceCents: 2000, status: QuoteStatus.ACCEPTED }
      });
      const order = await prisma.order.create({
        data: { quoteId: quote.id, status: OrderStatus.DELIVERED }
      });
      await prisma.review.create({
        data: {
          orderId: order.id,
          patientId,
          pharmacyId,
          rating: 5,
          comment: 'Excelente!'
        }
      });

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          orderId: order.id,
          rating: 4,
          comment: 'Outra nota'
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REVIEW_ALREADY_EXISTS');
    });
  });

  describe('Auth Controller Additional Coverage', () => {
    it('deve validar token e senha forte em resetPassword', async () => {
      // Faltando token ou senha
      const res1 = await request(app).post('/api/auth/reset-password').send({});
      expect(res1.status).toBe(400);

      // Senha fraca
      const res2 = await request(app).post('/api/auth/reset-password').send({
        token: 'token123',
        newPassword: 'senhasemnumerosemespeciais'
      });
      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('deve validar token obrigatório em verifyEmail', async () => {
      const res = await request(app).post('/api/auth/verify-email').send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('deve verificar e-mail de farmácia com sucesso', async () => {
      const rawToken = 'pharm-verify-token-12345';
      const tokenHash = hashToken(rawToken);

      await prisma.emailVerificationToken.create({
        data: {
          email: 'cov.farmacia@test.com',
          tokenHash,
          expiresAt: new Date(Date.now() + 3600000)
        }
      });

      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: rawToken });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('verificado com sucesso');

      const updatedPharm = await prisma.pharmacy.findUnique({ where: { id: pharmacyId } });
      expect(updatedPharm?.emailVerified).toBe(true);
    });
  });

  describe('Comprehensive Edge Cases for Threshold >= 80%', () => {
    it('AdminController: deve retornar 400 se approved não for fornecido', async () => {
      const res = await request(app)
        .patch(`/api/admin/pharmacies/${pharmacyId}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('PharmacyController: deve retornar métricas da farmácia ou 403 para não-farmácia', async () => {
      // Não-farmácia (paciente)
      const nonPharmRes = await request(app)
        .get('/api/pharmacies/stats')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(nonPharmRes.status).toBe(403);

      // Farmácia
      const pharmRes = await request(app)
        .get('/api/pharmacies/stats')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(pharmRes.status).toBe(200);
      expect(pharmRes.body.verificationStatus).toBeDefined();
      expect(pharmRes.body.totalQuotes).toBeDefined();
    });

    it('NotificationController: farmácia lista e marca todas como lidas, e valida posse', async () => {
      // Farmácia recebe notificação
      const notif = await prisma.notification.create({
        data: {
          pharmacyId,
          type: 'SYSTEM',
          title: 'Aviso Farmacia',
          message: 'Mensagem farmacia'
        }
      });

      // Farmácia lista
      const listRes = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBeGreaterThanOrEqual(1);

      // Paciente tenta marcar notificação da farmácia como lida: 403
      const idorRes = await request(app)
        .patch(`/api/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(idorRes.status).toBe(403);

      // Notificação inexistente: 404
      const notFoundRes = await request(app)
        .patch('/api/notifications/non-existent-notif/read')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(notFoundRes.status).toBe(404);

      // Farmácia marca todas como lidas
      const markAllRes = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${pharmacyToken}`);
      expect(markAllRes.status).toBe(200);
    });

    it('ReviewController: validações de paciente, campos obrigatórios e criação válida', async () => {
      // Farmácia tenta criar avaliação: 403
      const pharmRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ orderId: 'any', rating: 5 });
      expect(pharmRes.status).toBe(403);

      // Faltando campos: 400
      const missingRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ rating: 5 });
      expect(missingRes.status).toBe(400);

      // Pedido inexistente: 404
      const notFoundOrderRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ orderId: 'non-existent-order', rating: 5 });
      expect(notFoundOrderRes.status).toBe(404);

      // Pedido entregue pertencente ao paciente: 201
      const presc = await prisma.prescription.create({
        data: { patientId, fileUrl: 'local://rev2.pdf', status: PrescriptionStatus.ACCEPTED }
      });
      const quote = await prisma.quote.create({
        data: { prescriptionId: presc.id, pharmacyId, priceCents: 1500, status: QuoteStatus.ACCEPTED }
      });
      const order = await prisma.order.create({
        data: { quoteId: quote.id, status: OrderStatus.DELIVERED }
      });

      const createRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ orderId: order.id, rating: 5, comment: 'Excelente atendimento!' });
      expect(createRes.status).toBe(201);
      expect(createRes.body.rating).toBe(5);
    });

    it('QuoteController: rejeita cotação de receita finalizada ou inexistente', async () => {
      // Receita inexistente: 404
      const notFoundRes = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ prescriptionId: 'receita-fantasma-12345', price: 99.90 });
      expect(notFoundRes.status).toBe(404);

      // Receita já aceita: 409
      const finalizedPresc = await prisma.prescription.create({
        data: { patientId, fileUrl: 'local://fin.pdf', status: PrescriptionStatus.ACCEPTED }
      });
      const conflictRes = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ prescriptionId: finalizedPresc.id, price: 50.00 });
      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error.code).toBe('PRESCRIPTION_ALREADY_FINALIZED');
    });

    it('OrderController: busca pedido por id existente (Admin) e inexistente (404)', async () => {
      // Pedido inexistente: 404
      const notFoundRes = await request(app)
        .get('/api/orders/pedido-fantasma-999')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(notFoundRes.status).toBe(404);

      // Pedido existente visualizado por Admin
      const presc = await prisma.prescription.create({
        data: { patientId, fileUrl: 'local://adm-view.pdf', status: PrescriptionStatus.ACCEPTED }
      });
      const quote = await prisma.quote.create({
        data: { prescriptionId: presc.id, pharmacyId, priceCents: 3500, status: QuoteStatus.ACCEPTED }
      });
      const order = await prisma.order.create({
        data: { quoteId: quote.id, status: OrderStatus.PRODUCTION }
      });

      const adminOrderRes = await request(app)
        .get(`/api/orders/${order.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminOrderRes.status).toBe(200);
      expect(adminOrderRes.body.id).toBe(order.id);
      expect(adminOrderRes.body.quote.price).toBe('35.00');
    });

    it('PrescriptionController: bloqueia farmácia não verificada e trata arquivo ausente em serveLocalView', async () => {
      const presc = await prisma.prescription.create({
        data: { patientId, fileUrl: 'local://ausente.pdf', status: PrescriptionStatus.PENDING }
      });

      // Farmácia não verificada não pode acessar detalhes de receita (403)
      const unverifiedPharm = await prisma.pharmacy.create({
        data: {
          name: 'Farmacia Nao Verificada 2',
          email: 'nao.verificada2@farmacia.com',
          password: 'Password123!',
          cnpj: '55666777000188',
          verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION
        }
      });
      const unverifiedToken = jwt.sign(
        { id: unverifiedPharm.id, email: unverifiedPharm.email, role: 'PHARMACY' },
        env.JWT_SECRET
      );

      const unverifiedGetRes = await request(app)
        .get(`/api/prescriptions/${presc.id}`)
        .set('Authorization', `Bearer ${unverifiedToken}`);
      expect(unverifiedGetRes.status).toBe(403);
      expect(unverifiedGetRes.body.error.code).toBe('PHARMACY_NOT_VERIFIED');

      // Obter URL assinada para o arquivo ausente
      const signRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/view-url`)
        .set('Authorization', `Bearer ${patientToken}`);
      expect(signRes.status).toBe(200);

      const signedUrl = signRes.body.signedUrl;
      const urlObj = new URL(signedUrl, 'http://localhost:3000');
      const token = urlObj.searchParams.get('token');
      const expires = urlObj.searchParams.get('expires');

      // Arquivo ausente fisicamente retorna 404 FILE_NOT_FOUND
      const absentFileRes = await request(app)
        .get(`/api/prescriptions/${presc.id}/view?token=${token}&expires=${expires}`);
      expect(absentFileRes.status).toBe(404);
      expect(absentFileRes.body.error.code).toBe('FILE_NOT_FOUND');
    });

    it('UserController: lista todos os usuários cadastrados e rejeita CPF/email duplicado', async () => {
      // Cadastra usuário via API para popular cpfLastDigits
      const regRes = await request(app).post('/api/users').send({
        name: 'Usuario Com Cpf',
        email: 'usuario.com.cpf@test.com',
        password: 'Password123!',
        cpf: '52998224725'
      });
      expect(regRes.status).toBe(201);
      expect(regRes.body.cpf).toMatch(/\*\*\*\.\*\*\*\.\*\*\*-/);

      // Listar todos com autenticação de admin
      const listRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      const patientUser = listRes.body.find((u: any) => u.cpf);
      expect(patientUser).toBeDefined();
      expect(patientUser.cpf).toMatch(/\*\*\*\.\*\*\*\.\*\*\*-/);

      // Rejeita email duplicado
      const dupEmailRes = await request(app).post('/api/users').send({
        name: 'Outro Nome',
        email: 'cov.paciente@test.com', // Já existente
        password: 'Password123!',
        cpf: '11144477735' // CPF válido
      });
      expect(dupEmailRes.status).toBe(409);
      expect(dupEmailRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');

      // Rejeita CPF duplicado (criando um com mesmo CPF)
      const user1 = await request(app).post('/api/users').send({
        name: 'Cpf Teste 1',
        email: 'cpf.teste.1@test.com',
        password: 'Password123!',
        cpf: '11144477735'
      });
      expect(user1.status).toBe(201);

      const user2 = await request(app).post('/api/users').send({
        name: 'Cpf Teste 2',
        email: 'cpf.teste.2@test.com',
        password: 'Password123!',
        cpf: '11144477735'
      });
      expect(user2.status).toBe(409);
      expect(user2.body.error.code).toBe('CPF_ALREADY_EXISTS');
    });

    it('ReviewController: rejeita avaliação para pedido que ainda não foi entregue', async () => {
      const prescProd = await prisma.prescription.create({
        data: { patientId, fileUrl: 'local://prod.pdf', status: PrescriptionStatus.ACCEPTED }
      });
      const quoteProd = await prisma.quote.create({
        data: { prescriptionId: prescProd.id, pharmacyId, priceCents: 1000, status: QuoteStatus.ACCEPTED }
      });
      const orderProd = await prisma.order.create({
        data: { quoteId: quoteProd.id, status: OrderStatus.PRODUCTION }
      });

      const invalidStateRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ orderId: orderProd.id, rating: 5 });
      expect(invalidStateRes.status).toBe(409);
      expect(invalidStateRes.body.error.code).toBe('ORDER_NOT_DELIVERED');
    });

    it('PrescriptionController: view-url para id inexistente retorna 404', async () => {
      const res = await request(app)
        .get('/api/prescriptions/presc-inexistente-1234/view-url')
        .set('Authorization', `Bearer ${patientToken}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('AdminController: bloqueia usuário não-admin de verificar farmácia', async () => {
      const res = await request(app)
        .patch(`/api/admin/pharmacies/${pharmacyId}/verify`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ approved: true });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('ReviewController: rejeita nota inválida (e.g. 0 ou 6)', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ orderId: 'any-order', rating: 0 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Controllers: testa branches de guarda de autenticação direta quando req.user não existe', async () => {
      const { PrescriptionController } = require('../src/controllers/prescription.controller');
      const { OrderController } = require('../src/controllers/order.controller');
      const { ReviewController } = require('../src/controllers/review.controller');
      const { NotificationController } = require('../src/controllers/notification.controller');

      const prescCtrl = new PrescriptionController();
      const orderCtrl = new OrderController();
      const reviewCtrl = new ReviewController();
      const notifCtrl = new NotificationController();

      const createMockRes = () => {
        const res: any = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        return res;
      };

      const res1 = createMockRes();
      await prescCtrl.getMyPrescriptions({} as any, res1);
      expect(res1.status).toHaveBeenCalledWith(401);

      const res2 = createMockRes();
      await prescCtrl.getAvailableForPharmacy({} as any, res2);
      expect(res2.status).toHaveBeenCalledWith(401);

      const res3 = createMockRes();
      await prescCtrl.getQuotes({} as any, res3);
      expect(res3.status).toHaveBeenCalledWith(401);

      const res4 = createMockRes();
      await prescCtrl.getSignedViewUrl({} as any, res4);
      expect(res4.status).toHaveBeenCalledWith(401);

      const res5 = createMockRes();
      await orderCtrl.create({} as any, res5);
      expect(res5.status).toHaveBeenCalledWith(401);

      const res6 = createMockRes();
      await orderCtrl.updateStatus({} as any, res6);
      expect(res6.status).toHaveBeenCalledWith(401);

      const res7 = createMockRes();
      await orderCtrl.getMyOrders({} as any, res7);
      expect(res7.status).toHaveBeenCalledWith(401);

      const res8 = createMockRes();
      await orderCtrl.getById({} as any, res8);
      expect(res8.status).toHaveBeenCalledWith(401);

      const res9 = createMockRes();
      await reviewCtrl.create({} as any, res9);
      expect(res9.status).toHaveBeenCalledWith(401);

      const res10 = createMockRes();
      await notifCtrl.getMyNotifications({} as any, res10);
      expect(res10.status).toHaveBeenCalledWith(401);

      const res11 = createMockRes();
      await notifCtrl.markAsRead({} as any, res11);
      expect(res11.status).toHaveBeenCalledWith(401);

      const res12 = createMockRes();
      await notifCtrl.markAllAsRead({} as any, res12);
      expect(res12.status).toHaveBeenCalledWith(401);
    });
  });
});





