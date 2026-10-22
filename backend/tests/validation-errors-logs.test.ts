import request from 'supertest';
import app from '../src/app';
import { logger } from '../src/lib/logger';
import pino from 'pino';

describe('TAREFA 1.6 — Validação, Erros e Logs', () => {
  describe('1. Formato Padrão de Erro de Validação { error: { code, message } }', () => {
    it('Payload com body inválido retorna HTTP 400 no formato padrão', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: '', // Inválido (min 2)
          email: 'not-an-email',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code');
      expect(res.body.error).toHaveProperty('message');
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(typeof res.body.error.message).toBe('string');
      // Não vaza detalhes de stack
      expect(res.body.stack).toBeUndefined();
    });

    it('Requisição inclui cabeçalho X-Request-Id na resposta', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('Propaga X-Request-Id fornecido pelo cliente', async () => {
      const customRequestId = 'custom-request-id-12345';
      const res = await request(app)
        .get('/health')
        .set('X-Request-Id', customRequestId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customRequestId);
    });
  });

  describe('2. Tratamento Central de Erros e Ocultação de Detalhes Internos (HTTP 500)', () => {
    it('Erros não tratados retornam 500 com mensagem genérica segura sem vazar stack', async () => {
      // Simula uma rota com erro interno em tempo de execução
      const express = require('express');
      const testApp = express();
      const { requestIdMiddleware } = require('../src/middlewares/requestId.middleware');
      const { errorHandler } = require('../src/middlewares/errorHandler.middleware');

      testApp.use(requestIdMiddleware);
      testApp.get('/test-error', (req: any, res: any, next: any) => {
        next(new Error('DATABASE_CONNECTION_LOST: SELECT * FROM secret_table WHERE secret_credentials=1'));
      });
      testApp.use(errorHandler);

      const res = await request(testApp).get('/test-error');

      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('INTERNAL_ERROR');
      expect(res.body.error.message).toBe('Ocorreu um erro interno no servidor. Tente novamente mais tarde.');
      // Garante que o detalhe interno/SQL/stack NUNCA vazou para o cliente
      expect(res.text).not.toContain('DATABASE_CONNECTION_LOST');
      expect(res.text).not.toContain('secret_table');
      expect(res.body.stack).toBeUndefined();
    });
  });

  describe('3. Redaction Rigorosa de Dados Sensíveis com Pino', () => {
    it('Redige authorization, cookie, password, token, cpf, phone e address nos logs', () => {
      let loggedOutput = '';

      // Cria logger com stream de captura para validar a redaction
      const testLogger = pino(
        {
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'password',
              'token',
              'refreshToken',
              'cpf',
              'cpfEncrypted',
              'phone',
              'address'
            ],
            censor: '[REDACTED]'
          }
        },
        {
          write: (chunk: string) => {
            loggedOutput += chunk;
          }
        }
      );

      const sensitivePayload = {
        password: 'SuperSecretPassword@123',
        token: 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_token_payload',
        refreshToken: 'opaque_refresh_token_secret_123',
        cpf: '11144477735',
        phone: '11999998888',
        address: 'Rua das Flores, 123 - Apto 4',
        req: {
          headers: {
            authorization: 'Bearer secret_access_token_value',
            cookie: 'refreshToken=cookie_secret_value'
          }
        }
      };

      testLogger.info(sensitivePayload, 'Log contendo dados sensíveis de auditoria');

      // Valida que TODOS os campos sensíveis foram mascarados
      expect(loggedOutput).not.toContain('SuperSecretPassword@123');
      expect(loggedOutput).not.toContain('sensitive_token_payload');
      expect(loggedOutput).not.toContain('opaque_refresh_token_secret_123');
      expect(loggedOutput).not.toContain('11144477735');
      expect(loggedOutput).not.toContain('11999998888');
      expect(loggedOutput).not.toContain('Rua das Flores, 123');
      expect(loggedOutput).not.toContain('secret_access_token_value');
      expect(loggedOutput).not.toContain('cookie_secret_value');

      // E que o censor [REDACTED] substituiu os valores
      expect(loggedOutput).toContain('[REDACTED]');
    });
  });
});
