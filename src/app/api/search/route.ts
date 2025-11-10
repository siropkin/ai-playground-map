import { NextRequest, NextResponse } from "next/server";

import { MapBounds } from "@/types/map";
import { runOSMQuery } from "@/lib/osm";
import { Playground } from "@/types/playground";
import {
  generateOSMCacheKey,
  fetchOSMFromCache,
  saveOSMToCache
} from "@/lib/osm-cache";
import { fetchAIInsightsFromCache } from "@/lib/cache";
import { buildAIInsightsCacheKey } from "@/lib/cache-keys";

// Zoom-based limits for result count (industry best practice)
const ZOOM_THRESHOLD_LOW = 12; // Threshold for zoomed-out view
const ZOOM_THRESHOLD_HIGH = 14; // Threshold for zoomed-in view
const LIMIT_ZOOMED_OUT = 20; // Fewer items for performance when zoomed out
const LIMIT_MEDIUM = 50; // Balanced view for medium zoom
const LIMIT_ZOOMED_IN = 100; // Show more detail when zoomed in

export async function POST(
  request: NextRequest,
): Promise<NextResponse<{ error: string }> | NextResponse<Playground[]>> {
  const signal = request.signal;

  try {
    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    const body = await request.json();
    const { bounds } = body as { bounds: MapBounds };

    if (
      bounds?.north == null ||
      bounds?.south == null ||
      bounds?.east == null ||
      bounds?.west == null ||
      bounds?.zoom == null
    ) {
      return NextResponse.json(
        { error: "Invalid map bounds provided" },
        { status: 400 },
      );
    }

    // Calculate limit based on zoom level (industry best practice)
    // Zoomed out: Show fewer items for performance
    // Medium zoom: Balanced view
    // Zoomed in: Show more detail
    const zoomBasedLimit = bounds.zoom < ZOOM_THRESHOLD_LOW
      ? LIMIT_ZOOMED_OUT
      : bounds.zoom > ZOOM_THRESHOLD_HIGH
        ? LIMIT_ZOOMED_IN
        : LIMIT_MEDIUM;

    // Try to fetch from cache first (Phase 1 optimization)
    const cacheKey = generateOSMCacheKey(bounds, bounds.zoom);
    let osmResults = await fetchOSMFromCache(cacheKey);

    // Cache miss or empty cache result - fetch from OSM API
    // If cache returns 0 playgrounds, verify with real search (might be bad cache)
    if (!osmResults || osmResults.length === 0) {
      osmResults = await runOSMQuery({
        bounds,
        leisure: "playground",
        timeout: parseInt(process.env.OSM_QUERY_TIMEOUT || "25"),
        limit: zoomBasedLimit,
        signal,
      });

      // Save to cache for future requests (async, non-blocking)
      // Update cache even if empty to prevent repeated queries for areas with no playgrounds
      saveOSMToCache(cacheKey, bounds, bounds.zoom, osmResults).catch(err =>
        console.error("[APISearch] ❌ Failed to save OSM cache:", err)
      );
    }

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    if (osmResults.length === 0) {
      return NextResponse.json([]);
    }

    // Filter invalid items BEFORE expensive mapping for better performance
    // Track filtered count for data quality monitoring
    const invalidCount = osmResults.filter((item) => {
      const lat = item.type === "node" ? item.lat : item.center?.lat;
      const lon = item.type === "node" ? item.lon : item.center?.lon;
      return lat == null || lon == null;
    }).length;

    if (invalidCount > 0) {
      console.warn(`[APISearch] ⚠️ Filtered ${invalidCount} playgrounds without coordinates`);
    }

    // Create base playgrounds from OSM data
    const basePlaygrounds: Playground[] = osmResults
      .filter((item) => {
        // Extract coordinates based on type
        const lat = item.type === "node" ? item.lat : item.center?.lat;
        const lon = item.type === "node" ? item.lon : item.center?.lon;
        // Only process items with valid coordinates
        return lat != null && lon != null;
      })
      .map((item) => ({
        id: item.id,
        name: item.tags?.name || null,
        description: item.tags?.description || null,
        lat: item.type === "node" ? item.lat! : item.center!.lat,
        lon: item.type === "node" ? item.lon! : item.center!.lon,
        features: null,
        parking: null,
        sources: null,
        address: null,
        images: null,
        osmId: item.id,
        osmType: item.type,
        osmTags: item.tags,
        enriched: false,
        accessibility: null,
        tier: null,
        tierReasoning: null,
      }));

    // OPTIMIZATION: Check AI cache for each playground and populate enrichment data if available
    // This prevents redundant enrichment requests on page refresh
    const enrichedPlaygrounds = await Promise.all(
      basePlaygrounds.map(async (playground) => {
        try {
          // Build cache key using OSM ID
          const osmIdFormatted = playground.osmType && playground.osmId
            ? `${playground.osmType[0].toUpperCase()}${playground.osmId}`
            : undefined;

          if (!osmIdFormatted) {
            return playground;
          }

          const cacheKey = buildAIInsightsCacheKey({ osmId: osmIdFormatted });
          const cachedInsights = await fetchAIInsightsFromCache({ cacheKey });

          if (cachedInsights) {
            // Populate playground with cached AI insights
            return {
              ...playground,
              name: cachedInsights.name || playground.name,
              description: cachedInsights.description,
              features: cachedInsights.features,
              parking: cachedInsights.parking,
              sources: cachedInsights.sources,
              images: cachedInsights.images,
              accessibility: cachedInsights.accessibility,
              tier: cachedInsights.tier,
              tierReasoning: cachedInsights.tier_reasoning,
              enriched: true, // Mark as enriched since we have cache data
            };
          }

          return playground;
        } catch (error) {
          console.error(`[APISearch] ⚠️ Error checking cache for ${playground.osmId}:`, error);
          return playground;
        }
      })
    );

    const enrichedCount = enrichedPlaygrounds.filter(p => p.enriched).length;
    console.log(`[APISearch] ✅ Returning ${enrichedPlaygrounds.length} playgrounds (${enrichedCount} pre-enriched from cache)`);
    return NextResponse.json(enrichedPlaygrounds);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    console.error("[APISearch] ❌ Error fetching playgrounds from OSM:", error);
    return NextResponse.json(
      { error: "Failed to fetch playgrounds" },
      { status: 500 },
    );
  }
}
