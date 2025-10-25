/**
 * WebTorrent Client - TypeScript Migration (Sprint 2.1)
 * Async WebTorrent ESM module initialization wrapper
 */

const { config, isProduction, isCloud } = require('../config');
const logger = require('../utils/logger');

const importDynamic = new Function('specifier', 'return import(specifier);') as (
  specifier: string
) => Promise<any>;

// WebTorrent client will be initialized asynchronously
let client: any = null;
let initializationPromise: Promise<any> | null = null;

/**
 * Initialize WebTorrent client using dynamic import to handle ESM module
 */
export async function initializeClient(): Promise<any> {
  if (client) return client;
  if (initializationPromise) return initializationPromise;

  initializationPromise = (async () => {
    try {
      logger.info('🌀 Initializing WebTorrent client...');
      const webTorrentModule = await importDynamic('webtorrent');
      const WebTorrent = webTorrentModule?.default ?? webTorrentModule;

      client = new WebTorrent({
        uploadLimit: isProduction ? config.production.network.defaultUploadLimit : 10000,
        downloadLimit: -1,
        maxConns: isProduction ? config.production.network.maxConns : 150,
        webSeeds: true,
        tracker: true,
        pex: true,
        dht: true,
        ...(isCloud && {
          maxConns: 80,
          maxWebConns: 20,
          dhtTimeout: 10000,
          trackerTimeout: 15000,
          keepSeeding: true,
          utp: true
        })
      });

      logger.info('✅ WebTorrent client initialized successfully');
      return client;
    } catch (error: any) {
      logger.error('❌ Failed to initialize WebTorrent client:', error);
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Get WebTorrent client instance (synchronous access after initialization)
 */
export function getClient(): any {
  return client;
}

/**
 * Execute a function with the WebTorrent client, with safe fallback
 * @template T
 * @param fn - Function to execute with client
 * @param fallback - Fallback value if client not initialized
 * @returns Result of fn or fallback
 */
export function withClient<T>(fn: (client: any) => T, fallback?: T): T | undefined {
  if (!client) {
    logger.warn('⚠️  WebTorrent client not initialized, returning fallback value');
    return fallback;
  }

  try {
    return fn(client);
  } catch (error: any) {
    logger.error('❌ Error executing withClient function:', error);
    return fallback;
  }
}

// Getter property for backward compatibility
export const clientGetter = {
  get client() {
    if (!client) {
      logger.warn(
        '⚠️  WebTorrent client accessed before initialization. Call initializeClient() first.'
      );
    }
    return client;
  }
};

// CommonJS compatibility
module.exports = {
  initializeClient,
  getClient,
  withClient,
  get client() {
    if (!client) {
      logger.warn(
        '⚠️  WebTorrent client accessed before initialization. Call initializeClient() first.'
      );
    }
    return client;
  }
};
