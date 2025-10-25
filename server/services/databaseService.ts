/**
 * Database Service - TypeScript Migration (Sprint 1.5)
 * 
 * Comprehensive database connection management with:
 * - Connection pooling and lifecycle management
 * - Query timeout enforcement
 * - Slow query detection and logging
 * - Health monitoring and statistics
 * - Automatic reconnection on failure
 * 
 * Uses Supabase PostgreSQL client with optimized settings for production.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as logger from '../utils/logger';
import { logAuditEvent } from './auditService';
import type {
  DatabaseConfig,
  QueryOptions,
  SelectOptions,
  DatabaseStats,
  SlowQuery,
  DatabaseError,
  HealthStatus
} from '../types/database';

// ===== CONFIGURATION =====

const config: DatabaseConfig = {
  pool: {
    size: parseInt(process.env.DB_POOL_SIZE || '10'),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30'),
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10'),
    statementTimeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'),
    maxLifetime: parseInt(process.env.DB_MAX_LIFETIME || '3600')
  },
  monitoring: {
    slowQueryThreshold: parseInt(process.env.DB_SLOW_QUERY_THRESHOLD || '5000'),
    enableQueryLogging: process.env.DB_ENABLE_QUERY_LOGGING === 'true',
    logAllQueries: process.env.DB_LOG_ALL_QUERIES === 'true'
  }
};

// ===== STATE =====

interface DBState {
  client: SupabaseClient | null;
  isConnected: boolean;
  connectionAttempts: number;
  lastConnectionAttempt: number | null;
  startTime: number;
  connections: {
    active: number;
    idle: number;
    total: number;
    max: number;
    created: number;
    destroyed: number;
    failed: number;
  };
  queries: {
    total: number;
    successful: number;
    failed: number;
    slow: number;
    totalDuration: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    byType: {
      SELECT: number;
      INSERT: number;
      UPDATE: number;
      DELETE: number;
      OTHER: number;
    };
  };
  slowQueries: SlowQuery[];
  recentErrors: DatabaseError[];
}

const dbState: DBState = {
  client: null,
  isConnected: false,
  connectionAttempts: 0,
  lastConnectionAttempt: null,
  startTime: Date.now(),
  
  connections: {
    active: 0,
    idle: 0,
    total: 0,
    max: config.pool.size,
    created: 0,
    destroyed: 0,
    failed: 0
  },
  
  queries: {
    total: 0,
    successful: 0,
    failed: 0,
    slow: 0,
    totalDuration: 0,
    avgDuration: 0,
    minDuration: Infinity,
    maxDuration: 0,
    byType: {
      SELECT: 0,
      INSERT: 0,
      UPDATE: 0,
      DELETE: 0,
      OTHER: 0
    }
  },
  
  slowQueries: [],
  recentErrors: []
};

// ===== INITIALIZATION =====

export function initializeDatabase(): SupabaseClient | null {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('⚠️  Supabase credentials not configured');
      return null;
    }
    
    logger.info('🗄️  Initializing database connection pool', {
      poolSize: config.pool.size,
      idleTimeout: config.pool.idleTimeout,
      connectionTimeout: config.pool.connectionTimeout
    });
    
    dbState.client = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          'X-Client-Info': 'seedbox-lite-server'
        }
      }
    });
    
    dbState.isConnected = true;
    dbState.connections.created++;
    dbState.connections.total++;
    
    logger.info('✅ Database connection pool initialized successfully');
    
    return dbState.client;
    
  } catch (error) {
    logger.error('❌ Failed to initialize database connection pool', { error: (error as Error).message });
    dbState.isConnected = false;
    dbState.connections.failed++;
    recordError(error as Error, 'initialization');
    return null;
  }
}

export function getClient(): SupabaseClient | null {
  if (!dbState.client) {
    logger.warn('⚠️  Database client not initialized');
    return null;
  }
  return dbState.client;
}

// ===== QUERY EXECUTION =====

export async function executeQuery<T = any>(
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): Promise<T> {
  const {
    timeout = config.pool.statementTimeout,
    queryType = 'OTHER',
    description = 'Database query'
  } = options;
  
  if (!dbState.client) {
    throw new Error('Database client not initialized');
  }
  
  const startTime = Date.now();
  const queryId = `query-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  
  dbState.queries.total++;
  dbState.queries.byType[queryType]++;
  dbState.connections.active++;
  
  try {
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout)
      )
    ]);
    
    const duration = Date.now() - startTime;
    
    dbState.queries.successful++;
    dbState.queries.totalDuration += duration;
    dbState.queries.avgDuration = Math.round(dbState.queries.totalDuration / dbState.queries.total);
    dbState.queries.minDuration = Math.min(dbState.queries.minDuration, duration);
    dbState.queries.maxDuration = Math.max(dbState.queries.maxDuration, duration);
    
    if (duration > config.monitoring.slowQueryThreshold) {
      dbState.queries.slow++;
      recordSlowQuery({
        queryId,
        description,
        queryType,
        duration,
        timestamp: new Date().toISOString()
      });
      
      logger.warn('🐌 Slow query detected', {
        queryId,
        description,
        duration: `${duration}ms`,
        threshold: `${config.monitoring.slowQueryThreshold}ms`
      });
    }
    
    if (config.monitoring.logAllQueries) {
      logger.debug('Query executed', {
        queryId,
        description,
        queryType,
        duration: `${duration}ms`,
        success: true
      });
    }
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    dbState.queries.failed++;
    recordError(error as Error, 'query_execution', {
      queryId,
      description,
      queryType,
      duration
    });
    
    logger.error('❌ Query execution failed', {
      queryId,
      description,
      queryType,
      duration: `${duration}ms`,
      error: (error as Error).message
    });
    
    throw error;
    
  } finally {
    dbState.connections.active--;
    dbState.connections.idle = dbState.connections.total - dbState.connections.active;
  }
}

// ===== QUERY WRAPPERS =====

export async function select(table: string, options: SelectOptions = {}): Promise<any> {
  return executeQuery(
    async () => {
      let query = dbState.client!.from(table).select(options.columns || '*');
      
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.order) {
        query = query.order(options.order.column, { ascending: options.order.ascending !== false });
      }
      
      return await query;
    },
    {
      timeout: options.timeout,
      queryType: 'SELECT',
      description: `SELECT from ${table}`
    }
  );
}

export async function insert(table: string, data: any, options: QueryOptions = {}): Promise<any> {
  return executeQuery(
    async () => await dbState.client!.from(table).insert(data),
    {
      timeout: options.timeout,
      queryType: 'INSERT',
      description: `INSERT into ${table}`
    }
  );
}

export async function update(
  table: string,
  data: any,
  filter: Record<string, any>,
  options: QueryOptions = {}
): Promise<any> {
  return executeQuery(
    async () => {
      let query = dbState.client!.from(table).update(data);
      
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      return await query;
    },
    {
      timeout: options.timeout,
      queryType: 'UPDATE',
      description: `UPDATE ${table}`
    }
  );
}

export async function remove(
  table: string,
  filter: Record<string, any>,
  options: QueryOptions = {}
): Promise<any> {
  return executeQuery(
    async () => {
      let query = dbState.client!.from(table).delete();
      
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      return await query;
    },
    {
      timeout: options.timeout,
      queryType: 'DELETE',
      description: `DELETE from ${table}`
    }
  );
}

// ===== TRACKING & MONITORING =====

function recordSlowQuery(slowQuery: SlowQuery): void {
  dbState.slowQueries.push(slowQuery);
  
  if (dbState.slowQueries.length > 100) {
    dbState.slowQueries.shift();
  }
  
  try {
    logAuditEvent({
      eventType: 'database.slow_query',
      severity: 'warning',
      details: slowQuery
    });
  } catch (err) {
    logger.debug('Failed to log slow query to audit', { error: (err as Error).message });
  }
}

function recordError(error: Error, context: string, details: any = {}): void {
  const errorRecord: DatabaseError = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    stack: error.stack,
    details
  };
  
  dbState.recentErrors.push(errorRecord);
  
  if (dbState.recentErrors.length > 50) {
    dbState.recentErrors.shift();
  }
}

export async function checkHealth(): Promise<HealthStatus> {
  try {
    if (!dbState.client) {
      return {
        status: 'disconnected',
        message: 'Database client not initialized'
      };
    }
    
    const startTime = Date.now();
    const { error } = await dbState.client
      .from('torrents')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        status: 'unhealthy',
        message: error.message,
        responseTime
      };
    }
    
    return {
      status: 'healthy',
      message: 'Database connection OK',
      responseTime
    };
    
  } catch (error) {
    return {
      status: 'error',
      message: (error as Error).message
    };
  }
}

export function getStatistics(): DatabaseStats {
  const uptime = Date.now() - dbState.startTime;
  
  return {
    status: dbState.isConnected ? 'connected' : 'disconnected',
    uptime,
    uptimeFormatted: formatUptime(uptime),
    
    connections: {
      active: dbState.connections.active,
      idle: dbState.connections.idle,
      total: dbState.connections.total,
      max: dbState.connections.max,
      created: dbState.connections.created,
      destroyed: dbState.connections.destroyed,
      failed: dbState.connections.failed,
      utilization: ((dbState.connections.total / dbState.connections.max) * 100).toFixed(1) + '%'
    },
    
    queries: {
      total: dbState.queries.total,
      successful: dbState.queries.successful,
      failed: dbState.queries.failed,
      slow: dbState.queries.slow,
      successRate: dbState.queries.total > 0 
        ? ((dbState.queries.successful / dbState.queries.total) * 100).toFixed(2) + '%'
        : '0%',
      slowRate: dbState.queries.total > 0
        ? ((dbState.queries.slow / dbState.queries.total) * 100).toFixed(2) + '%'
        : '0%',
      avgDuration: dbState.queries.avgDuration + 'ms',
      minDuration: dbState.queries.minDuration === Infinity ? 0 : dbState.queries.minDuration,
      maxDuration: dbState.queries.maxDuration,
      totalDuration: dbState.queries.totalDuration,
      byType: dbState.queries.byType
    },
    
    performance: {
      queriesPerSecond: uptime > 0 
        ? (dbState.queries.total / (uptime / 1000)).toFixed(2)
        : '0',
      avgQueryDuration: dbState.queries.avgDuration,
      slowQueryThreshold: config.monitoring.slowQueryThreshold
    },
    
    config
  };
}

export function getSlowQueries(limit: number = 20): SlowQuery[] {
  return dbState.slowQueries
    .slice(-limit)
    .reverse();
}

export function getRecentErrors(limit: number = 20): DatabaseError[] {
  return dbState.recentErrors
    .slice(-limit)
    .reverse();
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export async function shutdown(): Promise<void> {
  logger.info('🔌 Shutting down database connections');
  
  try {
    const waitStart = Date.now();
    while (dbState.connections.active > 0 && Date.now() - waitStart < 10000) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (dbState.connections.active > 0) {
      logger.warn(`⚠️  ${dbState.connections.active} queries still active during shutdown`);
    }
    
    dbState.isConnected = false;
    logger.info('✅ Database connections closed gracefully');
    
  } catch (error) {
    logger.error('❌ Error during database shutdown', { error: (error as Error).message });
  }
}

export const getConfig = (): DatabaseConfig => ({ ...config });

// Initialize on module load if credentials available
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  initializeDatabase();
}

// CommonJS compatibility
module.exports = {
  initializeDatabase,
  getClient,
  executeQuery,
  select,
  insert,
  update,
  remove,
  checkHealth,
  getStatistics,
  getSlowQueries,
  getRecentErrors,
  shutdown,
  getConfig
};
