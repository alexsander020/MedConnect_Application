import request from 'supertest';
import { PharmacyVerificationStatus, QuoteStatus } from '@prisma/client';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { encryptField } from '../src/lib/fieldEncryption';
import { cleanDatabase } from './helpers/dbCleanup';
import { createPharmacy, createUser, tokenFor } from './helpers/phase6Fixtures';

/**
 * LGPD (ADR 008): o detalhe da receita (GET /api/prescriptions/:id) visto por uma farmácia deve seguir
 * a mesma minimização da listagem aberta — sem arquivo, sem contato e sem cotações concorrentes —
 * até que o paciente aceite a cotação daquela farmácia.
 */
describe('GET /api/prescriptions/:id — minimização para farmácias', () => {
  const patient = { id: 'rxp-patient', email: 'rxp.patient@test.com' };
  const pharmA = { id: 'rxp-pharm-a', email: 'rxp.a@test.com', cnpj: '11444777000161' };
  const pharmB = { id: 'rxp-pharm-b', email: 'rxp.b@test.com', cnpj: '11222333000181' };
  const pending = { id: 'rxp-pending', email: 'rxp.pending@test.com', cnpj: '45723174000110' };
  const rxId = 'rxp-prescription';

  beforeAll(async () => {
    await cleanDatabase(prisma);
    await createUser(prisma, { ...patient, name: 'Paula Privada', phone: encryptField('11988887777') });
    await createPharmacy(prisma, pharmA);
    await createPharmacy(prisma, pharmB);
    await createPharmacy(prisma, {
      ...pending,
      verified: false,
      verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION
    });
    await prisma.prescription.create({
      data: { id: rxId, patientId: patient.id, fileUrl: 'https://storage.example/rx/segredo.png', status: 'QUOTED' }
    });
    await prisma.quote.create({ data: { id: 'rxp-quote-a', prescriptionId: rxId, pharmacyId: pharmA.id, priceCents: 4500 } });
    await prisma.quote.create({ data: { id: 'rxp-quote-b', prescriptionId: rxId, pharmacyId: pharmB.id, priceCents: 3900 } });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await prisma.$disconnect();
  });

  const get = (who: { id: string; email: string }, role: 'PHARMACY' | 'PATIENT') =>
    request(app).get(`/api/prescriptions/${rxId}`).set('Authorization', `Bearer ${tokenFor(who.id, who.email, role)}`);

  it('antes do aceite: sem fileUrl, sem contato e só a própria cotação', async () => {
    const res = await get(pharmA, 'PHARMACY');
    expect(res.status).toBe(200);
    expect(res.body.fileUrl).toBeUndefined();
    expect(res.body.patientId).toBeUndefined();
    expect(res.body.contactReleased).toBe(false);
    expect(res.body.patient).toEqual({ anonymousId: expect.stringMatching(/^Paciente #/) });
    expect(JSON.stringify(res.body)).not.toContain('Paula');
    expect(JSON.stringify(res.body)).not.toContain('segredo');
    expect(res.body.quotes).toHaveLength(1);
    expect(res.body.quotes[0]).toMatchObject({ pharmacyId: pharmA.id, priceCents: 4500, price: '45.00' });
  });

  it('farmácia não verificada continua bloqueada', async () => {
    const res = await get(pending, 'PHARMACY');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PHARMACY_NOT_VERIFIED');
  });

  it('depois do aceite: a farmácia escolhida recebe nome e telefone decifrado; a outra não', async () => {
    await prisma.quote.update({ where: { id: 'rxp-quote-a' }, data: { status: QuoteStatus.ACCEPTED } });
    await prisma.quote.update({ where: { id: 'rxp-quote-b' }, data: { status: QuoteStatus.REJECTED } });

    const chosen = await get(pharmA, 'PHARMACY');
    expect(chosen.body.contactReleased).toBe(true);
    expect(chosen.body.patient).toMatchObject({ name: 'Paula Privada', phone: '11988887777' });
    expect(chosen.body.fileUrl).toBeUndefined();

    const other = await get(pharmB, 'PHARMACY');
    expect(other.body.contactReleased).toBe(false);
    expect(other.body.patient.name).toBeUndefined();
    expect(other.body.quotes).toHaveLength(1);
    expect(other.body.quotes[0].pharmacyId).toBe(pharmB.id);
  });

  it('o paciente dono continua vendo todas as cotações da própria receita', async () => {
    const res = await get(patient, 'PATIENT');
    expect(res.status).toBe(200);
    expect(res.body.quotes).toHaveLength(2);
  });
});

describe('GET /api/orders/my — listagem da farmácia sem arquivo nem contato cifrado', () => {
  const patient = { id: 'om-patient', email: 'om.patient@test.com' };
  const pharm = { id: 'om-pharm', email: 'om.pharm@test.com', cnpj: '11444777000161' };

  beforeAll(async () => {
    await cleanDatabase(prisma);
    await createUser(prisma, {
      ...patient,
      name: 'Otávio Minimizado',
      phone: encryptField('11977776666'),
      address: encryptField('Rua Sigilosa, 10')
    });
    await createPharmacy(prisma, pharm);
    await prisma.prescription.create({
      data: { id: 'om-rx', patientId: patient.id, fileUrl: 'https://storage.example/rx/arquivo-secreto.png', status: 'ACCEPTED' }
    });
    await prisma.quote.create({
      data: { id: 'om-quote', prescriptionId: 'om-rx', pharmacyId: pharm.id, priceCents: 5000, status: QuoteStatus.ACCEPTED }
    });
    await prisma.order.create({ data: { id: 'om-order', quoteId: 'om-quote' } });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  it('traz o nome do paciente, mas não fileUrl, telefone ou endereço', async () => {
    const res = await request(app)
      .get('/api/orders/my')
      .set('Authorization', `Bearer ${tokenFor(pharm.id, pharm.email, 'PHARMACY')}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const rx = res.body[0].quote.prescription;
    expect(rx).toMatchObject({ id: 'om-rx', patient: { id: patient.id, name: 'Otávio Minimizado' } });
    expect(rx.fileUrl).toBeUndefined();
    expect(rx.patient.phone).toBeUndefined();
    expect(rx.patient.address).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('arquivo-secreto');
  });
});
