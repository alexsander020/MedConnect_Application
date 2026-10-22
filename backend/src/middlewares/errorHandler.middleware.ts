import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Middleware central de tratamento de erros.
 * Garante retorno padronizado no formato { error: { code, message } }
 * sem vazar stack trace, consultas SQL ou detalhes internos do banco.
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const requestId = (req as any).requestId || req.headers['x-request-id'];

  const statusCode =
    typeof err?.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;

  const code = err?.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST');
  const message =
    statusCode === 500
      ? 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.'
      : err?.message || 'Erro inesperado ao processar requisição';

  // Log estruturado com Pino
  logger.error(
    {
      requestId,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode,
      err: {
        name: err?.name,
        message: err?.message,
        code: err?.code,
        stack: err?.stack
      }
    },
    'Erro capturado no middleware central de erros'
  );

  res.status(statusCode).json({
    error: {
      code,
      message
    }
  });
}
