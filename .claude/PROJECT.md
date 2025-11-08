# Good Playground Map - Project Knowledge Base

> **For Claude Code & AI Assistants**: This document contains comprehensive information about the project to avoid repeated explanations.

## Quick Reference

| Item | Value |
|------|-------|
| **Package Manager** | **pnpm** (not npm or yarn!) |
| **Framework** | Next.js 15.4.7 (App Router) |
| **React** | 19.0.0 |
| **TypeScript** | 5.6 |
| **UI Library** | **shadcn/ui** + Tailwind CSS 4 |
| **Deployment** | Vercel |
| **Repository** | https://github.com/siropkin/playground-map |

## Essential Commands

```bash
# Install dependencies (ALWAYS use pnpm!)
pnpm install

# Development (with Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint
pnpm lint
```

## Project Overview

**Good Playground Map** is an AI-powered interactive map that helps parents find playgrounds for their kids. It combines:

1. **OpenStreetMap** data for playground locations
2. **Perplexity AI** for detailed enrichment (descriptions, features, images)
3. **Mapbox GL** for interactive mapping
4. **Supabase** for auth & caching

## Tech Stack

### Core Dependencies

- **Next.js 15.4.7** - React framework with App Router
- **React 19.0.0** - UI library
- **TypeScript 5.6** - Type safety
- **Tailwind CSS 4** - Utility-first styling
- **shadcn/ui** - Accessible component library (uses Radix UI primitives)
- **Mapbox GL 3.11.0** - Interactive maps
- **Supabase** - PostgreSQL database, auth, storage
- **Perplexity AI** - AI-powered enrichment

### UI Components (shadcn/ui)

**Location:** `/src/components/ui/`

All UI components follow shadcn/ui patterns:
- **Button** - Various variants (outline, primary, ghost)
- **Card** - Container with header/content sections
- **Dialog** - Modal dialogs
- **Sheet** - Side/bottom drawers
- **Badge** - Tags and labels
- **Input** - Text inputs
- **Textarea** - Multi-line inputs
- **Label** - Form labels
- **Skeleton** - Loading placeholders
- **Spinner** - Loading indicator (custom, uses lucide-react LoaderIcon)

**Adding new shadcn components:**
```bash
pnpm dlx shadcn@latest add [component-name]
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   User Browser                   │
│  ┌────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  MapView   │  │ NavBar   │  │ Playground  │ │
│  │  (Mapbox)  │  │          │  │    List     │ │
│  └─────┬──────┘  └──────────┘  └──────┬──────┘ │
└────────┼────────────────────────────────┼────────┘
         │                                │
    ┌────▼────────────────────────────────▼─────┐
    │         React Context Providers           │
    │  • FiltersContext (map bounds)            │
    │  • PlaygroundsContext (data & enrichment) │
    │  • AuthContext (user session)             │
    └────────────────┬──────────────────────────┘
                     │
    ┌────────────────▼──────────────────────────┐
    │          Next.js API Routes               │
    │  • /api/search - OSM playground search    │
    │  • /api/insights - AI enrichment          │
    │  • /api/insights-batch - Batch enrichment │
    │  • /api/osm-location - Reverse geocode    │
    └────┬───────────────────┬──────────────────┘
         │                   │
    ┌────▼────┐         ┌────▼────────┐
    │ Supabase│         │ External    │
    │ (Cache) │         │ APIs        │
    │         │         │ • OSM       │
    │ • OSM   │         │ • Perplexity│
    │ • AI    │         │ • Nominatim │
    │ • Users │         └─────────────┘
    └─────────┘
```

## Key Features

1. **Interactive Map** - Mapbox-powered with clustering, zoom controls
2. **AI Enrichment** - Perplexity AI generates descriptions, features, parking info, images
3. **Smart Caching** - 24hr OSM cache, 1yr AI cache (cost optimization)
4. **Priority-based Enrichment** - Detail page (full), visible (medium), off-screen (light)
5. **Google OAuth** - Optional login for admin features
6. **SEO Optimized** - Dynamic sitemap, Open Graph images, structured data
7. **Mobile-First** - Responsive design with bottom sheet on mobile

## Data Flow

### Playground Discovery
```
User pans map → Map bounds change → FiltersContext updates →
PlaygroundsContext fetches → Check OSM cache →
  CACHE HIT: Return immediately
  CACHE MISS: Query Overpass API → Save to cache → Return
```

### AI Enrichment
```
User views playground → enrichPlayground(id) called →
Check if already enriched → Fetch location data →
Call Perplexity API → Validate result (location, quality) →
Score result (0-100) → Cache if score ≥ 70 → Display
```

## Important File Paths

### Core Logic
- `/src/lib/perplexity.ts` (696 lines) - AI enrichment with validation
- `/src/lib/osm.ts` (237 lines) - OpenStreetMap queries
- `/src/contexts/playgrounds-context.tsx` (275 lines) - State management
- `/src/lib/validators/result-scorer.ts` (232 lines) - Quality scoring

### UI Components
- `/src/components/map-view.tsx` - Interactive Mapbox map
- `/src/components/playground-list.tsx` - Playground list with enrichment
- `/src/components/nav-bar.tsx` - Header navigation
- `/src/components/ui/*` - **shadcn/ui component library**

### API Routes
- `/src/app/api/search/route.ts` - OSM playground search
- `/src/app/api/insights/route.ts` - Single AI enrichment
- `/src/app/api/insights-batch/route.ts` - Batch enrichment (max 5)

### Types
- `/src/types/playground.ts` - Main Playground type definition

## Environment Variables

**Required:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token

# Perplexity AI
PERPLEXITY_API_KEY=pplx-your-key
```

**Optional (with defaults):**
```bash
OSM_QUERY_TIMEOUT=25
PERPLEXITY_MODEL=sonar-pro
PERPLEXITY_TEMPERATURE=0.2
PERPLEXITY_CACHE_TTL_MS=31536000000  # 1 year
```

## Code Patterns

### Context Usage
```typescript
// Always use hooks to access context
const { playgrounds, loading, enrichPlayground } = usePlaygrounds();
const { mapBounds, setMapBounds } = useFilters();
const { user, signIn, signOut } = useAuth();
```

### API Route Pattern
```typescript
// All API routes use POST with AbortSignal
export async function POST(request: NextRequest): Promise<NextResponse> {
  const signal = request.signal;
  // Check for abort
  if (signal?.aborted) {
    return NextResponse.json({}, { status: 499 });
  }
  // Implementation...
}
```

### Component Styling (Tailwind + cn utility)
```typescript
import { cn } from "@/lib/utils";

<Button
  className={cn(
    "px-4 py-2",
    variant === "primary" && "bg-primary text-white"
  )}
/>
```

### shadcn/ui Components
```typescript
// Import from @/components/ui
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
```

## Recent Changes & Bug Fixes

### Latest Commits
- `f3666ef` - Fix flash of "No playgrounds found" on initial load
- `5c8b43a` - Improve loading state UX (added "Thinking..." text, shadcn Spinner)
- `918f2f5` - Add comprehensive SEO (sitemap, robots.txt, structured data)
- `b72516a` - Hide login UI, create admin-only `/login` route
- `126a323` - Rename "Buy me a coffee" → "Support"

### Known Issues (Fixed)
- ✅ Way/Relation OSM types now properly cached with prefixed IDs (N/W/R)
- ✅ Image loading works for all OSM types
- ✅ Detail page 404s fixed for Way/Relation playgrounds
- ✅ Loading state no longer flashes "not found" before data loads

## Development Guidelines

### When Adding Features

1. **Check if shadcn/ui has the component** before creating custom UI
2. **Use pnpm** for all package operations
3. **Follow existing patterns** in similar components
4. **Add TypeScript types** for new data structures
5. **Consider mobile** - test responsive design
6. **Update this doc** if architecture changes

### When Using AI Enrichment

- **Cost awareness**: High priority = $0.015, Medium = $0.010, Low = $0.005
- **Location validation**: Results must be within 0.1 mile radius
- **Quality threshold**: Only cache results with score ≥ 70
- **Batch size limit**: Max 5 playgrounds per batch call

### When Working with OSM Data

- **Prefixed IDs**: Always use `N123`, `W456`, `R789` format for caching
- **Retry logic**: 3 endpoints with 2 retries each = 9 total attempts
- **Timeout**: Max 25 seconds per Overpass query
- **Cache TTL**: 24 hours for OSM data

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Initial page load | 2-3s | Next.js + Mapbox init |
| OSM search (cached) | <50ms | Database lookup |
| OSM search (uncached) | 500-2000ms | Overpass API |
| AI enrichment (cached) | <50ms | Database lookup |
| AI enrichment (uncached) | 3-8s | Perplexity API + validation |

## Testing

### Manual Testing Checklist
- [ ] Map loads and centers correctly
- [ ] Playgrounds appear on zoom/pan
- [ ] Click playground shows details
- [ ] AI enrichment adds data to cards
- [ ] Mobile bottom sheet works
- [ ] Dark mode toggles properly
- [ ] Login/logout flow works (admin)

### Important Test Cases
1. **OSM Types**: Test with Node, Way, and Relation playgrounds
2. **Enrichment Quality**: Verify location validation works
3. **Caching**: Confirm cache hits show instantly
4. **Error Handling**: Network failures show graceful fallbacks

## Deployment

**Vercel Integration:**
- Git push to `main` triggers automatic deployment
- Environment variables set in Vercel dashboard
- Build command: `pnpm build`
- Output directory: `.next`

**Production URL:** https://goodplaygroundmap.com

## Useful Links

- **Repository**: https://github.com/siropkin/playground-map
- **Deployment**: Vercel Dashboard
- **shadcn/ui docs**: https://ui.shadcn.com
- **Mapbox docs**: https://docs.mapbox.com
- **Perplexity API**: https://docs.perplexity.ai

---

**Last Updated:** 2025-11-08
**Version:** 3.2.1
**Maintainer:** Ivan Seredkin
