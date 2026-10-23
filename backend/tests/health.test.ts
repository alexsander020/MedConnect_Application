import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Health Check, Readiness, Metrics & Docs', () => {
  it('should return 200 OK from /health with process uptime', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return 200 OK from /ready when database is connected', async () => {
    const response = await request(app).get('/ready');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
    expect(response.body.database).toBe('connected');
    expect(response.body.timestamp).toBeDefined();
  });

  it('should return 503 Service Unavailable from /ready when database query fails', async () => {
    const spy = jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('Connection refused'));
    const response = await request(app).get('/ready');
    expect(response.status).toBe(503);
    expect(response.body.status).toBe('unhealthy');
    expect(response.body.database).toBe('disconnected');
    expect(response.body.error).toContain('Connection refused');
    spy.mockRestore();
  });

  it('should return 200 with metrics from /metrics', async () => {
    // Fazer uma requisição antes para gerar métrica de rota
    await request(app).get('/api/users/profile');

    const response = await request(app).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(response.body.requests).toBeDefined();
    expect(response.body.requests.total).toBeGreaterThanOrEqual(1);
    expect(response.body.requests.statusCodes).toBeDefined();
    expect(response.body.requests.errorRatePercent).toBeDefined();
    expect(response.body.latencyByRoute).toBeDefined();
    expect(response.body.businessMetrics).toBeDefined();
    expect(typeof response.body.businessMetrics.pendingQuotes).toBe('number');
  });

  it('should serve Swagger documentation on /api-docs', async () => {
    const response = await request(app).get('/api-docs/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Swagger UI');
  });
});
