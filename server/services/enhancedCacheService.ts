/**
 * Enhanced Cache Service with Multi-tier Strategy - TypeScript Migration
 * Implements intelligent caching with LRU local cache + Redis distributed cache
 */

import { LRUCache } from 'lru-cache';
import { createClient, RedisClientType } from 'redis';

// ===== TYPES =====

export type CacheTier = 'local' | 'redis' | 'both';

export interface CacheStrategy {
  ttl: number;
  tiers: CacheTier[];
}

export interface CacheOptions {
  localFirst?: boolean;
  strategy?: CacheStrategy;
}

export interface CacheStats {
  hits: number;
  misses: number;
  localHits: number;
  redisHits: number;
  sets: number;
  deletes: number;
  size: number;
  localSize: number;
  hitRate: string;
}

export interface WarmCacheOptions {
  keys: string[];
  dataFetcher: (key: string) => Promise<any>;
  strategy?: CacheStrategy;
}

// ===== CONSTANTS =====

export const CACHE_TIERS = {
  LOCAL_ONLY: 'local' as CacheTier,
  REDIS_ONLY: 'redis' as CacheTier,
  BOTH: 'both' as CacheTier
};

// Cache strategies for different data types
export const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  TMDB_METADATA: { ttl: 86400, tiers: [CACHE_TIERS.BOTH] }, // 24h - both tiers
  TORRENT_STATS: { ttl: 2, tiers: [CACHE_TIERS.LOCAL_ONLY] }, // 2s - local only
  SEARCH_RESULTS: { ttl: 300, tiers: [CACHE_TIERS.REDIS_ONLY] }, // 5min - Redis only
  USER_PROFILE: { ttl: 600, tiers: [CACHE_TIERS.BOTH] }, // 10min - both tiers
  WATCHLIST: { ttl: 60, tiers: [CACHE_TIERS.LOCAL_ONLY] }, // 1min - local only
  TORRENT_LIST: { ttl: 2, tiers: [CACHE_TIERS.LOCAL_ONLY] }, // 2s - local only
  TORRENT_DETAILS: { ttl: 3, tiers: [CACHE_TIERS.LOCAL_ONLY] }, // 3s - local only
  TORRENT_FILES: { ttl: 10, tiers: [CACHE_TIERS.LOCAL_ONLY] }, // 10s - local only
  TORRENT_IMDB: { ttl: 3600, tiers: [CACHE_TIERS.BOTH] } // 1h - both tiers
};

// ===== CLASS =====

class CacheManager {
  private localCache: LRUCache<string, any>;
  private redisClient: RedisClientType | null;
  private redisConnected: boolean;
  private stats: Omit<CacheStats, 'size' | 'localSize' | 'hitRate'>;

  constructor() {
    this.localCache = new LRUCache({ max: 1000, ttl: 1000 * 60 * 5 }); // 5min default
    this.redisClient = null;
    this.redisConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      localHits: 0,
      redisHits: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Initialize Redis connection
   */
  async initialize(redisUrl?: string): Promise<void> {
    if (!redisUrl) {
      console.log('⚠️  Redis URL not provided, using local cache only');
      return;
    }

    try {
      this.redisClient = createClient({ url: redisUrl }) as RedisClientType;

      this.redisClient.on('error', (err: Error) => {
        console.error('Redis error:', err);
        this.redisConnected = false;
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis connected for distributed caching');
        this.redisConnected = true;
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.redisConnected = false;
    }
  }

  /**
   * Get value from cache (multi-tier)
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { localFirst = true, strategy = CACHE_STRATEGIES.TORRENT_STATS } = options;

    // Try local cache first if specified
    if (
      (localFirst && strategy.tiers.includes(CACHE_TIERS.LOCAL_ONLY)) ||
      strategy.tiers.includes(CACHE_TIERS.BOTH)
    ) {
      const localValue = this.localCache.get(key);
      if (localValue !== undefined) {
        this.stats.hits++;
        this.stats.localHits++;
        return localValue as T;
      }
    }

    // Try Redis if connected and strategy allows
    if (
      this.redisConnected &&
      this.redisClient &&
      (strategy.tiers.includes(CACHE_TIERS.REDIS_ONLY) || strategy.tiers.includes(CACHE_TIERS.BOTH))
    ) {
      try {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          this.stats.hits++;
          this.stats.redisHits++;
          const parsed = JSON.parse(redisValue) as T;

          // Backfill local cache if using BOTH tiers
          if (strategy.tiers.includes(CACHE_TIERS.BOTH)) {
            this.localCache.set(key, parsed, { ttl: strategy.ttl * 1000 });
          }

          return parsed;
        }
      } catch (error) {
        console.error('Redis get error:', error);
      }
    }

    this.stats.misses++;
    return null;
  }

  /**
   * Set value in cache (multi-tier)
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { strategy = CACHE_STRATEGIES.TORRENT_STATS } = options;

    // Set in local cache if strategy allows
    if (
      strategy.tiers.includes(CACHE_TIERS.LOCAL_ONLY) ||
      strategy.tiers.includes(CACHE_TIERS.BOTH)
    ) {
      this.localCache.set(key, value, { ttl: strategy.ttl * 1000 });
    }

    // Set in Redis if connected and strategy allows
    if (
      this.redisConnected &&
      this.redisClient &&
      (strategy.tiers.includes(CACHE_TIERS.REDIS_ONLY) || strategy.tiers.includes(CACHE_TIERS.BOTH))
    ) {
      try {
        await this.redisClient.setEx(key, strategy.ttl, JSON.stringify(value));
      } catch (error) {
        console.error('Redis set error:', error);
      }
    }

    this.stats.sets++;
  }

  /**
   * Delete value from cache (multi-tier)
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const { strategy = CACHE_STRATEGIES.TORRENT_STATS } = options;

    // Delete from local cache
    if (
      strategy.tiers.includes(CACHE_TIERS.LOCAL_ONLY) ||
      strategy.tiers.includes(CACHE_TIERS.BOTH)
    ) {
      this.localCache.delete(key);
    }

    // Delete from Redis if connected
    if (
      this.redisConnected &&
      this.redisClient &&
      (strategy.tiers.includes(CACHE_TIERS.REDIS_ONLY) || strategy.tiers.includes(CACHE_TIERS.BOTH))
    ) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.error('Redis delete error:', error);
      }
    }

    this.stats.deletes++;
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.localCache.clear();

    if (this.redisConnected && this.redisClient) {
      try {
        await this.redisClient.flushDb();
      } catch (error) {
        console.error('Redis clear error:', error);
      }
    }
  }

  /**
   * Warm cache with predefined keys
   */
  async warmCache(options: WarmCacheOptions): Promise<number> {
    const { keys, dataFetcher, strategy = CACHE_STRATEGIES.TMDB_METADATA } = options;
    let warmedCount = 0;

    for (const key of keys) {
      try {
        const data = await dataFetcher(key);
        if (data) {
          await this.set(key, data, { strategy });
          warmedCount++;
        }
      } catch (error) {
        console.error(`Failed to warm cache for key ${key}:`, error);
      }
    }

    return warmedCount;
  }

  /**
   * Invalidate cache by pattern (local only)
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0;

    for (const key of this.localCache.keys()) {
      if (pattern.test(key)) {
        this.localCache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : '0.00';

    return {
      ...this.stats,
      size: this.localCache.size,
      localSize: this.localCache.size,
      hitRate: `${hitRate}%`
    };
  }

  /**
   * Cleanup and close connections
   */
  async cleanup(): Promise<void> {
    this.localCache.clear();

    if (this.redisClient) {
      try {
        await this.redisClient.quit();
      } catch (error) {
        console.error('Redis cleanup error:', error);
      }
      this.redisClient = null;
      this.redisConnected = false;
    }
  }
}

// ===== EXPORTS =====

// Singleton instance
const cacheManager = new CacheManager();

export default cacheManager;

// Named exports for direct usage
export { CacheManager, cacheManager as enhancedCacheService };

// CommonJS compatibility
module.exports = cacheManager;
module.exports.enhancedCacheService = cacheManager;
module.exports.CacheManager = CacheManager;
module.exports.CACHE_STRATEGIES = CACHE_STRATEGIES;
module.exports.CACHE_TIERS = CACHE_TIERS;
