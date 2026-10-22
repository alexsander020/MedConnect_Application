import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('LGPD & Privacy Data Protection Tests', () => {
  const patientId = 'patient-lgpd-1';
  const pharmacyAId = 'pharmacy-lgpd-a';
  const pharmacyBId = 'pharmacy-lgpd-b';
  const prescriptionId = 'presc-lgpd-1';
  const quoteAId = 'quote-lgpd-a';
  const orderAId = 'order-lgpd-a';

  const patientToken = jwt.sign(
    { id: patientId, email: 'paciente.lgpd@test.com', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const pharmacyAToken = jwt.sign(
    { id: pharmacyAId, email: 'farmacia.a@test.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const pharmacyBToken = jwt.sign(
    { id: pharmacyBId, email: 'farmacia.b@test.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  beforeAll(async () => {
    // Limpeza prévia de registros sintéticos de teste
    await prisma.orderStatusHistory.deleteMany();
    await prisma.order.deleteMany({ where: { id: { in: [orderAId] } } });
    await prisma.quote.deleteMany({ where: { id: { in: [quoteAId] } } });
    await prisma.prescription.deleteMany({ where: { id: { in: [prescriptionId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [patientId] } } });
    await prisma.pharmacy.deleteMany({ where: { id: { in: [pharmacyAId, pharmacyBId] } } });

    // Criação de dados sintéticos para o teste
    await prisma.user.create({
      data: {
        id: patientId,
        name: 'Maria Sensível dos Santos',
        email: 'paciente.lgpd@test.com',
        password: 'HashedPassword123!',
        phone: '(11) 98765-4321',
        address: 'Rua das Camélias, 789, Apto 42 - São Paulo, SP',
        role: 'PATIENT',
      },
    });

    await prisma.pharmacy.create({
      data: {
        id: pharmacyAId,
        name: 'Farmácia Vencedora',
        email: 'farmacia.a@test.com',
        password: 'HashedPassword123!',
        cnpj: '11222333000181',
        verified: true,
        verificationStatus: 'VERIFIED'
      },
    });

    await prisma.pharmacy.create({
      data: {
        id: pharmacyBId,
        name: 'Farmácia Concorrente',
        email: 'farmacia.b@test.com',
        password: 'HashedPassword123!',
        cnpj: '22333444000192',
        verified: true,
        verificationStatus: 'VERIFIED'
      },
    });

    await prisma.prescription.create({
      data: {
        id: prescriptionId,
        patientId,
        fileUrl: 'https://storage.medconnect.com/uploads/receita-confidencial.pdf',
        status: 'QUOTED',
      },
    });

    await prisma.quote.create({
      data: {
        id: quoteAId,
        prescriptionId,
        pharmacyId: pharmacyAId,
        priceCents: 9950,
        status: 'ACCEPTED',
      },
    });

    await prisma.order.create({
      data: {
        id: orderAId,
        quoteId: quoteAId,
        status: 'PRODUCTION',
      },
    });
  });

  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany();
    await prisma.order.deleteMany({ where: { id: { in: [orderAId] } } });
    await prisma.quote.deleteMany({ where: { id: { in: [quoteAId] } } });
    await prisma.prescription.deleteMany({ where: { id: { in: [prescriptionId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [patientId] } } });
    await prisma.pharmacy.deleteMany({ where: { id: { in: [pharmacyAId, pharmacyBId] } } });
  });

  it('1. GET /api/prescriptions/pharmacy: pharmacy without accepted order MUST NOT receive phone, address, or fileUrl', async () => {
    const res = await request(app)
      .get('/api/prescriptions/pharmacy')
      .set('Authorization', `Bearer ${pharmacyBToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const found = res.body.find((p: any) => p.id === prescriptionId);
    expect(found).toBeDefined();

    // Deve conter identificador anônimo
    expect(found.patient).toBeDefined();
    expect(found.patient.anonymousId).toMatch(/^Paciente #/);

    // DADOS SENSÍVEIS DEVEM SER OBRIGATORIAMENTE OMITIDOS
    expect(found.fileUrl).toBeUndefined();
    expect(found.patient.phone).toBeUndefined();
    expect(found.patient.address).toBeUndefined();
    expect(found.patient.name).toBeUndefined();
  });

  it('2. GET /api/orders/:id: pharmacy with accepted quote/order receives delivery address and prescription fileUrl', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderAId}`)
      .set('Authorization', `Bearer ${pharmacyAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderAId);
    expect(res.body.quote.prescription.fileUrl).toBe('https://storage.medconnect.com/uploads/receita-confidencial.pdf');
    expect(res.body.quote.prescription.patient.address).toBe('Rua das Camélias, 789, Apto 42 - São Paulo, SP');
  });

  it('3. GET /api/orders/:id: competing pharmacy (without accepted quote) is forbidden (403 IDOR)', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderAId}`)
      .set('Authorization', `Bearer ${pharmacyBToken}`);

    expect(res.status).toBe(403);
    const errorMsg = res.body.error?.message || res.body.error;
    expect(errorMsg).toMatch(/permissão/i);
  });
});
