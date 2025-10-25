/**
 * Winston Logger with Context Support
 * 
 * Centralized logging system with:
 * - Winston daily log rotation
 * - Async context tracking (requestId, userId)
 * - Console override for seamless migration
 * - JSON and text formats
 * - Environment-aware configuration
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { AsyncLocalStorage } from 'async_hooks';

// ===== TYPES =====

interface LogContext {
  requestId?: string;
  userId?: string;
  [key: string]: any;
}

interface LoggerAPI {
  error: (message: string, ...meta: any[]) => void;
  warn: (message: string, ...meta: any[]) => void;
  info: (message: string, ...meta: any[]) => void;
  debug: (message: string, ...meta: any[]) => void;
  logger: winston.Logger;
  restoreConsole: () => void;
}

interface OriginalConsole {
  log: typeof console.log;
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
  debug: typeof console.debug;
}

// ===== CONTEXT STORAGE =====

declare global {
  var __SEEDBOX_LOGGER_CONTEXT__: AsyncLocalStorage<LogContext> | undefined;
}

const contextStorage = global.__SEEDBOX_LOGGER_CONTEXT__ ||
  (global.__SEEDBOX_LOGGER_CONTEXT__ = new AsyncLocalStorage<LogContext>());

const getCurrentContext = (): LogContext => contextStorage.getStore() || {};

// ===== CONFIGURATION =====

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FORMAT = process.env.LOG_FORMAT || 'text';
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';
const IS_TEST = NODE_ENV === 'test';

// ===== FORMATS =====

// Custom format for text output with emojis
const textFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  const context = getCurrentContext();
  const requestId = context.requestId || (metadata as any).requestId || '';
  const userId = context.userId || (metadata as any).userId || '';
  
  // Emoji prefixes for better visibility
  const emojiMap: Record<string, string> = {
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    debug: '🔍'
  };
  const emoji = emojiMap[level] || 'ℹ️';
  
  let msg = `${emoji} [${timestamp}] [${level.toUpperCase()}]`;
  if (requestId) msg += ` [req:${requestId}]`;
  if (userId) msg += ` [user:${userId}]`;
  msg += ` ${message}`;
  
  // Include metadata if present, excluding default fields
  const excludeKeys = ['requestId', 'userId', 'level', 'message', 'timestamp', 'service', 'environment', 'metadata'];
  const metaKeys = Object.keys(metadata).filter(k => !excludeKeys.includes(k));
  if (metaKeys.length > 0) {
    const cleanMeta: Record<string, any> = {};
    metaKeys.forEach(k => cleanMeta[k] = (metadata as any)[k]);
    msg += ` ${JSON.stringify(cleanMeta)}`;
  }
  
  return msg;
});

// Custom format for JSON output
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json()
);

// ===== WINSTON LOGGER =====

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: LOG_FORMAT === 'json' ? jsonFormat : winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    textFormat
  ),
  defaultMeta: {
    service: 'streamvault-backend',
    environment: NODE_ENV
  },
  transports: [],
  exitOnError: false
});

// Console transport (always enabled except in test)
if (!IS_TEST) {
  logger.add(new winston.transports.Console({
    format: LOG_FORMAT === 'json' ? jsonFormat : winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.colorize(),
      textFormat
    )
  }));
}

// File transports for production
if (IS_PRODUCTION || process.env.ENABLE_FILE_LOGGING === 'true') {
  // Combined log (all levels)
  logger.add(new DailyRotateFile({
    filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: jsonFormat
  }));

  // Error log (error level only)
  logger.add(new DailyRotateFile({
    level: 'error',
    filename: path.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: jsonFormat
  }));
}

// ===== CONSOLE OVERRIDE =====

// Store original console methods
const originalConsole: OriginalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console)
};

// Helper to enrich log with context
const enrichWithContext = (level: 'error' | 'warn' | 'info' | 'debug', message: string, ...meta: any[]): void => {
  const context = getCurrentContext();
  const enrichedMeta = { ...context, ...meta[0] };
  logger[level](message, enrichedMeta);
};

// API wrapper with context support
const api: LoggerAPI = {
  error: (message: string, ...meta: any[]) => enrichWithContext('error', message, ...meta),
  warn: (message: string, ...meta: any[]) => enrichWithContext('warn', message, ...meta),
  info: (message: string, ...meta: any[]) => enrichWithContext('info', message, ...meta),
  debug: (message: string, ...meta: any[]) => enrichWithContext('debug', message, ...meta),
  
  // Direct access to winston logger for advanced usage
  logger,
  
  // Restore original console methods (for testing)
  restoreConsole: () => {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.debug = originalConsole.debug;
  }
};

// ===== CONFIGURATION =====

let consoleConfigured = false;

export const configureLogger = (): void => {
  if (consoleConfigured) {
    return;
  }

  // Override console methods to use Winston
  console.log = (...args: any[]) => api.info(args[0], args[1]);
  console.info = (...args: any[]) => api.info(args[0], args[1]);
  console.warn = (...args: any[]) => api.warn(args[0], args[1]);
  console.error = (...args: any[]) => api.error(args[0], args[1]);
  console.debug = (...args: any[]) => api.debug(args[0], args[1]);

  consoleConfigured = true;
  
  if (!IS_TEST) {
    api.info('Logger configured', { level: LOG_LEVEL, format: LOG_FORMAT });
  }
};

// ===== CONTEXT MANAGEMENT =====

export const withLogContext = <T>(context: LogContext, callback: () => T): T => {
  const parent = getCurrentContext();
  const store = { ...parent, ...context };
  return contextStorage.run(store, callback);
};

export const setContextValue = (key: string, value: any): void => {
  const store = contextStorage.getStore();
  if (!store) {
    return;
  }

  if (value === undefined) {
    delete store[key];
  } else {
    store[key] = value;
  }
};

export const getContextValue = (key: string): any => {
  const store = contextStorage.getStore();
  return store ? store[key] : undefined;
};

export { getCurrentContext };

// ===== LOG LEVEL MANAGEMENT =====

export const setLogLevel = (level: string): void => {
  logger.level = level;
  api.info('Log level changed', { newLevel: level });
};

export const getLogLevel = (): string => logger.level;

// ===== LOGGING METHODS =====

export const error = api.error;
export const warn = api.warn;
export const info = api.info;
export const debug = api.debug;

// ===== EXPORTS =====

export { logger, originalConsole };
export const restoreConsole = api.restoreConsole;

// CommonJS compatibility
module.exports = {
  configureLogger,
  setLogLevel,
  getLogLevel,
  withLogContext,
  setContextValue,
  getContextValue,
  getCurrentContext,
  error,
  warn,
  info,
  debug,
  logger,
  restoreConsole,
  originalConsole
};
