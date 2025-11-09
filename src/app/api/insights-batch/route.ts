import { NextRequest, NextResponse } from "next/server";
import { AILocation } from "@/types/ai-insights";
import { fetchGeminiInsightsBatch } from "@/lib/gemini";
import { batchReverseGeocode } from "@/lib/osm";

export async function POST(
  request: NextRequest,
): Promise<NextResponse> {
  const signal = request.signal;

  try {
    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    const body = await request.json();
    const { playgrounds } = body as {
      playgrounds: Array<{
        id: number;
        lat: number;
        lon: number;
        name?: string;
        osmId?: string;
      }>;
    };

    if (!Array.isArray(playgrounds) || playgrounds.length === 0) {
      return NextResponse.json(
        { error: "Valid playgrounds array is required" },
        { status: 400 },
      );
    }

    // Limit to 5 playgrounds per batch request
    if (playgrounds.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 playgrounds per batch request" },
        { status: 400 },
      );
    }

    // PERFORMANCE OPTIMIZATION: Try cache-only checks first with osmIds
    // This saves ~3 seconds of geocoding for cached playgrounds
    const cacheOnlyRequests = playgrounds.map((pg) => ({
      playgroundId: pg.id,
      location: undefined, // No location for cache-only check
      name: pg.name,
      osmId: pg.osmId,
    }));

    const cacheResults = await fetchGeminiInsightsBatch({
      requests: cacheOnlyRequests,
      signal,
      cacheOnly: true, // Only check cache, don't try to fetch from API
    });

    // Identify cache misses (playgrounds that need geocoding + full enrichment)
    const cacheMisses = cacheResults
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => result.insights === null)
      .map(({ index }) => playgrounds[index]);

    // If all cached, return immediately (fast path!)
    if (cacheMisses.length === 0) {
      return NextResponse.json({ results: cacheResults });
    }

    // Geocode only the cache misses
    const coordinates = cacheMisses.map((pg) => ({ lat: pg.lat, lon: pg.lon }));
    const geocodeResults = await batchReverseGeocode({ coordinates, signal });

    // Build full requests for cache misses
    const missRequests = cacheMisses
      .map((pg, index) => {
        const result = geocodeResults[index];
        if (!result || !result.data) {
          return null;
        }

        // Type cast the nominatim response
        const address = (result.data as { address?: Record<string, string> }).address;

        const location: AILocation = {
          latitude: pg.lat,
          longitude: pg.lon,
          city: address?.city || address?.town || address?.village,
          region: address?.state,
          country: address?.country_code?.toUpperCase() || "US",
        };

        return {
          playgroundId: pg.id,
          location,
          name: pg.name,
          osmId: pg.osmId,
        };
      })
      .filter((loc): loc is NonNullable<typeof loc> => loc !== null);

    // Fetch insights for cache misses with full location data
    // NOTE: Images are NOT fetched here - use src/lib/images.ts instead
    console.log(`[API /insights-batch] 🚀 Fetching ${missRequests.length} playgrounds (AI insights only)`);

    const missResults = await fetchGeminiInsightsBatch({
      requests: missRequests,
      signal,
    });

    console.log(`[API /insights-batch] ✅ Completed: ${missResults.filter(r => r.insights).length}/${missResults.length}`);

    // Merge cache hits and API results
    const missMap = new Map(missResults.map((r) => [r.playgroundId, r]));
    const results = cacheResults.map((cacheResult) =>
      missMap.get(cacheResult.playgroundId) || cacheResult
    );

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    console.error("[API /insights-batch] ❌ Error in batch insights generation:", error);
    return NextResponse.json(
      { error: "Failed to generate batch insights" },
      { status: 500 },
    );
  }
}
