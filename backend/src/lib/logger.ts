import pino from 'pino';
import { env } from '../config/env';

/**
 * Logger central estruturado com redaction rigorosa de campos sensíveis (LGPD/PCI).
 */
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["set-cookie"]',
      'headers.authorization',
      'headers.cookie',
      'body.password',
      'body.token',
      'body.refreshToken',
      'body.cpf',
      'body.phone',
      'body.address',
      'password',
      'token',
      'refreshToken',
      'cpf',
      'cpfEncrypted',
      'cpfHash',
      'phone',
      'address'
    ],
    censor: '[REDACTED]'
  }
});
