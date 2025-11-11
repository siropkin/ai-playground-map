# Quick Reference Guide - AI Playground Map

## Data Flow Summary

| Layer | Source | Trigger | Cache TTL | Purpose |
|-------|--------|---------|-----------|---------|
| **OSM** | Overpass API | Map move/zoom | 24 hours | Location & basic playground data |
| **AI** | Gemini 2.0 Flash | Auto-enrich | 90 days | Name, description, tier, features |
| **Images** | Google Custom Search | On visibility | 90 days | Playground photos |

---

## Main Data Types

### Playground
```typescript
{
  osmId: number;                    // Unique identifier
  lat, lon: number;                 // Coordinates
  name: string | null;              // From AI (if not from OSM)
  description: string | null;       // From AI
  features: string[] | null;        // Play equipment
  parking: string | null;           // Parking info
  accessibility: string[] | null;   // Wheelchair accessible, etc.
  tier: "neighborhood"|"gem"|"star"; // Quality rating
  tierReasoning: string | null;     // Why this tier
  images: PlaygroundImage[] | null; // Photos
  sources: string[] | null;         // URLs
  enriched: boolean;                // Has AI insights
}
```

### Tier Types
- **Star (⭐)**: 8+ features, unique, award-winning
- **Gem (💎)**: 5+ features, themed, wheelchair accessible
- **Neighborhood (⚪)**: Basic, 2-4 features, local

---

## Context Hooks

### usePlaygrounds()
```typescript
{
  playgrounds: Playground[];
  loading: boolean;
  selectedPlayground: Playground | null;
  enrichPlaygroundsBatch(ids: number[]): Promise<void>;
  loadImagesForPlayground(id: number): Promise<void>;
}
```

### useFilters()
```typescript
{
  mapBounds: MapBounds | null;
  setMapBounds(bounds): void;
}
```

---

## API Endpoints

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| `/api/search` | POST | Get playgrounds in viewport | `{bounds}` | `Playground[]` |
| `/api/insights-batch` | POST | Get AI enrichment (max 5) | `{playgrounds}` | `{results}` |
| `/api/images` | POST | Get playground photos | `{name, city}` | `{images}` |
| `/api/osm-location` | POST | Reverse geocode | `{lat, lon}` | `{location}` |

---

## Cache System

### Cache Keys Format
```
OSM:       v1:osm:{north}:{south}:{east}:{west}:{zoom}
AI:        v17-tier-fields-fixed:N123456  or  v17-tier-fields-fixed:40.1,-122.2
Images:    v1:N123456  or  v1:name-city
```

### Cache Functions
```typescript
// Read
fetchAIInsightsFromCache(cacheKey)
batchFetchAIInsightsFromCache(cacheKeys)

// Write
saveAIInsightsToCache(cacheKey, insights)

// Delete
clearAIInsightsCache(cacheKey)
bulkClearAIInsightsCache(cacheKeys)
clearAIInsightsCacheByPattern(pattern)
```

### Invalidate Cache
Update `.env.local`:
```bash
AI_INSIGHTS_CACHE_VERSION=v18          # Invalidate all AI cache
IMAGES_CACHE_VERSION=v2                # Invalidate all images
OSM_CACHE_VERSION=v2                   # Invalidate all OSM cache
```

---

## Debugging Scripts

### Test AI Enrichment
```bash
npx tsx scripts/debug-ai-enrichment.ts 37.5305535 -122.2862704
npx tsx scripts/debug-ai-enrichment.ts 37.5305535 -122.2862704 "Name"
```
Shows: confidence, location verification, name, description, tier, sources

### Clear Specific Cache
```bash
npx tsx scripts/invalidate-playground-cache.ts W969448818 W1255936512
npx tsx scripts/invalidate-playground-cache.ts 969448818 1255936512
```
Clears: AI insights + images cache

### Clear All Caches
**Via Supabase SQL Editor**:
```sql
TRUNCATE TABLE osm_query_cache;
TRUNCATE TABLE ai_insights_cache;
TRUNCATE TABLE playground_images_cache;
```

---

## Common Debugging Workflows

### Wrong Playground Name?
1. `npx tsx scripts/debug-ai-enrichment.ts LAT LON "Name"`
2. Check AI response
3. `npx tsx scripts/invalidate-playground-cache.ts OSMID`
4. Hard refresh (Cmd+Shift+R)

### Changed Gemini Prompt?
1. Update `src/lib/gemini.ts`
2. Change `AI_INSIGHTS_CACHE_VERSION` in `.env.local`
3. Restart dev server
4. `npx tsx scripts/debug-ai-enrichment.ts LAT LON`

### Fresh Development Start?
1. Clear all caches (SQL above)
2. `pnpm dev`
3. Hard refresh browser

---

## Performance Optimizations

1. **Zoom-based limiting**: Fewer playgrounds when zoomed out
2. **Distance-based prioritization**: Enriches visible playgrounds first
3. **Batch processing**: Groups 5 playgrounds per request
4. **Cache-only fast path**: Instant cached results (~50ms)
5. **Lazy image loading**: Only loads visible images
6. **Request deduplication**: Prevents duplicate API calls
7. **Debounced updates**: 500-1000ms debounce on data changes
8. **Abort controllers**: Cancels stale requests

---

## Environment Variables

```bash
# API Keys
GEMINI_API_KEY=
GOOGLE_CUSTOM_SEARCH_API_KEY=
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cache Versions (increment to invalidate)
AI_INSIGHTS_CACHE_VERSION=v17-tier-fields-fixed
IMAGES_CACHE_VERSION=v1
OSM_CACHE_VERSION=v1

# Cache TTLs (milliseconds)
AI_INSIGHTS_CACHE_TTL_MS=7776000000   # 90 days
IMAGES_CACHE_TTL_MS=7776000000        # 90 days

# API Config
OSM_QUERY_TIMEOUT=25                   # Seconds
```

---

## Key Files

### Types
- `src/types/playground.ts` - Main Playground type
- `src/types/ai-insights.ts` - AI insights & location types
- `src/types/osm.ts` - OpenStreetMap API types
- `src/types/map.ts` - Map bounds type

### Contexts
- `src/contexts/playgrounds-context.tsx` - Playground state management
- `src/contexts/filters-context.tsx` - Map bounds & persistence

### API
- `src/app/api/search/route.ts` - OSM search
- `src/app/api/insights-batch/route.ts` - AI enrichment
- `src/app/api/images/route.ts` - Image search

### Libraries
- `src/lib/cache.ts` - Cache operations
- `src/lib/cache-keys.ts` - Cache key generation
- `src/lib/gemini.ts` - Gemini AI integration
- `src/lib/images.ts` - Image loading
- `src/lib/osm.ts` - OpenStreetMap queries
- `src/lib/rate-limiter.ts` - Concurrency limiting
- `src/lib/validators/result-scorer.ts` - Result quality scoring

### Debugging
- `scripts/debug-ai-enrichment.ts` - Test AI for coordinates
- `scripts/invalidate-playground-cache.ts` - Clear specific cache
- `scripts/clear-all-caches.sql` - SQL cache clearing

---

## State Flow

```
User moves map
    ↓
FiltersContext detects bounds change
    ↓
PlaygroundsContext fetches OSM data via /api/search
    ↓
Smart merge (preserve enriched data)
    ↓
Auto-enrich unenriched playgrounds (sorted by distance)
    ↓
Batch Gemini requests via /api/insights-batch
    ↓
Display playgrounds on map
    ↓
User scrolls/card becomes visible (Intersection Observer)
    ↓
Lazy load images via /api/images
```

---

## Rate Limits & Costs

| Service | Free Tier | Paid | Limit Strategy |
|---------|-----------|------|-----------------|
| **Gemini 2.0 Flash** | 15 RPM | 2,000 RPM | Rate limiter: 2 concurrent |
| **Google Custom Search** | 100/day | $5/1000 | Lazy load images only |
| **Overpass API** | Unlimited | N/A | Multiple endpoints with fallback |
| **Nominatim (OSM)** | Unlimited* | N/A | Batch with rate limiting |

*Nominatim: 1 request/second per IP (rate limiter handles)

---

## Scoring System

### Result Quality Score (0-100)
- **Sources (30%)**: URL validity, domain reputation
- **Description (25%)**: Length, coherence, relevance
- **Data Completeness (20%)**: How many fields filled
- **Location Confidence (25%)**: AI confidence + verification

### Thresholds
- Accept: 50+ (show in app)
- Cache: 65+ (save for reuse)
- High confidence: 75+
- Medium confidence: 50-74
- Low confidence: <50

---

## Tier Reasoning Examples

### Star Playground
```
"Exceptional destination with water play feature, 
multiple climbing structures, and award-winning design."
```

### Gem Playground
```
"Notable local playground with themed elements and 
wheelchair-accessible amenities."
```

### Neighborhood Playground
```
"Standard community playground with basic equipment 
serving local residents."
```

