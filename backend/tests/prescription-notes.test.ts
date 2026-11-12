import request from 'supertest';
import { QuoteStatus, OrderStatus } from '@prisma/client';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { encryptField } from '../src/lib/fieldEncryption';
import { cleanDatabase } from './helpers/dbCleanup';
import { createPharmacy, createUser, tokenFor } from './helpers/phase6Fixtures';

/**
 * Observações da receita (dado de saúde, LGPD art. 11):
 * cifradas em repouso, visíveis ao dono e às farmácias verificadas na cotação, nunca ao ADMIN,
 * presentes na exportação e apagadas na anonimização.
 */
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
const NOTE = 'Minoxidil 5% + Biotina 5mg — 60 cápsulas';

describe('Prescription.notes', () => {
  const patient = { id: 'pn-patient', email: 'pn.patient@test.com' };
  const pharm = { id: 'pn-pharm', email: 'pn.pharm@test.com', cnpj: '11444777000161' };
  const admin = { id: 'pn-admin', email: 'pn.admin@test.com' };
  const patientToken = tokenFor(patient.id, patient.email, 'PATIENT');
  const pharmToken = tokenFor(pharm.id, pharm.email, 'PHARMACY');
  const adminToken = tokenFor(admin.id, admin.email, 'ADMIN');
  let rxId: string;

  beforeAll(async () => {
    await cleanDatabase(prisma);
    await createUser(prisma, { ...patient, name: 'Nina Notas' });
    await createUser(prisma, { ...admin, role: 'ADMIN' });
    await createPharmacy(prisma, pharm);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await prisma.$disconnect();
  });

  const upload = (notes?: string) => {
    const req = request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${patientToken}`)
      .field('consent', 'true')
      .attach('file', PNG, { filename: 'receita.png', contentType: 'image/png' });
    return notes === undefined ? req : req.field('notes', notes);
  };

  it('rejeita observações acima de 1000 caracteres', async () => {
    const res = await upload('x'.repeat(1001));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('NOTES_TOO_LONG');
  });

  it('grava as observações cifradas e devolve o texto em claro ao dono', async () => {
    const res = await upload(`  ${NOTE}  `);
    expect(res.status).toBe(201);
    expect(res.body.notes).toBe(NOTE);
    rxId = res.body.id;

    const row = await prisma.prescription.findUnique({ where: { id: rxId } });
    expect(row?.notes).toBeTruthy();
    expect(row?.notes).not.toContain('Minoxidil');

    const mine = await request(app).get('/api/prescriptions/my').set('Authorization', `Bearer ${patientToken}`);
    expect(mine.body.find((p: any) => p.id === rxId).notes).toBe(NOTE);
  });

  it('sem observações, o campo fica nulo', async () => {
    const res = await upload();
    expect(res.status).toBe(201);
    expect(res.body.notes).toBeNull();
  });

  it('farmácia verificada lê as observações na listagem e no detalhe, sem arquivo', async () => {
    const list = await request(app).get('/api/prescriptions/pharmacy').set('Authorization', `Bearer ${pharmToken}`);
    const item = list.body.find((p: any) => p.id === rxId);
    expect(item.notes).toBe(NOTE);
    expect(item.fileUrl).toBeUndefined();

    const detail = await request(app).get(`/api/prescriptions/${rxId}`).set('Authorization', `Bearer ${pharmToken}`);
    expect(detail.body.notes).toBe(NOTE);
    expect(detail.body.fileUrl).toBeUndefined();
  });

  it('ADMIN não recebe as observações na listagem de gestão', async () => {
    const res = await request(app).get('/api/admin/prescriptions').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('Minoxidil');
  });

  it('pedidos trazem a avaliação (null até o paciente avaliar)', async () => {
    const quote = await prisma.quote.create({
      data: { prescriptionId: rxId, pharmacyId: pharm.id, priceCents: 8990, status: QuoteStatus.ACCEPTED }
    });
    const order = await prisma.order.create({ data: { quoteId: quote.id, status: OrderStatus.DELIVERED } });

    const before = await request(app).get('/api/orders/my').set('Authorization', `Bearer ${patientToken}`);
    expect(before.body.find((o: any) => o.id === order.id).review).toBeNull();

    await prisma.review.create({ data: { orderId: order.id, patientId: patient.id, pharmacyId: pharm.id, rating: 5 } });

    const after = await request(app).get('/api/orders/my').set('Authorization', `Bearer ${patientToken}`);
    expect(after.body.find((o: any) => o.id === order.id).review).toMatchObject({ rating: 5 });

    const detail = await request(app).get(`/api/orders/${order.id}`).set('Authorization', `Bearer ${patientToken}`);
    expect(detail.body.review).toMatchObject({ rating: 5 });
  });

  it('exportação LGPD inclui as observações e a anonimização as apaga (inclusive em receita retida)', async () => {
    const exp = await request(app).get('/api/lgpd/export').set('Authorization', `Bearer ${patientToken}`);
    expect(exp.status).toBe(200);
    expect(JSON.stringify(exp.body)).toContain('Minoxidil');

    // Receita extra, sem pedido, com observação gravada diretamente
    await prisma.prescription.create({
      data: { patientId: patient.id, fileUrl: 'rx-extra.png', notes: encryptField('Observação descartável') }
    });

    const anon = await request(app).post('/api/lgpd/anonymize').set('Authorization', `Bearer ${patientToken}`);
    expect(anon.status).toBe(200);

    const rows = await prisma.prescription.findMany({ where: { patientId: patient.id } });
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((r) => expect(r.notes).toBeNull());
  });
});
