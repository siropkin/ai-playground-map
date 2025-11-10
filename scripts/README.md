# Scripts Directory

Utility scripts for debugging and maintaining the Good Playground Map application.

## TypeScript Scripts

### 1. Cache Invalidation Script

**Purpose:** Clear stale AI insights and images cache for specific playgrounds.

**Usage:**
```bash
# Clear cache for specific playgrounds (by OSM ID)
npx tsx scripts/invalidate-playground-cache.ts W969448818 W1255936512

# Works with or without type prefix (N/W/R)
npx tsx scripts/invalidate-playground-cache.ts 969448818 1255936512
```

**When to use:**
- Playground showing incorrect name/data
- AI generated wrong information
- Need to force re-enrichment
- Testing AI prompt changes

---

### 2. AI Enrichment Debug Script

**Purpose:** Test AI enrichment for specific coordinates to see what Gemini returns.

**Usage:**
```bash
# Test without OSM name (unnamed playground)
npx tsx scripts/debug-ai-enrichment.ts 37.5305535 -122.2862704

# Test with OSM name (named playground)
npx tsx scripts/debug-ai-enrichment.ts 37.5379872 -122.3149726 "Beresford Park Playground"
```

**What it shows:**
- AI confidence level (high/medium/low)
- Location verification details
- Returned name, description, features
- Distance validation results
- Source URLs from web search

**When to use:**
- Investigating why AI assigned wrong name
- Testing distance validation logic
- Verifying AI prompt changes
- Understanding AI decision-making

---

## SQL Scripts

### 3. Clear All Caches (Verbose)

**File:** `clear-all-caches.sql`

**Purpose:** Truncates all cache tables with detailed before/after statistics.

**What it clears:**
- `osm_query_cache` - OpenStreetMap query results (24hr TTL)
- `ai_insights_cache` - Gemini AI insights (90 day TTL)
- `playground_images_cache` - Google Custom Search images (90 day TTL)

**Usage in Supabase:**
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire script
3. Click "Run"

**Output example:**
```
=== BEFORE CLEARING ===
OSM query cache: 1234 rows
AI insights cache: 5678 rows
Playground images cache: 890 rows
Total: 7802 rows

✓ Cleared osm_query_cache
✓ Cleared ai_insights_cache
✓ Cleared playground_images_cache

=== AFTER CLEARING ===
OSM query cache: 0 rows
AI insights cache: 0 rows
Playground images cache: 0 rows

✅ All caches cleared successfully!
```

---

### 4. Clear All Caches (Simple)

**File:** `clear-all-caches-simple.sql`

**Purpose:** Quick 3-line script to clear all caches without any output.

**Usage:**
```sql
TRUNCATE TABLE osm_query_cache;
TRUNCATE TABLE ai_insights_cache;
TRUNCATE TABLE playground_images_cache;
```

Just copy these 3 lines into Supabase SQL Editor and run.

---

## Common Workflows

### Workflow 1: Investigating Wrong Playground Name

```bash
# 1. Check OSM data directly
curl -s "https://overpass-api.de/api/interpreter" \
  -d "data=[out:json];(way(583248973););out center;" | \
  jq '.elements[] | {id, name: .tags.name, lat: .center.lat, lon: .center.lon}'

# 2. Test what AI returns
npx tsx scripts/debug-ai-enrichment.ts 37.5472587 -122.2920435 "Meadow Square Playground"

# 3. If AI returns wrong data, clear cache for that playground
npx tsx scripts/invalidate-playground-cache.ts 583248973

# 4. Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
```

### Workflow 2: Testing AI Prompt Changes

```bash
# 1. Make changes to src/lib/gemini.ts

# 2. Clear AI cache to force re-enrichment
# Run in Supabase SQL Editor:
TRUNCATE TABLE ai_insights_cache;

# 3. Test specific playground
npx tsx scripts/debug-ai-enrichment.ts 37.5305535 -122.2862704

# 4. Check results in app after hard refresh
```

### Workflow 3: Fresh Start for Development

```bash
# Clear all caches in Supabase (run in SQL Editor)
TRUNCATE TABLE osm_query_cache;
TRUNCATE TABLE ai_insights_cache;
TRUNCATE TABLE playground_images_cache;

# Restart dev server
pnpm dev

# Hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

---

## Tips

1. **Always hard refresh after clearing cache** - React state persists old data
2. **Use TypeScript scripts for targeted fixes** - Faster than clearing all caches
3. **Use SQL scripts for complete resets** - When testing major changes
4. **Check logs** - Scripts output helpful information about what was cleared

---

For more details, see `.claude/PROJECT.md` → "Debugging & Troubleshooting"
