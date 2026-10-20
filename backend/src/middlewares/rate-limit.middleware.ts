import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Limitador global para a API: 100 requisições por janela de 15 minutos por IP
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas requisições deste IP, tente novamente mais tarde.',
  },
  validate: {
    xForwardedForHeader: false,
    default: true,
  },
});

// Limitador específico para autenticação: 5 tentativas por janela de 15 minutos por IP + identificador (email)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
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
