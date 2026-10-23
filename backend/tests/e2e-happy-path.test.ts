import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { cleanDatabase } from './helpers/dbCleanup';
import { OrderStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

describe('TAREFA 3.1 — Caminho Feliz Ponta a Ponta (End-to-End)', () => {
  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  it('deve executar o fluxo completo de ponta a ponta: cadastro -> login -> receita -> cotação -> pedido -> entrega -> avaliação', async () => {
    // 1. Cadastro do Paciente
    const patientRegisterRes = await request(app)
      .post('/api/users')
      .send({
        name: 'Maria Silva',
        email: 'maria.paciente@exemplo.com',
        password: 'SenhaForte#123',
        cpf: '52998224725',
        phone: '11988887777',
        address: 'Av Paulista, 1000'
      });
    expect(patientRegisterRes.status).toBe(201);
    expect(patientRegisterRes.body.id).toBeDefined();

    // Login do Paciente
    const patientLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'maria.paciente@exemplo.com',
        password: 'SenhaForte#123',
        type: 'patient'
      });
    expect(patientLoginRes.status).toBe(200);
    const patientToken = patientLoginRes.body.accessToken;
    expect(patientToken).toBeDefined();

    // 2. Cadastro da Farmácia
    const pharmacyRegisterRes = await request(app)
      .post('/api/pharmacies')
      .send({
        name: 'Farmácia Vida & Saúde',
        email: 'contato@farmaciavida.com',
        password: 'SenhaForte#123',
        cnpj: '11222333000181',
        phone: '1133334444',
        address: 'Rua das Flores, 50',
        sanitaryLicense: 'CEVS-12345/2026',
        operatingAuth: 'AFE-987654',
        technicalResponsibleName: 'Dra. Carolina Farmacêutica',
        technicalResponsibleCrf: 'CRF-SP 45678',
        technicalResponsibleUf: 'SP',
        documentUrl: 'https://docs.medconnect.com/licenca.pdf'
      });
    expect(pharmacyRegisterRes.status).toBe(201);
    const pharmacyId = pharmacyRegisterRes.body.id;
    expect(pharmacyId).toBeDefined();

    // Login da Farmácia
    const pharmacyLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'contato@farmaciavida.com',
        password: 'SenhaForte#123',
        type: 'pharmacy'
      });
    expect(pharmacyLoginRes.status).toBe(200);
    const pharmacyToken = pharmacyLoginRes.body.accessToken;
    expect(pharmacyToken).toBeDefined();

    // 3. Admin aprova a Farmácia
    const adminToken = jwt.sign(
      { id: 'admin-1', email: 'admin@medconnect.com.br', role: 'ADMIN' },
      env.JWT_SECRET
    );
    await prisma.user.create({
      data: {
        id: 'admin-1',
        name: 'Administrador MedConnect',
        email: 'admin@medconnect.com.br',
        password: 'Password123!',
        role: 'ADMIN'
      }
    });

    const verifyRes = await request(app)
      .patch(`/api/admin/pharmacies/${pharmacyId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approved: true });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.verificationStatus).toBe('VERIFIED');

    // 4. Paciente cria receita médica com arquivo PDF válido (magic bytes %PDF-1.4)
    const validPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const createPrescriptionRes = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${patientToken}`)
      .attach('file', validPdfBuffer, 'receita-manipulada.pdf');
    expect(createPrescriptionRes.status).toBe(201);
    const prescriptionId = createPrescriptionRes.body.id;
    expect(prescriptionId).toBeDefined();

    // 5. Farmácia consulta oportunidades de receita no mural aberto
    const pharmacyPrescriptionsRes = await request(app)
      .get('/api/prescriptions/pharmacy')
      .set('Authorization', `Bearer ${pharmacyToken}`);
    expect(pharmacyPrescriptionsRes.status).toBe(200);
    expect(Array.isArray(pharmacyPrescriptionsRes.body)).toBe(true);
    const foundPrescription = pharmacyPrescriptionsRes.body.find(
      (p: any) => p.id === prescriptionId
    );
    expect(foundPrescription).toBeDefined();
    // LGPD: dados pessoais do paciente mascarados no mural
    expect(foundPrescription.patient.anonymousId).toBeDefined();
    expect(foundPrescription.patient.phone).toBeUndefined();

    // 6. Farmácia envia cotação com valor de R$ 125.50 e 3 dias de prazo
    const quoteRes = await request(app)
      .post('/api/quotes')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        prescriptionId,
        price: '125.50',
        deliveryDays: 3,
        notes: 'Inclui cápsulas vegetais sem lactose e frete grátis.'
      });
    expect(quoteRes.status).toBe(201);
    const quoteId = quoteRes.body.id;
    expect(quoteId).toBeDefined();
    expect(quoteRes.body.price).toBe('125.50');

    // 7. Paciente consulta cotações da sua receita
    const quotesListRes = await request(app)
      .get(`/api/prescriptions/${prescriptionId}/quotes`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(quotesListRes.status).toBe(200);
    expect(Array.isArray(quotesListRes.body)).toBe(true);
    expect(quotesListRes.body.length).toBeGreaterThanOrEqual(1);

    // 8. Paciente aprova a cotação gerando o Pedido
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ quoteId });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.id;
    expect(orderId).toBeDefined();
    expect(orderRes.body.status).toBe(OrderStatus.PRODUCTION);
    expect(orderRes.body.quote.price).toBe('125.50');

    // 9. Farmácia visualiza o pedido criado
    const getOrderRes = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${pharmacyToken}`);
    expect(getOrderRes.status).toBe(200);
    expect(getOrderRes.body.id).toBe(orderId);
    expect(getOrderRes.body.status).toBe(OrderStatus.PRODUCTION);

    // 10. Farmácia avança status para DELIVERY
    const updateToDeliveryRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        status: OrderStatus.DELIVERY
      });
    expect(updateToDeliveryRes.status).toBe(200);
    expect(updateToDeliveryRes.body.status).toBe(OrderStatus.DELIVERY);

    // 11. Farmácia avança status para DELIVERED
    const updateToDeliveredRes = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({
        status: OrderStatus.DELIVERED
      });
    expect(updateToDeliveredRes.status).toBe(200);
    expect(updateToDeliveredRes.body.status).toBe(OrderStatus.DELIVERED);

    // 12. Paciente avalia o pedido concluído
    const reviewRes = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        orderId,
        rating: 5,
        comment: 'Excelente atendimento, fórmula manipulada com precisão e entrega rápida!'
      });
    expect(reviewRes.status).toBe(201);
    expect(reviewRes.body.rating).toBe(5);
    expect(reviewRes.body.comment).toContain('Excelente');

    // 13. Farmácia consulta suas estatísticas consolidadas
    const statsRes = await request(app)
      .get('/api/pharmacy/stats')
      .set('Authorization', `Bearer ${pharmacyToken}`);
    expect(statsRes.status).toBe(200);
    expect(statsRes.body.deliveredOrders).toBeGreaterThanOrEqual(1);
    expect(statsRes.body.averageRating).toBe(5);
  });
});
