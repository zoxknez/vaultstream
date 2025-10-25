/**
 * Winston Logger - JavaScript Implementation
 *
 * Provides structured logging with file rotation and console output.
 * Fallback implementation while TypeScript migration is in progress.
 *
 * Features:
 * - Daily log file rotation
 * - Separate error log files
 * - Emoji-enhanced console output
 * - Metadata support
 *
 * @module utils/logger
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_TEST = NODE_ENV === 'test';

// Text format with emojis
const textFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
  const emojiMap = {
    error: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    debug: '🔍'
  };
  const emoji = emojiMap[level] || 'ℹ️';

  let msg = `${emoji} [${timestamp}] [${level.toUpperCase()}] ${message}`;

  // Include metadata if present
  const excludeKeys = ['level', 'message', 'timestamp'];
  const metaKeys = Object.keys(metadata).filter((k) => !excludeKeys.includes(k));
  if (metaKeys.length > 0) {
    const cleanMeta = {};
    metaKeys.forEach((k) => (cleanMeta[k] = metadata[k]));
    msg += ` ${JSON.stringify(cleanMeta)}`;
  }

  return msg;
});

// Create winston logger
const winstonLogger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    textFormat
  ),
  transports: IS_TEST
    ? []
    : [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), textFormat)
        }),
        // File transport for errors
        new DailyRotateFile({
          filename: path.join(LOG_DIR, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d'
        }),
        // File transport for all logs
        new DailyRotateFile({
          filename: path.join(LOG_DIR, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d'
        })
      ]
});

// Create logger API
const logger = {
  error: (message, ...meta) => winstonLogger.error(message, ...meta),
  warn: (message, ...meta) => winstonLogger.warn(message, ...meta),
  info: (message, ...meta) => winstonLogger.info(message, ...meta),
  debug: (message, ...meta) => winstonLogger.debug(message, ...meta),
  logger: winstonLogger
};

/**
 * Configure logger - logs initialization message
 */
function configureLogger() {
  if (!IS_TEST) {
    logger.info('✅ Logger initialized', {
      level: LOG_LEVEL,
      environment: NODE_ENV,
      logDir: LOG_DIR
    });
  }
}

/**
 * Export logger API
 * Supports both CommonJS and ES6 imports
 */
module.exports = {
  ...logger,
  logger: winstonLogger,
  configureLogger,
  // Individual exports for ES6 compatibility
  error: logger.error,
  warn: logger.warn,
  info: logger.info,
  debug: logger.debug
};
