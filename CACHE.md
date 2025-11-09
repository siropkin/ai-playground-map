# Cache Management Guide

This document explains how caching works in the playground mapping application and how to manage cache invalidation.

## Overview

The application uses a **three-layer caching system**:

1. **OSM (OpenStreetMap) Cache** - Playground location data
2. **AI Insights Cache** - Gemini AI enrichment (descriptions, features, tier ratings)
3. **Images Cache** - Google Custom Search playground images

All three layers use **cache key versioning** for simple, automatic invalidation.

---

## Cache Architecture

### Cache Key Format

All cache entries include a version prefix in their key:

```
OSM:           "v1:osm:{north}:{south}:{east}:{west}:{zoom}"
AI Insights:   "v17-tier-fields-fixed:N123456"
Images:        "v1:N123456"
```

When you increment the version, old cache entries are **automatically ignored** (never found).

### Cache TTLs (Time To Live)

| Layer | Default TTL | Recommended Range | Why |
|-------|-------------|-------------------|-----|
| **OSM** | 24 hours | 24 hours - 1 week | Location data changes rarely |
| **AI Insights** | 90 days | 30-90 days | Playgrounds evolve, AI improves |
| **Images** | 90 days | 30-90 days | Seasonal changes, renovations |

---

## Cache Invalidation

### Quick Start

To invalidate a cache layer, increment its version in `.env.local`:

```bash
# Before
AI_INSIGHTS_CACHE_VERSION=v17-tier-fields-fixed

# After (invalidates all AI insights)
AI_INSIGHTS_CACHE_VERSION=v18
```

Then restart your application.

### Common Scenarios

#### Scenario 1: You Modified the Gemini Prompt

**What changed:** You updated the AI prompt to improve tier ratings or descriptions.

**Action:**
```bash
# .env.local
AI_INSIGHTS_CACHE_VERSION=v18  # Changed from v17-tier-fields-fixed
```

**Result:** All playgrounds will be re-enriched with fresh AI data using the new prompt.

---

#### Scenario 2: You Want Different Images

**What changed:** You modified image search parameters or quality filters.

**Action:**
```bash
# .env.local
IMAGES_CACHE_VERSION=v2  # Changed from v1
```

**Result:** All playground images will be re-fetched from Google Custom Search.

---

#### Scenario 3: You Changed OSM Query Logic

**What changed:** You modified which playgrounds to fetch or added new tags.

**Action:**
```bash
# .env.local
OSM_CACHE_VERSION=v2  # Changed from v1
```

**Result:** All OSM queries will be re-executed with the new logic.

---

#### Scenario 4: Nuclear Option (Clear Everything)

**What changed:** Major refactor or you want a completely fresh start.

**Action:**
```bash
# .env.local
AI_INSIGHTS_CACHE_VERSION=v18
IMAGES_CACHE_VERSION=v2
OSM_CACHE_VERSION=v2
```

**Result:** Entire application cache is invalidated. Everything re-fetched.

---

## Cache Versions Reference

### Current Versions

```bash
AI_INSIGHTS_CACHE_VERSION=v17-tier-fields-fixed
IMAGES_CACHE_VERSION=v1
OSM_CACHE_VERSION=v1
```

### Version History

#### AI Insights
- `v17-tier-fields-fixed` - Fixed bug where tier/accessibility fields weren't saved
- `v16` - Previous version (deprecated)
- `v15` and earlier - Legacy versions

#### Images
- `v1` - Initial version with Google Custom Search integration

#### OSM
- `v1` - Initial version with quantized bounds caching

---

## Manual Cache Cleanup (Optional)

Old cache entries remain in the database but are never accessed. They're harmless, but you can clean them up:

### Delete Old AI Insights

```sql
-- Keep only current version entries
DELETE FROM ai_insights_cache
WHERE cache_key NOT LIKE 'v17-tier-fields-fixed:%';
```

### Delete Old Images

```sql
-- Keep only current version entries
DELETE FROM playground_images_cache
WHERE cache_key NOT LIKE 'v1:%';
```

### Delete Old OSM Queries

```sql
-- Keep only current version entries
DELETE FROM osm_query_cache
WHERE cache_key NOT LIKE 'v1:osm:%';
```

### Nuclear Option - Clear All Caches

```sql
DELETE FROM osm_query_cache;
DELETE FROM ai_insights_cache;
DELETE FROM playground_images_cache;
```

**⚠️ Warning:** This will force all data to be re-fetched from APIs (rate limits apply!).

---

## Cache Monitoring

### Check Cache Stats

Connect to your Supabase database and run:

```sql
-- OSM Cache Stats
SELECT
  COUNT(*) as total_entries,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM osm_query_cache;

-- AI Insights Cache Stats
SELECT
  COUNT(*) as total_entries,
  COUNT(CASE WHEN tier = 'star' THEN 1 END) as star_playgrounds,
  COUNT(CASE WHEN tier = 'gem' THEN 1 END) as gem_playgrounds,
  COUNT(CASE WHEN tier = 'neighborhood' THEN 1 END) as neighborhood_playgrounds
FROM ai_insights_cache;

-- Images Cache Stats
SELECT
  COUNT(*) as total_entries,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM playground_images_cache;
```

### Check Version Distribution

```sql
-- See which versions are in the database
SELECT
  SUBSTRING(cache_key FROM 1 FOR POSITION(':' IN cache_key)) as version_prefix,
  COUNT(*) as count
FROM ai_insights_cache
GROUP BY version_prefix
ORDER BY count DESC;
```

---

## Best Practices

### ✅ DO

- **Increment versions** when you change API logic, prompts, or data structure
- **Use descriptive versions** like `v17-tier-fields-fixed` for tracking changes
- **Test locally first** before invalidating production cache
- **Document version changes** in git commit messages

### ❌ DON'T

- **Don't manually delete cache entries** unless necessary (versions handle it)
- **Don't use short TTLs** (wastes API quota and slows app)
- **Don't change versions frequently** without reason (wastes resources)
- **Don't skip version increments** when prompt/logic changes (serves stale data)

---

## Troubleshooting

### Problem: Cache not invalidating

**Solution:** Make sure you:
1. Updated the version in `.env.local`
2. Restarted your development server
3. Cleared your browser cache
4. Checked the version is actually being loaded (`console.log` the constant)

### Problem: Too many API requests

**Cause:** Cache TTL too short or versions changing too frequently.

**Solution:**
- Increase TTLs in `.env.local`
- Only increment versions when truly needed
- Check rate limits in your API dashboards

### Problem: Serving stale data

**Cause:** Version wasn't incremented after changing logic.

**Solution:**
- Increment the appropriate cache version
- Restart the application

---

## Environment Variables Reference

```bash
# Cache TTLs (milliseconds)
OSM_CACHE_TTL_MS=86400000              # 24 hours
AI_INSIGHTS_CACHE_TTL_MS=7776000000    # 90 days
IMAGES_CACHE_TTL_MS=7776000000         # 90 days

# Cache Versions (increment to invalidate)
AI_INSIGHTS_CACHE_VERSION=v17-tier-fields-fixed
IMAGES_CACHE_VERSION=v1
OSM_CACHE_VERSION=v1
```

See `.env.example` for complete configuration options.

---

## Architecture Notes

### Why Cache Key Versioning?

We use **cache key versioning** (not database schema versions) because:

1. **Simpler** - No validation logic needed
2. **Faster** - No extra database queries
3. **Industry standard** - Same as Redis, Memcached
4. **Automatic** - Old entries never found
5. **Consistent** - All three tables work the same way

### Why Not Delete Old Entries?

Old cache entries are harmless:
- They never match new cache key lookups
- They don't impact performance
- They serve as a historical record
- You can manually clean them up anytime

---

## Further Reading

- [Supabase Schema](./supabase-schema.sql) - Database table definitions
- [Cache Keys Module](./src/lib/cache-keys.ts) - Cache key generation logic
- [AI Cache Module](./src/lib/cache.ts) - AI insights caching
- [Images Cache Module](./src/lib/images.ts) - Image caching
- [OSM Cache Module](./src/lib/osm-cache.ts) - OSM query caching
