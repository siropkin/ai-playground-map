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
-- 2. AI Insights Cache Table
-- ============================================
-- NOTE: 'images' field is deprecated - use playground_images_cache table instead
-- Kept for backward compatibility during migration
-- Cache invalidation: Version is in cache_key (e.g., "v17-tier-fields-fixed:N123456")
CREATE TABLE IF NOT EXISTS ai_insights_cache (
  cache_key TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  features JSONB,
  parking TEXT,
  sources JSONB,
  images JSONB, -- DEPRECATED: Use playground_images_cache instead
  accessibility JSONB,
  tier TEXT CHECK (tier IN ('neighborhood', 'gem', 'star')),
  tier_reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for accessibility queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_accessibility
ON ai_insights_cache USING GIN (accessibility);

-- Add index for created_at for TTL checks
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_created_at
ON ai_insights_cache(created_at);

-- Add comment
COMMENT ON TABLE ai_insights_cache IS 'Caches AI-generated playground insights with 1 year TTL';

-- Disable RLS for cache table (no user-specific data)
ALTER TABLE ai_insights_cache DISABLE ROW LEVEL SECURITY;


-- ============================================
-- 3. Playground Images Cache Table (NEW)
-- ============================================
-- Cache invalidation: Version is in cache_key (e.g., "v1:N123456")
CREATE TABLE IF NOT EXISTS playground_images_cache (
  cache_key TEXT PRIMARY KEY,
  images JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for created_at for TTL checks
CREATE INDEX IF NOT EXISTS idx_playground_images_cache_created_at
ON playground_images_cache(created_at);

-- Add comment
COMMENT ON TABLE playground_images_cache IS 'Caches playground images from Google Custom Search with 1 year TTL';

-- Disable RLS for cache table (no user-specific data)
ALTER TABLE playground_images_cache DISABLE ROW LEVEL SECURITY;


-- ============================================
-- 4. Playground Issues Table
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

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Anyone can submit issues" ON playground_issues;
DROP POLICY IF EXISTS "Only admins can view issues" ON playground_issues;
DROP POLICY IF EXISTS "Only admins can delete issues" ON playground_issues;

-- Allow anyone to submit issues (insert)
CREATE POLICY "Anyone can submit issues"
ON playground_issues FOR INSERT
TO public
WITH CHECK (true);

-- Only admins can view all issues (for moderation)
CREATE POLICY "Only admins can view issues"
ON playground_issues FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'app_admin'
);

-- Only admins can delete issues
CREATE POLICY "Only admins can delete issues"
ON playground_issues FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'app_admin'
);


-- ============================================
-- MIGRATION: Rename table from old name
-- ============================================
-- If the old table exists, rename it to the new generic name
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'perplexity_insights_cache'
  ) THEN
    ALTER TABLE perplexity_insights_cache RENAME TO ai_insights_cache;
    RAISE NOTICE 'Table renamed from perplexity_insights_cache to ai_insights_cache';
  END IF;
END $$;

-- Rename indexes if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_perplexity_cache_accessibility'
  ) THEN
    ALTER INDEX idx_perplexity_cache_accessibility RENAME TO idx_ai_insights_cache_accessibility;
  END IF;

  IF EXISTS (
    SELECT FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname = 'idx_perplexity_cache_created_at'
  ) THEN
    ALTER INDEX idx_perplexity_cache_created_at RENAME TO idx_ai_insights_cache_created_at;
  END IF;
END $$;


-- ============================================
-- MIGRATION: Add tier fields to existing table
-- ============================================
-- If the table already exists, add the new columns
ALTER TABLE ai_insights_cache
ADD COLUMN IF NOT EXISTS tier TEXT CHECK (tier IN ('neighborhood', 'gem', 'star'));

ALTER TABLE ai_insights_cache
ADD COLUMN IF NOT EXISTS tier_reasoning TEXT;

-- Add index for tier filtering (optional - for future tier-based queries)
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_tier
ON ai_insights_cache(tier) WHERE tier IS NOT NULL;


-- ============================================
-- MIGRATION: Remove schema_version columns (Option A: Cache Key Only)
-- ============================================
-- Drop schema_version columns if they exist (we use cache key versioning instead)
ALTER TABLE ai_insights_cache DROP COLUMN IF EXISTS schema_version;
ALTER TABLE playground_images_cache DROP COLUMN IF EXISTS schema_version;

-- Note: Old cache entries with version in cache_key will still work
-- e.g., "v17-tier-fields-fixed:N123456" will never match "v16:N123456"


-- ============================================
-- CLEAR CACHE (Optional: Run after major changes)
-- ============================================
-- Uncomment the lines below to clear all cache entries
-- This will force fresh data with tier ratings from Gemini AI
-- DELETE FROM osm_query_cache;
-- DELETE FROM ai_insights_cache;
-- DELETE FROM playground_images_cache;


-- ============================================
-- VERIFY TABLES EXIST
-- ============================================
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE tablename IN ('osm_query_cache', 'ai_insights_cache', 'playground_images_cache', 'playground_issues')
ORDER BY tablename;
