-- Clear All Cache Tables (Simple Version)
--
-- Quick script to truncate all cache tables.
-- No output, no confirmations - just clears everything.
--
-- Usage:
-- Copy and paste these 3 lines into Supabase SQL Editor and run.

TRUNCATE TABLE osm_query_cache;
TRUNCATE TABLE ai_insights_cache;
TRUNCATE TABLE playground_images_cache;
