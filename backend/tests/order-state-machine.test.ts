import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { cleanDatabase } from './helpers/dbCleanup';
import {
  isValidOrderTransition,
  assertValidOrderTransition,
  OrderTransitionError,
  ALLOWED_TRANSITIONS
} from '../src/domain/orderStateMachine';
import { OrderStatus, PrescriptionStatus, QuoteStatus, Role } from '@prisma/client';

describe('TAREFA 1.3 — Máquina de estados do pedido e Histórico', () => {
  describe('1. Testes Unitários de Domínio da Máquina de Estados', () => {
    it('Permite transições válidas: PRODUCTION->DELIVERY, DELIVERY->DELIVERED, PRODUCTION->CANCELLED', () => {
      expect(isValidOrderTransition(OrderStatus.PRODUCTION, OrderStatus.DELIVERY)).toBe(true);
      expect(isValidOrderTransition(OrderStatus.DELIVERY, OrderStatus.DELIVERED)).toBe(true);
      expect(isValidOrderTransition(OrderStatus.PRODUCTION, OrderStatus.CANCELLED)).toBe(true);

      expect(() => assertValidOrderTransition(OrderStatus.PRODUCTION, OrderStatus.DELIVERY)).not.toThrow();
      expect(() => assertValidOrderTransition(OrderStatus.DELIVERY, OrderStatus.DELIVERED)).not.toThrow();
      expect(() => assertValidOrderTransition(OrderStatus.PRODUCTION, OrderStatus.CANCELLED)).not.toThrow();
    });

    it('Rejeita e lança 409 para transições inválidas', () => {
      const invalidPairs: [OrderStatus, OrderStatus][] = [
        [OrderStatus.PRODUCTION, OrderStatus.DELIVERED],
        [OrderStatus.DELIVERY, OrderStatus.PRODUCTION],
        [OrderStatus.DELIVERY, OrderStatus.CANCELLED],
        [OrderStatus.DELIVERED, OrderStatus.PRODUCTION],
        [OrderStatus.DELIVERED, OrderStatus.DELIVERY],
        [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
        [OrderStatus.CANCELLED, OrderStatus.PRODUCTION],
        [OrderStatus.CANCELLED, OrderStatus.DELIVERY],
        [OrderStatus.CANCELLED, OrderStatus.DELIVERED],
        [OrderStatus.PRODUCTION, OrderStatus.PRODUCTION],
        [OrderStatus.DELIVERY, OrderStatus.DELIVERY],
        [OrderStatus.DELIVERED, OrderStatus.DELIVERED],
        [OrderStatus.CANCELLED, OrderStatus.CANCELLED]
      ];

      for (const [from, to] of invalidPairs) {
        expect(isValidOrderTransition(from, to)).toBe(false);
        expect(() => assertValidOrderTransition(from, to)).toThrow(OrderTransitionError);
      }
    });
  });

  describe('2. Testes de Integração de Atualização de Status e Auditoria', () => {
    const patientId = 'patient-osm-1';
    const ownerPharmacyId = 'pharmacy-osm-owner';
    const otherPharmacyId = 'pharmacy-osm-other';

    const patientToken = jwt.sign(
      { id: patientId, email: 'paciente.osm@test.com', role: 'PATIENT' },
      env.JWT_SECRET
    );

    const ownerPharmacyToken = jwt.sign(
      { id: ownerPharmacyId, email: 'owner.osm@test.com', role: 'PHARMACY' },
      env.JWT_SECRET
    );

    const otherPharmacyToken = jwt.sign(
      { id: otherPharmacyId, email: 'other.osm@test.com', role: 'PHARMACY' },
      env.JWT_SECRET
    );

    let testOrderId: string;
    let testQuoteId: string;
    let testPrescriptionId: string;

    beforeEach(async () => {
      await cleanDatabase(prisma);

      await prisma.user.create({
        data: {
          id: patientId,
          name: 'Paciente OSM',
          email: 'paciente.osm@test.com',
          password: 'Password123!',
          role: 'PATIENT'
        }
      });

      await prisma.pharmacy.create({
        data: {
          id: ownerPharmacyId,
          name: 'Farmácia Dona',
          email: 'owner.osm@test.com',
          password: 'Password123!',
          cnpj: '55555555000105',
          verified: true
        }
      });

      await prisma.pharmacy.create({
        data: {
          id: otherPharmacyId,
          name: 'Farmácia Intrusiva',
          email: 'other.osm@test.com',
          password: 'Password123!',
          cnpj: '66666666000106',
          verified: true
        }
      });

      const presc = await prisma.prescription.create({
        data: {
          patientId,
          fileUrl: 'https://storage.medconnect.com/rec-osm.pdf',
          status: PrescriptionStatus.ACCEPTED
        }
      });
      testPrescriptionId = presc.id;

      const quote = await prisma.quote.create({
        data: {
          prescriptionId: presc.id,
          pharmacyId: ownerPharmacyId,
          priceCents: 15000,
          status: QuoteStatus.ACCEPTED
        }
      });
      testQuoteId = quote.id;

      const order = await prisma.order.create({
        data: {
          quoteId: quote.id,
          status: OrderStatus.PRODUCTION,
          history: {
            create: {
              fromStatus: OrderStatus.PRODUCTION,
              toStatus: OrderStatus.PRODUCTION,
              changedByType: Role.PATIENT,
              changedById: patientId
            }
          }
        }
      });
      testOrderId = order.id;
    });

    afterAll(async () => {
      await cleanDatabase(prisma);
    });

    it('Transição válida: PRODUCTION -> DELIVERY -> DELIVERED grava histórico com sucesso', async () => {
      // 1. PRODUCTION -> DELIVERY
      const res1 = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${ownerPharmacyToken}`)
        .send({ status: 'DELIVERY' });

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('DELIVERY');

      // 2. DELIVERY -> DELIVERED
      const res2 = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${ownerPharmacyToken}`)
        .send({ status: 'DELIVERED' });

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('DELIVERED');

      // 3. Verifica OrderStatusHistory
      const history = await prisma.orderStatusHistory.findMany({
        where: { orderId: testOrderId },
        orderBy: { createdAt: 'asc' }
      });

      expect(history.length).toBe(3); // Criação inicial + 2 transições
      expect(history[1].fromStatus).toBe(OrderStatus.PRODUCTION);
      expect(history[1].toStatus).toBe(OrderStatus.DELIVERY);
      expect(history[1].changedById).toBe(ownerPharmacyId);

      expect(history[2].fromStatus).toBe(OrderStatus.DELIVERY);
      expect(history[2].toStatus).toBe(OrderStatus.DELIVERED);
      expect(history[2].changedById).toBe(ownerPharmacyId);
    });

    it('Transição válida: PRODUCTION -> CANCELLED', async () => {
      const res = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${ownerPharmacyToken}`)
        .send({ status: 'CANCELLED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('CANCELLED');

      const history = await prisma.orderStatusHistory.findFirst({
        where: { orderId: testOrderId, toStatus: OrderStatus.CANCELLED }
      });
      expect(history).toBeDefined();
      expect(history?.fromStatus).toBe(OrderStatus.PRODUCTION);
    });

    it('Transição inválida retorna 409 com mensagem clara', async () => {
      // Tenta pular de PRODUCTION direto para DELIVERED
      const res = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${ownerPharmacyToken}`)
        .send({ status: 'DELIVERED' });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('INVALID_ORDER_TRANSITION');
      expect(res.body.error?.message).toMatch(/não é permitido alterar de 'PRODUCTION' para 'DELIVERED'/i);
    });

    it('Autorização: Farmácia que não é dona do pedido recebe 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${otherPharmacyToken}`)
        .send({ status: 'DELIVERY' });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('FORBIDDEN_ORDER_MODIFICATION');
    });

    it('Autorização: Paciente tentando alterar status recebe 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ status: 'DELIVERY' });

      expect(res.status).toBe(403);
    });
  });
});
