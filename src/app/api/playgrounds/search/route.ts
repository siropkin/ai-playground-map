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
      !bounds ||
      !bounds.north ||
      !bounds.south ||
      !bounds.east ||
      !bounds.west
    ) {
      return NextResponse.json(
        { error: "Invalid map bounds provided" },
        { status: 400 },
      );
    }

    const osmPlaygrounds = await runOSMQuery({
      bounds,
      leisure: "playground",
      timeout: 5,
      limit: 10,
      signal,
    });

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    if (osmPlaygrounds.length === 0) {
      return NextResponse.json([]);
    }

    const playgrounds: Playground[] = osmPlaygrounds
      .map((playground) => ({
        id: playground.id,
        name: playground.tags?.name || null,
        description: playground.tags?.description || null,
        lat:
          playground.type === "node" ? playground.lat : playground.center?.lat,
        lon:
          playground.type === "node" ? playground.lon : playground.center?.lon,
        features: null,
        parking: null,
        sources: null,
        address: null,
        images: null,
        osmId: playground.id,
        osmType: playground.type,
        osmTags: playground.tags,
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
