/**
 * Request Batching and Deduplication
 * Optimizes API calls by batching multiple requests and deduplicating identical requests
 */

class RequestBatcher {
  constructor(options = {}) {
    this.batchDelay = options.batchDelay || 50; // ms
    this.maxBatchSize = options.maxBatchSize || 10;
    this.pendingRequests = new Map();
    this.batchTimeout = null;
  }

  /**
   * Add request to batch
   * @param {string} key - Unique request identifier
   * @param {Function} requestFn - Function that returns a Promise
   * @returns {Promise} - Resolves with request result
   */
  add(key, requestFn) {
    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key).promise;
    }

    // Create new request entry
    const entry = {
      key,
      requestFn,
      promise: null,
      resolve: null,
      reject: null
    };

    // Create promise for this request
    entry.promise = new Promise((resolve, reject) => {
      entry.resolve = resolve;
      entry.reject = reject;
    });

    this.pendingRequests.set(key, entry);

    // Schedule batch execution
    this.scheduleBatch();

    return entry.promise;
  }

  /**
   * Schedule batch execution
   */
  scheduleBatch() {
    if (this.batchTimeout) return;

    this.batchTimeout = setTimeout(() => {
      this.executeBatch();
    }, this.batchDelay);
  }

  /**
   * Execute batched requests
   */
  async executeBatch() {
    const batch = Array.from(this.pendingRequests.values()).slice(0, this.maxBatchSize);

    if (batch.length === 0) {
      this.batchTimeout = null;
      return;
    }

    // Remove executed requests from pending
    batch.forEach((entry) => {
      this.pendingRequests.delete(entry.key);
    });

    // Execute all requests in parallel
    const results = await Promise.allSettled(batch.map((entry) => entry.requestFn()));

    // Resolve/reject promises
    results.forEach((result, index) => {
      const entry = batch[index];
      if (result.status === 'fulfilled') {
        entry.resolve(result.value);
      } else {
        entry.reject(result.reason);
      }
    });

    // Reset timeout
    this.batchTimeout = null;

    // If there are more pending requests, schedule next batch
    if (this.pendingRequests.size > 0) {
      this.scheduleBatch();
    }
  }

  /**
   * Clear all pending requests
   */
  clear() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Reject all pending requests
    this.pendingRequests.forEach((entry) => {
      entry.reject(new Error('Batch cleared'));
    });

    this.pendingRequests.clear();
  }
}

/**
 * Request Deduplicator
 * Prevents duplicate API calls for the same resource
 */
class RequestDeduplicator {
  constructor() {
    this.inflightRequests = new Map();
  }

  /**
   * Deduplicate request
   * @param {string} key - Unique request identifier
   * @param {Function} requestFn - Function that returns a Promise
   * @returns {Promise} - Resolves with request result
   */
  async dedupe(key, requestFn) {
    // If request is already in flight, return existing promise
    if (this.inflightRequests.has(key)) {
      return this.inflightRequests.get(key);
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Remove from inflight when done
      this.inflightRequests.delete(key);
    });

    this.inflightRequests.set(key, promise);
    return promise;
  }

  /**
   * Clear all inflight requests
   */
  clear() {
    this.inflightRequests.clear();
  }
}

/**
 * DataLoader-style batching for API calls
 * Groups multiple requests into a single batch
 */
class DataLoader {
  constructor(batchLoadFn, options = {}) {
    this.batchLoadFn = batchLoadFn;
    this.maxBatchSize = options.maxBatchSize || 100;
    this.batchDelay = options.batchDelay || 16; // ~1 frame
    this.cache = options.cache !== false;
    this.cacheMap = new Map();
    this.queue = [];
    this.batchTimeout = null;
  }

  /**
   * Load single item
   * @param {any} key - Item key
   * @returns {Promise} - Resolves with item value
   */
  load(key) {
    // Check cache first
    if (this.cache && this.cacheMap.has(key)) {
      return Promise.resolve(this.cacheMap.get(key));
    }

    // Create promise for this request
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Schedule batch
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.dispatch();
        }, this.batchDelay);
      }
    });
  }

  /**
   * Load multiple items
   * @param {Array} keys - Array of keys
   * @returns {Promise<Array>} - Resolves with array of values
   */
  loadMany(keys) {
    return Promise.all(keys.map((key) => this.load(key)));
  }

  /**
   * Dispatch batched requests
   */
  async dispatch() {
    const batch = this.queue.splice(0, this.maxBatchSize);
    this.batchTimeout = null;

    if (batch.length === 0) return;

    const keys = batch.map((item) => item.key);

    try {
      const results = await this.batchLoadFn(keys);

      // Resolve all promises
      batch.forEach((item, index) => {
        const result = results[index];

        // Cache result
        if (this.cache) {
          this.cacheMap.set(item.key, result);
        }

        item.resolve(result);
      });
    } catch (error) {
      // Reject all promises
      batch.forEach((item) => {
        item.reject(error);
      });
    }

    // If there are more items in queue, schedule next batch
    if (this.queue.length > 0) {
      this.batchTimeout = setTimeout(() => {
        this.dispatch();
      }, this.batchDelay);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cacheMap.clear();
  }
}

// Create singleton instances
export const requestBatcher = new RequestBatcher({
  batchDelay: 50,
  maxBatchSize: 10
});

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Create a DataLoader instance
 * @param {Function} batchLoadFn - Batch load function
 * @param {Object} options - Options
 * @returns {DataLoader} - DataLoader instance
 */
export function createDataLoader(batchLoadFn, options) {
  return new DataLoader(batchLoadFn, options);
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Batch API calls example usage:
 *
 * // Create loader for TMDB movies
 * const movieLoader = createDataLoader(async (ids) => {
 *   const response = await fetch(`/api/movies/batch?ids=${ids.join(',')}`);
 *   return response.json();
 * });
 *
 * // Load multiple movies (automatically batched)
 * const movie1 = await movieLoader.load(123);
 * const movie2 = await movieLoader.load(456);
 * // ^ These will be batched into a single request
 *
 * // Or load many at once
 * const movies = await movieLoader.loadMany([123, 456, 789]);
 */

export { DataLoader, RequestBatcher, RequestDeduplicator };
