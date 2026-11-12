import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import { emailSender } from '../src/services/email';
import { env } from '../src/config/env';
import { cleanDatabase } from './helpers/dbCleanup';

/**
 * Links enviados por e-mail apontam para o frontend (FRONTEND_URL):
 * - cadastro emite token de verificação de e-mail e envia /verify-email?token=...
 * - recuperação de senha envia /reset-password?token=...
 */
describe('Links de e-mail (verificação de cadastro e redefinição de senha)', () => {
  let sendSpy: jest.SpyInstance;

  const extractToken = (text: string, path: string): string => {
    const match = text.match(new RegExp(`${path}\\?token=([a-f0-9]{64})`));
    if (!match) throw new Error(`Link ${path} não encontrado no e-mail`);
    return match[1];
  };

  beforeAll(async () => {
    await cleanDatabase(prisma);
  });

  beforeEach(() => {
    sendSpy = jest.spyOn(emailSender, 'sendEmail').mockResolvedValue(undefined);
  });

  afterEach(() => {
    sendSpy.mockRestore();
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
    await prisma.$disconnect();
  });

  it('cadastro de paciente envia link de verificação que confirma o e-mail (uso único)', async () => {
    const res = await request(app).post('/api/users').send({
      name: 'Vera Verificação',
      email: 'vera.verifica@test.com',
      password: 'SenhaForte#123',
      cpf: '52998224725',
      termsAccepted: true,
      healthConsent: true
    });
    expect(res.status).toBe(201);
    expect(res.body.emailVerified).toBe(false);

    const mail = sendSpy.mock.calls.find(([opts]) => opts.to === 'vera.verifica@test.com')?.[0];
    expect(mail).toBeDefined();
    expect(mail.text).toContain(`${env.FRONTEND_URL}/verify-email?token=`);

    // Só o hash fica no banco
    const token = extractToken(mail.text, '/verify-email');
    const stored = await prisma.emailVerificationToken.findFirst({ where: { email: 'vera.verifica@test.com' } });
    expect(stored?.tokenHash).toBeDefined();
    expect(stored?.tokenHash).not.toBe(token);

    const verify = await request(app).post('/api/auth/verify-email').send({ token });
    expect(verify.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email: 'vera.verifica@test.com' } });
    expect(user?.emailVerified).toBe(true);

    const reuse = await request(app).post('/api/auth/verify-email').send({ token });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  it('cadastro de farmácia também envia link de verificação', async () => {
    const res = await request(app).post('/api/pharmacies').send({
      name: 'Farmácia Verificação',
      email: 'farmacia.verifica@test.com',
      password: 'SenhaForte#123',
      cnpj: '11222333000181',
      termsAccepted: true
    });
    expect(res.status).toBe(201);

    const mail = sendSpy.mock.calls.find(([opts]) => opts.to === 'farmacia.verifica@test.com')?.[0];
    expect(mail?.text).toContain(`${env.FRONTEND_URL}/verify-email?token=`);
  });

  it('cadastro não falha quando o envio do e-mail falha', async () => {
    sendSpy.mockRejectedValueOnce(new Error('SMTP fora do ar'));
    const res = await request(app).post('/api/users').send({
      name: 'Sem Email',
      email: 'sem.email@test.com',
      password: 'SenhaForte#123',
      cpf: '11144477735',
      termsAccepted: true,
      healthConsent: true
    });
    expect(res.status).toBe(201);
  });

  it('recuperação de senha envia link para /reset-password com token válido', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'vera.verifica@test.com' });
    expect(res.status).toBe(200);

    const mail = sendSpy.mock.calls.find(([opts]) => opts.to === 'vera.verifica@test.com')?.[0];
    expect(mail?.text).toContain(`${env.FRONTEND_URL}/reset-password?token=`);

    const token = extractToken(mail.text, '/reset-password');
    const reset = await request(app).post('/api/auth/reset-password').send({ token, newPassword: 'NovaSenha#456' });
    expect(reset.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vera.verifica@test.com', password: 'NovaSenha#456' });
    expect(login.status).toBe(200);
  });
});
