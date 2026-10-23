import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { OrderStatus, PharmacyVerificationStatus, PrescriptionStatus, QuoteStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('TAREFA 3.1 — Concorrência na Aprovação de Cotações (Serializable Isolation)', () => {
  const patientId = 'patient-concurrency-test';
  const pharmacyId = 'pharmacy-concurrency-test';

  const patientToken = jwt.sign(
    { id: patientId, email: 'paciente.concorrencia@test.com', role: 'PATIENT' },
    env.JWT_SECRET
  );

  beforeEach(async () => {
    await cleanDatabase(prisma);

    await prisma.user.create({
      data: {
        id: patientId,
        name: 'Paciente Concorrência',
        email: 'paciente.concorrencia@test.com',
        password: 'Password123!',
        role: 'PATIENT'
      }
    });

    await prisma.pharmacy.create({
      data: {
        id: pharmacyId,
        name: 'Farmácia Concorrência',
        email: 'farmacia.concorrencia@test.com',
        password: 'Password123!',
        cnpj: '33444555000199',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED
      }
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  it('duas requisições simultâneas de aprovação geram exatamente UM único pedido e retornam 409 Conflict na concorrente', async () => {
    const presc = await prisma.prescription.create({
      data: {
        id: 'presc-race-1',
        patientId,
        fileUrl: 'https://storage.medconnect.com/rec-race.pdf',
        status: PrescriptionStatus.PENDING
      }
    });

    const quote = await prisma.quote.create({
      data: {
        id: 'quote-race-1',
        prescriptionId: presc.id,
        pharmacyId,
        priceCents: 18000,
        status: QuoteStatus.PENDING
      }
    });

    // Dispara 2 requisições concorrentes simultâneas de aprovação da mesma cotação via Promise.all
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ quoteId: quote.id }),
      request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ quoteId: quote.id })
    ]);

    const statuses = [res1.status, res2.status].sort();

    // Uma deve ter sucesso (201 Created) e a outra deve ser rejeitada com 409 Conflict
    expect(statuses).toEqual([201, 409]);

    // O erro do 409 deve indicar claramente o conflito de pedido ou receita já finalizada
    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.error).toBeDefined();
    expect(conflictRes.body.error.code).toMatch(/ORDER_ALREADY_EXISTS|PRESCRIPTION_ALREADY_FINALIZED/);

    // Verificação estrita de banco de dados: apenas 1 pedido foi persistido
    const ordersInDb = await prisma.order.findMany({
      where: { quoteId: quote.id }
    });
    expect(ordersInDb.length).toBe(1);
    expect(ordersInDb[0].status).toBe(OrderStatus.PRODUCTION);

    // Cotação deve estar marcada como ACCEPTED
    const updatedQuote = await prisma.quote.findUnique({
      where: { id: quote.id }
    });
    expect(updatedQuote?.status).toBe(QuoteStatus.ACCEPTED);
  });
});
