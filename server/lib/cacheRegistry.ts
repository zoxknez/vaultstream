/**
 * Cache Registry - Centralized LRU Cache Management (Sprint 2.1 - PASS 4)
 * Manages all application caches with metrics and cleanup
 */

import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  max: number;
  ttl: number;
  updateAgeOnGet?: boolean;
}

export interface CacheStats {
  name: string;
  size: number;
  max: number;
  ttl: number;
  calculatedSize?: number;
}

export type CacheKey = 
  | 'torrent_list'
  | 'torrent_details'
  | 'torrent_files'
  | 'torrent_stats'
  | 'torrent_imdb';

/**
 * Centralized cache registry with built-in metrics
 */
export class CacheRegistry {
  private caches = new Map<CacheKey, LRUCache<string, any>>();
  private metricsCallback?: (cacheName: CacheKey, size: number) => void;

  /**
   * Register a new cache
   */
  register(name: CacheKey, options: CacheOptions): LRUCache<string, any> {
    const cache = new LRUCache<string, any>({
      updateAgeOnGet: true,
      ...options
    });

    this.caches.set(name, cache);
    this.updateMetrics(name, cache);
    
    console.log(`✅ Cache registered: ${name} (max: ${options.max}, ttl: ${options.ttl}ms)`);
    return cache;
  }

  /**
   * Get a registered cache by name
   */
  get(name: CacheKey): LRUCache<string, any> | undefined {
    return this.caches.get(name);
  }

  /**
   * Clear specific cache
   */
  clear(name: CacheKey): void {
    const cache = this.caches.get(name);
    if (cache) {
      cache.clear();
      this.updateMetrics(name, cache);
      console.log(`🗑️  Cache cleared: ${name}`);
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.forEach((cache, name) => {
      cache.clear();
      this.updateMetrics(name, cache);
    });
    console.log(`🗑️  All caches cleared (${this.caches.size} caches)`);
  }

  /**
   * Get statistics for all caches
   */
  getStats(): CacheStats[] {
    return Array.from(this.caches.entries()).map(([name, cache]) => ({
      name,
      size: cache.size,
      max: cache.max,
      ttl: cache.ttl || 0,
      calculatedSize: cache.calculatedSize
    }));
  }

  /**
   * Set metrics callback for Prometheus/custom metrics
   */
  setMetricsCallback(callback: (cacheName: CacheKey, size: number) => void): void {
    this.metricsCallback = callback;
  }

  /**
   * Update metrics for a cache
   */
  private updateMetrics(name: CacheKey, cache: LRUCache<string, any>): void {
    if (this.metricsCallback) {
      this.metricsCallback(name, cache.size);
    }
  }

  /**
   * Record cache hit
   */
  recordHit(name: CacheKey, hitCallback?: (cacheName: string) => void): void {
    if (hitCallback) {
      hitCallback(name);
    }
  }

  /**
   * Record cache miss
   */
  recordMiss(name: CacheKey, missCallback?: (cacheName: string) => void): void {
    if (missCallback) {
      missCallback(name);
    }
  }
}

// Singleton instance
export const cacheRegistry = new CacheRegistry();

// CommonJS compatibility
module.exports = {
  CacheRegistry,
  cacheRegistry
};
