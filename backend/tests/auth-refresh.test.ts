import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { cleanDatabase } from './helpers/dbCleanup';
import { hashToken } from '../src/lib/authTokens';

describe('TAREFA 1.5 — Autenticação Robusta, Refresh Tokens e Recuperação', () => {
  const userPassword = 'Password123!';
  const userEmail = 'auth.test@medconnect.com';
  let userId: string;

  beforeEach(async () => {
    await cleanDatabase(prisma);

    const hash = await bcrypt.hash(userPassword, 10);
    const user = await prisma.user.create({
      data: {
        name: 'Usuário Auth Teste',
        email: userEmail,
        password: hash,
        role: 'PATIENT'
      }
    });
    userId = user.id;
  });

  afterAll(async () => {
    await cleanDatabase(prisma);
  });

  it('1. Login emite Access Token de 15 minutos e cookie HttpOnly com Refresh Token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: userPassword });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();

    // Valida expiração de 15 minutos (900 segundos)
    const decoded: any = jwt.decode(res.body.accessToken);
    expect(decoded.exp - decoded.iat).toBe(15 * 60);

    // Valida cookie HttpOnly
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = (cookies as unknown as string[]).find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('Path=/api/auth');
  });

  it('2. Rotação do Refresh Token: /auth/refresh emite novo access token e rotaciona o refresh token', async () => {
    // 1. Faz login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: userPassword });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const firstRefreshToken = cookies[0].split(';')[0]; // "refreshToken=..."

    // 2. Chama refresh
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [firstRefreshToken]);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeDefined();

    // Novo cookie de refresh emitido
    const newCookies = refreshRes.headers['set-cookie'] as unknown as string[];
    expect(newCookies).toBeDefined();
    const secondRefreshToken = newCookies[0].split(';')[0];
    expect(secondRefreshToken).not.toBe(firstRefreshToken);

    // No banco, o primeiro token foi marcado como revogado (isRevoked: true)
    const rawFirst = firstRefreshToken.replace('refreshToken=', '');
    const dbFirstToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawFirst) }
    });
    expect(dbFirstToken?.isRevoked).toBe(true);

    // E o segundo token está ativo (isRevoked: false)
    const rawSecond = secondRefreshToken.replace('refreshToken=', '');
    const dbSecondToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawSecond) }
    });
    expect(dbSecondToken?.isRevoked).toBe(false);
    expect(dbSecondToken?.familyId).toBe(dbFirstToken?.familyId);
  });

  it('3. Detecção de reuso: apresentar token já rotacionado invalida toda a família', async () => {
    // 1. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: userPassword });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const firstCookie = cookies[0].split(';')[0];

    // 2. Rotação legítima
    const refreshRes1 = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [firstCookie]);

    expect(refreshRes1.status).toBe(200);
    const cookies2 = refreshRes1.headers['set-cookie'] as unknown as string[];
    const secondCookie = cookies2[0].split(';')[0];

    // 3. REUSO: Atacante (ou requisição interceptada) tenta usar o FIRST cookie de novo
    const reuseAttemptRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [firstCookie]);

    expect(reuseAttemptRes.status).toBe(401);
    expect(reuseAttemptRes.body.error?.code).toBe('TOKEN_REUSE_DETECTED');

    // 4. Tentativa com o segundo cookie AGORA também falha, pois a família inteira foi revogada!
    const subsequentAttemptRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [secondCookie]);

    expect(subsequentAttemptRes.status).toBe(401);
  });

  it('4. Logout revoga a família do token e limpa o cookie', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: userPassword });

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    const refreshCookie = cookies[0].split(';')[0];
    const rawToken = refreshCookie.replace('refreshToken=', '');

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [refreshCookie]);

    expect(logoutRes.status).toBe(200);

    // Token no banco está revogado
    const dbToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) }
    });
    expect(dbToken?.isRevoked).toBe(true);

    // Tentar refresh após logout falha
    const refreshAfterLogout = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [refreshCookie]);

    expect(refreshAfterLogout.status).toBe(401);
  });

  it('5. Esqueci minha senha: respostas IDÊNTICAS para e-mail existente e inexistente', async () => {
    // E-mail existente
    const resExisting = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: userEmail });

    // E-mail inexistente
    const resNonExistent = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'inexistente_123456@medconnect.com' });

    expect(resExisting.status).toBe(200);
    expect(resNonExistent.status).toBe(200);
    expect(resExisting.body).toEqual(resNonExistent.body);
    expect(resExisting.body.message).toMatch(/instruções para redefinição/i);
  });

  it('6. Redefinição de senha com token de uso único', async () => {
    const resetUserEmail = 'reset.test@medconnect.com';
    const initialPass = 'Password123!';
    const initialHash = await bcrypt.hash(initialPass, 10);
    await prisma.user.create({
      data: {
        name: 'Usuário Reset',
        email: resetUserEmail,
        password: initialHash,
        role: 'PATIENT'
      }
    });

    // 1. Gera token no banco
    const rawResetToken = 'single_use_test_reset_token_12345';
    await prisma.passwordResetToken.create({
      data: {
        email: resetUserEmail,
        tokenHash: hashToken(rawResetToken),
        expiresAt: new Date(Date.now() + 3600000)
      }
    });

    // 2. Redefine a senha com nova senha forte
    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawResetToken,
        newPassword: 'NovaSenhaForte@999'
      });

    expect(resetRes.status).toBe(200);

    // 3. Login com senha antiga deve falhar
    const failOldPass = await request(app)
      .post('/api/auth/login')
      .send({ email: resetUserEmail, password: initialPass });
    expect(failOldPass.status).toBe(401);

    // 4. Login com nova senha deve suceder
    const successNewPass = await request(app)
      .post('/api/auth/login')
      .send({ email: resetUserEmail, password: 'NovaSenhaForte@999' });
    expect(successNewPass.status).toBe(200);

    // 5. Reutilizar o mesmo token de reset deve ser rejeitado
    const reuseResetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: rawResetToken,
        newPassword: 'OutraSenhaForte@888'
      });
    expect(reuseResetRes.status).toBe(400);
  });
});
