import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { PharmacyVerificationStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('TAREFA 3.1 — Matriz de Autorização por Papel (RBAC: PATIENT / PHARMACY / ADMIN / UNAUTHENTICATED)', () => {
  const patientId = 'patient-rbac-test';
  const pharmacyId = 'pharmacy-rbac-test';
  const adminId = 'admin-rbac-test';

  const patientToken = jwt.sign(
    { id: patientId, email: 'paciente.rbac@test.com', role: 'PATIENT' },
    env.JWT_SECRET
  );

  const pharmacyToken = jwt.sign(
    { id: pharmacyId, email: 'farmacia.rbac@test.com', role: 'PHARMACY' },
    env.JWT_SECRET
  );

  const adminToken = jwt.sign(
    { id: adminId, email: 'admin.rbac@medconnect.com', role: 'ADMIN' },
    env.JWT_SECRET
  );

  beforeAll(async () => {
    await cleanDatabase(prisma);

    await prisma.user.create({
      data: {
        id: patientId,
        name: 'Paciente RBAC',
        email: 'paciente.rbac@test.com',
        password: 'Password123!',
        role: 'PATIENT'
      }
    });

    await prisma.pharmacy.create({
      data: {
        id: pharmacyId,
        name: 'Farmácia RBAC',
        email: 'farmacia.rbac@test.com',
        password: 'Password123!',
        cnpj: '44555666000188',
        verified: true,
        verificationStatus: PharmacyVerificationStatus.VERIFIED
      }
    });

    await prisma.user.create({
      data: {
        id: adminId,
        name: 'Admin RBAC',
        email: 'admin.rbac@medconnect.com',
        password: 'Password123!',
        role: 'ADMIN'
      }
    });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  function getToken(role: 'UNAUTH' | 'PATIENT' | 'PHARMACY' | 'ADMIN'): string | null {
    switch (role) {
      case 'PATIENT':
        return patientToken;
      case 'PHARMACY':
        return pharmacyToken;
      case 'ADMIN':
        return adminToken;
      default:
        return null;
    }
  }

  // Tabela parametrizada: [Método, Rota, Papel, Status Esperado, Descrição]
  const rbacMatrix: Array<[
    'get' | 'post' | 'patch',
    string,
    'UNAUTH' | 'PATIENT' | 'PHARMACY' | 'ADMIN',
    number | number[],
    string
  ]> = [
    // --- Rotas Administrativas ---
    ['get', '/api/admin/pharmacies/pending', 'UNAUTH', 401, 'Rejeita chamada anônima em /admin'],
    ['get', '/api/admin/pharmacies/pending', 'PATIENT', 403, 'Bloqueia Paciente em /admin'],
    ['get', '/api/admin/pharmacies/pending', 'PHARMACY', 403, 'Bloqueia Farmácia em /admin'],
    ['get', '/api/admin/pharmacies/pending', 'ADMIN', 200, 'Permite Admin em /admin/pharmacies/pending'],

    ['patch', '/api/admin/pharmacies/non-existent/verify', 'UNAUTH', 401, 'Rejeita chamada anônima em verificar farmácia'],
    ['patch', '/api/admin/pharmacies/non-existent/verify', 'PATIENT', 403, 'Bloqueia Paciente em verificar farmácia'],
    ['patch', '/api/admin/pharmacies/non-existent/verify', 'PHARMACY', 403, 'Bloqueia Farmácia em verificar farmácia'],
    ['patch', '/api/admin/pharmacies/non-existent/verify', 'ADMIN', [400, 404], 'Admin atinge controlador em verificar farmácia'],

    ['get', '/api/users', 'UNAUTH', 401, 'Rejeita anônimo em /api/users'],
    ['get', '/api/users', 'PATIENT', 403, 'Bloqueia Paciente em /api/users'],
    ['get', '/api/users', 'PHARMACY', 403, 'Bloqueia Farmácia em /api/users'],
    ['get', '/api/users', 'ADMIN', 200, 'Permite Admin em /api/users'],

    // --- Rotas Exclusivas de Paciente ---
    ['get', '/api/prescriptions/my', 'UNAUTH', 401, 'Rejeita anônimo em minhas receitas'],
    ['get', '/api/prescriptions/my', 'PHARMACY', 403, 'Bloqueia Farmácia em minhas receitas'],
    ['get', '/api/prescriptions/my', 'ADMIN', 403, 'Bloqueia Admin em minhas receitas'],
    ['get', '/api/prescriptions/my', 'PATIENT', 200, 'Permite Paciente em minhas receitas'],

    ['post', '/api/orders', 'UNAUTH', 401, 'Rejeita anônimo na criação de pedido'],
    ['post', '/api/orders', 'PHARMACY', 403, 'Bloqueia Farmácia na criação de pedido'],
    ['post', '/api/orders', 'ADMIN', 403, 'Bloqueia Admin na criação de pedido'],
    ['post', '/api/orders', 'PATIENT', [400, 404], 'Paciente atinge validação do pedido'],

    ['post', '/api/reviews', 'UNAUTH', 401, 'Rejeita anônimo na criação de avaliação'],
    ['post', '/api/reviews', 'PHARMACY', 403, 'Bloqueia Farmácia na criação de avaliação'],
    ['post', '/api/reviews', 'ADMIN', 403, 'Bloqueia Admin na criação de avaliação'],
    ['post', '/api/reviews', 'PATIENT', [400, 404], 'Paciente atinge validação da avaliação'],

    // --- Rotas Exclusivas de Farmácia ---
    ['get', '/api/prescriptions/pharmacy', 'UNAUTH', 401, 'Rejeita anônimo no mural de receitas'],
    ['get', '/api/prescriptions/pharmacy', 'PATIENT', 403, 'Bloqueia Paciente no mural de receitas'],
    ['get', '/api/prescriptions/pharmacy', 'ADMIN', 403, 'Bloqueia Admin no mural de receitas'],
    ['get', '/api/prescriptions/pharmacy', 'PHARMACY', 200, 'Permite Farmácia no mural de receitas'],

    ['get', '/api/quotes/my', 'UNAUTH', 401, 'Rejeita anônimo em minhas cotações'],
    ['get', '/api/quotes/my', 'PATIENT', 403, 'Bloqueia Paciente em minhas cotações'],
    ['get', '/api/quotes/my', 'ADMIN', 403, 'Bloqueia Admin em minhas cotações'],
    ['get', '/api/quotes/my', 'PHARMACY', 200, 'Permite Farmácia em minhas cotações'],

    ['get', '/api/pharmacy/stats', 'UNAUTH', 401, 'Rejeita anônimo em estatísticas da farmácia'],
    ['get', '/api/pharmacy/stats', 'PATIENT', 403, 'Bloqueia Paciente em estatísticas da farmácia'],
    ['get', '/api/pharmacy/stats', 'ADMIN', 403, 'Bloqueia Admin em estatísticas da farmácia'],
    ['get', '/api/pharmacy/stats', 'PHARMACY', 200, 'Permite Farmácia em estatísticas da farmácia'],

    ['patch', '/api/orders/non-existent/status', 'UNAUTH', 401, 'Rejeita anônimo em atualização de pedido'],
    ['patch', '/api/orders/non-existent/status', 'PATIENT', 403, 'Bloqueia Paciente em atualização de pedido'],
    ['patch', '/api/orders/non-existent/status', 'ADMIN', 403, 'Bloqueia Admin em atualização de pedido'],
    ['patch', '/api/orders/non-existent/status', 'PHARMACY', [400, 404], 'Farmácia atinge controlador de pedido'],

    // --- Rotas Compartilhadas / Comuns ---
    ['get', '/api/orders/my', 'UNAUTH', 401, 'Rejeita anônimo em /orders/my'],
    ['get', '/api/orders/my', 'PATIENT', 200, 'Permite Paciente em /orders/my'],
    ['get', '/api/orders/my', 'PHARMACY', 200, 'Permite Farmácia em /orders/my'],

    ['get', '/api/notifications', 'UNAUTH', 401, 'Rejeita anônimo em notificações'],
    ['get', '/api/notifications', 'PATIENT', 200, 'Permite Paciente em notificações'],
    ['get', '/api/notifications', 'PHARMACY', 200, 'Permite Farmácia em notificações']
  ];

  test.each(rbacMatrix)(
    '%s %s como [%s] -> espera %s (%s)',
    async (method, path, role, expectedStatus, description) => {
      const token = getToken(role);
      let req = (request(app) as any)[method](path);

      if (token) {
        req = req.set('Authorization', `Bearer ${token}`);
      }

      const res = await req.send({});

      if (Array.isArray(expectedStatus)) {
        expect(expectedStatus).toContain(res.status);
      } else {
        expect(res.status).toBe(expectedStatus);
      }
    }
  );
});
