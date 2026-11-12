import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { DEFAULT_PASSWORD, createPharmacy, createUser, refreshCookieFrom, tokenFor } from './helpers/phase6Fixtures';
import { encryptField, isEncrypted } from '../src/lib/fieldEncryption';
import { generateRefreshTokenData } from '../src/lib/authTokens';
import { OrderStatus, PrescriptionStatus, QuoteStatus, Role } from '@prisma/client';

/**
 * FASE 6 — Contas: suspensão/reativação ponta a ponta, troca de senha, perfil próprio e aceite de termos.
 */
describe('FASE 6 — Gestão de contas (suspensão, senha, perfil e termos)', () => {
  const admin = { id: 'p6-acc-admin', email: 'p6.acc.admin@test.com' };
  const otherAdmin = { id: 'p6-acc-admin-2', email: 'p6.acc.admin2@test.com' };
  const paula = { id: 'p6-acc-paula', email: 'p6.acc.paula@test.com' };
  const carlos = { id: 'p6-acc-carlos', email: 'p6.acc.carlos@test.com' };
  const pharmacy = { id: 'p6-acc-pharmacy', email: 'p6.acc.pharmacy@test.com', cnpj: '11444777000161' };

  const adminToken = tokenFor(admin.id, admin.email, Role.ADMIN);
  const paulaToken = tokenFor(paula.id, paula.email, Role.PATIENT);
  const carlosToken = tokenFor(carlos.id, carlos.email, Role.PATIENT);
  const pharmacyToken = tokenFor(pharmacy.id, pharmacy.email, Role.PHARMACY);

  beforeAll(async () => {
    await cleanDatabase(prisma);
    await createUser(prisma, { ...admin, role: Role.ADMIN, name: 'Admin Contas' });
    await createUser(prisma, { ...otherAdmin, role: Role.ADMIN, name: 'Outro Admin' });
    await createUser(prisma, {
      ...paula,
      name: 'Paula Paciente',
      phone: encryptField('11911112222'),
      address: encryptField('Rua das Acácias, 10 - São Paulo, SP'),
      cpfLastDigits: '35'
    });
    await createUser(prisma, { ...carlos, name: 'Carlos Senha' });
    await createPharmacy(prisma, { ...pharmacy, name: 'Farmácia Contas' });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  describe('Suspensão de paciente ponta a ponta', () => {
    let paulaCookie: string;

    it('login bem-sucedido atualiza lastLoginAt', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: paula.email, password: DEFAULT_PASSWORD });
      expect(res.status).toBe(200);
      paulaCookie = refreshCookieFrom(res);

      const db = await prisma.user.findUnique({ where: { id: paula.id } });
      expect(db?.lastLoginAt).toBeInstanceOf(Date);
    });

    it('suspender exige motivo de 5 a 500 caracteres', async () => {
      const noReason = await request(app)
        .patch(`/api/admin/users/${paula.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });
      expect(noReason.status).toBe(400);
      expect(noReason.body.error.code).toBe('VALIDATION_ERROR');

      const shortReason = await request(app)
        .patch(`/api/admin/users/${paula.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED', reason: 'abc' });
      expect(shortReason.status).toBe(400);
    });

    it('admin suspende: item atualizado, refresh tokens revogados e AuditLog gravado', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${paula.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED', reason: 'Uso indevido da plataforma' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: paula.id, status: 'SUSPENDED', cpf: '***.***.***-35' });
      expect(res.body.suspendedAt).toBeTruthy();
      expect(res.body).not.toHaveProperty('phone');
      expect(res.body).not.toHaveProperty('address');
      expect(res.body).not.toHaveProperty('password');

      const activeTokens = await prisma.refreshToken.count({ where: { userId: paula.id, isRevoked: false } });
      expect(activeTokens).toBe(0);

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'ADMIN_SUSPEND_USER', resourceId: paula.id },
        orderBy: { createdAt: 'desc' }
      });
      expect(audit).toMatchObject({ actorId: admin.id, actorType: 'ADMIN', resource: 'User', reason: 'Uso indevido da plataforma' });
    });

    it('refresh de conta suspensa → 401 ACCOUNT_SUSPENDED', async () => {
      const res = await request(app).post('/api/auth/refresh').set('Cookie', [paulaCookie]);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('login de conta suspensa → 403 ACCOUNT_SUSPENDED (somente com a senha correta)', async () => {
      const ok = await request(app).post('/api/auth/login').send({ email: paula.email, password: DEFAULT_PASSWORD });
      expect(ok.status).toBe(403);
      expect(ok.body.error.code).toBe('ACCOUNT_SUSPENDED');

      const wrong = await request(app).post('/api/auth/login').send({ email: paula.email, password: 'SenhaErrada@1' });
      expect(wrong.status).toBe(401);
      expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('detalhe do admin mostra o motivo da suspensão', async () => {
      const res = await request(app).get(`/api/admin/users/${paula.id}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.suspensionReason).toBe('Uso indevido da plataforma');
    });

    it('reativar limpa suspendedAt/motivo, grava AuditLog e permite login novamente', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${paula.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.suspendedAt).toBeNull();

      const db = await prisma.user.findUnique({ where: { id: paula.id } });
      expect(db?.suspensionReason).toBeNull();

      const audit = await prisma.auditLog.count({ where: { action: 'ADMIN_REACTIVATE_USER', resourceId: paula.id } });
      expect(audit).toBeGreaterThanOrEqual(1);

      const login = await request(app).post('/api/auth/login').send({ email: paula.email, password: DEFAULT_PASSWORD });
      expect(login.status).toBe(200);
    });
  });

  describe('Regras de proteção da suspensão', () => {
    it('admin não pode suspender a si mesmo (400 CANNOT_SUSPEND_SELF)', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${admin.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED', reason: 'Teste de auto suspensão' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_SUSPEND_SELF');
    });

    it('admin não pode suspender outro admin (403)', async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${otherAdmin.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED', reason: 'Tentativa de suspender admin' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CANNOT_SUSPEND_ADMIN');

      const db = await prisma.user.findUnique({ where: { id: otherAdmin.id } });
      expect(db?.status).toBe('ACTIVE');
    });

    it('usuário inexistente → 404 NOT_FOUND', async () => {
      const res = await request(app)
        .patch('/api/admin/users/nao-existe/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('o banco recusa status SUSPENDED sem suspendedAt (CHECK de consistência)', async () => {
      await expect(
        prisma.user.update({ where: { id: carlos.id }, data: { status: 'SUSPENDED' } })
      ).rejects.toThrow();
    });
  });

  describe('Suspensão de farmácia ponta a ponta', () => {
    let pharmacyCookie: string;

    it('farmácia ativa faz login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: pharmacy.email, password: DEFAULT_PASSWORD, type: 'pharmacy' });
      expect(res.status).toBe(200);
      pharmacyCookie = refreshCookieFrom(res);
      const db = await prisma.pharmacy.findUnique({ where: { id: pharmacy.id } });
      expect(db?.lastLoginAt).toBeInstanceOf(Date);
    });

    it('suspensão exige motivo', async () => {
      const res = await request(app)
        .patch(`/api/admin/pharmacies/${pharmacy.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(400);
    });

    it('admin suspende a farmácia: tokens revogados, notificação e AuditLog', async () => {
      const res = await request(app)
        .patch(`/api/admin/pharmacies/${pharmacy.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED', reason: 'Licença sanitária vencida' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: pharmacy.id, status: 'SUSPENDED', counts: { quotes: 0, orders: 0 } });
      expect(res.body.suspendedAt).toBeTruthy();

      expect(await prisma.refreshToken.count({ where: { pharmacyId: pharmacy.id, isRevoked: false } })).toBe(0);

      const notification = await prisma.notification.findFirst({
        where: { pharmacyId: pharmacy.id, type: 'ACCOUNT_STATUS_UPDATE' }
      });
      expect(notification?.message).toContain('Licença sanitária vencida');

      expect(
        await prisma.auditLog.count({ where: { action: 'ADMIN_SUSPEND_PHARMACY', resourceId: pharmacy.id } })
      ).toBeGreaterThanOrEqual(1);
    });

    it('farmácia suspensa não faz login (403) nem renova sessão (401)', async () => {
      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: pharmacy.email, password: DEFAULT_PASSWORD, type: 'pharmacy' });
      expect(login.status).toBe(403);
      expect(login.body.error.code).toBe('ACCOUNT_SUSPENDED');

      const refresh = await request(app).post('/api/auth/refresh').set('Cookie', [pharmacyCookie]);
      expect(refresh.status).toBe(401);
      expect(refresh.body.error.code).toBe('ACCOUNT_SUSPENDED');
    });

    it('reativação notifica e libera o login', async () => {
      const res = await request(app)
        .patch(`/api/admin/pharmacies/${pharmacy.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE', reason: 'Licença renovada' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.suspendedAt).toBeNull();

      const notifications = await prisma.notification.count({
        where: { pharmacyId: pharmacy.id, type: 'ACCOUNT_STATUS_UPDATE' }
      });
      expect(notifications).toBe(2);

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: pharmacy.email, password: DEFAULT_PASSWORD, type: 'pharmacy' });
      expect(login.status).toBe(200);
    });

    it('farmácia inexistente → 404', async () => {
      const res = await request(app)
        .patch('/api/admin/pharmacies/nao-existe/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('senha atual errada → 400 INVALID_CURRENT_PASSWORD', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${carlosToken}`)
        .send({ currentPassword: 'Errada@123', newPassword: 'NovaSenha@456' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });

    it('senha nova fraca → 400 WEAK_PASSWORD', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${carlosToken}`)
        .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'fraca' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('sucesso → 204, preserva a sessão atual, revoga as demais e audita', async () => {
      const current = generateRefreshTokenData();
      const other = generateRefreshTokenData();
      await prisma.refreshToken.createMany({
        data: [
          { userId: carlos.id, tokenHash: current.tokenHash, familyId: current.familyId, expiresAt: current.expiresAt },
          { userId: carlos.id, tokenHash: other.tokenHash, familyId: other.familyId, expiresAt: other.expiresAt }
        ]
      });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${carlosToken}`)
        .set('Cookie', [`refreshToken=${current.rawToken}`])
        .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'NovaSenha@456' });

      expect(res.status).toBe(204);

      const tokens = await prisma.refreshToken.findMany({ where: { userId: carlos.id } });
      expect(tokens.find((t) => t.familyId === current.familyId)?.isRevoked).toBe(false);
      expect(tokens.find((t) => t.familyId === other.familyId)?.isRevoked).toBe(true);

      const db = await prisma.user.findUnique({ where: { id: carlos.id } });
      expect(await bcrypt.compare('NovaSenha@456', db!.password)).toBe(true);

      const audit = await prisma.auditLog.findFirst({ where: { action: 'PASSWORD_CHANGED', resourceId: carlos.id } });
      expect(audit).toMatchObject({ actorType: 'PATIENT', resource: 'User' });
      expect(audit?.details).not.toContain('NovaSenha');

      const login = await request(app).post('/api/auth/login').send({ email: carlos.email, password: 'NovaSenha@456' });
      expect(login.status).toBe(200);
    });

    it('farmácia troca a senha sem cookie → todas as sessões revogadas', async () => {
      const session = generateRefreshTokenData();
      await prisma.refreshToken.create({
        data: { pharmacyId: pharmacy.id, tokenHash: session.tokenHash, familyId: session.familyId, expiresAt: session.expiresAt }
      });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'FarmaNova@789' });
      expect(res.status).toBe(204);

      expect(await prisma.refreshToken.count({ where: { pharmacyId: pharmacy.id, isRevoked: false } })).toBe(0);
      const audit = await prisma.auditLog.findFirst({ where: { action: 'PASSWORD_CHANGED', resourceId: pharmacy.id } });
      expect(audit?.resource).toBe('Pharmacy');
    });

    it('conta inexistente → 404', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${tokenFor('fantasma', 'fantasma@test.com', Role.PATIENT)}`)
        .send({ currentPassword: DEFAULT_PASSWORD, newPassword: 'NovaSenha@456' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET/PATCH /api/users/me', () => {
    beforeAll(async () => {
      // Receita → cotação → pedido entregue → avaliação, para os contadores
      const prescription = await prisma.prescription.create({
        data: { patientId: paula.id, fileUrl: 'uploads/p6-acc.jpg', status: PrescriptionStatus.ACCEPTED }
      });
      const quote = await prisma.quote.create({
        data: { prescriptionId: prescription.id, pharmacyId: pharmacy.id, priceCents: 9900, status: QuoteStatus.ACCEPTED }
      });
      const order = await prisma.order.create({ data: { quoteId: quote.id, status: OrderStatus.DELIVERED } });
      await prisma.review.create({ data: { orderId: order.id, patientId: paula.id, pharmacyId: pharmacy.id, rating: 5 } });
    });

    it('retorna o perfil com contato decifrado, CPF mascarado e contadores', async () => {
      const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${paulaToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: paula.id,
        name: 'Paula Paciente',
        email: paula.email,
        role: 'PATIENT',
        phone: '11911112222',
        address: 'Rua das Acácias, 10 - São Paulo, SP',
        cpf: '***.***.***-35',
        status: 'ACTIVE',
        emailVerified: false,
        counts: { prescriptions: 1, orders: 1, reviews: 1 }
      });
      expect(res.body.lastLoginAt).toBeTruthy();
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('cpfEncrypted');
      expect(res.body).not.toHaveProperty('cpfHash');
    });

    it('atualiza nome/telefone/endereço e cifra em repouso', async () => {
      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${paulaToken}`)
        .send({ name: 'Paula Atualizada', phone: '11933334444', address: 'Av. Nova, 200', email: 'hacker@test.com' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Paula Atualizada', phone: '11933334444', address: 'Av. Nova, 200', email: paula.email });

      const db = await prisma.user.findUnique({ where: { id: paula.id } });
      expect(isEncrypted(db?.phone)).toBe(true);
      expect(isEncrypted(db?.address)).toBe(true);
      expect(db?.email).toBe(paula.email);
    });

    it('string vazia limpa telefone; validação de nome curto', async () => {
      const cleared = await request(app).patch('/api/users/me').set('Authorization', `Bearer ${paulaToken}`).send({ phone: '' });
      expect(cleared.status).toBe(200);
      expect(cleared.body.phone).toBeNull();

      const invalid = await request(app).patch('/api/users/me').set('Authorization', `Bearer ${paulaToken}`).send({ name: 'A' });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('token de conta inexistente → 404 no GET e no PATCH', async () => {
      const ghost = tokenFor('fantasma-2', 'fantasma2@test.com', Role.PATIENT);
      expect((await request(app).get('/api/users/me').set('Authorization', `Bearer ${ghost}`)).status).toBe(404);
      expect(
        (await request(app).patch('/api/users/me').set('Authorization', `Bearer ${ghost}`).send({ name: 'Fantasma' })).status
      ).toBe(404);
    });
  });

  describe('Aceite de termos no cadastro', () => {
    it('paciente: registra TERMS_AND_PRIVACY além de HEALTH_DATA_PROCESSING', async () => {
      const res = await request(app).post('/api/users').send({
        name: 'Termos Paciente',
        email: 'p6.terms.patient@test.com',
        password: 'SenhaForte@123',
        cpf: '52998224725'
      });
      expect(res.status).toBe(201);

      const consents = await prisma.consent.findMany({ where: { userId: res.body.id } });
      expect(consents.map((c) => c.consentType).sort()).toEqual(['HEALTH_DATA_PROCESSING', 'TERMS_AND_PRIVACY']);
      expect(consents.find((c) => c.consentType === 'TERMS_AND_PRIVACY')?.textVersion).toBe('v1.0.0');
    });

    it('paciente com termsAccepted=false não registra TERMS_AND_PRIVACY', async () => {
      const res = await request(app).post('/api/users').send({
        name: 'Sem Termos',
        email: 'p6.noterms.patient@test.com',
        password: 'SenhaForte@123',
        cpf: '39053344705',
        termsAccepted: false
      });
      expect(res.status).toBe(201);
      const types = (await prisma.consent.findMany({ where: { userId: res.body.id } })).map((c) => c.consentType);
      expect(types).toEqual(['HEALTH_DATA_PROCESSING']);
    });

    it('farmácia: termsAccepted grava termsAcceptedAt/termsVersion; cidade e UF normalizada', async () => {
      const res = await request(app).post('/api/pharmacies').send({
        name: 'Farmácia Termos',
        email: 'p6.terms.pharmacy@test.com',
        password: 'SenhaForte@123',
        cnpj: '12345678000195',
        city: 'Campinas',
        state: 'sp',
        termsAccepted: true
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ city: 'Campinas', state: 'SP', termsVersion: 'v1.0.0', status: 'ACTIVE' });
      expect(res.body.termsAcceptedAt).toBeTruthy();
      expect(res.body).not.toHaveProperty('password');
    });

    it('farmácia sem aceite fica com termsAcceptedAt nulo; UF inválida → 400', async () => {
      const res = await request(app).post('/api/pharmacies').send({
        name: 'Farmácia Sem Termos',
        email: 'p6.noterms.pharmacy@test.com',
        password: 'SenhaForte@123',
        cnpj: '45723174000110'
      });
      expect(res.status).toBe(201);
      expect(res.body.termsAcceptedAt).toBeNull();
      expect(res.body.termsVersion).toBeNull();

      const invalid = await request(app).post('/api/pharmacies').send({
        name: 'Farmácia UF',
        email: 'p6.uf.pharmacy@test.com',
        password: 'SenhaForte@123',
        cnpj: '04252011000110',
        state: 'São Paulo'
      });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
