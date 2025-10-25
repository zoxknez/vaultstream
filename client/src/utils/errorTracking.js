/**
 * 🔍 ERROR TRACKING UTILITY
 * Centralized error logging and reporting for StreamVault
 * Supports Electron-specific error tracking and crash reporting
 */

import { error as logError } from '../services/loggingService';

// Error tracking configuration
const config = {
  enableConsoleLog: import.meta.env.DEV,
  enableRemoteTracking: import.meta.env.PROD,
  maxStackDepth: 10,
  sampleRate: 1.0 // 100% in dev, could be lower in prod
};

// Error queue for batch reporting
let errorQueue = [];
const MAX_QUEUE_SIZE = 50;

/**
 * Initialize error tracking
 */
export function initErrorTracking() {
  // Global error handler
  window.addEventListener('error', (event) => {
    trackError({
      message: event.message,
      stack: event.error?.stack,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'uncaught-error'
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackError({
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      type: 'unhandled-rejection',
      promise: event.promise
    });
  });

  // Electron-specific errors
  if (window.electronAPI) {
    console.log('✅ Electron error tracking enabled');

    // Listen for renderer process crashes
    window.addEventListener('beforeunload', () => {
      flushErrorQueue();
    });
  }

  // Send errors periodically
  setInterval(() => {
    if (errorQueue.length > 0) {
      flushErrorQueue();
    }
  }, 30000); // Every 30 seconds

  console.log('✅ Error tracking initialized');
}

/**
 * Track an error
 */
export function trackError(errorData) {
  const enrichedError = enrichErrorData(errorData);

  // Log to console in dev
  if (config.enableConsoleLog) {
    console.error('🚨 Error tracked:', enrichedError);
  }

  // Log to service
  logError(enrichedError.message, {
    ...enrichedError,
    timestamp: new Date().toISOString()
  });

  // Add to queue
  errorQueue.push(enrichedError);

  // Flush if queue is full
  if (errorQueue.length >= MAX_QUEUE_SIZE) {
    flushErrorQueue();
  }

  // Send to Electron main process if available
  if (window.electronAPI?.performance) {
    window.electronAPI.performance.getMetrics().then((metrics) => {
      console.log('💾 Memory at error:', {
        memory: metrics.memory,
        cpu: metrics.cpu
      });
    });
  }
}

/**
 * Enrich error data with context
 */
function enrichErrorData(errorData) {
  const enriched = {
    ...errorData,
    timestamp: Date.now(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    memory: performance.memory
      ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        }
      : null
  };

  // Add Electron-specific context
  if (window.electronAPI) {
    enriched.platform = {
      os: window.electronAPI.platform,
      arch: window.electronAPI.arch,
      version: window.electronAPI.version
    };
  }

  // Clean up stack trace
  if (enriched.stack) {
    enriched.stack = cleanStackTrace(enriched.stack);
  }

  return enriched;
}

/**
 * Clean and truncate stack trace
 */
function cleanStackTrace(stack) {
  if (!stack) return null;

  const lines = stack.split('\n');
  const cleaned = lines
    .slice(0, config.maxStackDepth)
    .map((line) => line.trim())
    .filter(Boolean);

  return cleaned.join('\n');
}

/**
 * Flush error queue
 */
async function flushErrorQueue() {
  if (errorQueue.length === 0) return;

  const errors = [...errorQueue];
  errorQueue = [];

  if (config.enableRemoteTracking) {
    try {
      // Send to backend
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errors,
          session: getSessionId()
        })
      });

      console.log(`📤 Sent ${errors.length} errors to tracking service`);
    } catch (err) {
      console.error('Failed to send errors:', err);
      // Re-add to queue
      errorQueue.unshift(...errors);
    }
  }
}

/**
 * Get or create session ID
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem('errorTrackingSessionId');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('errorTrackingSessionId', sessionId);
  }
  return sessionId;
}

/**
 * Track component error (for use in Error Boundaries)
 */
export function trackComponentError(error, errorInfo, componentName = 'Unknown') {
  trackError({
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    componentName,
    type: 'react-error-boundary'
  });
}

/**
 * Track network error
 */
export function trackNetworkError(url, error, options = {}) {
  trackError({
    message: `Network request failed: ${url}`,
    stack: error.stack,
    url,
    method: options.method || 'GET',
    type: 'network-error'
  });
}

/**
 * Track performance issue
 */
export function trackPerformanceIssue(metric, value, threshold) {
  if (value > threshold) {
    trackError({
      message: `Performance threshold exceeded: ${metric}`,
      metric,
      value,
      threshold,
      type: 'performance-issue'
    });
  }
}

/**
 * Manual error reporting
 */
export function reportError(message, context = {}) {
  trackError({
    message,
    ...context,
    type: 'manual-report'
  });
}

/**
 * Get error statistics
 */
export function getErrorStats() {
  return {
    queueSize: errorQueue.length,
    sessionId: getSessionId()
  };
}

// Export for Electron main process
if (window.electronAPI) {
  window.__STREAMVAULT_ERROR_TRACKER__ = trackComponentError;
}

export default {
  init: initErrorTracking,
  track: trackError,
  trackComponent: trackComponentError,
  trackNetwork: trackNetworkError,
  trackPerformance: trackPerformanceIssue,
  report: reportError,
  getStats: getErrorStats
};
