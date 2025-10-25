/**
 * Express Type Augmentation
 * 
 * Extends Express Request and Session with custom properties
 */

import { User } from './user';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    user?: {
      id?: string;
      userId?: string;
    };
    username?: string;
    loginTime?: number;
    lastActivity?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      requestId?: string;
      startTime?: number;
      session?: any;
      context?: {
        requestId: string;
        startTime: number;
        method: string;
        path: string;
        ip?: string;
        userAgent?: string;
      };
    }
    
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
      }
    }
  }
}

export {};
