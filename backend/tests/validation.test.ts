import request from 'supertest';
import app from '../src/app';

describe('Validation Integration Tests', () => {
  describe('POST /api/users validation', () => {
    it('should reject registration when email format is invalid', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'João Silva',
          email: 'invalid-email-format',
          password: 'Password123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/e-mail/i);
    });

    it('should reject registration when password is weak', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'João Silva',
          email: 'joao@exemplo.com',
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/senha/i);
    });
  });

  describe('POST /api/pharmacies validation', () => {
    it('should reject registration when CNPJ is mathematically invalid', async () => {
      const response = await request(app)
        .post('/api/pharmacies')
        .send({
          name: 'Farmácia Exemplo',
          email: 'contato@farmaciaexemplo.com',
          password: 'Password123!',
          cnpj: '11.111.111/1111-11' // CNPJ de dígitos repetidos inválido
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/CNPJ inválido/i);
    });
  });
});
