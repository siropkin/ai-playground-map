# AI Playground Map - Codebase Architecture Analysis

## Overview
This is a Next.js web application that displays playgrounds on a map, enriches playground data with AI-generated insights, and caches all results for performance. The application is organized around three main data flows with a sophisticated caching system.

---

## 1. DATA FLOW ARCHITECTURE

### 1.1 Three-Layer Data Fetch & Enrichment

The application follows a clearly defined data pipeline with three distinct layers:

#### **Layer 1: OSM (OpenStreetMap) Data - Location/Basic Info**
- **Source**: Overpass API (multiple endpoints with fallback)
- **Trigger**: User moves map or changes zoom level
- **Process**:
  1. FiltersContext detects map bounds change
  2. PlaygroundsContext calls `searchPlaygrounds()` via `/api/search`
  3. API queries cache first (Phase 1 optimization)
  4. Cache miss → runOSMQuery() hits Overpass API
  5. Results cached for 24 hours
  6. Returns basic Playground objects with null enrichment fields

#### **Layer 2: AI Insights - Rich Enrichment Data**
- **Source**: Google Gemini 2.0 Flash with web search grounding
- **Trigger**: Automatically enriches unenriched playgrounds in viewport (after Layer 1)
- **Process**:
  1. PlaygroundsContext identifies unenriched playgrounds
  2. Sorts by distance from map center (prioritizes visible playgrounds)
  3. Batches playgrounds in groups of 5
  4. Calls `generatePlaygroundAiInsightsBatch()` via `/api/insights-batch`
  5. API cache-first strategy:
     - Cache-only check with osmId (fast path ~50ms)
     - Cache hits return immediately
     - Cache misses trigger batch geocoding + full enrichment
  6. Gemini processes batch with prompt containing location context
  7. Results cached for 90 days with TTL validation
  8. Returns AIInsights with name, description, features, tier, reasoning

#### **Layer 3: Images - Visual Enrichment**
- **Source**: Google Custom Search API (photo-only, SafeSearch enabled)
- **Trigger**: Lazy-loaded when playground card becomes visible (Intersection Observer)
- **Process**:
  1. PlaygroundCard component uses `useIntersectionObserver` hook
  2. When visible, calls `loadImagesForPlayground()` 
  3. Context calls `fetchPlaygroundImages()` via `/api/images`
  4. Google Custom Search returns up to 8 images
  5. Results cached for 90 days
  6. Updates playground in context with image URLs

### 1.2 Smart Merging Strategy

When playgrounds are re-fetched, PlaygroundsContext intelligently merges fresh OSM data with preserved AI enrichment:

```typescript
// src/contexts/playgrounds-context.tsx (lines 97-121)
const enrichedMap = new Map(prevPlaygrounds.filter(p => p.enriched).map(p => [p.osmId, p]));

updatedPlaygrounds = playgroundsForBounds.map(newPlayground => {
  const existingEnriched = enrichedMap.get(newPlayground.osmId);
  if (existingEnriched) {
    // Merge: Fresh OSM data + Preserved AI fields
    return {
      ...newPlayground,  // Fresh: coords, address, tags
      ...existingEnriched // Preserved: name, description, tier, etc.
    };
  }
  return newPlayground; // New playground, mark for enrichment
});
```

### 1.3 Cache Deduplication & Request Dedup

Multiple mechanisms prevent redundant enrichment:

1. **Recently Enriched Tracking**: Maps store enrichment timestamps
   - Window: 5 seconds deduplication
   - Auto-cleanup after 10 seconds
   - Prevents duplicate requests on rapid map movements

2. **Request Deduplication**: Fetch-level dedup for identical in-flight requests
   - Uses `deduplicatedFetch()` wrapper
   - Prevents multiple identical API calls

3. **Abort Controllers**: Cancel previous requests when bounds change
   - Prevents race conditions
   - Cleans up stale requests

---

## 2. DATA TYPES & MODELS

### 2.1 Core Data Types

#### **Playground Type** (src/types/playground.ts)
```typescript
type Playground = {
  id: number;                    // Internal database ID
  name: string | null;           // From AI enrichment or OSM
  description: string | null;    // From AI enrichment
  lat: number;                   // Coordinates
  lon: number;
  address: string | null;        // From OSM
  features: string[] | null;     // Play equipment (from AI)
  parking: string | null;        // Parking info (from AI)
  sources: string[] | null;      // URLs where AI found data
  images: PlaygroundImage[] | null;  // From Google Custom Search
  osmId: number;                 // OpenStreetMap ID
  osmType: "node" | "way" | "relation";  // OSM element type
  osmTags: Record<string, string> | null;  // Raw OSM tags
  enriched: boolean | null;      // AI enrichment status
  accessibility: string[] | null; // Accessibility features (from AI)
  tier: "neighborhood" | "gem" | "star" | null;  // Quality rating
  tierReasoning: string | null;  // Why assigned this tier
};

type PlaygroundTier = "neighborhood" | "gem" | "star";
```

#### **AIInsights Type** (src/types/ai-insights.ts)
```typescript
type AIInsights = {
  name: string | null;
  description: string | null;
  features: string[] | null;
  parking: string | null;
  sources: string[] | null;
  images: PlaygroundImage[] | null;
  accessibility: string[] | null;
  tier: "neighborhood" | "gem" | "star" | null;
  tier_reasoning: string | null;
};

type AILocation = {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country: string;  // ISO 3166-1 alpha-2 code
};
```

#### **OSM Response Types** (src/types/osm.ts)
```typescript
type OSMQueryResults = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: Record<string, string>;
  nodes?: number[];
  members?: { type: string; ref: number }[];
};

type OSMPlaceDetails = {
  place_id: number;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  lat: string;
  lon: string;
  name: string;
  address: { road?: string; city?: string; state?: string; ... };
  ...
};
```

#### **MapBounds Type** (src/types/map.ts)
```typescript
type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom: number;
};
```

#### **PlaygroundImage Type** (src/lib/images.ts)
```typescript
interface PlaygroundImage {
  image_url: string;
  origin_url: string;
  height: number;
  width: number;
  title?: string;
  thumbnail_url?: string;
}
```

### 2.2 Tier Determination

Tiers are calculated by Gemini AI based on this rubric (in gemini.ts prompt):

- **⭐ Star**: Exceptional destination playground (8+ features, unique/themed, award-winning, water play, climbing walls)
- **💎 Gem**: Notable playground with standout features (5+ features, themed elements, good amenities, wheelchair accessible)
- **⚪ Neighborhood**: Standard local playground (basic equipment, 2-4 features, serves local community)

The AI returns confidence level along with verification details.

---

## 3. STATE MANAGEMENT

### 3.1 Context-Based Architecture

#### **PlaygroundsContext** (src/contexts/playgrounds-context.tsx)
Manages playground data lifecycle:

```typescript
interface PlaygroundsContextType {
  playgrounds: Playground[];           // All loaded playgrounds
  loading: boolean;                    // Data fetch status
  error: string | null;                // Error messages
  flyToCoords: [number, number] | null; // Map fly-to request
  requestFlyTo: (coords) => void;      // Request map navigation
  clearFlyToRequest: () => void;
  enrichPlayground: (id) => Promise<void>;      // Single enrichment
  enrichPlaygroundsBatch: (ids) => Promise<void>; // Batch enrichment (max 5)
  loadImagesForPlayground: (id) => Promise<void>; // Lazy load images
  selectedPlayground: Playground | null; // Currently selected
  selectPlayground: (p) => void;
  clearSelectedPlayground: () => void;
}
```

Key features:
- Debounced fetch on map bounds change (1000ms debounce)
- Automatic unenriched playground enrichment
- Smart data merging (preserves enriched data)
- Abort controller for request cancellation
- URL-synced playground selection

#### **FiltersContext** (src/contexts/filters-context.tsx)
Manages map state and persistence:

```typescript
interface FiltersContextType {
  mapBounds: MapBounds | null;
  setMapBounds: (bounds: MapBounds) => void;
}
```

Key features:
- Persists bounds to URL query params (debounced 500ms)
- Restores from session storage on mount
- Priority: URL params > session storage > null
- Syncs map navigation across browser tabs

### 3.2 URL & Session Storage Synchronization

**Map Position Persistence** (src/lib/utils.ts):
- Bounds stored in URL: `?north=37.5&south=37.4&east=-122.2&west=-122.3&zoom=14`
- Session storage as backup for page refreshes
- Automatic restoration on mount

**Playground Selection**:
- Selected playground ID in URL: `?playground=123456`
- Restored on mount, cleared on deselection

---

## 4. CACHING ARCHITECTURE

### 4.1 Three-Layer Cache System

#### **1. OSM Query Cache** (24-hour TTL)
- **Key Format**: `v1:osm:{north}:{south}:{east}:{west}:{zoom}`
- **Storage**: Supabase `osm_query_cache` table
- **TTL**: 24 hours (overridable via env var)
- **Invalidation**: Via OSM_CACHE_VERSION env var
- **Use**: Prevents repeated Overpass API calls for same viewport

#### **2. AI Insights Cache** (90-day TTL)
- **Key Format**: `v17-tier-fields-fixed:N123456` (osmId) or `v17-tier-fields-fixed:40.1234,-122.5678` (coords)
- **Storage**: Supabase `ai_insights_cache` table
- **TTL**: 90 days with validation (null fields expire earlier)
- **Fields Cached**: name, description, features, parking, sources, images, accessibility, tier, tier_reasoning, created_at
- **Invalidation**: Via AI_INSIGHTS_CACHE_VERSION env var
- **Use**: Prevents repeated Gemini API calls

#### **3. Images Cache** (90-day TTL)
- **Key Format**: `v1:N123456` (osmId) or `v1:playground-name-city`
- **Storage**: Supabase `playground_images_cache` table
- **TTL**: 90 days
- **Use**: Prevents repeated Google Custom Search calls

### 4.2 Cache Key Management

**Version Control** (src/lib/cache-keys.ts):
```typescript
export const AI_INSIGHTS_CACHE_VERSION = 
  process.env.AI_INSIGHTS_CACHE_VERSION || "v17-tier-fields-fixed";
export const IMAGES_CACHE_VERSION = 
  process.env.IMAGES_CACHE_VERSION || "v1";
export const OSM_CACHE_VERSION = 
  process.env.OSM_CACHE_VERSION || "v1";
```

**Cache Invalidation Workflow**:
1. Update version in `.env.local`
2. Old cache entries with old prefix never found (automatic)
3. New requests generate keys with new prefix
4. No database cleanup needed

### 4.3 Cache Functions

**Read Functions**:
- `fetchAIInsightsFromCache(cacheKey)` - Single read
- `batchFetchAIInsightsFromCache(cacheKeys)` - Batch read
- `fetchImagesFromCache(cacheKey)` - Single read
- `fetchOSMFromCache(cacheKey)` - Single read

**Write Functions**:
- `saveAIInsightsToCache(cacheKey, insights)` - Single write
- `saveImagesCache(cacheKey, images)` - Single write
- `saveOSMToCache(cacheKey, results)` - Single write

**Delete Functions**:
- `clearAIInsightsCache(cacheKey)` - Single delete
- `bulkClearAIInsightsCache(cacheKeys)` - Batch delete
- `clearAIInsightsCacheByPattern(pattern)` - Pattern delete
- `invalidatePlaygroundCache(params)` - Atomic multi-layer delete

---

## 5. API ROUTES

### 5.1 API Endpoints

#### **POST /api/search**
**Purpose**: Search for playgrounds in a map viewport
**Input**:
```typescript
{ bounds: MapBounds }
```
**Output**:
```typescript
Playground[]  // With null enrichment fields
```
**Logic**:
1. Validate bounds
2. Calculate limit based on zoom level
3. Check OSM query cache
4. If miss, query Overpass API
5. Transform OSM results to Playground type
6. Return

**Zoom-Based Limits**:
- Zoom < 12: 20 playgrounds
- Zoom 12-14: 50 playgrounds
- Zoom > 14: 100 playgrounds

#### **POST /api/insights-batch**
**Purpose**: Generate AI insights for multiple playgrounds
**Input**:
```typescript
{
  playgrounds: Array<{
    id: number;
    lat: number;
    lon: number;
    name?: string;
    osmId?: string;
  }>  // Max 5 per request
}
```
**Output**:
```typescript
{
  results: Array<{
    playgroundId: number;
    insights: AIInsights | null;
  }>
}
```
**Logic**:
1. Validate input (max 5)
2. Cache-only check with osmId (fast path)
3. Identify cache misses
4. Batch reverse geocode misses (Nominatim API)
5. Call `fetchGeminiInsightsBatch()` for misses
6. Merge cache hits with fresh results
7. Return combined results

**Performance Optimization**: Cache-only check saves ~3 seconds of geocoding

#### **POST /api/images**
**Purpose**: Fetch playground images
**Input**:
```typescript
{
  playgroundName: string;
  city?: string;
  region?: string;
  country?: string;
  osmId?: string;
}
```
**Output**:
```typescript
{ images: PlaygroundImage[] | null }
```
**Logic**:
1. Build cache key (prefer osmId)
2. Check images cache
3. If hit, return cached images
4. If miss, call Google Custom Search
5. Cache results
6. Return

#### **POST /api/osm-location**
**Purpose**: Get structured location data from coordinates
**Input**:
```typescript
{ lat: number; lon: number }
```
**Output**:
```typescript
{ location: AILocation }
```
**Logic**:
1. Reverse geocode with Nominatim
2. Extract city, region, country
3. Return AILocation

#### **POST /api/insights**
**Purpose**: Generate AI insights for single playground
**Input**:
```typescript
{
  location: AILocation;
  name?: string;
  osmId?: string;
}
```
**Output**:
```typescript
{ insights: AIInsights | null }
```
**Logic**:
1. Call `fetchGeminiInsights()` wrapper
2. Return results

#### **GET /api/admin/clear-cache**
**Purpose**: Admin endpoint to clear cache entries
**Authentication**: Internal header check
**Parameters**:
```typescript
?keys=key1,key2  // Comma-separated cache keys
?pattern=v1:N%   // Pattern for LIKE query
```

---

## 6. DEBUGGING TOOLS & UTILITIES

### 6.1 TypeScript Debugging Scripts

#### **1. debug-ai-enrichment.ts**
**Purpose**: Test AI enrichment for specific coordinates

**Usage**:
```bash
# Without name
npx tsx scripts/debug-ai-enrichment.ts 37.5305535 -122.2862704

# With OSM name
npx tsx scripts/debug-ai-enrichment.ts 37.5379872 -122.3149726 "Beresford Park Playground"
```

**Output Shows**:
- AI confidence level (high/medium/low)
- Location verification details
- Returned name, description, features, tier, reasoning
- Source URLs (where AI found data)

**When to Use**:
- Investigating why AI assigned wrong name
- Testing distance validation logic
- Verifying AI prompt changes
- Understanding AI decision-making

---

#### **2. invalidate-playground-cache.ts**
**Purpose**: Clear stale cache for specific playgrounds

**Usage**:
```bash
# With type prefix
npx tsx scripts/invalidate-playground-cache.ts W969448818 W1255936512

# Without type prefix (auto-detects)
npx tsx scripts/invalidate-playground-cache.ts 969448818 1255936512
```

**What It Does**:
1. Generates cache keys for playground
2. Deletes AI insights cache entries
3. Deletes images cache entries
4. Reports what was deleted

**When to Use**:
- Playground showing incorrect name/data
- AI generated wrong information
- Need to force re-enrichment
- Testing AI prompt changes

---

### 6.2 SQL Scripts

#### **clear-all-caches.sql**
Truncates all three cache tables with before/after statistics

**Tables Cleared**:
- `osm_query_cache`
- `ai_insights_cache`
- `playground_images_cache`

**Usage** (in Supabase SQL Editor):
1. Open Dashboard → SQL Editor
2. Copy entire script
3. Click "Run"

#### **clear-all-caches-simple.sql**
Simple 3-line version without output:
```sql
TRUNCATE TABLE osm_query_cache;
TRUNCATE TABLE ai_insights_cache;
TRUNCATE TABLE playground_images_cache;
```

---

### 6.3 Available npm Scripts

From package.json:
```json
{
  "dev": "next dev --turbopack",      // Development server
  "build": "next build",               // Production build
  "start": "next start",               // Production server
  "lint": "next lint"                  // ESLint
}
```

---

### 6.4 Common Debugging Workflows

#### **Workflow 1: Wrong Playground Name**
```bash
# Step 1: Check OSM data directly
curl -s "https://overpass-api.de/api/interpreter" \
  -d "data=[out:json];(way(583248973););out center;" | \
  jq '.elements[] | {id, name: .tags.name}'

# Step 2: Test AI response
npx tsx scripts/debug-ai-enrichment.ts 37.547 -122.292 "Meadow Square"

# Step 3: Clear cache if needed
npx tsx scripts/invalidate-playground-cache.ts W583248973

# Step 4: Hard refresh browser (Cmd+Shift+R Mac / Ctrl+Shift+R Windows)
```

#### **Workflow 2: Testing Gemini Prompt Changes**
```bash
# Step 1: Update src/lib/gemini.ts

# Step 2: Increment cache version in .env.local
AI_INSIGHTS_CACHE_VERSION=v18

# Step 3: Test specific playground
npx tsx scripts/debug-ai-enrichment.ts 37.5305535 -122.2862704

# Step 4: Check results in app after hard refresh
```

#### **Workflow 3: Fresh Development Start**
```bash
# Clear all caches via Supabase SQL Editor
TRUNCATE TABLE osm_query_cache;
TRUNCATE TABLE ai_insights_cache;
TRUNCATE TABLE playground_images_cache;

# Restart dev server
pnpm dev

# Hard refresh browser (Cmd+Shift+R)
```

---

## 7. VALIDATION & SCORING

### 7.1 Result Scoring System (src/lib/validators/result-scorer.ts)

**Scoring Components**:
- Source Quality (30% weight) - Validates URLs, domain reputation
- Description Quality (25% weight) - Length, coherence, relevance
- Data Completeness (20% weight) - How many fields are populated
- Location Confidence (25% weight) - AI confidence level + verification

**Thresholds**:
- Min accept score: 50/100
- Min cache score: 65/100
- High confidence: 75+/100
- Medium confidence: 50-74/100
- Low confidence: <50/100

**Output**:
```typescript
interface ResultScore {
  overallScore: number;        // 0-100
  confidence: 'high' | 'medium' | 'low';
  shouldAccept: boolean;       // Based on minAcceptScore
  shouldCache: boolean;        // Based on minCacheScore
  breakdown: { ... };
  validationResults: { sources, description };
  flags: string[];             // Quality issues detected
}
```

### 7.2 Validation Layers

1. **Source Validator** (src/lib/validators/source-validator.ts)
   - Validates URLs format
   - Checks domain reputation
   - Counts high-quality sources

2. **Description Validator** (src/lib/validators/description-validator.ts)
   - Checks minimum length
   - Detects placeholder text
   - Validates coherence

---

## 8. KEY UTILITIES & HELPERS

### 8.1 Rate Limiting (src/lib/rate-limiter.ts)
```typescript
export const aiLimiter = pLimit(2);
// Limits to 2 concurrent AI requests
// Prevents 429 errors
```

Used in:
- Gemini API calls
- Nominatim reverse geocoding

### 8.2 Request Deduplication (src/lib/request-dedup.ts)
```typescript
export async function deduplicatedFetch(url, options) {
  // Prevents multiple identical in-flight requests
  // Returns same promise if request already pending
}
```

### 8.3 Hooks (src/lib/hooks.ts)
- `useDebounce()` - Debounce callbacks with cleanup
- `useMediaQuery()` - Responsive design queries
- `usePlaygrounds()` - Access playground context

---

## 9. ENVIRONMENT CONFIGURATION

**Key Environment Variables**:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# APIs
GEMINI_API_KEY=
GOOGLE_CUSTOM_SEARCH_API_KEY=
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=

# Cache Versions (for invalidation)
AI_INSIGHTS_CACHE_VERSION=v17-tier-fields-fixed
IMAGES_CACHE_VERSION=v1
OSM_CACHE_VERSION=v1

# Cache TTLs
AI_INSIGHTS_CACHE_TTL_MS=7776000000  # 90 days
IMAGES_CACHE_TTL_MS=7776000000       # 90 days

# API Config
OSM_QUERY_TIMEOUT=25                  # Seconds

# Feature Flags (optional)
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

---

## 10. DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                    │
│ User moves map or changes zoom level                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              FiltersContext (mapBounds change)              │
│ Detects bounds change → triggers debouncedFetch (1000ms)   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Layer 1: OSM Data Fetch (searchPlaygrounds)         │
│ /api/search → [Cache Check] → [Overpass API] → Playground[]│
│ Result: Basic playground with null enrichment fields        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│        PlaygroundsContext: Data Merge & Smart Merging       │
│ Fresh OSM data + Preserved AI enrichment + New dedup check  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   [Already      [New Playground]  [Render Updates]
    Enriched]     Mark for Enrich
   ▼
┌─────────────────────────────────────────────────────────────┐
│    Layer 2: AI Enrichment (enrichPlaygroundsBatch)          │
│ Sort by distance → Batch (5) → /api/insights-batch         │
│ [Cache-only check] → [Geocoding] → [Gemini] → AIInsights[] │
│ Result: Enriched with name, description, tier, etc.        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            PlaygroundCard Renders on Map                    │
│ Intersection Observer detects visibility                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│   Layer 3: Images Lazy Load (loadImagesForPlayground)       │
│ /api/images → [Cache Check] → [Google Custom Search]       │
│ Result: PlaygroundImage[] cached for 90 days               │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. PERFORMANCE OPTIMIZATIONS

1. **Zoom-based result limiting**: Fewer playgrounds when zoomed out
2. **Distance-based prioritization**: Enrich center playgrounds first
3. **Batch processing**: Group enrichment requests (max 5)
4. **Cache-only fast path**: Instant responses for cached playgrounds
5. **Lazy image loading**: Only load images when visible
6. **Request deduplication**: Prevent duplicate API calls
7. **Debounced URL updates**: Don't spam URL history
8. **Abort controllers**: Cancel stale requests
9. **Incremental rendering**: Don't block on data fetches
10. **Session storage**: Restore map position instantly

---

## 12. KEY FILES REFERENCE

**Data Types**:
- `/src/types/playground.ts` - Playground type definition
- `/src/types/ai-insights.ts` - AIInsights and AILocation types
- `/src/types/osm.ts` - OpenStreetMap response types
- `/src/types/map.ts` - MapBounds type

**State Management**:
- `/src/contexts/playgrounds-context.tsx` - Main playground state
- `/src/contexts/filters-context.tsx` - Map bounds state

**API Routes**:
- `/src/app/api/search/route.ts` - OSM search endpoint
- `/src/app/api/insights-batch/route.ts` - AI enrichment endpoint
- `/src/app/api/images/route.ts` - Image fetch endpoint
- `/src/app/api/osm-location/route.ts` - Reverse geocoding

**Core Libraries**:
- `/src/lib/osm.ts` - OpenStreetMap queries
- `/src/lib/gemini.ts` - Gemini AI integration
- `/src/lib/images.ts` - Image caching
- `/src/lib/cache.ts` - AI insights cache layer
- `/src/lib/cache-keys.ts` - Cache key generation
- `/src/lib/rate-limiter.ts` - Concurrency limiting

**Debugging**:
- `/scripts/debug-ai-enrichment.ts` - Test AI enrichment
- `/scripts/invalidate-playground-cache.ts` - Clear specific cache
- `/scripts/clear-all-caches.sql` - Clear all caches

**Documentation**:
- `/CACHE.md` - Caching guide
- `/CHANGELOG.md` - Version history
- `/scripts/README.md` - Debugging workflows

