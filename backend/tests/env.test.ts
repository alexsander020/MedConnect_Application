import { parseEnv, envSchema } from '../src/config/env';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../src/middlewares/auth.middleware';

describe('Environment Configuration & JWT Secret Validation', () => {
  const validBaseEnv = {
    NODE_ENV: 'test',
    PORT: '3000',
    DATABASE_URL: 'file:./dev.db',
    JWT_SECRET: 'a_very_secure_and_long_jwt_secret_with_32_plus_chars!',
    CORS_ORIGINS: 'http://localhost:5173',
  };

  it('should fail validation when JWT_SECRET is missing', () => {
    const invalidEnv = { ...validBaseEnv };
    delete (invalidEnv as any).JWT_SECRET;

    expect(() => parseEnv(invalidEnv)).toThrow(/JWT_SECRET/i);
  });

  it('should fail validation when JWT_SECRET is shorter than 32 characters', () => {
    const invalidEnv = {
      ...validBaseEnv,
      JWT_SECRET: 'short_secret_under_32_chars',
    };

    expect(() => parseEnv(invalidEnv)).toThrow(/32 caracteres/i);
  });

  it('should fail validation in production when CLOUDINARY credentials are missing', () => {
    const prodEnvWithoutCloudinary = {
      ...validBaseEnv,
      NODE_ENV: 'production',
    };

    expect(() => parseEnv(prodEnvWithoutCloudinary)).toThrow(/CLOUDINARY/i);
  });

  it('should succeed validation when all required variables are valid', () => {
    const parsed = parseEnv(validBaseEnv);
    expect(parsed.JWT_SECRET).toBe(validBaseEnv.JWT_SECRET);
    expect(parsed.PORT).toBe(3000);
    expect(parsed.CORS_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('should reject a token signed with the old hardcoded fallback secret', async () => {
    const app = express();
    app.get('/protected', authMiddleware, (req: AuthRequest, res) => {
      res.json({ ok: true, user: req.user });
    });

    // Token signed with the old leaked fallback
    const oldLeakedSecret = ['medconnect', 'super', 'secret', 'key'].join('_');
    const tokenWithOldSecret = jwt.sign(
      { id: 'user-1', email: 'test@medconnect.com', role: 'PATIENT' },
      oldLeakedSecret
    );

    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${tokenWithOldSecret}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token inválido');
  });
});
