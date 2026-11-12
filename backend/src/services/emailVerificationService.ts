import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { hashToken } from '../lib/authTokens';
import { logger } from '../lib/logger';
import { env } from '../config/env';
import { emailSender } from './email';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Emite um token de verificação de e-mail (guardado só como hash SHA-256, uso único)
 * e envia o link `<FRONTEND_URL>/verify-email?token=...`.
 * Falhas são registradas e engolidas: o cadastro não deve falhar porque o e-mail não saiu.
 */
export async function sendVerificationEmail(email: string, name: string): Promise<boolean> {
  try {
    const rawToken = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerificationToken.create({
      data: {
        email,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS)
      }
    });

    await emailSender.sendEmail({
      to: email,
      subject: 'Confirme seu e-mail - MedConnect',
      text:
        `Olá ${name},\n\n` +
        `Para confirmar seu e-mail na MedConnect, acesse:\n${env.FRONTEND_URL}/verify-email?token=${rawToken}\n\n` +
        `O link expira em 24 horas. Se você não criou esta conta, ignore este e-mail.`
    });
    return true;
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'Falha ao emitir/enviar verificação de e-mail');
    return false;
  }
}
