import { NextRequest, NextResponse } from "next/server";

import { MapBounds } from "@/types/map";
import { Playground } from "@/types/playground";
import { runOSMQuery } from "@/lib/osm";

// Get playgrounds for boundaries
export async function GET(
  req: NextRequest,
): Promise<
  NextResponse<{ results: Playground[] }> | NextResponse<{ error: string }>
> {
  try {
    // Extract map bounds from URL parameters
    const url = new URL(req.url);
    const south = parseFloat(url.searchParams.get("south") || "0");
    const north = parseFloat(url.searchParams.get("north") || "0");
    const west = parseFloat(url.searchParams.get("west") || "0");
    const east = parseFloat(url.searchParams.get("east") || "0");

    // Validate bounds
    if (isNaN(south) || isNaN(north) || isNaN(west) || isNaN(east)) {
      return NextResponse.json(
        { error: "Invalid map bounds parameters" },
        { status: 400 },
      );
    }

    if (
      south < -90 ||
      north > 90 ||
      west < -180 ||
      east > 180 ||
      south >= north ||
      west >= east
    ) {
      return NextResponse.json(
        { error: "Invalid map bounds values" },
        { status: 400 },
      );
    }

    const bounds: MapBounds = { south, north, west, east };

    // Fetch OSM playgrounds
    const osmPlaygrounds = await runOSMQuery({
      bounds,
      type: "playground",
      timeout: 5,
      limit: 25,
    });

    if (osmPlaygrounds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Process playgrounds - extract only basic data from OSM
    const results = osmPlaygrounds.map((playground) => ({
      id: playground.id,
      name: playground.tags?.name || null,
      description: playground.tags?.description || null,
      lat: playground.type === "node" ? playground.lat : playground.center?.lat,
      lon: playground.type === "node" ? playground.lon : playground.center?.lon,
      address: null,
      osmId: playground.id,
      osmType: playground.type,
      osmTags: playground.tags,
      enriched: false,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error(
      "Error in playground get API:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
