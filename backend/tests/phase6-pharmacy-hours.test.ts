import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { createPharmacy, createUser, tokenFor } from './helpers/phase6Fixtures';
import { OrderStatus, PharmacyVerificationStatus, PrescriptionStatus, QuoteStatus, Role } from '@prisma/client';

/**
 * FASE 6 — Perfil da farmácia, grade de horários (PUT /pharmacy/me/hours) e vitrine pública.
 */
describe('FASE 6 — Farmácia: perfil próprio, horários de atendimento e vitrine pública', () => {
  const a = { id: 'p6-ph-a', email: 'p6.ph.a@test.com', cnpj: '70000000000101' };
  const b = { id: 'p6-ph-b', email: 'p6.ph.b@test.com', cnpj: '70000000000102' };
  const pending = { id: 'p6-ph-pending', email: 'p6.ph.pending@test.com', cnpj: '70000000000103' };
  const suspended = { id: 'p6-ph-suspended', email: 'p6.ph.suspended@test.com', cnpj: '70000000000104' };
  const rejected = { id: 'p6-ph-rejected', email: 'p6.ph.rejected@test.com', cnpj: '70000000000105' };
  const patient = { id: 'p6-ph-patient', email: 'p6.ph.patient@test.com' };

  const tokenA = tokenFor(a.id, a.email, Role.PHARMACY);
  const tokenB = tokenFor(b.id, b.email, Role.PHARMACY);

  const ALWAYS_OPEN = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ pharmacyId: b.id, dayOfWeek, opensAt: 0, closesAt: 1440 }));

  const LUNCH_SCHEDULE = [
    ...[1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
      { dayOfWeek, opensAt: '13:00', closesAt: '18:30' },
      { dayOfWeek, opensAt: '09:00', closesAt: '12:00' }
    ]),
    { dayOfWeek: 6, opensAt: '09:00', closesAt: '13:00' }
  ];

  beforeAll(async () => {
    await cleanDatabase(prisma);
    await createPharmacy(prisma, {
      ...a,
      name: 'Farmácia Alfa Manipulação',
      phone: '1130000001',
      address: 'Rua Secreta A, 1',
      city: 'São Paulo',
      state: 'SP',
      deliveryArea: 'Zona Sul',
      description: 'Especialista em dermatológicos',
      documentUrl: 'https://docs.example/a.pdf'
    });
    await createPharmacy(prisma, {
      ...b,
      name: 'Botica Beta',
      phone: '1930000002',
      address: 'Rua Secreta B, 2',
      city: 'Campinas',
      state: 'SP',
      services: ['Florais', 'Veterinária']
    });
    await createPharmacy(prisma, {
      ...pending,
      name: 'Farmácia Pendente',
      verified: false,
      verificationStatus: PharmacyVerificationStatus.PENDING_VERIFICATION
    });
    await createPharmacy(prisma, {
      ...suspended,
      name: 'Farmácia Suspensa',
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspensionReason: 'Teste'
    });
    await createPharmacy(prisma, {
      ...rejected,
      name: 'Farmácia Reprovada',
      verified: false,
      verificationStatus: PharmacyVerificationStatus.REJECTED
    });
    await prisma.pharmacyBusinessHour.createMany({ data: ALWAYS_OPEN });

    // Duas avaliações para a farmácia A (média 4.5)
    await createUser(prisma, { ...patient });
    for (const rating of [4, 5]) {
      const prescription = await prisma.prescription.create({
        data: { patientId: patient.id, fileUrl: `uploads/p6-ph-${rating}.jpg`, status: PrescriptionStatus.ACCEPTED }
      });
      const quote = await prisma.quote.create({
        data: { prescriptionId: prescription.id, pharmacyId: a.id, priceCents: 5000, status: QuoteStatus.ACCEPTED }
      });
      const order = await prisma.order.create({ data: { quoteId: quote.id, status: OrderStatus.DELIVERED } });
      await prisma.review.create({ data: { orderId: order.id, patientId: patient.id, pharmacyId: a.id, rating } });
    }
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  describe('GET/PATCH /api/pharmacy/me', () => {
    it('retorna o perfil completo da própria farmácia (sem horários = fechada)', async () => {
      const res = await request(app).get('/api/pharmacy/me').set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: a.id,
        name: 'Farmácia Alfa Manipulação',
        email: a.email,
        cnpj: a.cnpj,
        phone: '1130000001',
        city: 'São Paulo',
        state: 'SP',
        timezone: 'America/Sao_Paulo',
        services: [],
        verificationStatus: 'VERIFIED',
        verified: true,
        status: 'ACTIVE',
        businessHours: [],
        openStatus: { isOpen: false, closesAt: null, nextOpening: null }
      });
      for (const key of ['description', 'termsAcceptedAt', 'termsVersion', 'sanitaryLicense', 'technicalResponsibleCrf', 'rejectionReason', 'createdAt']) {
        expect(res.body).toHaveProperty(key);
      }
      expect(res.body).not.toHaveProperty('password');
      expect(res.body).not.toHaveProperty('documentUrl');
    });

    it('o alias /api/pharmacies/me devolve o mesmo perfil', async () => {
      const res = await request(app).get('/api/pharmacies/me').set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(b.id);
      expect(res.body.businessHours).toHaveLength(7);
      expect(res.body.openStatus.isOpen).toBe(true);
    });

    it('PATCH atualiza campos operacionais; nome/CNPJ/e-mail são ignorados', async () => {
      const res = await request(app)
        .patch('/api/pharmacy/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          description: 'Manipulação magistral e dermocosméticos',
          services: ['Cápsulas', 'Dermocosméticos', 'Cápsulas'],
          city: 'Rio de Janeiro',
          state: 'rj',
          deliveryArea: 'Zona Sul e Centro',
          phone: '',
          name: 'Nome Hackeado',
          cnpj: '00000000000000',
          email: 'hack@test.com',
          id: b.id
        });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: a.id,
        name: 'Farmácia Alfa Manipulação',
        cnpj: a.cnpj,
        email: a.email,
        description: 'Manipulação magistral e dermocosméticos',
        services: ['Cápsulas', 'Dermocosméticos'],
        city: 'Rio de Janeiro',
        state: 'RJ',
        deliveryArea: 'Zona Sul e Centro',
        phone: null
      });

      // IDOR: a farmácia B não foi afetada
      const dbB = await prisma.pharmacy.findUnique({ where: { id: b.id } });
      expect(dbB).toMatchObject({ name: 'Botica Beta', city: 'Campinas', email: b.email });
    });

    it('PATCH valida limites de descrição, serviços e UF', async () => {
      const cases = [
        { description: 'x'.repeat(601) },
        { services: Array.from({ length: 13 }, (_, i) => `Serviço ${i}`) },
        { services: ['y'.repeat(41)] },
        { state: 'XYZ' }
      ];
      for (const body of cases) {
        const res = await request(app).patch('/api/pharmacy/me').set('Authorization', `Bearer ${tokenA}`).send(body);
        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('token de farmácia inexistente → 404', async () => {
      const ghost = tokenFor('p6-ph-ghost', 'ghost@test.com', Role.PHARMACY);
      expect((await request(app).get('/api/pharmacy/me').set('Authorization', `Bearer ${ghost}`)).status).toBe(404);
      expect(
        (await request(app).patch('/api/pharmacy/me').set('Authorization', `Bearer ${ghost}`).send({ city: 'X' })).status
      ).toBe(404);
      expect(
        (await request(app).put('/api/pharmacy/me/hours').set('Authorization', `Bearer ${ghost}`).send({ hours: [] })).status
      ).toBe(404);
    });
  });

  describe('PUT /api/pharmacy/me/hours', () => {
    it('salva grade com pausa de almoço e sábado meio período, ordenada, com fuso', async () => {
      const res = await request(app)
        .put('/api/pharmacy/me/hours')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ timezone: 'America/Manaus', hours: LUNCH_SCHEDULE });

      expect(res.status).toBe(200);
      expect(res.body.timezone).toBe('America/Manaus');
      expect(res.body.businessHours).toHaveLength(11);
      expect(res.body.businessHours[0]).toEqual({ dayOfWeek: 1, opensAt: '09:00', closesAt: '12:00' });
      expect(res.body.businessHours[1]).toEqual({ dayOfWeek: 1, opensAt: '13:00', closesAt: '18:30' });
      expect(res.body.businessHours[10]).toEqual({ dayOfWeek: 6, opensAt: '09:00', closesAt: '13:00' });
      expect(typeof res.body.openStatus.isOpen).toBe('boolean');

      const rows = await prisma.pharmacyBusinessHour.findMany({ where: { pharmacyId: a.id } });
      expect(rows).toHaveLength(11);
      expect(rows.find((r) => r.dayOfWeek === 1 && r.opensAt === 780)?.closesAt).toBe(1110);
    });

    it.each([
      ['INVALID_TIME_FORMAT', { hours: [{ dayOfWeek: 1, opensAt: '9:00', closesAt: '12:00' }] }],
      ['INVALID_TIME_FORMAT', { hours: [{ dayOfWeek: 1, opensAt: '24:00', closesAt: '24:00' }] }],
      ['INVALID_INTERVAL', { hours: [{ dayOfWeek: 1, opensAt: '18:00', closesAt: '09:00' }] }],
      [
        'OVERLAPPING_INTERVALS',
        {
          hours: [
            { dayOfWeek: 2, opensAt: '09:00', closesAt: '13:00' },
            { dayOfWeek: 2, opensAt: '12:00', closesAt: '18:00' }
          ]
        }
      ],
      [
        'TOO_MANY_INTERVALS',
        {
          hours: ['06:00', '08:00', '10:00', '12:00', '14:00'].map((opensAt, i) => ({
            dayOfWeek: 3,
            opensAt,
            closesAt: `${String(7 + i * 2).padStart(2, '0')}:00`
          }))
        }
      ],
      ['INVALID_TIMEZONE', { timezone: 'Marte/Olympus', hours: [] }],
      ['VALIDATION_ERROR', { hours: [{ dayOfWeek: 7, opensAt: '09:00', closesAt: '10:00' }] }],
      ['VALIDATION_ERROR', { timezone: 'America/Sao_Paulo' }]
    ])('rejeita grade inválida com %s sem alterar a grade salva', async (code, body) => {
      const res = await request(app).put('/api/pharmacy/me/hours').set('Authorization', `Bearer ${tokenA}`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe(code);
      expect(typeof res.body.error.message).toBe('string');

      expect(await prisma.pharmacyBusinessHour.count({ where: { pharmacyId: a.id } })).toBe(11);
      expect((await prisma.pharmacy.findUnique({ where: { id: a.id } }))?.timezone).toBe('America/Manaus');
    });

    it('IDOR: a grade da farmácia A não toca a da farmácia B', async () => {
      expect(await prisma.pharmacyBusinessHour.count({ where: { pharmacyId: b.id } })).toBe(7);
    });

    it('grade vazia fecha todos os dias (sem alterar o fuso quando omitido)', async () => {
      const res = await request(app).put('/api/pharmacy/me/hours').set('Authorization', `Bearer ${tokenA}`).send({ hours: [] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        timezone: 'America/Manaus',
        businessHours: [],
        openStatus: { isOpen: false, closesAt: null, nextOpening: null }
      });
      expect(await prisma.pharmacyBusinessHour.count({ where: { pharmacyId: a.id } })).toBe(0);
    });
  });

  describe('GET /api/pharmacies/public', () => {
    it('lista apenas farmácias VERIFIED e ACTIVE, sem dados de contato', async () => {
      const res = await request(app).get('/api/pharmacies/public');
      expect(res.status).toBe(200);

      const ids = res.body.data.map((p: any) => p.id).sort();
      expect(ids).toEqual([a.id, b.id].sort());
      expect(res.body.meta).toEqual({ total: 2, openNow: 1 });

      for (const item of res.body.data) {
        for (const forbidden of ['email', 'cnpj', 'phone', 'address', 'password', 'documentUrl', 'cnpjData', 'sanitaryLicense']) {
          expect(item).not.toHaveProperty(forbidden);
        }
        expect(Object.keys(item).sort()).toEqual(
          [
            'averageRating',
            'businessHours',
            'city',
            'deliveryArea',
            'description',
            'id',
            'name',
            'openStatus',
            'reviewsCount',
            'services',
            'state',
            'timezone'
          ].sort()
        );
      }

      const alfa = res.body.data.find((p: any) => p.id === a.id);
      expect(alfa).toMatchObject({ averageRating: 4.5, reviewsCount: 2, businessHours: [] });
      const beta = res.body.data.find((p: any) => p.id === b.id);
      expect(beta).toMatchObject({ averageRating: 0, reviewsCount: 0, services: ['Florais', 'Veterinária'] });
      expect(beta.openStatus).toEqual({ isOpen: true, closesAt: '24:00', nextOpening: null });

      expect(JSON.stringify(res.body)).not.toContain('Rua Secreta');
    });

    it('openNow=true filtra as abertas agora', async () => {
      const res = await request(app).get('/api/pharmacies/public?openNow=true');
      expect(res.status).toBe(200);
      expect(res.body.data.map((p: any) => p.id)).toEqual([b.id]);
      expect(res.body.meta).toEqual({ total: 1, openNow: 1 });
    });

    it('search e city são case-insensitive', async () => {
      const bySearch = await request(app).get('/api/pharmacies/public').query({ search: 'BOTICA' });
      expect(bySearch.body.data.map((p: any) => p.id)).toEqual([b.id]);

      const byDescription = await request(app).get('/api/pharmacies/public').query({ search: 'dermocosm' });
      expect(byDescription.body.data.map((p: any) => p.id)).toEqual([a.id]);

      const byCity = await request(app).get('/api/pharmacies/public').query({ city: 'rio de' });
      expect(byCity.body.data.map((p: any) => p.id)).toEqual([a.id]);

      const none = await request(app).get('/api/pharmacies/public').query({ search: 'Pendente' });
      expect(none.body.data).toEqual([]);
    });

    it('openNow inválido → 400', async () => {
      const res = await request(app).get('/api/pharmacies/public?openNow=talvez');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
