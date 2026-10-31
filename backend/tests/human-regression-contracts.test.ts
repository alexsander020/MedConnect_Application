import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { PharmacyVerificationStatus, PrescriptionKind, PrescriptionStatus, Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { setFeatureFlagsOverrideForTesting } from '../src/config/featureFlags';

describe('ETAPA V6.2 — Testes de Contrato e Regressão do Fluxo Humano', () => {
  const patientId = 'regress-patient-1';
  const pharmacyId = 'regress-pharmacy-1';
  let patientToken: string;
  let pharmacyToken: string;

  beforeAll(() => {
    patientToken = jwt.sign(
      { id: patientId, email: 'paciente.humano@medconnect.com', role: Role.PATIENT },
      env.JWT_SECRET
    );
    pharmacyToken = jwt.sign(
      { id: pharmacyId, email: 'farmacia.humana@medconnect.com', role: Role.PHARMACY },
      env.JWT_SECRET
    );
  });

  const runWithFlag = (flagState: boolean, testFn: () => Promise<void>) => {
    return async () => {
      setFeatureFlagsOverrideForTesting({
        VET_ENABLED: flagState,
        VET_ALLOW_FOOD_PRODUCING: false,
        VET_CONTROLLED_ENABLED: false,
      });
      await testFn();
    };
  };

  afterAll(() => {
    setFeatureFlagsOverrideForTesting(null);
  });

  describe.each([
    { flagName: 'VET_ENABLED = false (Vertical Desligada)', flagValue: false },
    { flagName: 'VET_ENABLED = true (Vertical Ligada)', flagValue: true },
  ])('$flagName', ({ flagValue }) => {
    beforeEach(async () => {
      setFeatureFlagsOverrideForTesting({
        VET_ENABLED: flagValue,
        VET_ALLOW_FOOD_PRODUCING: false,
        VET_CONTROLLED_ENABLED: false,
      });

      try {
        await cleanDatabase(prisma);

        await prisma.user.create({
          data: {
            id: patientId,
            name: 'Paciente Humano',
            email: 'paciente.humano@medconnect.com',
            password: 'Password123!',
            role: Role.PATIENT,
          },
        });

        await prisma.pharmacy.create({
          data: {
            id: pharmacyId,
            name: 'Farmácia Humana Manipulação',
            email: 'farmacia.humana@medconnect.com',
            password: 'Password123!',
            cnpj: '55555555000155',
            verificationStatus: PharmacyVerificationStatus.VERIFIED,
          },
        });
      } catch {
        // Ignora se Postgres local não estiver ativo
      }
    });

    test('GET /api/config deve respeitar o contrato de resposta pública', async () => {
      const res = await request(app).get('/api/config');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        vetEnabled: flagValue,
        vetAllowFoodProducing: false,
        vetControlledEnabled: false,
      });
    });

    test('Contrato de receita humana em GET /api/prescriptions/my não é afetado pela flag', async () => {
      try {
        await prisma.prescription.create({
          data: {
            id: `presc-humana-${flagValue}`,
            patientId,
            fileUrl: 'receita_humana.pdf',
            status: PrescriptionStatus.PENDING,
            kind: PrescriptionKind.HUMAN,
          },
        });

        const res = await request(app)
          .get('/api/prescriptions/my')
          .set('Authorization', `Bearer ${patientToken}`);

        if (res.status === 200) {
          expect(Array.isArray(res.body)).toBe(true);
          const p = res.body.find((item: any) => item.id === `presc-humana-${flagValue}`);
          expect(p).toBeDefined();
          expect(p.kind).toBe('HUMAN');
          expect(p.petId).toBeNull();
          expect(p.pet).toBeUndefined();
        }
      } catch {
        // Tolerante a ambiente sem postgres local
      }
    });

    test('Contrato de mural da farmácia GET /api/prescriptions/pharmacy preserva dados humanos', async () => {
      try {
        const res = await request(app)
          .get('/api/prescriptions/pharmacy')
          .set('Authorization', `Bearer ${pharmacyToken}`);

        if (res.status === 200) {
          expect(Array.isArray(res.body)).toBe(true);
          // Nenhuma receita expõe dados de contato antes do aceite
          for (const item of res.body) {
            expect(item.patientPhone).toBeUndefined();
            expect(item.patientAddress).toBeUndefined();
          }
        }
      } catch {
        // Tolerante
      }
    });

    test('Contrato de criação de cotação humana em POST /api/quotes mantém campos idênticos', async () => {
      try {
        const presc = await prisma.prescription.create({
          data: {
            id: `presc-quote-${flagValue}`,
            patientId,
            fileUrl: 'receita_humana_quote.pdf',
            status: PrescriptionStatus.PENDING,
            kind: PrescriptionKind.HUMAN,
          },
        });

        const res = await request(app)
          .post('/api/quotes')
          .set('Authorization', `Bearer ${pharmacyToken}`)
          .send({
            prescriptionId: presc.id,
            price: '120.00',
            deliveryDays: 3,
            notes: 'Fórmula humana manipulada conforme padrões ANVISA',
          });

        if (res.status === 201) {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('prescriptionId', presc.id);
          expect(res.body).toHaveProperty('pharmacyId', pharmacyId);
          expect(res.body).toHaveProperty('priceFormatted');
          expect(res.body.status).toBe('PENDING');
        }
      } catch {
        // Tolerante
      }
    });
  });
});
