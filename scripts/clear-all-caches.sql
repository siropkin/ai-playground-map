-- Clear All Cache Tables
--
-- This script truncates all cache tables in the database.
-- Use this when you need to force re-fetch of all data.
--
-- WARNING: This will delete ALL cached data:
-- - OpenStreetMap query results (24 hour cache)
-- - AI-generated insights (90 day cache)
-- - Playground images (90 day cache)
--
-- Usage in Supabase SQL Editor:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" to execute
--
-- Usage with psql:
-- psql "postgresql://..." -f scripts/clear-all-caches.sql

-- Enable output for confirmation
\set QUIET off

BEGIN;

-- Display current row counts before deletion
DO $$
DECLARE
  osm_count INTEGER;
  ai_count INTEGER;
  images_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO osm_count FROM osm_query_cache;
  SELECT COUNT(*) INTO ai_count FROM ai_insights_cache;
  SELECT COUNT(*) INTO images_count FROM playground_images_cache;

  RAISE NOTICE '';
  RAISE NOTICE '=== BEFORE CLEARING ===';
  RAISE NOTICE 'OSM query cache: % rows', osm_count;
  RAISE NOTICE 'AI insights cache: % rows', ai_count;
  RAISE NOTICE 'Playground images cache: % rows', images_count;
  RAISE NOTICE 'Total: % rows', osm_count + ai_count + images_count;
  RAISE NOTICE '';
END $$;

-- Clear OSM query cache (24 hour TTL)
-- Contains raw OpenStreetMap query results
TRUNCATE TABLE osm_query_cache;
RAISE NOTICE '✓ Cleared osm_query_cache';

-- Clear AI insights cache (90 day TTL)
-- Contains Gemini API results (names, descriptions, features, tiers)
TRUNCATE TABLE ai_insights_cache;
RAISE NOTICE '✓ Cleared ai_insights_cache';

-- Clear playground images cache (90 day TTL)
-- Contains Google Custom Search image results
TRUNCATE TABLE playground_images_cache;
RAISE NOTICE '✓ Cleared playground_images_cache';

-- Display confirmation
DO $$
DECLARE
  osm_count INTEGER;
  ai_count INTEGER;
  images_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO osm_count FROM osm_query_cache;
  SELECT COUNT(*) INTO ai_count FROM ai_insights_cache;
  SELECT COUNT(*) INTO images_count FROM playground_images_cache;

  RAISE NOTICE '';
  RAISE NOTICE '=== AFTER CLEARING ===';
  RAISE NOTICE 'OSM query cache: % rows', osm_count;
  RAISE NOTICE 'AI insights cache: % rows', ai_count;
  RAISE NOTICE 'Playground images cache: % rows', images_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ All caches cleared successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Next steps:';
  RAISE NOTICE '   1. Reload your app at http://localhost:3000';
  RAISE NOTICE '   2. All data will be re-fetched from APIs';
  RAISE NOTICE '   3. New cache entries will be created automatically';
  RAISE NOTICE '';
END $$;

COMMIT;
