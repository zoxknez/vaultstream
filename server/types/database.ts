/**
 * Database Types
 */

export interface DatabaseConfig {
  pool: {
    size: number;
    idleTimeout: number;
    connectionTimeout: number;
    statementTimeout: number;
    maxLifetime: number;
  };
  monitoring: {
    slowQueryThreshold: number;
    enableQueryLogging: boolean;
    logAllQueries: boolean;
  };
}

export interface QueryOptions {
  timeout?: number;
  queryType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  description?: string;
}

export interface SelectOptions extends QueryOptions {
  columns?: string;
  filter?: Record<string, any>;
  limit?: number;
  order?: {
    column: string;
    ascending?: boolean;
  };
}

export interface ConnectionStats {
  active: number;
  idle: number;
  total: number;
  max: number;
  created: number;
  destroyed: number;
  failed: number;
  utilization: string;
}

export interface QueryStats {
  total: number;
  successful: number;
  failed: number;
  slow: number;
  successRate: string;
  slowRate: string;
  avgDuration: string;
  minDuration: number;
  maxDuration: number;
  totalDuration: number;
  byType: {
    SELECT: number;
    INSERT: number;
    UPDATE: number;
    DELETE: number;
    OTHER: number;
  };
}

export interface PerformanceStats {
  queriesPerSecond: string;
  avgQueryDuration: number;
  slowQueryThreshold: number;
}

export interface DatabaseStats {
  status: 'connected' | 'disconnected';
  uptime: number;
  uptimeFormatted: string;
  connections: ConnectionStats;
  queries: QueryStats;
  performance: PerformanceStats;
  config: DatabaseConfig;
}

export interface SlowQuery {
  queryId: string;
  description: string;
  queryType: string;
  duration: number;
  timestamp: string;
}

export interface DatabaseError {
  timestamp: string;
  context: string;
  message: string;
  stack?: string;
  details?: any;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'disconnected' | 'error';
  message: string;
  responseTime?: number;
}
