import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';

describe('Order Security & Authorization Tests', () => {
  const secret = process.env.JWT_SECRET || 'medconnect_super_secret_key';

  const patientToken = jwt.sign(
    { id: 'patient-1', email: 'paciente@medconnect.com', role: 'PATIENT' },
    secret
  );

  const pharmacyToken = jwt.sign(
    { id: 'pharmacy-1', email: 'farmacia@medconnect.com', role: 'PHARMACY' },
    secret
  );

  it('should reject unauthenticated access to /api/orders/my', async () => {
    const response = await request(app).get('/api/orders/my');
    expect(response.status).toBe(401);
  });

  it('should forbid pharmacy from creating an order (PATIENT only)', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${pharmacyToken}`)
      .send({ quoteId: 'quote-123' });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/Acesso negado/i);
  });

  it('should forbid patient from updating order status (PHARMACY only)', async () => {
    const response = await request(app)
      .patch('/api/orders/order-123/status')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ status: 'DELIVERY' });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/Acesso negado/i);
  });
});
