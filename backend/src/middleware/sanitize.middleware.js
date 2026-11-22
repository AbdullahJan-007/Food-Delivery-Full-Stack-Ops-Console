import crypto from 'node:crypto';
import { AppError } from '../utils/AppError.js';
import { sanitizeInPlace } from '../utils/validators.js';
import { getClientIp, recordSecurityStrike } from './trafficControl.middleware.js';

/**
 * Attaches a unique correlation ID to every request and response header
 * so logs and error responses can be traced end-to-end.
 */
export function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(incoming)
      ? incoming
      : crypto.randomUUID();

  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

/**
 * Express 5 compatible NoSQL operator sanitizer.
 * - Rejects query parameters containing `$` operator syntax (e.g. ?status[$ne]=x).
 * - Recursively strips `$`, `.`, and prototype keys from req.body and req.params in place.
 */
export function sanitizeRequest(req, res, next) {
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (key.includes('$')) {
        recordSecurityStrike(getClientIp(req), {
          type: 'NOSQL_INJECTION_PROBE',
          path: (req.originalUrl || req.url || '/').slice(0, 120),
          points: 4,
          severity: 'high',
          action: 'Blocked $ operator in query string',
        });
        throw new AppError('Invalid query parameter', 400);
      }
    }
    sanitizeInPlace(req.query);
  }
  if (req.body && typeof req.body === 'object') {
    sanitizeInPlace(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    sanitizeInPlace(req.params);
  }
  next();
}
