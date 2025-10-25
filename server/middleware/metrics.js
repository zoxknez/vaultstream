/**
 * 📊 STREAMVAULT METRICS MIDDLEWARE
 * Performance monitoring and metrics collection
 */

const { logger } = require('../utils/logger');
const { trackRequest, trackConnection } = require('../services/memoryService');

// Metrics storage
const metrics = {
  requests: {
    total: 0,
    successful: 0,
    failed: 0,
    averageResponseTime: 0,
    responseTimes: []
  },
  connections: {
    active: 0,
    total: 0,
    peak: 0
  },
  errors: {
    total: 0,
    byType: {},
    byEndpoint: {}
  },
  performance: {
    memoryUsage: [],
    cpuUsage: [],
    heapUsed: [],
    heapTotal: []
  }
};

/**
 * Track request metrics
 */
const trackRequestMetrics = (req, res, next) => {
  const startTime = Date.now();
  
  // Track request start
  trackRequest(req);
  
  // Increment total requests
  metrics.requests.total++;
  metrics.connections.active++;
  metrics.connections.total++;
  
  // Update peak connections
  if (metrics.connections.active > metrics.connections.peak) {
    metrics.connections.peak = metrics.connections.active;
  }

  // Override res.end to track response
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Track response time
    metrics.requests.responseTimes.push(responseTime);
    
    // Keep only last 1000 response times
    if (metrics.requests.responseTimes.length > 1000) {
      metrics.requests.responseTimes.shift();
    }
    
    // Update average response time
    const totalTime = metrics.requests.responseTimes.reduce((sum, time) => sum + time, 0);
    metrics.requests.averageResponseTime = totalTime / metrics.requests.responseTimes.length;
    
    // Track success/failure
    if (res.statusCode >= 200 && res.statusCode < 400) {
      metrics.requests.successful++;
    } else {
      metrics.requests.failed++;
      
      // Track error by endpoint
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      if (!metrics.errors.byEndpoint[endpoint]) {
        metrics.errors.byEndpoint[endpoint] = 0;
      }
      metrics.errors.byEndpoint[endpoint]++;
    }
    
    // Decrement active connections
    metrics.connections.active--;
    
    // Call original end
    originalEnd.apply(this, args);
  };

  next();
};

/**
 * Track error metrics
 */
const trackErrorMetrics = (error, req, res, next) => {
  // Increment error count
  metrics.errors.total++;
  
  // Track error by type
  const errorType = error.constructor.name;
  if (!metrics.errors.byType[errorType]) {
    metrics.errors.byType[errorType] = 0;
  }
  metrics.errors.byType[errorType]++;
  
  // Track error by endpoint
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  if (!metrics.errors.byEndpoint[endpoint]) {
    metrics.errors.byEndpoint[endpoint] = 0;
  }
  metrics.errors.byEndpoint[endpoint]++;
  
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next(error);
};

/**
 * Track performance metrics
 */
const trackPerformanceMetrics = (req, res, next) => {
  // Track memory usage
  const memoryUsage = process.memoryUsage();
  metrics.performance.memoryUsage.push({
    timestamp: Date.now(),
    rss: memoryUsage.rss,
    heapUsed: memoryUsage.heapUsed,
    heapTotal: memoryUsage.heapTotal,
    external: memoryUsage.external,
    arrayBuffers: memoryUsage.arrayBuffers
  });
  
  // Keep only last 100 memory readings
  if (metrics.performance.memoryUsage.length > 100) {
    metrics.performance.memoryUsage.shift();
  }
  
  // Track heap usage
  metrics.performance.heapUsed.push(memoryUsage.heapUsed);
  metrics.performance.heapTotal.push(memoryUsage.heapTotal);
  
  // Keep only last 100 heap readings
  if (metrics.performance.heapUsed.length > 100) {
    metrics.performance.heapUsed.shift();
    metrics.performance.heapTotal.shift();
  }
  
  next();
};

/**
 * Get current metrics
 */
const getMetrics = () => {
  const currentMemory = process.memoryUsage();
  
  return {
    ...metrics,
    current: {
      memory: currentMemory,
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid
    }
  };
};

/**
 * Get metrics summary
 */
const getMetricsSummary = () => {
  const currentMemory = process.memoryUsage();
  const uptime = process.uptime();
  
  return {
    requests: {
      total: metrics.requests.total,
      successful: metrics.requests.successful,
      failed: metrics.requests.failed,
      successRate: metrics.requests.total > 0 ? 
        (metrics.requests.successful / metrics.requests.total * 100).toFixed(2) + '%' : '0%',
      averageResponseTime: Math.round(metrics.requests.averageResponseTime) + 'ms'
    },
    connections: {
      active: metrics.connections.active,
      total: metrics.connections.total,
      peak: metrics.connections.peak
    },
    errors: {
      total: metrics.errors.total,
      byType: metrics.errors.byType,
      byEndpoint: metrics.errors.byEndpoint
    },
    performance: {
      memoryUsage: {
        current: Math.round(currentMemory.heapUsed / 1024 / 1024) + 'MB',
        peak: Math.round(Math.max(...metrics.performance.heapUsed) / 1024 / 1024) + 'MB',
        average: Math.round(
          metrics.performance.heapUsed.reduce((sum, usage) => sum + usage, 0) / 
          metrics.performance.heapUsed.length / 1024 / 1024
        ) + 'MB'
      },
      uptime: Math.round(uptime) + 's',
      platform: process.platform,
      nodeVersion: process.version
    }
  };
};

/**
 * Reset metrics
 */
const resetMetrics = () => {
  metrics.requests = {
    total: 0,
    successful: 0,
    failed: 0,
    averageResponseTime: 0,
    responseTimes: []
  };
  metrics.connections = {
    active: 0,
    total: 0,
    peak: 0
  };
  metrics.errors = {
    total: 0,
    byType: {},
    byEndpoint: {}
  };
  metrics.performance = {
    memoryUsage: [],
    cpuUsage: [],
    heapUsed: [],
    heapTotal: []
  };
  
  logger.info('Metrics reset');
};

/**
 * Get health status based on metrics
 */
const getHealthStatus = () => {
  const currentMemory = process.memoryUsage();
  const memoryUsagePercent = (currentMemory.heapUsed / currentMemory.heapTotal) * 100;
  
  const status = {
    healthy: true,
    warnings: [],
    errors: []
  };
  
  // Check memory usage
  if (memoryUsagePercent > 90) {
    status.healthy = false;
    status.errors.push('High memory usage: ' + Math.round(memoryUsagePercent) + '%');
  } else if (memoryUsagePercent > 80) {
    status.warnings.push('Memory usage is high: ' + Math.round(memoryUsagePercent) + '%');
  }
  
  // Check error rate
  const errorRate = metrics.requests.total > 0 ? 
    (metrics.requests.failed / metrics.requests.total) * 100 : 0;
  
  if (errorRate > 10) {
    status.healthy = false;
    status.errors.push('High error rate: ' + errorRate.toFixed(2) + '%');
  } else if (errorRate > 5) {
    status.warnings.push('Error rate is elevated: ' + errorRate.toFixed(2) + '%');
  }
  
  // Check response time
  if (metrics.requests.averageResponseTime > 5000) {
    status.healthy = false;
    status.errors.push('High average response time: ' + Math.round(metrics.requests.averageResponseTime) + 'ms');
  } else if (metrics.requests.averageResponseTime > 2000) {
    status.warnings.push('Response time is slow: ' + Math.round(metrics.requests.averageResponseTime) + 'ms');
  }
  
  // Check active connections
  if (metrics.connections.active > 1000) {
    status.healthy = false;
    status.errors.push('Too many active connections: ' + metrics.connections.active);
  } else if (metrics.connections.active > 500) {
    status.warnings.push('High number of active connections: ' + metrics.connections.active);
  }
  
  return status;
};

/**
 * Export metrics to Prometheus format
 */
const exportPrometheusMetrics = () => {
  const currentMemory = process.memoryUsage();
  
  return `# HELP streamvault_requests_total Total number of requests
# TYPE streamvault_requests_total counter
streamvault_requests_total ${metrics.requests.total}

# HELP streamvault_requests_successful Total number of successful requests
# TYPE streamvault_requests_successful counter
streamvault_requests_successful ${metrics.requests.successful}

# HELP streamvault_requests_failed Total number of failed requests
# TYPE streamvault_requests_failed counter
streamvault_requests_failed ${metrics.requests.failed}

# HELP streamvault_requests_average_response_time Average response time in milliseconds
# TYPE streamvault_requests_average_response_time gauge
streamvault_requests_average_response_time ${metrics.requests.averageResponseTime}

# HELP streamvault_connections_active Current number of active connections
# TYPE streamvault_connections_active gauge
streamvault_connections_active ${metrics.connections.active}

# HELP streamvault_connections_total Total number of connections
# TYPE streamvault_connections_total counter
streamvault_connections_total ${metrics.connections.total}

# HELP streamvault_connections_peak Peak number of connections
# TYPE streamvault_connections_peak gauge
streamvault_connections_peak ${metrics.connections.peak}

# HELP streamvault_errors_total Total number of errors
# TYPE streamvault_errors_total counter
streamvault_errors_total ${metrics.errors.total}

# HELP streamvault_memory_heap_used Current heap used in bytes
# TYPE streamvault_memory_heap_used gauge
streamvault_memory_heap_used ${currentMemory.heapUsed}

# HELP streamvault_memory_heap_total Current heap total in bytes
# TYPE streamvault_memory_heap_total gauge
streamvault_memory_heap_total ${currentMemory.heapTotal}

# HELP streamvault_memory_rss Current RSS memory in bytes
# TYPE streamvault_memory_rss gauge
streamvault_memory_rss ${currentMemory.rss}

# HELP streamvault_uptime_seconds Current uptime in seconds
# TYPE streamvault_uptime_seconds gauge
streamvault_uptime_seconds ${process.uptime()}`;
};

module.exports = {
  trackRequestMetrics,
  trackErrorMetrics,
  trackPerformanceMetrics,
  getMetrics,
  getMetricsSummary,
  resetMetrics,
  getHealthStatus,
  exportPrometheusMetrics
};
