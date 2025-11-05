import { NextRequest, NextResponse } from "next/server";
import { PerplexityLocation } from "@/types/perplexity";
import { fetchPerplexityInsightsBatch } from "@/lib/perplexity";

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

    // First, get location data for all playgrounds in parallel
    const locationPromises = playgrounds.map(async (pg) => {
      try {
        const response = await fetch(
          `${request.nextUrl.origin}/api/osm-location`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-app-origin": "internal",
            },
            body: JSON.stringify({ lat: pg.lat, lon: pg.lon }),
            signal,
          },
        );

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        return {
          playgroundId: pg.id,
          location: data.location as PerplexityLocation,
          name: pg.name,
          osmId: pg.osmId,
        };
      } catch (error) {
        console.error(`Error fetching location for playground ${pg.id}:`, error);
        return null;
      }
    });

    const locations = (await Promise.all(locationPromises)).filter(
      (loc): loc is NonNullable<typeof loc> => loc !== null,
    );

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
