/**
 * User Types
 */

export interface User {
  id: string;
  authenticated: boolean;
  loginTime?: number;
  sessionId?: string;
}

export interface AuthConfig {
  accessPassword?: string;
  accessPasswordHash?: string;
  sessionSecret: string;
  sessionMaxAge: number;
}
