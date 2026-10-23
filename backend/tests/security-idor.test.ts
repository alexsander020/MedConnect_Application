import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { OrderStatus, PharmacyVerificationStatus, PrescriptionStatus, QuoteStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('TAREFA 3.1 — Segurança e Prevenção de IDOR (Insecure Direct Object Reference)', () => {
  const patientAId = 'patient-idor-a';
  const patientBId = 'patient-idor-b';
  const pharmacyAId = 'pharmacy-idor-a';
  const pharmacyBId = 'pharmacy-idor-b';

  const patientAToken = jwt.sign(
    { id: patientAId, email: 'paciente.a@test.com', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const patientBToken = jwt.sign(
    { id: patientBId, email: 'paciente.b@test.com', role: 'PATIENT' },
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

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Cria Paciente A
    await prisma.user.create({
      data: {
        id: patientAId,
        name: 'Paciente Alice',
        email: 'paciente.a@test.com',
        password: 'Password123!',
        cpfEncrypted: 'encrypted-cpf-a',
        cpfHash: 'hash-cpf-a',
        phone: '11911112222',
        address: 'Rua das Oliveiras, 100',
        role: 'PATIENT'
      }
    });

    // Cria Paciente B
    await prisma.user.create({
      data: {
        id: patientBId,
        name: 'Paciente Bruno',
        email: 'paciente.b@test.com',
        password: 'Password123!',
        cpfEncrypted: 'encrypted-cpf-b',
        cpfHash: 'hash-cpf-b',
        phone: '11933334444',
        address: 'Rua dos Pinheiros, 200',
        role: 'PATIENT'
      }
    });

    // Cria Farmácia A (verificada)
    await prisma.pharmacy.create({
      data: {
        id: pharmacyAId,
        name: 'Farmácia Alfa',
        email: 'farmacia.a@test.com',
        password: 'Password123!',
        cnpj: '11111111000101',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED
      }
    });

    // Cria Farmácia B (verificada)
    await prisma.pharmacy.create({
      data: {
        id: pharmacyBId,
        name: 'Farmácia Beta',
        email: 'farmacia.b@test.com',
        password: 'Password123!',
        cnpj: '22222222000102',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED
      }
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  it('1. Paciente A NÃO pode aprovar cotação da receita do Paciente B (IDOR em aprovação de cotação)', async () => {
    // Receita criada para Paciente B
    const prescB = await prisma.prescription.create({
      data: {
        id: 'presc-b-1',
        patientId: patientBId,
        fileUrl: 'https://storage.medconnect.com/rec-b.pdf',
        status: PrescriptionStatus.PENDING
      }
    });

    // Cotação da Farmácia A para a receita do Paciente B
    const quoteB = await prisma.quote.create({
      data: {
        id: 'quote-b-1',
        prescriptionId: prescB.id,
        pharmacyId: pharmacyAId,
        priceCents: 9900,
        status: QuoteStatus.PENDING
      }
    });

    // Paciente A tenta aprovar a cotação do Paciente B
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${patientAToken}`)
      .send({ quoteId: quoteB.id });

    expect(res.status).toBe(403);
    const errorMsg = res.body.error?.message || res.body.error;
    expect(errorMsg).toMatch(/outro paciente|permissão|negado/i);

    // Garante que nenhum pedido foi criado
    const ordersCount = await prisma.order.count();
    expect(ordersCount).toBe(0);
  });

  it('2. Paciente A NÃO pode ler receita do Paciente B (IDOR em leitura de receita)', async () => {
    const prescB = await prisma.prescription.create({
      data: {
        id: 'presc-b-secret',
        patientId: patientBId,
        fileUrl: 'https://storage.medconnect.com/rec-b-confidencial.pdf',
        status: PrescriptionStatus.PENDING
      }
    });

    const res = await request(app)
      .get(`/api/prescriptions/${prescB.id}`)
      .set('Authorization', `Bearer ${patientAToken}`);

    expect([403, 404]).toContain(res.status);
  });

  it('3. Paciente A NÃO pode ler pedido do Paciente B (IDOR em leitura de pedido)', async () => {
    const prescB = await prisma.prescription.create({
      data: {
        id: 'presc-b-order',
        patientId: patientBId,
        fileUrl: 'https://storage.medconnect.com/rec-b.pdf',
        status: PrescriptionStatus.ACCEPTED
      }
    });

    const quoteB = await prisma.quote.create({
      data: {
        id: 'quote-b-order',
        prescriptionId: prescB.id,
        pharmacyId: pharmacyAId,
        priceCents: 8500,
        status: QuoteStatus.ACCEPTED
      }
    });

    const orderB = await prisma.order.create({
      data: {
        id: 'order-b-123',
        quoteId: quoteB.id,
        status: OrderStatus.PRODUCTION
      }
    });

    const res = await request(app)
      .get(`/api/orders/${orderB.id}`)
      .set('Authorization', `Bearer ${patientAToken}`);

    expect([403, 404]).toContain(res.status);
    const errorMsg = res.body.error?.message || res.body.error;
    expect(errorMsg).toMatch(/permissão|negado|não encontrado/i);
  });

  it('4. Farmácia A NÃO pode alterar status de pedido da Farmácia B (IDOR entre farmácias)', async () => {
    const presc = await prisma.prescription.create({
      data: {
        id: 'presc-for-pharmacy-b',
        patientId: patientAId,
        fileUrl: 'https://storage.medconnect.com/rec.pdf',
        status: PrescriptionStatus.ACCEPTED
      }
    });

    // Cotação e Pedido pertencem à Farmácia B
    const quoteB = await prisma.quote.create({
      data: {
        id: 'quote-owned-by-pharmacy-b',
        prescriptionId: presc.id,
        pharmacyId: pharmacyBId,
        priceCents: 15000,
        status: QuoteStatus.ACCEPTED
      }
    });

    const orderB = await prisma.order.create({
      data: {
        id: 'order-owned-by-pharmacy-b',
        quoteId: quoteB.id,
        status: OrderStatus.PRODUCTION
      }
    });

    // Farmácia A tenta alterar o status do pedido da Farmácia B
    const res = await request(app)
      .patch(`/api/orders/${orderB.id}/status`)
      .set('Authorization', `Bearer ${pharmacyAToken}`)
      .send({ status: OrderStatus.DELIVERY });

    expect([403, 404]).toContain(res.status);
    const errorMsg = res.body.error?.message || res.body.error;
    expect(errorMsg).toMatch(/outra farmácia|permissão|farmácia responsável/i);

    // O status do pedido original deve permanecer inalterado
    const checkOrder = await prisma.order.findUnique({ where: { id: orderB.id } });
    expect(checkOrder?.status).toBe(OrderStatus.PRODUCTION);
  });

  it('5. Farmácia A NÃO pode ver dados de contato de paciente sem cotação aceita (LGPD & Privacy)', async () => {
    const presc = await prisma.prescription.create({
      data: {
        id: 'presc-public-opportunity',
        patientId: patientAId,
        fileUrl: 'https://storage.medconnect.com/rec-secret-patient-a.pdf',
        status: PrescriptionStatus.PENDING
      }
    });

    const res = await request(app)
      .get('/api/prescriptions/pharmacy')
      .set('Authorization', `Bearer ${pharmacyAToken}`);

    expect(res.status).toBe(200);
    const found = res.body.find((p: any) => p.id === presc.id);
    expect(found).toBeDefined();

    // Verificações rigorosas de privacidade:
    // Identificador anônimo obrigatório
    expect(found.patient.anonymousId).toBeDefined();

    // Nenhum dado de contato pessoal ou arquivo direto pode ser exposto
    expect(found.fileUrl).toBeUndefined();
    expect(found.patient.phone).toBeUndefined();
    expect(found.patient.address).toBeUndefined();
    expect(found.patient.email).toBeUndefined();
    expect(found.patient.name).toBeUndefined();
    expect(found.patient.cpf).toBeUndefined();
  });
});
