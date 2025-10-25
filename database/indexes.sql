-- ============================================
-- StreamVault Database Optimization
-- Performance Indexes & Query Optimization
-- ============================================

-- Execute this script on your Supabase database
-- Run: psql -h <your-db-host> -U postgres -d postgres -f database-indexes.sql

BEGIN;

-- ============================================
-- USER QUERIES OPTIMIZATION
-- ============================================

-- Index on email for fast user lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
  ON auth.users(email);

-- Index on created_at for user analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
  ON auth.users(created_at DESC);

COMMENT ON INDEX idx_users_email IS 'Fast user lookup by email';
COMMENT ON INDEX idx_users_created_at IS 'User analytics and recent users query';

-- ============================================
-- WATCHLIST OPTIMIZATION
-- ============================================

-- Primary index: user_id + created_at (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watchlist_user_created 
  ON public.watchlist(user_id, created_at DESC);

-- Index on tmdb_id for cross-reference queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watchlist_tmdb_id 
  ON public.watchlist(tmdb_id);

-- Composite index for checking if item exists in watchlist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watchlist_user_tmdb_media 
  ON public.watchlist(user_id, tmdb_id, media_type);

COMMENT ON INDEX idx_watchlist_user_created IS 'User watchlist ordered by date';
COMMENT ON INDEX idx_watchlist_tmdb_id IS 'Find users watching specific content';
COMMENT ON INDEX idx_watchlist_user_tmdb_media IS 'Check if item is in user watchlist';

-- ============================================
-- WATCH PROGRESS / CONTINUE WATCHING
-- ============================================

-- Primary index: user_id + updated_at for "Continue Watching" query
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watch_progress_user_updated 
  ON public.watch_progress(user_id, updated_at DESC);

-- Index for finding progress by torrent hash
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watch_progress_torrent 
  ON public.watch_progress(torrent_hash);

-- Composite index for resume functionality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_watch_progress_user_torrent_progress
  ON public.watch_progress(user_id, torrent_hash, progress DESC)
  WHERE progress > 0 AND progress < 0.95;

COMMENT ON INDEX idx_watch_progress_user_updated IS 'Continue watching query performance';
COMMENT ON INDEX idx_watch_progress_torrent IS 'Find all users watching a torrent';
COMMENT ON INDEX idx_watch_progress_user_torrent_progress IS 'Resume playback optimization';

-- ============================================
-- COLLECTIONS OPTIMIZATION
-- ============================================

-- Primary index: user_id + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_user_created 
  ON public.collections(user_id, created_at DESC);

-- Index on slug for public collection sharing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_slug 
  ON public.collections(slug)
  WHERE slug IS NOT NULL;

-- Index for public collections discovery
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_public 
  ON public.collections(is_public, created_at DESC)
  WHERE is_public = true;

-- Collection items ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_items_collection_position
  ON public.collection_items(collection_id, position);

-- Index for finding collections containing specific content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_items_tmdb
  ON public.collection_items(tmdb_id, media_type);

COMMENT ON INDEX idx_collections_user_created IS 'User collections listing';
COMMENT ON INDEX idx_collections_slug IS 'Public collection access by slug';
COMMENT ON INDEX idx_collections_public IS 'Discover public collections';
COMMENT ON INDEX idx_collection_items_collection_position IS 'Ordered collection items';
COMMENT ON INDEX idx_collection_items_tmdb IS 'Find collections containing content';

-- ============================================
-- ANALYTICS EVENTS OPTIMIZATION
-- ============================================

-- Primary index: user_id + created_at for user activity
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_created
  ON public.analytics_events(user_id, created_at DESC);

-- Index on event_type for aggregations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_type_created
  ON public.analytics_events(event_type, created_at DESC);

-- BRIN index for time-series data (very efficient for large tables)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_created_brin
  ON public.analytics_events USING BRIN (created_at)
  WITH (pages_per_range = 128);

-- Index for finding events by tmdb_id (top content queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_tmdb
  ON public.analytics_events(tmdb_id)
  WHERE tmdb_id IS NOT NULL;

COMMENT ON INDEX idx_analytics_events_user_created IS 'User activity timeline';
COMMENT ON INDEX idx_analytics_events_type_created IS 'Event type aggregations';
COMMENT ON INDEX idx_analytics_events_created_brin IS 'Efficient time-series queries';
COMMENT ON INDEX idx_analytics_events_tmdb IS 'Popular content analytics';

-- ============================================
-- FULL-TEXT SEARCH (Optional Enhancement)
-- ============================================

-- Full-text search on collection names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_name_fts
  ON public.collections USING GIN (to_tsvector('english', name));

COMMENT ON INDEX idx_collections_name_fts IS 'Full-text search on collection names';

-- ============================================
-- TABLE PARTITIONING (For high-volume analytics)
-- ============================================

-- Example: Partition analytics_events by month
-- Uncomment and adapt if your analytics table grows very large

/*
-- Create parent table (if not exists)
CREATE TABLE IF NOT EXISTS public.analytics_events_partitioned (
  LIKE public.analytics_events INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create partitions for each month
CREATE TABLE public.analytics_events_2025_10 PARTITION OF public.analytics_events_partitioned
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE public.analytics_events_2025_11 PARTITION OF public.analytics_events_partitioned
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- Migrate data
INSERT INTO public.analytics_events_partitioned 
  SELECT * FROM public.analytics_events;

-- Rename tables
ALTER TABLE public.analytics_events RENAME TO analytics_events_old;
ALTER TABLE public.analytics_events_partitioned RENAME TO analytics_events;
*/

-- ============================================
-- VACUUM & ANALYZE
-- ============================================

-- Update table statistics for query planner
VACUUM ANALYZE public.watchlist;
VACUUM ANALYZE public.watch_progress;
VACUUM ANALYZE public.collections;
VACUUM ANALYZE public.collection_items;
VACUUM ANALYZE public.analytics_events;

-- ============================================
-- INDEX MONITORING QUERIES
-- ============================================

-- View index usage statistics
CREATE OR REPLACE VIEW public.index_usage_stats AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS number_of_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

COMMENT ON VIEW index_usage_stats IS 'Monitor index usage to identify unused indexes';

-- View table bloat
CREATE OR REPLACE VIEW public.table_bloat AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

COMMENT ON VIEW table_bloat IS 'Monitor table and index sizes';

-- View slow queries (requires pg_stat_statements extension)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE OR REPLACE VIEW public.slow_queries AS
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- queries slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

COMMENT ON VIEW slow_queries IS 'Identify slow queries for optimization';

-- ============================================
-- MAINTENANCE FUNCTIONS
-- ============================================

-- Function to rebuild indexes
CREATE OR REPLACE FUNCTION public.rebuild_indexes()
RETURNS void AS $$
DECLARE
  idx record;
BEGIN
  FOR idx IN 
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'REINDEX INDEX CONCURRENTLY ' || idx.indexname;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rebuild_indexes IS 'Rebuild all indexes in public schema';

-- Function to update statistics
CREATE OR REPLACE FUNCTION public.update_statistics()
RETURNS void AS $$
BEGIN
  ANALYZE public.watchlist;
  ANALYZE public.watch_progress;
  ANALYZE public.collections;
  ANALYZE public.collection_items;
  ANALYZE public.analytics_events;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_statistics IS 'Update query planner statistics';

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

-- List all indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Show table sizes
SELECT * FROM public.table_bloat;

-- Show index usage
SELECT * FROM public.index_usage_stats;

-- ============================================
-- CRON JOBS (Optional - Supabase Pro)
-- ============================================

/*
-- Schedule weekly vacuum analyze
SELECT cron.schedule(
  'weekly-vacuum',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$
  VACUUM ANALYZE public.watchlist;
  VACUUM ANALYZE public.watch_progress;
  VACUUM ANALYZE public.collections;
  VACUUM ANALYZE public.analytics_events;
  $$
);

-- Schedule daily statistics update
SELECT cron.schedule(
  'daily-stats',
  '0 1 * * *', -- Every day at 1 AM
  $$SELECT public.update_statistics()$$
);
*/

-- ============================================
-- END OF OPTIMIZATION SCRIPT
-- ============================================

\echo '✅ Database optimization complete!'
\echo '📊 Run "SELECT * FROM index_usage_stats;" to monitor index usage'
\echo '📈 Run "SELECT * FROM slow_queries;" to identify slow queries'
