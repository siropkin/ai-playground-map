-- ============================================
-- SUPABASE TABLE SCHEMAS
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. OSM Query Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS osm_query_cache (
  cache_key TEXT PRIMARY KEY,
  bounds JSONB NOT NULL,
  zoom_level INTEGER NOT NULL,
  playgrounds JSONB NOT NULL,
  query_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_osm_cache_created_at ON osm_query_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_osm_cache_last_accessed ON osm_query_cache(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_osm_cache_zoom ON osm_query_cache(zoom_level);

-- Add comment
COMMENT ON TABLE osm_query_cache IS 'Caches OpenStreetMap query results for 24 hours with LRU eviction';

-- Disable RLS for cache table (no user-specific data)
ALTER TABLE osm_query_cache DISABLE ROW LEVEL SECURITY;


-- ============================================
-- 2. Perplexity Insights Cache Table
-- ============================================
CREATE TABLE IF NOT EXISTS perplexity_insights_cache (
  cache_key TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  features JSONB,
  parking TEXT,
  sources JSONB,
  images JSONB,
  accessibility JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  schema_version INTEGER DEFAULT 1
);

-- Add index for accessibility queries
CREATE INDEX IF NOT EXISTS idx_perplexity_cache_accessibility
ON perplexity_insights_cache USING GIN (accessibility);

-- Add index for created_at for TTL checks
CREATE INDEX IF NOT EXISTS idx_perplexity_cache_created_at
ON perplexity_insights_cache(created_at);

-- Add comment
COMMENT ON TABLE perplexity_insights_cache IS 'Caches AI-generated playground insights with 1 year TTL';

-- Disable RLS for cache table (no user-specific data)
ALTER TABLE perplexity_insights_cache DISABLE ROW LEVEL SECURITY;


-- ============================================
-- 3. Playground Issues Table
-- ============================================
CREATE TABLE IF NOT EXISTS playground_issues (
  id BIGSERIAL PRIMARY KEY,
  playground_id TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('wrong-location', 'incorrect-info', 'inappropriate-content', 'other')),
  description TEXT NOT NULL,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for playground_id lookups
CREATE INDEX IF NOT EXISTS idx_playground_issues_playground_id
ON playground_issues(playground_id);

-- Add index for created_at for sorting
CREATE INDEX IF NOT EXISTS idx_playground_issues_created_at
ON playground_issues(created_at DESC);

-- Add comment
COMMENT ON TABLE playground_issues IS 'User-reported issues with playground data';

-- Enable RLS for issues table (contains user submissions)
ALTER TABLE playground_issues ENABLE ROW LEVEL SECURITY;

-- Allow anyone to submit issues (insert)
CREATE POLICY IF NOT EXISTS "Anyone can submit issues"
ON playground_issues FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can view all issues (for moderation)
CREATE POLICY IF NOT EXISTS "Only admins can view issues"
ON playground_issues FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'app_admin'
);

-- Only admins can delete issues
CREATE POLICY IF NOT EXISTS "Only admins can delete issues"
ON playground_issues FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'app_admin'
);


-- ============================================
-- VERIFY TABLES EXIST
-- ============================================
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename IN ('osm_query_cache', 'perplexity_insights_cache', 'playground_issues')
ORDER BY tablename;
