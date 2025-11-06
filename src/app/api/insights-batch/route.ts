import { NextRequest, NextResponse } from "next/server";
import { PerplexityLocation } from "@/types/perplexity";
import { fetchPerplexityInsightsBatch } from "@/lib/perplexity";
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

    // Get location data for all playgrounds using batch reverse geocoding
    const coordinates = playgrounds.map((pg) => ({ lat: pg.lat, lon: pg.lon }));
    const geocodeResults = await batchReverseGeocode({ coordinates, signal });

    // Map geocode results back to playgrounds
    const locations = playgrounds
      .map((pg, index) => {
        const result = geocodeResults[index];
        if (!result || !result.data) {
          return null;
        }

        // Type cast the nominatim response
        const address = (result.data as { address?: Record<string, string> }).address;

        const location: PerplexityLocation = {
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

    if (locations.length === 0) {
      return NextResponse.json(
        { error: "Failed to fetch location data" },
        { status: 500 },
      );
    }

    // Fetch insights for all playgrounds with valid locations
    const results = await fetchPerplexityInsightsBatch({
      requests: locations,
      signal,
    });

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    return NextResponse.json({ results });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    console.error("Error in batch insights generation:", error);
    return NextResponse.json(
      { error: "Failed to generate batch insights" },
      { status: 500 },
    );
  }
}
