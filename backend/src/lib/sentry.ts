import * as Sentry from '@sentry/node';
import { env } from '../config/env';

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'refreshtoken',
  'accesstoken',
  'cpf',
  'cpfencrypted',
  'cpfhash',
  'authorization',
  'cookie',
  'phone',
  'address',
  'secret'
]);

function sanitizeData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

let isInitialized = false;

export function initSentry(): void {
  const dsn = env.SENTRY_DSN || process.env.SENTRY_DSN;
  if (!dsn || isInitialized) {
    return;
  }

  Sentry.init({
    dsn,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.2 : 1.0,
    beforeSend(event) {
      // LGPD Scrubbing: Remove sensitive data before sending to Sentry
      if (event.request) {
        if (event.request.headers) {
          event.request.headers = sanitizeData(event.request.headers);
        }
        if (event.request.data) {
          event.request.data = sanitizeData(event.request.data);
        }
      }
      if (event.user) {
        // Redact PII from user context
        event.user = {
          id: event.user.id,
          // Remove email, username, ip_address
          ip_address: undefined
        };
      }
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => {
          if (b.data) {
            b.data = sanitizeData(b.data);
          }
          return b;
        });
      }
      return event;
    }
  });

  isInitialized = true;
}

export function captureException(error: any, context?: Record<string, any>): void {
  if (!isInitialized) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(sanitizeData(context));
    }
    Sentry.captureException(error);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!isInitialized) return;
  Sentry.captureMessage(message, level);
}

export { sanitizeData };
