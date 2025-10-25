/**
 * 🎬 STREAMVAULT PRODUCTION LOGGER
 * Environment-aware logging for server-side
 */

const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test';

class ProductionLogger {
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
    return process.env.STREAMVAULT_DEBUG === 'true' || process.env.DEBUG === 'true';
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

  // Enable debug mode
  enableDebugMode() {
    process.env.STREAMVAULT_DEBUG = 'true';
    this.debugMode = true;
    this.info('Debug mode enabled');
  }

  // Disable debug mode
  disableDebugMode() {
    process.env.STREAMVAULT_DEBUG = 'false';
    this.debugMode = false;
  }
}

// Create singleton instance
const logger = new ProductionLogger();

// Override console methods in production
if (IS_PRODUCTION) {
  console.log = (...args) => logger.info(...args);
  console.info = (...args) => logger.info(...args);
  console.warn = (...args) => logger.warn(...args);
  console.error = (...args) => logger.error(...args);
  console.debug = (...args) => logger.debug(...args);
}

module.exports = logger;
module.exports.logger = logger;
module.exports.info = logger.info.bind(logger);
module.exports.warn = logger.warn.bind(logger);
module.exports.error = logger.error.bind(logger);
module.exports.debug = logger.debug.bind(logger);
module.exports.time = logger.time.bind(logger);
module.exports.timeEnd = logger.timeEnd.bind(logger);
module.exports.group = logger.group.bind(logger);
module.exports.groupEnd = logger.groupEnd.bind(logger);
