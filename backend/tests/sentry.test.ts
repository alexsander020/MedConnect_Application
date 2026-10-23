import { sanitizeData, initSentry, captureException, captureMessage } from '../src/lib/sentry';
import * as Sentry from '@sentry/node';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  withScope: jest.fn((cb) => cb({ setExtras: jest.fn() }))
}));

describe('Sentry Integration & LGPD Data Scrubbing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve sanitizar recursivamente chaves sensíveis (LGPD)', () => {
    const rawData = {
      user: {
        id: 'usr-123',
        name: 'Maria da Silva',
        email: 'maria@exemplo.com',
        cpf: '123.456.789-00',
        cpfEncrypted: 'abcdef1234567890',
        cpfHash: 'hashvalue',
        password: 'MinhaSenhaForte#1',
        phone: '(11) 98765-4321',
        address: 'Rua das Flores, 123'
      },
      token: 'jwt.token.secret',
      refreshToken: 'refresh-cookie-value',
      authorization: 'Bearer jwt.token.secret',
      cookie: 'refreshToken=xyz; sessionId=123',
      meta: {
        action: 'APPROVE_QUOTE',
        quoteId: 'quote-456'
      }
    };

    const sanitized = sanitizeData(rawData);

    expect(sanitized.user.id).toBe('usr-123');
    expect(sanitized.user.name).toBe('Maria da Silva');
    expect(sanitized.meta.action).toBe('APPROVE_QUOTE');
    expect(sanitized.meta.quoteId).toBe('quote-456');

    // Campos sensíveis devem ser redigidos
    expect(sanitized.user.cpf).toBe('[REDACTED]');
    expect(sanitized.user.cpfEncrypted).toBe('[REDACTED]');
    expect(sanitized.user.cpfHash).toBe('[REDACTED]');
    expect(sanitized.user.password).toBe('[REDACTED]');
    expect(sanitized.user.phone).toBe('[REDACTED]');
    expect(sanitized.user.address).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.refreshToken).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.cookie).toBe('[REDACTED]');
  });

  it('deve sanitizar arrays com objetos sensíveis', () => {
    const list = [
      { id: 1, password: 'secret1', note: 'test1' },
      { id: 2, password: 'secret2', note: 'test2' }
    ];

    const sanitized = sanitizeData(list);
    expect(sanitized[0].password).toBe('[REDACTED]');
    expect(sanitized[0].note).toBe('test1');
    expect(sanitized[1].password).toBe('[REDACTED]');
    expect(sanitized[1].note).toBe('test2');
  });

  it('deve configurar Sentry com beforeSend fazendo scrubbing', () => {
    process.env.SENTRY_DSN = 'https://fakekey@o123456.ingest.sentry.io/78910';
    initSentry();

    expect(Sentry.init).toHaveBeenCalled();
    const initCall = (Sentry.init as jest.Mock).mock.calls[0][0];
    expect(initCall.dsn).toBe(process.env.SENTRY_DSN);

    // Testar hook beforeSend
    const eventInput: any = {
      request: {
        headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
        data: { password: 'secretpassword', email: 'test@medconnect.com' }
      },
      user: { id: 'usr-1', email: 'pii@test.com', ip_address: '1.2.3.4' },
      breadcrumbs: [
        { message: 'login attempt', data: { password: 'raw' } }
      ]
    };

    const scrubbedEvent = initCall.beforeSend(eventInput);
    expect(scrubbedEvent.request.headers.authorization).toBe('[REDACTED]');
    expect(scrubbedEvent.request.headers['content-type']).toBe('application/json');
    expect(scrubbedEvent.request.data.password).toBe('[REDACTED]');
    expect(scrubbedEvent.user.id).toBe('usr-1');
    expect(scrubbedEvent.user.ip_address).toBeUndefined();
    expect(scrubbedEvent.breadcrumbs[0].data.password).toBe('[REDACTED]');
  });

  it('deve capturar exceção com contexto sanitizado', () => {
    const error = new Error('Test crash');
    captureException(error, { password: 'sensitive_input', contextInfo: 'ok' });

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('deve capturar mensagem', () => {
    captureMessage('Test info message', 'info');
    expect(Sentry.captureMessage).toHaveBeenCalledWith('Test info message', 'info');
  });
});
