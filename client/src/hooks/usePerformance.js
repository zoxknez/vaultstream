/**
 * 🚀 STREAMVAULT PERFORMANCE MONITORING HOOK
 * Advanced performance monitoring and optimization
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '../utils/logger';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      renderTime: [],
      memoryUsage: [],
      networkRequests: [],
      userInteractions: [],
      errors: []
    };

    this.observers = new Map();
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Monitor render performance
    this.observeRenderPerformance();

    // Monitor memory usage
    this.observeMemoryUsage();

    // Monitor network requests
    this.observeNetworkRequests();

    // Monitor user interactions
    this.observeUserInteractions();

    // Monitor errors
    this.observeErrors();

    logger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // Disconnect all observers
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }

    this.observers.clear();

    logger.info('Performance monitoring stopped');
  }

  /**
   * Monitor render performance
   */
  observeRenderPerformance() {
    if (!window.performance || !window.performance.mark) return;

    // Monitor component render times
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          this.metrics.renderTime.push({
            name: entry.name,
            duration: entry.duration,
            timestamp: Date.now()
          });
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });
    this.observers.set('render', observer);
  }

  /**
   * Monitor memory usage
   */
  observeMemoryUsage() {
    if (!window.performance || !window.performance.memory) return;

    const checkMemory = () => {
      const memory = window.performance.memory;

      this.metrics.memoryUsage.push({
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        timestamp: Date.now()
      });

      // Check for memory leaks
      if (this.metrics.memoryUsage.length > 10) {
        const recent = this.metrics.memoryUsage.slice(-10);
        const isIncreasing = recent.every(
          (item, index) => index === 0 || item.used > recent[index - 1].used
        );

        if (isIncreasing) {
          logger.warn('Potential memory leak detected', {
            memoryUsage: memory.usedJSHeapSize,
            limit: memory.jsHeapSizeLimit
          });
        }
      }
    };

    // Check memory every 5 seconds
    const interval = setInterval(checkMemory, 5000);

    // Store interval for cleanup
    this.observers.set('memory', { disconnect: () => clearInterval(interval) });
  }

  /**
   * Monitor network requests
   */
  observeNetworkRequests() {
    if (!window.performance || !window.performance.getEntriesByType) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          this.metrics.networkRequests.push({
            name: entry.name,
            duration: entry.duration,
            size: entry.transferSize,
            timestamp: Date.now()
          });
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.set('network', observer);
  }

  /**
   * Monitor user interactions
   */
  observeUserInteractions() {
    const events = ['click', 'scroll', 'keydown', 'mousemove'];

    const handleInteraction = (event) => {
      this.metrics.userInteractions.push({
        type: event.type,
        target: event.target.tagName,
        timestamp: Date.now()
      });
    };

    events.forEach((eventType) => {
      document.addEventListener(eventType, handleInteraction, { passive: true });
    });

    // Store cleanup function
    this.observers.set('interactions', {
      disconnect: () => {
        events.forEach((eventType) => {
          document.removeEventListener(eventType, handleInteraction);
        });
      }
    });
  }

  /**
   * Monitor errors
   */
  observeErrors() {
    const handleError = (event) => {
      this.metrics.errors.push({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now()
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', (event) => {
      this.metrics.errors.push({
        message: event.reason?.message || 'Unhandled promise rejection',
        timestamp: Date.now()
      });
    });

    // Store cleanup function
    this.observers.set('errors', {
      disconnect: () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleError);
      }
    });
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      summary: this.generateSummary()
    };
  }

  /**
   * Generate performance summary
   */
  generateSummary() {
    const summary = {
      renderTime: this.calculateRenderTimeSummary(),
      memoryUsage: this.calculateMemoryUsageSummary(),
      networkRequests: this.calculateNetworkRequestsSummary(),
      userInteractions: this.calculateUserInteractionsSummary(),
      errors: this.calculateErrorsSummary(),
      overallScore: 0
    };

    // Calculate overall performance score
    summary.overallScore = this.calculateOverallScore(summary);

    return summary;
  }

  /**
   * Calculate render time summary
   */
  calculateRenderTimeSummary() {
    if (this.metrics.renderTime.length === 0) return null;

    const durations = this.metrics.renderTime.map((item) => item.duration);

    return {
      count: this.metrics.renderTime.length,
      average: durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      slowRenders: durations.filter((duration) => duration > 100).length
    };
  }

  /**
   * Calculate memory usage summary
   */
  calculateMemoryUsageSummary() {
    if (this.metrics.memoryUsage.length === 0) return null;

    const used = this.metrics.memoryUsage.map((item) => item.used);
    const total = this.metrics.memoryUsage.map((item) => item.total);

    return {
      count: this.metrics.memoryUsage.length,
      averageUsed: used.reduce((sum, usage) => sum + usage, 0) / used.length,
      averageTotal: total.reduce((sum, usage) => sum + usage, 0) / total.length,
      currentUsed: used[used.length - 1],
      currentTotal: total[total.length - 1],
      peakUsed: Math.max(...used),
      peakTotal: Math.max(...total)
    };
  }

  /**
   * Calculate network requests summary
   */
  calculateNetworkRequestsSummary() {
    if (this.metrics.networkRequests.length === 0) return null;

    const durations = this.metrics.networkRequests.map((item) => item.duration);
    const sizes = this.metrics.networkRequests.map((item) => item.size);

    return {
      count: this.metrics.networkRequests.length,
      averageDuration: durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
      averageSize: sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
      slowRequests: durations.filter((duration) => duration > 1000).length,
      largeRequests: sizes.filter((size) => size > 100000).length
    };
  }

  /**
   * Calculate user interactions summary
   */
  calculateUserInteractionsSummary() {
    if (this.metrics.userInteractions.length === 0) return null;

    const types = this.metrics.userInteractions.map((item) => item.type);
    const typeCounts = types.reduce((counts, type) => {
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});

    return {
      count: this.metrics.userInteractions.length,
      typeCounts,
      mostActiveType: Object.entries(typeCounts).reduce((a, b) => (a[1] > b[1] ? a : b))[0]
    };
  }

  /**
   * Calculate errors summary
   */
  calculateErrorsSummary() {
    if (this.metrics.errors.length === 0) return null;

    return {
      count: this.metrics.errors.length,
      recentErrors: this.metrics.errors.slice(-5),
      errorRate:
        (this.metrics.errors.length / (Date.now() - this.metrics.errors[0]?.timestamp || 1)) * 1000
    };
  }

  /**
   * Calculate overall performance score
   */
  calculateOverallScore(summary) {
    let score = 100;

    // Deduct for slow renders
    if (summary.renderTime?.slowRenders > 0) {
      score -= Math.min(summary.renderTime.slowRenders * 5, 30);
    }

    // Deduct for high memory usage
    if (summary.memoryUsage?.currentUsed > 50 * 1024 * 1024) {
      // 50MB
      score -= 20;
    }

    // Deduct for slow network requests
    if (summary.networkRequests?.slowRequests > 0) {
      score -= Math.min(summary.networkRequests.slowRequests * 3, 20);
    }

    // Deduct for errors
    if (summary.errors?.count > 0) {
      score -= Math.min(summary.errors.count * 10, 40);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Clear metrics
   */
  clearMetrics() {
    this.metrics = {
      renderTime: [],
      memoryUsage: [],
      networkRequests: [],
      userInteractions: [],
      errors: []
    };
  }
}

// Global performance monitor instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Performance monitoring hook
 */
export const usePerformance = () => {
  const [metrics, setMetrics] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef(null);

  /**
   * Start monitoring
   */
  const startMonitoring = useCallback(() => {
    performanceMonitor.startMonitoring();
    setIsMonitoring(true);

    // Update metrics every 5 seconds
    intervalRef.current = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics());
    }, 5000);
  }, []);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    performanceMonitor.stopMonitoring();
    setIsMonitoring(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Get current metrics
   */
  const getMetrics = useCallback(() => {
    return performanceMonitor.getMetrics();
  }, []);

  /**
   * Clear metrics
   */
  const clearMetrics = useCallback(() => {
    performanceMonitor.clearMetrics();
    setMetrics(null);
  }, []);

  /**
   * Mark performance entry
   */
  const mark = useCallback((name) => {
    if (window.performance && window.performance.mark) {
      window.performance.mark(name);
    }
  }, []);

  /**
   * Measure performance between two marks
   */
  const measure = useCallback((name, startMark, endMark) => {
    if (window.performance && window.performance.measure) {
      try {
        window.performance.measure(name, startMark, endMark);
      } catch (error) {
        logger.warn('Performance measure failed:', error.message);
      }
    }
  }, []);

  /**
   * Get performance recommendations
   */
  const getRecommendations = useCallback(() => {
    const currentMetrics = getMetrics();
    const recommendations = [];

    if (currentMetrics?.summary) {
      const { renderTime, memoryUsage, networkRequests, errors } = currentMetrics.summary;

      // Render performance recommendations
      if (renderTime?.slowRenders > 0) {
        recommendations.push({
          type: 'render',
          priority: 'high',
          message: `${renderTime.slowRenders} slow renders detected. Consider optimizing component rendering.`,
          impact: 'High performance impact'
        });
      }

      // Memory usage recommendations
      if (memoryUsage?.currentUsed > 50 * 1024 * 1024) {
        recommendations.push({
          type: 'memory',
          priority: 'medium',
          message: `High memory usage detected (${Math.round(
            memoryUsage.currentUsed / 1024 / 1024
          )}MB). Check for memory leaks.`,
          impact: 'Medium performance impact'
        });
      }

      // Network performance recommendations
      if (networkRequests?.slowRequests > 0) {
        recommendations.push({
          type: 'network',
          priority: 'medium',
          message: `${networkRequests.slowRequests} slow network requests detected. Consider optimizing API calls.`,
          impact: 'Medium performance impact'
        });
      }

      // Error recommendations
      if (errors?.count > 0) {
        recommendations.push({
          type: 'errors',
          priority: 'high',
          message: `${errors.count} errors detected. Fix errors to improve stability.`,
          impact: 'High stability impact'
        });
      }
    }

    return recommendations;
  }, [getMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getMetrics,
    clearMetrics,
    mark,
    measure,
    getRecommendations
  };
};

/**
 * Performance optimization utilities
 */
export const performanceUtils = {
  /**
   * Debounce function for performance
   */
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function for performance
   */
  throttle: (func, limit) => {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  /**
   * Memoize function for performance
   */
  memoize: (func) => {
    const cache = new Map();
    return function executedFunction(...args) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func.apply(this, args);
      cache.set(key, result);
      return result;
    };
  },

  /**
   * Lazy load component
   */
  lazyLoad: (importFunc) => {
    return React.lazy(importFunc);
  },

  /**
   * Preload resource
   */
  preload: (href, as = 'script') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  },

  /**
   * Prefetch resource
   */
  prefetch: (href) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  }
};

export default usePerformance;
