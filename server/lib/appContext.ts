/**
 * App Context - Eliminate Global State (Sprint 2.1 - PASS 4)
 * Centralized application state and configuration
 */

export interface SystemHealth {
  totalRequests: number;
  apiTimeouts: number;
  lastError: {
    type: string;
    message: string;
    time: number;
  } | null;
  startTime: number;
}

export interface AppFlags {
  processHandlersRegistered: boolean;
  signalHandlersRegistered: boolean;
}

export interface AppContext {
  systemHealth: SystemHealth;
  flags: AppFlags;
  serverBootTimestamp: string;
}

/**
 * Create initial app context
 */
export function createAppContext(): AppContext {
  return {
    systemHealth: {
      totalRequests: 0,
      apiTimeouts: 0,
      lastError: null,
      startTime: Date.now()
    },
    flags: {
      processHandlersRegistered: false,
      signalHandlersRegistered: false
    },
    serverBootTimestamp: new Date().toISOString()
  };
}

/**
 * Increment request counter
 */
export function incrementRequests(ctx: AppContext): void {
  ctx.systemHealth.totalRequests += 1;
}

/**
 * Increment timeout counter
 */
export function incrementTimeouts(ctx: AppContext): void {
  ctx.systemHealth.apiTimeouts += 1;
}

/**
 * Record error in context
 */
export function recordError(
  ctx: AppContext, 
  type: string, 
  message: string
): void {
  ctx.systemHealth.lastError = {
    type,
    message,
    time: Date.now()
  };
}

/**
 * Get system uptime in seconds
 */
export function getUptime(ctx: AppContext): number {
  return Math.floor((Date.now() - ctx.systemHealth.startTime) / 1000);
}

/**
 * Get health summary
 */
export function getHealthSummary(ctx: AppContext) {
  return {
    uptime: getUptime(ctx),
    totalRequests: ctx.systemHealth.totalRequests,
    apiTimeouts: ctx.systemHealth.apiTimeouts,
    lastError: ctx.systemHealth.lastError,
    startedAt: ctx.serverBootTimestamp
  };
}

// CommonJS compatibility
module.exports = {
  createAppContext,
  incrementRequests,
  incrementTimeouts,
  recordError,
  getUptime,
  getHealthSummary
};
