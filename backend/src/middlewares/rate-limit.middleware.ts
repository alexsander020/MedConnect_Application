import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export const ANONYMOUS_API_LIMIT = 100;
export const AUTHENTICATED_API_LIMIT = 600;

/** Id da conta quando a requisição traz um access token válido; senão null (tráfego anônimo). */
function authenticatedAccountId(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.slice(7), env.JWT_SECRET) as { id?: string; role?: string };
    return decoded?.id ? `${decoded.role || 'ACCOUNT'}:${decoded.id}` : null;
  } catch {
    return null;
  }
}

// Limitador global da API (janela de 15 minutos):
// - anônimo: 100 requisições por IP;
// - autenticado: 600 por conta (~40/min). As telas de gestão e o polling de notificações fazem várias
//   chamadas por tela, e equipes de farmácia costumam compartilhar o mesmo IP (NAT) — limitar só por IP
//   bloquearia uso legítimo. Token inválido conta como anônimo.
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: (req) => (authenticatedAccountId(req) ? AUTHENTICATED_API_LIMIT : ANONYMOUS_API_LIMIT),
  keyGenerator: (req) => authenticatedAccountId(req) || ipKeyGenerator(req.ip || req.socket.remoteAddress || '127.0.0.1'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(options.statusCode).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Muitas requisições em pouco tempo. Aguarde alguns minutos e tente novamente.'
      },
      retryAfter: retryAfterSeconds
    });
  },
  validate: {
    xForwardedForHeader: false,
    keyGeneratorIpFallback: false,
    default: true,
  },
});

// Limitador específico para autenticação: 5 tentativas por janela de 15 minutos por IP + identificador (email)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'development' ? 30 : 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const rawIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const normalizedIp = ipKeyGenerator(rawIp);
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
    return email ? `${normalizedIp}_${email}` : normalizedIp;
  },
  handler: (req, res, next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(options.statusCode).json({
      error: 'Muitas tentativas de autenticação. Tente novamente mais tarde.',
      retryAfter: retryAfterSeconds,
    });
  },
  validate: {
    xForwardedForHeader: false,
    keyGeneratorIpFallback: false,
    default: true,
  },
});

// Limitador da abertura de chamados de suporte (rota pública): 5 chamados por janela de 15 minutos por IP.
// Assim como os demais limitadores, fica ativo também em NODE_ENV=test (o store em memória é
// recriado a cada arquivo de teste do Jest, então os testes controlam quantas chamadas fazem).
export const supportTicketLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket.remoteAddress || '127.0.0.1'),
  handler: (req, res, next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    res.setHeader('Retry-After', retryAfterSeconds.toString());
    res.status(options.statusCode).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Muitos chamados abertos a partir desta rede. Tente novamente em alguns minutos.'
      },
      retryAfter: retryAfterSeconds,
    });
  },
  validate: {
    xForwardedForHeader: false,
    keyGeneratorIpFallback: false,
    default: true,
  },
});
