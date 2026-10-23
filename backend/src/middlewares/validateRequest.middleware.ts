import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';

export interface RequestValidationSchema {
  body?: ZodType<any>;
  params?: ZodType<any>;
  query?: ZodType<any>;
}

/**
 * Middleware genérico para validação de requisições com Zod.
 * Valida de forma isolada body, params e query.
 * Retorna erro 400 formatado no padrão { error: { code, message, details } }.
 */
export function validateRequest(schema: RequestValidationSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      if (schema.query) {
        const parsedQuery = await schema.query.parseAsync(req.query);
        try {
          req.query = parsedQuery;
        } catch {
          Object.defineProperty(req, 'query', {
            value: parsedQuery,
            writable: true,
            configurable: true,
            enumerable: true
          });
        }
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues.map((e) => `${e.path.join('.') || 'geral'}: ${e.message}`).join('; ');
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message,
            details: error.issues
          }
        });
        return;
      }
      next(error);
    }
  };
}
