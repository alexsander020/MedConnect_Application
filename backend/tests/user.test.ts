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

describe('User Routes', () => {
  it('should get all users', async () => {
    const response = await request(app).get('/api/users');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0].name).toBe('Test User');
  });
});
