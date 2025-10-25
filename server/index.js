/**
 * 🚀 STREAMVAULT SERVER
 * Main server entry point with modular architecture
 */

require('dotenv').config();

// Register ts-node only if not already registered via NODE_OPTIONS
if (!process[Symbol.for('ts-node.register.instance')]) {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs'
    }
  });
}

const StreamVaultApp = require('./app');
const { logger } = require('./utils/logger');
const { config } = require('./config');

// Create application instance
const app = new StreamVaultApp();

// Graceful shutdown handlers
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    await app.shutdown();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', { reason, promise });
  gracefulShutdown('unhandledRejection');
});

// Start server
const startServer = async () => {
  try {
    // Initialize application
    await app.initialize();

    // Get Express app
    const expressApp = app.getApp();

    // Start server
    const server = expressApp.listen(config.server.port, config.server.host, () => {
      logger.info(`🚀 StreamVault server running on ${config.server.host}:${config.server.port}`);
      logger.info(`📊 Environment: ${config.env.NODE_ENV || 'development'}`);
      logger.info(`🔧 Debug mode: ${config.isDevelopment ? 'enabled' : 'disabled'}`);
      logger.info(
        `📚 API Documentation: http://${config.server.host}:${config.server.port}/api/docs`
      );
    });

    // Set server timeout
    server.timeout = config.server.timeout;

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
      gracefulShutdown('serverError');
    });

    // Handle client errors
    server.on('clientError', (error, socket) => {
      logger.warn('Client error:', error);
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
