import * as Sentry from '@sentry/react';

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

export function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  const sanitized = {};
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

export function initFrontendSentry() {
  const dsn = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SENTRY_DSN : undefined;
  if (!dsn || isInitialized) {
    return;
  }

  Sentry.init({
    dsn,
    environment: (import.meta.env && import.meta.env.MODE) || 'development',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request) {
        if (event.request.headers) {
          event.request.headers = sanitizeData(event.request.headers);
        }
        if (event.request.data) {
          event.request.data = sanitizeData(event.request.data);
        }
      }
      if (event.user) {
        event.user = {
          id: event.user.id,
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

export function captureFrontendException(error, context) {
  if (!isInitialized) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(sanitizeData(context));
    }
    Sentry.captureException(error);
  });
}
