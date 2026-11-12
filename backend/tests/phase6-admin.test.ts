import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { createPharmacy, createUser, tokenFor } from './helpers/phase6Fixtures';
import { encryptField } from '../src/lib/fieldEncryption';
import {
  OrderStatus,
  PharmacyVerificationStatus,
  PrescriptionStatus,
  QuoteStatus,
  Role,
  SupportTicketStatus
} from '@prisma/client';

/**
 * FASE 6 — Painel administrativo: visão geral, usuários, farmácias, pedidos e receitas.
 */
describe('FASE 6 — Gestão administrativa (overview, usuários, farmácias, pedidos, receitas)', () => {
  const admin = { id: 'p6-adm-admin', email: 'p6.adm.admin@test.com' };
  const p1 = { id: 'p6-adm-p1', email: 'p6.adm.p1@test.com' };
  const p2 = { id: 'p6-adm-p2', email: 'p6.adm.p2@test.com' };
  const p3 = { id: 'p6-adm-p3', email: 'p6.adm.p3@test.com' };
  const pa = { id: 'p6-adm-pa', email: 'p6.adm.pa@test.com', cnpj: '11222333000181' };
  const pb = { id: 'p6-adm-pb', email: 'p6.adm.pb@test.com', cnpj: '70000000000201' };
  const pc = { id: 'p6-adm-pc', email: 'p6.adm.pc@test.com', cnpj: '70000000000202' };
  const pd = { id: 'p6-adm-pd', email: 'p6.adm.pd@test.com', cnpj: '70000000000203' };

  const adminToken = tokenFor(admin.id, admin.email, Role.ADMIN);
  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${adminToken}`);

  let deliveredOrderId: string;
  let productionOrderId: string;
  let rx2Id: string;

  beforeAll(async () => {
    await cleanDatabase(prisma);

    await createUser(prisma, { ...admin, role: Role.ADMIN, name: 'Admin Painel' });
    await createUser(prisma, {
      ...p1,
      name: 'Joana Paciente',
      phone: encryptField('11955556666'),
      address: encryptField('Rua do Paciente, 42'),
      cpfLastDigits: '09'
    });
    await createUser(prisma, {
      ...p2,
      name: 'Antigo Paciente',
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)
    });
    await createUser(prisma, {
      ...p3,
      name: 'Suspenso Paciente',
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspensionReason: 'Fraude'
    });

    await prisma.consent.createMany({
      data: [
        { userId: p1.id, consentType: 'HEALTH_DATA_PROCESSING', textVersion: 'v1.0.0', ipAddress: '10.0.0.1' },
        { userId: p1.id, consentType: 'TERMS_AND_PRIVACY', textVersion: 'v1.0.0', revokedAt: new Date() }
      ]
    });

    await createPharmacy(prisma, {
      ...pa,
      name: 'Alfa Manipulação',
      city: 'São Paulo',
      state: 'SP',
      documentUrl: 'https://docs.example/alfa.pdf',
      cnpjData: JSON.stringify({ situacao: 'ATIVA', razaoSocial: 'Alfa LTDA' })
    });
    await createPharmacy(prisma, {
      ...pb,
      name: 'Beta Pendente',
      verified: false,
      verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION,
      cnpjData: 'json-quebrado'
    });
    await createPharmacy(prisma, {
      ...pc,
      name: 'Gama Reprovada',
      verified: false,
      verificationStatus: PharmacyVerificationStatus.REJECTED
    });
    await createPharmacy(prisma, {
      ...pd,
      name: 'Delta Suspensa',
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspensionReason: 'Teste'
    });

    const rx = async (status: PrescriptionStatus) =>
      prisma.prescription.create({ data: { patientId: p1.id, fileUrl: `uploads/segredo-${status}.jpg`, status } });

    await rx(PrescriptionStatus.PENDING);
    const rx2 = await rx(PrescriptionStatus.QUOTED);
    const rx3 = await rx(PrescriptionStatus.ACCEPTED);
    await rx(PrescriptionStatus.CANCELLED);
    const rx5 = await rx(PrescriptionStatus.ACCEPTED);
    rx2Id = rx2.id;

    await prisma.quote.create({ data: { prescriptionId: rx2.id, pharmacyId: pa.id, priceCents: 7000, status: QuoteStatus.PENDING } });
    await prisma.quote.create({ data: { prescriptionId: rx2.id, pharmacyId: pc.id, priceCents: 7100, status: QuoteStatus.EXPIRED } });
    const q3 = await prisma.quote.create({
      data: { prescriptionId: rx3.id, pharmacyId: pa.id, priceCents: 12550, deliveryDays: 2, status: QuoteStatus.ACCEPTED }
    });
    const q5 = await prisma.quote.create({
      data: { prescriptionId: rx5.id, pharmacyId: pa.id, priceCents: 8000, deliveryDays: 3, status: QuoteStatus.ACCEPTED }
    });
    await prisma.quote.create({ data: { prescriptionId: rx5.id, pharmacyId: pb.id, priceCents: 9000, status: QuoteStatus.REJECTED } });

    const delivered = await prisma.order.create({ data: { quoteId: q3.id, status: OrderStatus.DELIVERED } });
    const production = await prisma.order.create({ data: { quoteId: q5.id, status: OrderStatus.PRODUCTION } });
    deliveredOrderId = delivered.id;
    productionOrderId = production.id;

    const base = Date.now();
    await prisma.orderStatusHistory.createMany({
      data: [
        { orderId: delivered.id, fromStatus: 'PRODUCTION', toStatus: 'PRODUCTION', changedByType: 'PATIENT', changedById: p1.id, createdAt: new Date(base - 3000) },
        { orderId: delivered.id, fromStatus: 'PRODUCTION', toStatus: 'DELIVERY', changedByType: 'PHARMACY', changedById: pa.id, createdAt: new Date(base - 2000) },
        { orderId: delivered.id, fromStatus: 'DELIVERY', toStatus: 'DELIVERED', changedByType: 'PHARMACY', changedById: pa.id, createdAt: new Date(base - 1000) }
      ]
    });
    await prisma.review.create({
      data: { orderId: delivered.id, patientId: p1.id, pharmacyId: pa.id, rating: 4, comment: 'Entrega rápida' }
    });

    await prisma.supportTicket.createMany({
      data: [
        { protocol: 'MC-20261112-AAAA1', name: 'A', email: 'a@test.com', subject: 'Assunto A', message: 'Mensagem longa A' },
        { protocol: 'MC-20261112-AAAA2', name: 'B', email: 'b@test.com', subject: 'Assunto B', message: 'Mensagem longa B' },
        { protocol: 'MC-20261112-AAAA3', name: 'C', email: 'c@test.com', subject: 'Assunto C', message: 'Mensagem longa C', status: SupportTicketStatus.IN_PROGRESS },
        { protocol: 'MC-20261112-AAAA4', name: 'D', email: 'd@test.com', subject: 'Assunto D', message: 'Mensagem longa D', status: SupportTicketStatus.RESOLVED, resolvedAt: new Date() }
      ]
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  describe('GET /api/admin/overview', () => {
    it('agrega contagens de todas as áreas', async () => {
      const res = await auth(request(app).get('/api/admin/overview'));
      expect(res.status).toBe(200);
      expect(res.body.users).toEqual({ patients: 3, admins: 1, suspended: 1, newLast30d: 2 });
      expect(res.body.pharmacies).toEqual({ total: 4, verified: 2, pending: 1, rejected: 1, suspended: 1 });
      expect(res.body.prescriptions).toEqual({ total: 5, pending: 1, quoted: 1, accepted: 2, cancelled: 1 });
      expect(res.body.quotes).toEqual({ total: 5, pending: 1, accepted: 2, rejected: 1, expired: 1 });
      expect(res.body.orders).toEqual({
        total: 2,
        production: 1,
        delivery: 0,
        delivered: 1,
        cancelled: 0,
        gmvDeliveredCents: 12550
      });
      expect(res.body.support).toEqual({ open: 2, inProgress: 1 });
      expect(res.body.consents).toEqual({ active: 1, revoked: 1 });
    });

    it('série dos últimos 14 dias, em ordem, inclusive dias zerados', async () => {
      const res = await auth(request(app).get('/api/admin/overview'));
      const series = res.body.series as Array<{ date: string; prescriptions: number; orders: number }>;
      expect(series).toHaveLength(14);
      for (const point of series) {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      const dates = series.map((p) => p.date);
      expect([...dates].sort()).toEqual(dates);
      expect(new Set(dates).size).toBe(14);
      expect(series.reduce((sum, p) => sum + p.prescriptions, 0)).toBe(5);
      expect(series.reduce((sum, p) => sum + p.orders, 0)).toBe(2);
      expect(series.filter((p) => p.prescriptions === 0 && p.orders === 0).length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('Usuários', () => {
    it('lista paginada sem telefone/endereço, com CPF mascarado e contadores', async () => {
      const res = await auth(request(app).get('/api/admin/users'));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 4, page: 1, limit: 20, totalPages: 1 });
      expect(res.body.data).toHaveLength(4);

      const joana = res.body.data.find((u: any) => u.id === p1.id);
      expect(joana).toMatchObject({
        name: 'Joana Paciente',
        role: 'PATIENT',
        status: 'ACTIVE',
        isAnonymized: false,
        cpf: '***.***.***-09',
        counts: { prescriptions: 5, reviews: 1 }
      });
      for (const item of res.body.data) {
        expect(item).not.toHaveProperty('phone');
        expect(item).not.toHaveProperty('address');
        expect(item).not.toHaveProperty('password');
        expect(item).not.toHaveProperty('cpfLastDigits');
      }
      expect(JSON.stringify(res.body)).not.toContain('Rua do Paciente');
    });

    it('filtros por papel, status e busca; paginação', async () => {
      const admins = await auth(request(app).get('/api/admin/users?role=ADMIN'));
      expect(admins.body.data.map((u: any) => u.id)).toEqual([admin.id]);

      const suspendedRes = await auth(request(app).get('/api/admin/users?status=SUSPENDED'));
      expect(suspendedRes.body.data.map((u: any) => u.id)).toEqual([p3.id]);
      expect(suspendedRes.body.data[0].suspendedAt).toBeTruthy();

      const search = await auth(request(app).get('/api/admin/users').query({ search: 'JOANA' }));
      expect(search.body.data.map((u: any) => u.id)).toEqual([p1.id]);

      const byEmail = await auth(request(app).get('/api/admin/users').query({ search: 'p6.adm.p2' }));
      expect(byEmail.body.total).toBe(1);

      const page2 = await auth(request(app).get('/api/admin/users?limit=3&page=2'));
      expect(page2.body).toMatchObject({ total: 4, page: 2, limit: 3, totalPages: 2 });
      expect(page2.body.data).toHaveLength(1);
    });

    it('parâmetros inválidos → 400', async () => {
      expect((await auth(request(app).get('/api/admin/users?limit=101'))).status).toBe(400);
      expect((await auth(request(app).get('/api/admin/users?role=PHARMACY'))).status).toBe(400);
      expect((await auth(request(app).get('/api/admin/users?page=0'))).status).toBe(400);
    });

    it('detalhe decifra contato, lista consentimentos e grava AuditLog ADMIN_VIEW_USER', async () => {
      const res = await auth(request(app).get(`/api/admin/users/${p1.id}`));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: p1.id,
        phone: '11955556666',
        address: 'Rua do Paciente, 42',
        suspensionReason: null,
        cpf: '***.***.***-09'
      });
      expect(res.body.consents).toHaveLength(2);
      for (const consent of res.body.consents) {
        expect(Object.keys(consent).sort()).toEqual(['consentType', 'consentedAt', 'revokedAt', 'textVersion']);
      }
      expect(res.body).not.toHaveProperty('password');

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'ADMIN_VIEW_USER', resourceId: p1.id },
        orderBy: { createdAt: 'desc' }
      });
      expect(audit).toMatchObject({ actorId: admin.id, actorType: 'ADMIN', resource: 'User' });
    });

    it('usuário inexistente → 404 NOT_FOUND', async () => {
      const res = await auth(request(app).get('/api/admin/users/nao-existe'));
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Farmácias', () => {
    it('lista com média de avaliações e contadores de cotações/pedidos', async () => {
      const res = await auth(request(app).get('/api/admin/pharmacies'));
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(4);

      const alfa = res.body.data.find((p: any) => p.id === pa.id);
      expect(alfa).toMatchObject({
        name: 'Alfa Manipulação',
        email: pa.email,
        cnpj: pa.cnpj,
        city: 'São Paulo',
        state: 'SP',
        verificationStatus: 'VERIFIED',
        verified: true,
        status: 'ACTIVE',
        averageRating: 4,
        reviewsCount: 1,
        counts: { quotes: 3, orders: 2 }
      });
      expect(alfa).not.toHaveProperty('password');
      expect(alfa).not.toHaveProperty('documentUrl');
    });

    it('filtros por verificação, status e busca (nome ou CNPJ formatado)', async () => {
      const pendingRes = await auth(request(app).get('/api/admin/pharmacies?verificationStatus=PENDING_VERIFICATION'));
      expect(pendingRes.body.data.map((p: any) => p.id)).toEqual([pb.id]);

      const suspendedRes = await auth(request(app).get('/api/admin/pharmacies?status=SUSPENDED'));
      expect(suspendedRes.body.data.map((p: any) => p.id)).toEqual([pd.id]);

      const byCnpj = await auth(request(app).get('/api/admin/pharmacies').query({ search: '11.222.333' }));
      expect(byCnpj.body.data.map((p: any) => p.id)).toEqual([pa.id]);

      const byName = await auth(request(app).get('/api/admin/pharmacies').query({ search: 'gama' }));
      expect(byName.body.data.map((p: any) => p.id)).toEqual([pc.id]);
    });

    it('detalhe com documentos, cnpjData parseado, estatísticas e AuditLog', async () => {
      const res = await auth(request(app).get(`/api/admin/pharmacies/${pa.id}`));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: pa.id,
        email: pa.email,
        documentUrl: 'https://docs.example/alfa.pdf',
        cnpjData: { situacao: 'ATIVA', razaoSocial: 'Alfa LTDA' },
        verifiedById: null,
        suspensionReason: null,
        businessHours: [],
        openStatus: { isOpen: false, closesAt: null, nextOpening: null },
        stats: {
          quotes: 3,
          acceptedQuotes: 2,
          orders: 2,
          deliveredOrders: 1,
          gmvDeliveredCents: 12550,
          averageRating: 4,
          reviewsCount: 1
        }
      });
      expect(res.body).toHaveProperty('timezone');
      expect(res.body).not.toHaveProperty('password');

      expect(
        await prisma.auditLog.count({ where: { action: 'ADMIN_VIEW_PHARMACY', resourceId: pa.id, actorId: admin.id } })
      ).toBeGreaterThanOrEqual(1);
    });

    it('cnpjData inválido vira null; farmácia inexistente → 404', async () => {
      const res = await auth(request(app).get(`/api/admin/pharmacies/${pb.id}`));
      expect(res.status).toBe(200);
      expect(res.body.cnpjData).toBeNull();
      expect(res.body.stats).toMatchObject({ quotes: 1, orders: 0, averageRating: 0, reviewsCount: 0 });

      expect((await auth(request(app).get('/api/admin/pharmacies/nao-existe'))).status).toBe(404);
    });
  });

  describe('Pedidos', () => {
    it('lista com preço em centavos e decimal, farmácia e paciente', async () => {
      const res = await auth(request(app).get('/api/admin/orders'));
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);

      const delivered = res.body.data.find((o: any) => o.id === deliveredOrderId);
      expect(delivered).toMatchObject({
        status: 'DELIVERED',
        priceCents: 12550,
        price: '125.50',
        deliveryDays: 2,
        pharmacy: { id: pa.id, name: 'Alfa Manipulação' },
        patient: { id: p1.id, name: 'Joana Paciente' }
      });
      expect(delivered.prescriptionId).toBeTruthy();
    });

    it('filtro por status e busca por paciente, farmácia ou id', async () => {
      const deliveredRes = await auth(request(app).get('/api/admin/orders?status=DELIVERED'));
      expect(deliveredRes.body.data.map((o: any) => o.id)).toEqual([deliveredOrderId]);

      const byPatient = await auth(request(app).get('/api/admin/orders').query({ search: 'joana' }));
      expect(byPatient.body.total).toBe(2);

      const byPharmacy = await auth(request(app).get('/api/admin/orders').query({ search: 'ALFA' }));
      expect(byPharmacy.body.total).toBe(2);

      const byId = await auth(request(app).get('/api/admin/orders').query({ search: productionOrderId.slice(0, 8) }));
      expect(byId.body.data.map((o: any) => o.id)).toContain(productionOrderId);

      const none = await auth(request(app).get('/api/admin/orders').query({ search: 'ninguém' }));
      expect(none.body.total).toBe(0);
    });

    it('detalhe com histórico em ordem e avaliação', async () => {
      const res = await auth(request(app).get(`/api/admin/orders/${deliveredOrderId}`));
      expect(res.status).toBe(200);
      expect(res.body.history.map((h: any) => h.toStatus)).toEqual(['PRODUCTION', 'DELIVERY', 'DELIVERED']);
      expect(Object.keys(res.body.history[0]).sort()).toEqual(['changedByType', 'createdAt', 'fromStatus', 'toStatus']);
      expect(res.body.review).toMatchObject({ rating: 4, comment: 'Entrega rápida' });

      const other = await auth(request(app).get(`/api/admin/orders/${productionOrderId}`));
      expect(other.body.review).toBeNull();
      expect(other.body.history).toEqual([]);

      expect((await auth(request(app).get('/api/admin/orders/nao-existe'))).status).toBe(404);
    });
  });

  describe('Receitas', () => {
    it('lista metadados e NUNCA retorna fileUrl', async () => {
      const res = await auth(request(app).get('/api/admin/prescriptions'));
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(5);
      for (const item of res.body.data) {
        expect(Object.keys(item).sort()).toEqual(['createdAt', 'id', 'patient', 'quotesCount', 'status']);
        expect(item.patient).toEqual({ id: p1.id, name: 'Joana Paciente' });
      }
      expect(JSON.stringify(res.body)).not.toContain('fileUrl');
      expect(JSON.stringify(res.body)).not.toContain('segredo');

      const quoted = res.body.data.find((p: any) => p.id === rx2Id);
      expect(quoted.quotesCount).toBe(2);
    });

    it('filtro por status', async () => {
      const res = await auth(request(app).get('/api/admin/prescriptions?status=ACCEPTED'));
      expect(res.body.total).toBe(2);
      expect((await auth(request(app).get('/api/admin/prescriptions?status=INVALIDO'))).status).toBe(400);
    });
  });
});
