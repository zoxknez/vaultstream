/**
 * 🎬 STREAMVAULT LOGGER - PRODUCTION READY
 * Centralized logging system with environment-aware behavior
 */

const IS_DEV = import.meta.env.DEV;
const IS_PRODUCTION = import.meta.env.PROD;

class StreamVaultLogger {
  constructor() {
    this.debugMode = this.getDebugMode();
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console)
    };
  }

  getDebugMode() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('streamvault_debug') === 'true';
    }
    return false;
  }

  // Production-safe logging
  log(level, message, ...args) {
    if (IS_PRODUCTION && !this.debugMode) {
      // In production, only log errors and warnings
      if (level === 'error' || level === 'warn') {
        this.originalConsole[level](`[StreamVault] ${message}`, ...args);
      }
      return;
    }

    // Development or debug mode - log everything
    const timestamp = new Date().toISOString();
    const prefix = `[StreamVault ${level.toUpperCase()}] ${timestamp}`;
    
    this.originalConsole[level](prefix, message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  // Enable debug mode in production
  enableDebugMode() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('streamvault_debug', 'true');
      this.debugMode = true;
      this.info('Debug mode enabled');
    }
  }

  // Disable debug mode
  disableDebugMode() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('streamvault_debug', 'false');
      this.debugMode = false;
    }
  }

  // Performance logging
  time(label) {
    if (IS_PRODUCTION && !this.debugMode) return;
    console.time(`[StreamVault] ${label}`);
  }

  timeEnd(label) {
    if (IS_PRODUCTION && !this.debugMode) return;
    console.timeEnd(`[StreamVault] ${label}`);
  }

  // Group logging
  group(label) {
    if (IS_PRODUCTION && !this.debugMode) return;
    console.group(`[StreamVault] ${label}`);
  }

  groupEnd() {
    if (IS_PRODUCTION && !this.debugMode) return;
    console.groupEnd();
  }
}

// Create singleton instance
const logger = new StreamVaultLogger();

// Override console methods in production
if (IS_PRODUCTION) {
  console.log = (...args) => logger.info(...args);
  console.info = (...args) => logger.info(...args);
  console.warn = (...args) => logger.warn(...args);
  console.error = (...args) => logger.error(...args);
  console.debug = (...args) => logger.debug(...args);
}

// Expose debug controls globally
if (typeof window !== 'undefined') {
  window.__STREAMVAULT_LOGGER__ = {
    enableDebug: () => logger.enableDebugMode(),
    disableDebug: () => logger.disableDebugMode(),
    isDebugMode: () => logger.debugMode
  };
}

export default logger;
export const { info, warn, error, debug, time, timeEnd, group, groupEnd } = logger;
