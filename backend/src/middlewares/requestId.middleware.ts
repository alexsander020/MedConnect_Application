import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';

export interface RequestWithLogging extends Request {
  requestId?: string;
  log?: typeof logger;
}

export function requestIdMiddleware(req: RequestWithLogging, res: Response, next: NextFunction): void {
  const incomingId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.requestId = incomingId;
  res.setHeader('X-Request-Id', incomingId);
  req.log = logger.child({ requestId: incomingId });
  next();
}
