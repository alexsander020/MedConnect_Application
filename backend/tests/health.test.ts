import request from 'supertest';
import app from '../src/app';

describe('Health Check', () => {
  it('should return 200 OK from /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});
