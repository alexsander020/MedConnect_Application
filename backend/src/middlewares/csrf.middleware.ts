import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Middleware de proteção contra Cross-Site Request Forgery (CSRF).
 * Para requisições que alteram estado (POST, PUT, PATCH, DELETE):
 * Valida se o cabeçalho Origin ou Referer pertence à lista permitida em CORS_ORIGINS.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const origin = req.headers['origin'] as string | undefined;
  const referer = req.headers['referer'] as string | undefined;

  // Se nenhum dos cabeçalhos estiver presente (ex: cliente nativo, CLI ou chamadas de teste de integração),
  // a proteção por cookie SameSite=Lax/Strict já mitiga o envio entre sites.
  if (!origin && !referer) {
    return next();
  }

  const sourceToCheck = origin || (referer ? new URL(referer).origin : undefined);

  if (sourceToCheck && !env.CORS_ORIGINS.includes(sourceToCheck)) {
    res.status(403).json({
      error: {
        code: 'CSRF_ORIGIN_REJECTED',
        message: 'Origem da requisição não permitida'
      }
    });
    return;
  }

  next();
}
