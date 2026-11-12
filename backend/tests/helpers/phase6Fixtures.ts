import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PharmacyVerificationStatus, Prisma, PrismaClient, Role } from '@prisma/client';
import { env } from '../../src/config/env';

/**
 * Fixtures compartilhadas dos testes da Fase 6 (gestão de contas, horários e suporte).
 */

export const DEFAULT_PASSWORD = 'SenhaForte@123';
let cachedHash: string | null = null;

export async function passwordHash(): Promise<string> {
  if (!cachedHash) cachedHash = await bcrypt.hash(DEFAULT_PASSWORD, 4);
  return cachedHash;
}

export function tokenFor(id: string, email: string, role: Role | 'PATIENT' | 'PHARMACY' | 'ADMIN'): string {
  return jwt.sign({ id, email, role }, env.JWT_SECRET);
}

export async function createUser(
  prisma: PrismaClient,
  data: { id: string; email: string; role?: Role; name?: string } & Partial<Prisma.UserUncheckedCreateInput>
) {
  const { id, email, role = Role.PATIENT, name, ...rest } = data;
  return prisma.user.create({
    data: {
      id,
      email,
      role,
      name: name ?? `Usuário ${id}`,
      password: await passwordHash(),
      ...rest
    }
  });
}

export async function createPharmacy(
  prisma: PrismaClient,
  data: { id: string; email: string; cnpj: string; name?: string } & Partial<Prisma.PharmacyUncheckedCreateInput>
) {
  const { id, email, cnpj, name, ...rest } = data;
  return prisma.pharmacy.create({
    data: {
      id,
      email,
      cnpj,
      name: name ?? `Farmácia ${id}`,
      password: await passwordHash(),
      verified: true,
      verificationStatus: PharmacyVerificationStatus.VERIFIED,
      ...rest
    }
  });
}

export function refreshCookieFrom(res: { headers: Record<string, unknown> }): string {
  const cookies = (res.headers['set-cookie'] as unknown as string[]) || [];
  const cookie = cookies.find((c) => c.startsWith('refreshToken='));
  if (!cookie) throw new Error('Cookie refreshToken ausente na resposta');
  return cookie.split(';')[0];
}
