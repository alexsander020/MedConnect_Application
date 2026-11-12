import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { createPharmacy, createUser, tokenFor } from './helpers/phase6Fixtures';
import { Role, SupportTicketCategory } from '@prisma/client';

/**
 * FASE 6 — Chamados de suporte: abertura (anônima e autenticada), "meus chamados" e tratamento pelo admin.
 * Atenção: POST /api/support/tickets tem limite de 5 chamadas por IP a cada 15 min, por isso os
 * chamados usados nas demais verificações são criados direto no banco e o teste do 429 é o último.
 */
describe('FASE 6 — Suporte (chamados)', () => {
  const admin = { id: 'p6-sup-admin', email: 'p6.sup.admin@test.com' };
  const patient = { id: 'p6-sup-patient', email: 'p6.sup.patient@test.com' };
  const otherPatient = { id: 'p6-sup-other', email: 'p6.sup.other@test.com' };
  const pharmacy = { id: 'p6-sup-pharmacy', email: 'p6.sup.pharmacy@test.com', cnpj: '70000000000301' };

  const adminToken = tokenFor(admin.id, admin.email, Role.ADMIN);
  const patientToken = tokenFor(patient.id, patient.email, Role.PATIENT);
  const pharmacyToken = tokenFor(pharmacy.id, pharmacy.email, Role.PHARMACY);

  const LONG_MESSAGE =
    'Minha receita de dermatologia foi enviada, mas não recebi nenhuma cotação até agora. ' +
    'Preciso do medicamento com urgência para continuar o tratamento indicado pelo médico. Obrigado!';

  let anonTicketId: string;
  let patientTicketId: string;
  let pharmacyTicketId: string;
  let otherTicketId: string;

  beforeAll(async () => {
    await cleanDatabase(prisma);
    await createUser(prisma, { ...admin, role: Role.ADMIN, name: 'Admin Suporte' });
    await createUser(prisma, { ...patient, name: 'Paciente Suporte' });
    await createUser(prisma, { ...otherPatient, name: 'Outro Paciente' });
    await createPharmacy(prisma, { ...pharmacy, name: 'Farmácia Suporte' });

    const other = await prisma.supportTicket.create({
      data: {
        protocol: 'MC-20261101-OUTRO',
        requesterType: Role.PATIENT,
        userId: otherPatient.id,
        name: 'Outro Paciente',
        email: otherPatient.email,
        category: SupportTicketCategory.PRIVACY,
        subject: 'Dúvida sobre meus dados',
        message: 'Quero saber quais dados vocês guardam.'
      }
    });
    otherTicketId = other.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  describe('POST /api/support/tickets', () => {
    it('visitante anônimo abre chamado → 201 com protocolo', async () => {
      const res = await request(app).post('/api/support/tickets').send({
        name: 'Visitante Curioso',
        email: 'VISITANTE@Exemplo.com ',
        subject: 'Como funciona?',
        message: 'Gostaria de entender como funcionam as cotações.'
      });
      expect(res.status).toBe(201);
      expect(Object.keys(res.body).sort()).toEqual(['createdAt', 'id', 'protocol', 'status']);
      expect(res.body.protocol).toMatch(/^MC-\d{8}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
      expect(res.body.status).toBe('OPEN');
      anonTicketId = res.body.id;

      const db = await prisma.supportTicket.findUnique({ where: { id: anonTicketId } });
      expect(db).toMatchObject({
        requesterType: null,
        userId: null,
        pharmacyId: null,
        email: 'visitante@exemplo.com',
        category: 'GENERAL'
      });
    });

    it('sem login (Bearer inválido é ignorado) exige nome e e-mail', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', 'Bearer token-invalido')
        .send({ subject: 'Sem identificação', message: 'Mensagem sem nome nem e-mail.' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('paciente autenticado: vincula ao titular e usa nome/e-mail da conta', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          name: 'Nome Forjado',
          email: 'forjado@test.com',
          category: 'PRESCRIPTION',
          subject: 'Receita sem cotação',
          message: LONG_MESSAGE
        });
      expect(res.status).toBe(201);
      patientTicketId = res.body.id;

      const db = await prisma.supportTicket.findUnique({ where: { id: patientTicketId } });
      expect(db).toMatchObject({
        requesterType: 'PATIENT',
        userId: patient.id,
        pharmacyId: null,
        name: 'Paciente Suporte',
        email: patient.email,
        category: 'PRESCRIPTION'
      });
    });

    it('farmácia autenticada: dispensa nome/e-mail e vincula à farmácia', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${pharmacyToken}`)
        .send({ category: 'PHARMACY_ONBOARDING', subject: 'Credenciamento', message: 'Quando minha farmácia será aprovada?' });
      expect(res.status).toBe(201);
      pharmacyTicketId = res.body.id;

      const db = await prisma.supportTicket.findUnique({ where: { id: pharmacyTicketId } });
      expect(db).toMatchObject({ requesterType: 'PHARMACY', pharmacyId: pharmacy.id, userId: null, name: 'Farmácia Suporte' });
    });

    it('valida tamanho da mensagem e categoria', async () => {
      const res = await request(app)
        .post('/api/support/tickets')
        .send({ name: 'Visitante', email: 'v@test.com', category: 'OUTRA', subject: 'Oi', message: 'curta' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('o banco impede chamado com dois donos (CHECK)', async () => {
      await expect(
        prisma.supportTicket.create({
          data: {
            protocol: 'MC-20261112-DUPLO',
            userId: patient.id,
            pharmacyId: pharmacy.id,
            name: 'X',
            email: 'x@test.com',
            subject: 'Dois donos',
            message: 'Isto não deveria ser possível.'
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('GET /api/support/tickets/my', () => {
    it('paciente vê apenas os próprios chamados, sem a mensagem', async () => {
      const res = await request(app).get('/api/support/tickets/my').set('Authorization', `Bearer ${patientToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.map((t: any) => t.id)).toEqual([patientTicketId]);
      expect(Object.keys(res.body.data[0]).sort()).toEqual(
        ['category', 'createdAt', 'id', 'protocol', 'resolution', 'resolvedAt', 'status', 'subject', 'updatedAt'].sort()
      );
      expect(JSON.stringify(res.body)).not.toContain(otherTicketId);
    });

    it('farmácia vê apenas os da farmácia; admin sem chamados recebe lista vazia', async () => {
      const ph = await request(app).get('/api/support/tickets/my').set('Authorization', `Bearer ${pharmacyToken}`);
      expect(ph.body.data.map((t: any) => t.id)).toEqual([pharmacyTicketId]);

      const adm = await request(app).get('/api/support/tickets/my').set('Authorization', `Bearer ${adminToken}`);
      expect(adm.body).toEqual({ data: [] });
    });
  });

  describe('Admin: /api/admin/support-tickets', () => {
    const auth = (req: request.Test) => req.set('Authorization', `Bearer ${adminToken}`);

    it('lista com prévia de até 140 caracteres e sem a mensagem completa', async () => {
      const res = await auth(request(app).get('/api/admin/support-tickets'));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 4, page: 1, limit: 20, totalPages: 1 });

      const item = res.body.data.find((t: any) => t.id === patientTicketId);
      expect(item).not.toHaveProperty('message');
      expect(item.preview.length).toBeLessThanOrEqual(140);
      expect(item.preview.endsWith('…')).toBe(true);
      expect(item).toMatchObject({ requesterType: 'PATIENT', name: 'Paciente Suporte', category: 'PRESCRIPTION', status: 'OPEN' });
    });

    it('filtros por categoria, status e busca', async () => {
      const privacy = await auth(request(app).get('/api/admin/support-tickets?category=PRIVACY'));
      expect(privacy.body.data.map((t: any) => t.id)).toEqual([otherTicketId]);

      const byProtocol = await auth(request(app).get('/api/admin/support-tickets').query({ search: 'mc-20261101' }));
      expect(byProtocol.body.data.map((t: any) => t.id)).toEqual([otherTicketId]);

      const resolved = await auth(request(app).get('/api/admin/support-tickets?status=RESOLVED'));
      expect(resolved.body.total).toBe(0);
    });

    it('detalhe completo grava AuditLog ADMIN_VIEW_SUPPORT_TICKET', async () => {
      const res = await auth(request(app).get(`/api/admin/support-tickets/${patientTicketId}`));
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: patientTicketId,
        message: LONG_MESSAGE,
        resolution: null,
        handledById: null,
        userId: patient.id
      });

      const audit = await prisma.auditLog.findFirst({ where: { action: 'ADMIN_VIEW_SUPPORT_TICKET', resourceId: patientTicketId } });
      expect(audit).toMatchObject({ actorId: admin.id, resource: 'SupportTicket' });
      expect(audit?.details).not.toContain('dermatologia');
    });

    it('IN_PROGRESS registra quem tratou, sem resolvedAt', async () => {
      const res = await auth(request(app).patch(`/api/admin/support-tickets/${patientTicketId}`)).send({ status: 'IN_PROGRESS' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'IN_PROGRESS', handledById: admin.id, resolvedAt: null });
    });

    it('RESOLVED seta resolvedAt, notifica o paciente e aparece em "meus chamados"', async () => {
      const res = await auth(request(app).patch(`/api/admin/support-tickets/${patientTicketId}`)).send({
        status: 'RESOLVED',
        resolution: 'Reenviamos sua receita para as farmácias parceiras.'
      });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.resolvedAt).toBeTruthy();
      expect(res.body.resolution).toBe('Reenviamos sua receita para as farmácias parceiras.');

      const notifications = await prisma.notification.findMany({
        where: { userId: patient.id, type: 'SUPPORT_TICKET_UPDATE' },
        orderBy: { createdAt: 'asc' }
      });
      expect(notifications).toHaveLength(2);
      const notification = notifications[1];
      expect(notification?.message).toContain('Resolvido');
      expect(notification?.message).not.toContain('dermatologia');

      const mine = await request(app).get('/api/support/tickets/my').set('Authorization', `Bearer ${patientToken}`);
      expect(mine.body.data[0]).toMatchObject({ status: 'RESOLVED', resolution: 'Reenviamos sua receita para as farmácias parceiras.' });
      expect(mine.body.data[0].resolvedAt).toBeTruthy();

      expect(
        await prisma.auditLog.count({ where: { action: 'ADMIN_UPDATE_SUPPORT_TICKET', resourceId: patientTicketId } })
      ).toBe(2);
    });

    it('RESOLVED → CLOSED mantém o resolvedAt original; reabrir limpa', async () => {
      const before = await prisma.supportTicket.findUnique({ where: { id: patientTicketId } });

      const closed = await auth(request(app).patch(`/api/admin/support-tickets/${patientTicketId}`)).send({ status: 'CLOSED' });
      expect(closed.status).toBe(200);
      expect(new Date(closed.body.resolvedAt).getTime()).toBe(before!.resolvedAt!.getTime());

      const reopened = await auth(request(app).patch(`/api/admin/support-tickets/${patientTicketId}`)).send({ status: 'OPEN' });
      expect(reopened.body.resolvedAt).toBeNull();
    });

    it('chamado de farmácia notifica a farmácia; chamado anônimo não gera notificação', async () => {
      const ph = await auth(request(app).patch(`/api/admin/support-tickets/${pharmacyTicketId}`)).send({ status: 'CLOSED' });
      expect(ph.status).toBe(200);
      expect(await prisma.notification.count({ where: { pharmacyId: pharmacy.id, type: 'SUPPORT_TICKET_UPDATE' } })).toBe(1);

      const before = await prisma.notification.count();
      const anon = await auth(request(app).patch(`/api/admin/support-tickets/${anonTicketId}`)).send({ resolution: 'Respondido por e-mail.' });
      expect(anon.status).toBe(200);
      expect(anon.body).toMatchObject({ status: 'OPEN', resolution: 'Respondido por e-mail.', resolvedAt: null });
      expect(await prisma.notification.count()).toBe(before);
    });

    it('validações e 404', async () => {
      expect((await auth(request(app).patch(`/api/admin/support-tickets/${anonTicketId}`)).send({})).status).toBe(400);
      expect(
        (await auth(request(app).patch(`/api/admin/support-tickets/${anonTicketId}`)).send({ status: 'ARQUIVADO' })).status
      ).toBe(400);
      expect((await auth(request(app).get('/api/admin/support-tickets/nao-existe'))).status).toBe(404);
      const patch404 = await auth(request(app).patch('/api/admin/support-tickets/nao-existe')).send({ status: 'CLOSED' });
      expect(patch404.status).toBe(404);
      expect(patch404.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Direitos do titular sobre chamados (LGPD art. 18)', () => {
    const otherToken = tokenFor(otherPatient.id, otherPatient.email, Role.PATIENT);

    it('exportação de dados inclui os chamados do titular', async () => {
      const res = await request(app).get('/api/users/me/export').set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);
      expect(res.body.chamadosSuporte).toHaveLength(1);
      expect(res.body.chamadosSuporte[0]).toMatchObject({
        protocolo: 'MC-20261101-OUTRO',
        categoria: 'PRIVACY',
        mensagem: 'Quero saber quais dados vocês guardam.'
      });
    });

    it('anonimização remove nome, e-mail e texto livre dos chamados vinculados', async () => {
      const res = await request(app).post('/api/users/me/anonymize').set('Authorization', `Bearer ${otherToken}`);
      expect(res.status).toBe(200);

      const ticket = await prisma.supportTicket.findUnique({ where: { id: otherTicketId } });
      expect(ticket).toMatchObject({ protocol: 'MC-20261101-OUTRO', category: 'PRIVACY', resolution: null });
      expect(ticket?.name).not.toBe('Outro Paciente');
      expect(ticket?.email).not.toBe(otherPatient.email);
      expect(ticket?.message).not.toContain('dados vocês guardam');
    });
  });

  describe('Rate limit da abertura de chamados', () => {
    it('a 6ª abertura na janela é bloqueada com 429 no formato padrão de erro', async () => {
      const res = await request(app).post('/api/support/tickets').send({
        name: 'Spammer',
        email: 'spam@test.com',
        subject: 'Spam',
        message: 'Mensagem repetida de spam.'
      });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(res.headers['retry-after']).toBeDefined();
    });
  });
});
