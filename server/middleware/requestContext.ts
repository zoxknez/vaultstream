/**
 * Request Context Middleware - TypeScript Migration (Sprint 2.1 Phase 4)
 * Adds unique request ID tracking and logging
 */

import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
const { withLogContext } = require('../utils/logger');

const normalizeHeaderValue = (value: any): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return String(value);
};

interface RequestContextOptions {
  headerName?: string;
  responseHeader?: string;
  logRequests?: boolean;
}

const requestContext = (options: RequestContextOptions = {}) => {
  const {
    headerName = 'x-request-id',
    responseHeader = 'X-Request-Id',
    logRequests = true
  } = options;

  const normalizedHeaderName = headerName.toLowerCase();

  return (req: Request, res: Response, next: NextFunction) => {
    const incomingId = normalizeHeaderValue(req.headers[normalizedHeaderName]);
    const requestId = incomingId || randomUUID();

    (req as any).requestId = requestId;
    if (responseHeader) {
      res.setHeader(responseHeader, requestId);
    }

    const startedAt = Date.now();

    return withLogContext({ requestId }, () => {
      if (logRequests && req.method && req.originalUrl) {
        console.debug(`➡️  ${req.method} ${req.originalUrl}`);
      }

      res.on('finish', () => {
        if (!logRequests) {
          return;
        }
        const duration = Date.now() - startedAt;
        console.debug(`⬅️  ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
      });

      return next();
    });
  };
};

export default requestContext;

// CommonJS compatibility
module.exports = requestContext;
