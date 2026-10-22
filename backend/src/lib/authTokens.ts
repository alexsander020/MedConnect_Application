import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { env } from '../config/env';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Gera um access token JWT com expiração curta de 15 minutos.
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
}

/**
 * Gera um refresh token opaco e criptograficamente seguro.
 */
export function generateRefreshTokenData(existingFamilyId?: string) {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const familyId = existingFamilyId || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  return {
    rawToken,
    tokenHash,
    familyId,
    expiresAt
  };
}

/**
 * Calcula o hash SHA-256 de um token bruto para consulta no banco.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Configura o refresh token em um cookie HttpOnly seguro.
 */
export function setRefreshTokenCookie(res: Response, rawToken: string): void {
  res.cookie('refreshToken', rawToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias em ms
  });
}

/**
 * Limpa o cookie de refresh token.
 */
export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth'
  });
}
