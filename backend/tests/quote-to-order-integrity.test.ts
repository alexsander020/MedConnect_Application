import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { cleanDatabase } from './helpers/dbCleanup';
import { PrescriptionStatus, QuoteStatus, OrderStatus, PharmacyVerificationStatus } from '@prisma/client';

describe('TAREFA 1.2 — Integridade do fluxo cotação -> pedido', () => {
  const patientId = 'patient-test-int-1';
  const pharmacy1Id = 'pharmacy-test-int-1';
  const pharmacy2Id = 'pharmacy-test-int-2';

  const patientToken = jwt.sign(
    { id: patientId, email: 'paciente.int@test.com', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const pharmacy1Token = jwt.sign(
    { id: pharmacy1Id, email: 'pharmacy1.int@test.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const pharmacy2Token = jwt.sign(
    { id: pharmacy2Id, email: 'pharmacy2.int@test.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  beforeEach(async () => {
    await cleanDatabase(prisma);

    // Cria paciente
    await prisma.user.create({
      data: {
        id: patientId,
        name: 'Paciente Teste Integração',
        email: 'paciente.int@test.com',
        password: 'Password123!',
        role: 'PATIENT'
      }
    });

    // Cria farmácia 1 verificada
    await prisma.pharmacy.create({
      data: {
        id: pharmacy1Id,
        name: 'Farmácia Alfa',
        email: 'pharmacy1.int@test.com',
        password: 'Password123!',
        cnpj: '11111111000101',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED
      }
    });

    // Cria farmácia 2 verificada
    await prisma.pharmacy.create({
      data: {
        id: pharmacy2Id,
        name: 'Farmácia Beta',
        email: 'pharmacy2.int@test.com',
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

  it('1. Caminho feliz: cotações enviadas, paciente aprova -> pedido gerado, cotação aceita, demais rejeitadas, receita aceita', async () => {
    // 1. Cria receita
    const presc = await prisma.prescription.create({
      data: {
        patientId,
        fileUrl: 'https://storage.medconnect.com/presc1.pdf',
        status: PrescriptionStatus.PENDING
      }
    });

    // 2. Farmácia 1 envia cotação
    const quote1Res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${pharmacy1Token}`)
      .send({
        prescriptionId: presc.id,
        price: '150.75',
        deliveryDays: 2,
        notes: 'Fórmula padrão'
      });

    expect(quote1Res.status).toBe(201);
    expect(quote1Res.body.price).toBe('150.75');
    expect(quote1Res.body.priceCents).toBe(15075);
    const quote1Id = quote1Res.body.id;

    // 3. Farmácia 2 envia cotação
    const quote2Res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${pharmacy2Token}`)
      .send({
        prescriptionId: presc.id,
        price: '130.00',
        deliveryDays: 3,
        notes: 'Desconto à vista'
      });

    expect(quote2Res.status).toBe(201);
    const quote2Id = quote2Res.body.id;

    // 4. Paciente aprova cotação da Farmácia 2
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ quoteId: quote2Id });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.status).toBe(OrderStatus.PRODUCTION);
    expect(orderRes.body.quoteId).toBe(quote2Id);

    // 5. Verifica banco de dados
    const updatedPrescription = await prisma.prescription.findUnique({ where: { id: presc.id } });
    expect(updatedPrescription?.status).toBe(PrescriptionStatus.ACCEPTED);

    const updatedQuote2 = await prisma.quote.findUnique({ where: { id: quote2Id } });
    expect(updatedQuote2?.status).toBe(QuoteStatus.ACCEPTED);

    const updatedQuote1 = await prisma.quote.findUnique({ where: { id: quote1Id } });
    expect(updatedQuote1?.status).toBe(QuoteStatus.REJECTED);
  });

  it('2. Duas aprovações simultâneas (Promise.all) geram exatamente UM pedido e uma delas retorna 409', async () => {
    const presc = await prisma.prescription.create({
      data: {
        patientId,
        fileUrl: 'https://storage.medconnect.com/presc2.pdf',
        status: PrescriptionStatus.PENDING
      }
    });

    const quoteRes = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${pharmacy1Token}`)
      .send({
        prescriptionId: presc.id,
        price: '200.00'
      });

    const quoteId = quoteRes.body.id;

    // Duas requisições simultâneas de aprovação
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ quoteId }),
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ quoteId })
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);

    // Exatamente um pedido gerado no banco de dados
    const ordersCount = await prisma.order.count({ where: { quoteId } });
    expect(ordersCount).toBe(1);
  });

  it('3. Cotação duplicada da mesma farmácia para a mesma receita retorna 409 Conflict', async () => {
    const presc = await prisma.prescription.create({
      data: {
        patientId,
        fileUrl: 'https://storage.medconnect.com/presc3.pdf',
        status: PrescriptionStatus.PENDING
      }
    });

    // Primeira cotação
    const firstRes = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${pharmacy1Token}`)
      .send({
        prescriptionId: presc.id,
        price: '100.00'
      });
    expect(firstRes.status).toBe(201);

    // Segunda cotação da mesma farmácia
    const secondRes = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${pharmacy1Token}`)
      .send({
        prescriptionId: presc.id,
        price: '95.00'
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error?.code).toBe('QUOTE_ALREADY_EXISTS');
  });

  it('4. Cotação em receita já aceita retorna 409 Conflict', async () => {
    const presc = await prisma.prescription.create({
      data: {
        patientId,
        fileUrl: 'https://storage.medconnect.com/presc4.pdf',
        status: PrescriptionStatus.ACCEPTED // Receita já finalizada
      }
    });

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${pharmacy1Token}`)
      .send({
        prescriptionId: presc.id,
        price: '110.00'
      });

    expect(res.status).toBe(409);
    expect(res.body.error?.code).toBe('PRESCRIPTION_ALREADY_FINALIZED');
  });

  it('5. Farmácia não verificada não pode enviar cotações (403 Forbidden)', async () => {
    const unverifiedPharmacyId = 'pharmacy-unverified';
    await prisma.pharmacy.create({
      data: {
        id: unverifiedPharmacyId,
        name: 'Farmácia Não Verificada',
        email: 'unverified@test.com',
        password: 'Password123!',
        cnpj: '33333333000103',
        verified: false
      }
    });

    const unverifiedToken = jwt.sign(
      { id: unverifiedPharmacyId, email: 'unverified@test.com', role: 'PHARMACY' },
      env.JWT_SECRET
    );

    const presc = await prisma.prescription.create({
      data: {
        patientId,
        fileUrl: 'https://storage.medconnect.com/presc5.pdf',
        status: PrescriptionStatus.PENDING
      }
    });

    const res = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${unverifiedToken}`)
      .send({
        prescriptionId: presc.id,
        price: '50.00'
      });

    expect(res.status).toBe(403);
    expect(res.body.error?.code).toBe('PHARMACY_NOT_VERIFIED');
  });
});
