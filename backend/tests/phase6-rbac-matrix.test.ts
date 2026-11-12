import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { createPharmacy, createUser, tokenFor } from './helpers/phase6Fixtures';
import { Role } from '@prisma/client';

/**
 * Matriz RBAC das rotas novas da Fase 6 (anônimo / paciente / farmácia / admin).
 * Mantida abaixo de 100 requisições por arquivo por causa do limitador global da API.
 */
describe('FASE 6 — Matriz RBAC das rotas de gestão, horários e suporte', () => {
  const patient = { id: 'p6-rbac-patient', email: 'p6.rbac.patient@test.com' };
  const pharmacy = { id: 'p6-rbac-pharmacy', email: 'p6.rbac.pharmacy@test.com' };
  const admin = { id: 'p6-rbac-admin', email: 'p6.rbac.admin@test.com' };

  const tokens: Record<'PATIENT' | 'PHARMACY' | 'ADMIN', string> = {
    PATIENT: tokenFor(patient.id, patient.email, Role.PATIENT),
    PHARMACY: tokenFor(pharmacy.id, pharmacy.email, Role.PHARMACY),
    ADMIN: tokenFor(admin.id, admin.email, Role.ADMIN)
  };

  beforeAll(async () => {
    await cleanDatabase(prisma);
    await createUser(prisma, { ...patient, role: Role.PATIENT });
    await createUser(prisma, { ...admin, role: Role.ADMIN });
    await createPharmacy(prisma, { ...pharmacy, cnpj: '61222333000144' });
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  type Who = 'UNAUTH' | 'PATIENT' | 'PHARMACY' | 'ADMIN';
  type Method = 'get' | 'post' | 'patch' | 'put';

  const adminRoutes: Array<[Method, string, number | number[]]> = [
    ['get', '/api/admin/overview', 200],
    ['get', '/api/admin/users', 200],
    ['get', '/api/admin/users/inexistente', 404],
    ['patch', '/api/admin/users/inexistente/status', [400, 404]],
    ['get', '/api/admin/pharmacies', 200],
    ['get', '/api/admin/pharmacies/inexistente', 404],
    ['patch', '/api/admin/pharmacies/inexistente/status', [400, 404]],
    ['get', '/api/admin/orders', 200],
    ['get', '/api/admin/orders/inexistente', 404],
    ['get', '/api/admin/prescriptions', 200],
    ['get', '/api/admin/support-tickets', 200],
    ['get', '/api/admin/support-tickets/inexistente', 404],
    ['patch', '/api/admin/support-tickets/inexistente', [400, 404]]
  ];

  const matrix: Array<[Method, string, Who, number | number[]]> = [
    // Perfil do paciente/admin
    ['get', '/api/users/me', 'UNAUTH', 401],
    ['get', '/api/users/me', 'PHARMACY', 403],
    ['get', '/api/users/me', 'PATIENT', 200],
    ['get', '/api/users/me', 'ADMIN', 200],
    ['patch', '/api/users/me', 'UNAUTH', 401],
    ['patch', '/api/users/me', 'PHARMACY', 403],

    // Perfil e horários da farmácia
    ['get', '/api/pharmacy/me', 'UNAUTH', 401],
    ['get', '/api/pharmacy/me', 'PATIENT', 403],
    ['get', '/api/pharmacy/me', 'ADMIN', 403],
    ['get', '/api/pharmacy/me', 'PHARMACY', 200],
    ['patch', '/api/pharmacy/me', 'UNAUTH', 401],
    ['patch', '/api/pharmacy/me', 'PATIENT', 403],
    ['patch', '/api/pharmacy/me', 'ADMIN', 403],
    ['put', '/api/pharmacy/me/hours', 'UNAUTH', 401],
    ['put', '/api/pharmacy/me/hours', 'PATIENT', 403],
    ['put', '/api/pharmacy/me/hours', 'ADMIN', 403],

    // Público
    ['get', '/api/pharmacies/public', 'UNAUTH', 200],

    // Suporte: meus chamados (qualquer papel autenticado)
    ['get', '/api/support/tickets/my', 'UNAUTH', 401],
    ['get', '/api/support/tickets/my', 'PATIENT', 200],
    ['get', '/api/support/tickets/my', 'PHARMACY', 200],
    ['get', '/api/support/tickets/my', 'ADMIN', 200],

    // Troca de senha exige autenticação
    ['post', '/api/auth/change-password', 'UNAUTH', 401],

    // Todas as rotas administrativas novas: anônimo 401, paciente/farmácia 403, admin alcança o controller
    ...adminRoutes.flatMap(([method, path, adminStatus]) => [
      [method, path, 'UNAUTH', 401] as [Method, string, Who, number],
      [method, path, 'PATIENT', 403] as [Method, string, Who, number],
      [method, path, 'PHARMACY', 403] as [Method, string, Who, number],
      [method, path, 'ADMIN', adminStatus] as [Method, string, Who, number | number[]]
    ])
  ];

  test.each(matrix)('%s %s como [%s] -> espera %s', async (method, path, who, expected) => {
    let req = (request(app) as any)[method](path);
    if (who !== 'UNAUTH') {
      req = req.set('Authorization', `Bearer ${tokens[who]}`);
    }
    const res = await req.send({});

    if (Array.isArray(expected)) {
      expect(expected).toContain(res.status);
    } else {
      expect(res.status).toBe(expected);
    }
    // Erros sempre no formato { error: { code, message } }
    if (res.status >= 400) {
      expect(typeof res.body.error?.code).toBe('string');
      expect(typeof res.body.error?.message).toBe('string');
    }
  });
});
