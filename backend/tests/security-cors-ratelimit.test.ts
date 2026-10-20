import request from 'supertest';
import app from '../src/app';

describe('Security: CORS and Rate Limiting Policies', () => {
  describe('CORS Strict Allowlist Validation', () => {
    it('should permit requests from allowed origin and include CORS headers', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should block requests from an unlisted/disallowed origin with 403', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://malicious-attacker.com');

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/Origem não permitida pela política de CORS/i);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should block preflight OPTIONS request from disallowed origin', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://unauthorized-domain.org')
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(403);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Authentication Rate Limiting (/api/auth/login)', () => {
    const targetEmail = `brute_force_${Date.now()}@medconnect.test`;

    it('should allow up to 5 failed attempts but block the 6th attempt with HTTP 429', async () => {
      // First 5 attempts: should be processed normally by auth controller (returning 401 or 400)
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: targetEmail, password: 'wrong_password_123' });

        expect(res.status).not.toBe(429);
      }

      // 6th attempt: must be blocked by authLimiter with HTTP 429 and Retry-After header
      const blockedRes = await request(app)
        .post('/api/auth/login')
        .send({ email: targetEmail, password: 'wrong_password_123' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toMatch(/Muitas tentativas de autenticação/i);
      expect(blockedRes.headers['retry-after']).toBeDefined();
    });

    it('should not block a different email from the same IP when isolation key is active', async () => {
      const otherEmail = `different_user_${Date.now()}@medconnect.test`;

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: otherEmail, password: 'wrong_password_123' });

      expect(res.status).not.toBe(429);
    });
  });
});
