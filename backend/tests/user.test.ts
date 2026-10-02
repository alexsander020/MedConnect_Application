import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

// Mock do Prisma
jest.mock('../src/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn().mockResolvedValue([
        { id: '1', name: 'Test User', email: 'test@test.com', role: 'PATIENT' }
      ]),
    },
  },
}));

import jwt from 'jsonwebtoken';

describe('User Routes', () => {
  it('should reject unauthenticated request to /api/users', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(401);
  });

  it('should get all users when authenticated as ADMIN', async () => {
    const adminToken = jwt.sign(
      { id: 'admin-1', email: 'admin@medconnect.com', role: 'ADMIN' },
      process.env.JWT_SECRET || 'medconnect_super_secret_key'
    );

    const response = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0].name).toBe('Test User');
  });
});
