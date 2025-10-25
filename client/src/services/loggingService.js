/**
 * Frontend Logging Service
 * Provides structured logging with dev/prod awareness
 */

const IS_PRODUCTION = import.meta.env.PROD;
const IS_DEV = import.meta.env.DEV;
const LOG_LEVEL = import.meta.env.VITE_LOG_LEVEL || 'info';

// Check localStorage for debug mode override
const getDebugMode = () => {
  try {
    return localStorage.getItem('streamvault_debug') === 'true';
  } catch {
    return false;
  }
};

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = LEVELS[LOG_LEVEL] ?? LEVELS.info;

class Logger {
  constructor() {
    this.debugMode = getDebugMode();
    
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug ? console.debug.bind(console) : console.log.bind(console)
    };
  }

  shouldLog(level) {
    // Always log in debug mode
    if (this.debugMode) return true;
    
    // In production, only log warnings and errors
    if (IS_PRODUCTION) {
      return LEVELS[level] <= LEVELS.warn;
    }
    
    // In development, respect LOG_LEVEL
    return LEVELS[level] <= currentLevel;
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const emoji = {
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🔍'
    }[level] || 'ℹ️';
    
    return [`${emoji} [${timestamp}] [${level.toUpperCase()}]`, message, ...args];
  }

  error(message, ...args) {
    if (this.shouldLog('error')) {
      this.originalConsole.error(...this.formatMessage('error', message, ...args));
    }
    
    // Send to remote logging service if configured
    this.sendToRemote('error', message, args);
  }

  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      this.originalConsole.warn(...this.formatMessage('warn', message, ...args));
    }
    
    this.sendToRemote('warn', message, args);
  }

  info(message, ...args) {
    if (this.shouldLog('info')) {
      this.originalConsole.info(...this.formatMessage('info', message, ...args));
    }
  }

  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      this.originalConsole.debug(...this.formatMessage('debug', message, ...args));
    }
  }

  // Log with context (useful for tracking user actions)
  logWithContext(level, message, context) {
    const enrichedMessage = context 
      ? `${message} ${JSON.stringify(context)}` 
      : message;
    
    this[level](enrichedMessage);
  }

  // Send errors/warnings to remote logging service
  async sendToRemote(level, message, args) {
    // Only send errors and warnings in production
    if (!IS_PRODUCTION || !['error', 'warn'].includes(level)) {
      return;
    }

    try {
      // TODO: Implement remote logging (e.g., Sentry, LogRocket, custom endpoint)
      // For now, just store in sessionStorage for debugging
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        args,
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      const existingLogs = sessionStorage.getItem('streamvault_logs');
      const logs = existingLogs ? JSON.parse(existingLogs) : [];
      logs.push(logEntry);
      
      // Keep only last 50 logs
      if (logs.length > 50) {
        logs.shift();
      }
      
      sessionStorage.setItem('streamvault_logs', JSON.stringify(logs));
    } catch (err) {
      // Silently fail - don't break app if logging fails
      this.originalConsole.error('Failed to send log to remote:', err);
    }
  }

  // Enable debug mode
  enableDebugMode() {
    try {
      localStorage.setItem('streamvault_debug', 'true');
      this.debugMode = true;
      this.info('Debug mode enabled');
    } catch (err) {
      this.originalConsole.warn('Failed to enable debug mode:', err);
    }
  }

  // Disable debug mode
  disableDebugMode() {
    try {
      localStorage.removeItem('streamvault_debug');
      this.debugMode = false;
      this.info('Debug mode disabled');
    } catch (err) {
      this.originalConsole.warn('Failed to disable debug mode:', err);
    }
  }

  // Get stored logs from sessionStorage
  getStoredLogs() {
    try {
      const logs = sessionStorage.getItem('streamvault_logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  // Clear stored logs
  clearStoredLogs() {
    try {
      sessionStorage.removeItem('streamvault_logs');
      this.info('Stored logs cleared');
    } catch (err) {
      this.originalConsole.warn('Failed to clear stored logs:', err);
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export logger methods
export const error = logger.error.bind(logger);
export const warn = logger.warn.bind(logger);
export const info = logger.info.bind(logger);
export const debug = logger.debug.bind(logger);
export const logWithContext = logger.logWithContext.bind(logger);

// Export logger instance for advanced usage
export { logger };

// Expose debug mode controls globally for console access
if (IS_DEV || logger.debugMode) {
  window.__STREAMVAULT_LOGGER__ = {
    enableDebug: () => logger.enableDebugMode(),
    disableDebug: () => logger.disableDebugMode(),
    getLogs: () => logger.getStoredLogs(),
    clearLogs: () => logger.clearStoredLogs(),
    isDebugMode: () => logger.debugMode
  };
}

// Override console methods in production
if (IS_PRODUCTION) {
  console.log = (...args) => logger.info(...args);
  console.info = (...args) => logger.info(...args);
  console.warn = (...args) => logger.warn(...args);
  console.error = (...args) => logger.error(...args);
  console.debug = (...args) => logger.debug(...args);
}

export default logger;
