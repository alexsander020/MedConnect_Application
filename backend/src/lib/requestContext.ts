import { Request } from 'express';

/**
 * Metadados de rede usados na trilha de auditoria (mesmo critério já usado nos controllers).
 */
export function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || '127.0.0.1';
}

export function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}
