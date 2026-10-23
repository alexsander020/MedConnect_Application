import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { OrderStatus, PharmacyVerificationStatus, PrescriptionStatus, QuoteStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('TAREFA 3.1 — Transições Inválidas de Estado & Farmácia Não Verificada Bloqueada', () => {
  const patientId = 'patient-sm-test';
  const verifiedPharmacyId = 'pharmacy-verified-sm';
  const pendingPharmacyId = 'pharmacy-pending-sm';
  const rejectedPharmacyId = 'pharmacy-rejected-sm';

  const verifiedPharmacyToken = jwt.sign(
    { id: verifiedPharmacyId, email: 'verified.sm@farmacia.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const pendingPharmacyToken = jwt.sign(
    { id: pendingPharmacyId, email: 'pending.sm@farmacia.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const rejectedPharmacyToken = jwt.sign(
    { id: rejectedPharmacyId, email: 'rejected.sm@farmacia.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  beforeEach(async () => {
    await cleanDatabase(prisma);

    await prisma.user.create({
      data: {
        id: patientId,
        name: 'Paciente SM',
        email: 'paciente.sm@test.com',
        password: 'Password123!',
        role: 'PATIENT'
      }
    });

    // Farmácia Verificada
    await prisma.pharmacy.create({
      data: {
        id: verifiedPharmacyId,
        name: 'Farmácia Verificada',
        email: 'verified.sm@farmacia.com',
        password: 'Password123!',
        cnpj: '55666777000101',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED
      }
    });

    // Farmácia Pendente
    await prisma.pharmacy.create({
      data: {
        id: pendingPharmacyId,
        name: 'Farmácia Pendente',
        email: 'pending.sm@farmacia.com',
        password: 'Password123!',
        cnpj: '55666777000102',
        verified: false,
        verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION
      }
    });

    // Farmácia Rejeitada
    await prisma.pharmacy.create({
      data: {
        id: rejectedPharmacyId,
        name: 'Farmácia Rejeitada',
        email: 'rejected.sm@farmacia.com',
        password: 'Password123!',
        cnpj: '55666777000103',
        verified: false,
        verificationStatus: PharmacyVerificationStatus.REJECTED,
        rejectionReason: 'Alvará sanitário vencido e ausência de CRF ativo'
      }
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  describe('1. Bloqueio Mandatório de Farmácias Não Verificadas', () => {
    it('Farmácia PENDING_VERIFICATION é bloqueada em GET /api/prescriptions/pharmacy (HTTP 403 PHARMACY_NOT_VERIFIED)', async () => {
      const res = await request(app)
        .get('/api/prescriptions/pharmacy')
        .set('Authorization', `Bearer ${pendingPharmacyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('PHARMACY_NOT_VERIFIED');
    });

    it('Farmácia PENDING_VERIFICATION é bloqueada em POST /api/quotes (HTTP 403 PHARMACY_NOT_VERIFIED)', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${pendingPharmacyToken}`)
        .send({
          prescriptionId: 'any-presc',
          price: '100.00'
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('PHARMACY_NOT_VERIFIED');
    });

    it('Farmácia REJECTED é bloqueada em GET /api/prescriptions/pharmacy (HTTP 403 PHARMACY_NOT_VERIFIED)', async () => {
      const res = await request(app)
        .get('/api/prescriptions/pharmacy')
        .set('Authorization', `Bearer ${rejectedPharmacyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('PHARMACY_NOT_VERIFIED');
    });

    it('Farmácia REJECTED é bloqueada em POST /api/quotes (HTTP 403 PHARMACY_NOT_VERIFIED)', async () => {
      const res = await request(app)
        .post('/api/quotes')
        .set('Authorization', `Bearer ${rejectedPharmacyToken}`)
        .send({
          prescriptionId: 'any-presc',
          price: '100.00'
        });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('PHARMACY_NOT_VERIFIED');
    });
  });

  describe('2. Transições Inválidas na Máquina de Estados do Pedido (Order State Machine)', () => {
    let orderId: string;

    beforeEach(async () => {
      const presc = await prisma.prescription.create({
        data: {
          id: 'presc-sm-order',
          patientId,
          fileUrl: 'https://storage.medconnect.com/rec-sm.pdf',
          status: PrescriptionStatus.ACCEPTED
        }
      });

      const quote = await prisma.quote.create({
        data: {
          id: 'quote-sm-order',
          prescriptionId: presc.id,
          pharmacyId: verifiedPharmacyId,
          priceCents: 12000,
          status: QuoteStatus.ACCEPTED
        }
      });

      const order = await prisma.order.create({
        data: {
          id: 'order-sm-state-machine',
          quoteId: quote.id,
          status: OrderStatus.PRODUCTION
        }
      });

      orderId = order.id;
    });

    it('Rejeita pular de PRODUCTION direto para DELIVERED (sem passar por DELIVERY) -> 409 Conflict', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${verifiedPharmacyToken}`)
        .send({ status: OrderStatus.DELIVERED });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toMatch(/INVALID_ORDER_TRANSITION|INVALID_TRANSITION/i);
    });

    it('Rejeita retroceder status de DELIVERY de volta para PRODUCTION -> 409 Conflict', async () => {
      // Avança primeiro para DELIVERY legitimamente
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERY }
      });

      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${verifiedPharmacyToken}`)
        .send({ status: OrderStatus.PRODUCTION });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toMatch(/INVALID_ORDER_TRANSITION|INVALID_TRANSITION/i);
    });

    it('Rejeita cancelar um pedido que já está DELIVERED -> 409 Conflict', async () => {
      // Avança para DELIVERED
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.DELIVERED }
      });

      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${verifiedPharmacyToken}`)
        .send({ status: OrderStatus.CANCELLED });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toMatch(/INVALID_ORDER_TRANSITION|INVALID_TRANSITION/i);
    });

    it('Rejeita transicionar um pedido já CANCELLED para DELIVERY -> 409 Conflict', async () => {
      // Cancela o pedido
      await prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED }
      });

      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${verifiedPharmacyToken}`)
        .send({ status: OrderStatus.DELIVERY });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toMatch(/INVALID_ORDER_TRANSITION|INVALID_TRANSITION/i);
    });
  });
});
