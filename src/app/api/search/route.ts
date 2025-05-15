import { NextRequest, NextResponse } from "next/server";

import { MapBounds } from "@/types/map";
import { runOSMQuery } from "@/lib/osm";
import { Playground } from "@/types/playground";

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
      bounds?.west == null
    ) {
      return NextResponse.json(
        { error: "Invalid map bounds provided" },
        { status: 400 },
      );
    }

    const osmResults = await runOSMQuery({
      bounds,
      leisure: "playground",
      timeout: 5,
      limit: 10,
      signal,
    });

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    if (osmResults.length === 0) {
      return NextResponse.json([]);
    }

    const playgrounds: Playground[] = osmResults
      .map((item) => ({
        id: item.id,
        name: item.tags?.name || null,
        description: item.tags?.description || null,
        lat: item.type === "node" ? item.lat : item.center?.lat,
        lon: item.type === "node" ? item.lon : item.center?.lon,
        features: null,
        parking: null,
        sources: null,
        address: null,
        images: null,
        osmId: item.id,
        osmType: item.type,
        osmTags: item.tags,
        enriched: false,
      }))
      .filter((playground) => playground.lat && playground.lon);

    return NextResponse.json(playgrounds);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    console.error("Error fetching playgrounds from OSM:", error);
    return NextResponse.json(
      { error: "Failed to fetch playgrounds" },
      { status: 500 },
    );
  }
}
