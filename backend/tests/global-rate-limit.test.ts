import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { env } from '../src/config/env';
import { ANONYMOUS_API_LIMIT, AUTHENTICATED_API_LIMIT } from '../src/middlewares/rate-limit.middleware';

/**
 * Limitador global da API: anônimo por IP (100/15 min); autenticado por conta (600/15 min).
 * Usa /api/health (barata, sem banco) para gerar volume.
 */
describe('globalApiLimiter', () => {
  const tokenA = jwt.sign({ id: 'rl-user-a', email: 'a@test.com', role: 'PATIENT' }, env.JWT_SECRET);
  const tokenB = jwt.sign({ id: 'rl-user-b', email: 'b@test.com', role: 'PHARMACY' }, env.JWT_SECRET);

  it('limites configurados', () => {
    expect(ANONYMOUS_API_LIMIT).toBe(100);
    expect(AUTHENTICATED_API_LIMIT).toBeGreaterThan(ANONYMOUS_API_LIMIT);
  });

  it('bloqueia o anônimo após 100 requisições, no formato de erro padrão da API', async () => {
    for (let i = 0; i < ANONYMOUS_API_LIMIT; i++) {
      const ok = await request(app).get('/api/health');
      expect(ok.status).toBe(200);
    }
    const blocked = await request(app).get('/api/health');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.headers['retry-after']).toBeDefined();

    // Token inválido conta como anônimo (mesmo balde do IP)
    const forged = await request(app).get('/api/health').set('Authorization', 'Bearer token-forjado');
    expect(forged.status).toBe(429);
  });

  it('usuário autenticado no mesmo IP continua liberado (balde por conta)', async () => {
    for (let i = 0; i < 120; i++) {
      const res = await request(app).get('/api/health').set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
    }
    const remaining = Number((await request(app).get('/api/health').set('Authorization', `Bearer ${tokenA}`)).headers['ratelimit-remaining']);
    expect(remaining).toBe(AUTHENTICATED_API_LIMIT - 121);

    // Outra conta tem seu próprio balde
    const other = await request(app).get('/api/health').set('Authorization', `Bearer ${tokenB}`);
    expect(other.status).toBe(200);
    expect(Number(other.headers['ratelimit-remaining'])).toBe(AUTHENTICATED_API_LIMIT - 1);
  });
});
