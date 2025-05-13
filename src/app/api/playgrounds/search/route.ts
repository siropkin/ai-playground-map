import { NextRequest, NextResponse } from "next/server";
import { runOSMQuery } from "@/lib/osm";
import { MapBounds } from "@/types/map";
import { Playground } from "@/types/playground";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bounds } = body as { bounds: MapBounds };

    if (!bounds || !bounds.north || !bounds.south || !bounds.east || !bounds.west) {
      return NextResponse.json(
        { error: "Invalid map bounds provided" },
        { status: 400 }
      );
    }

    // Fetch OSM playgrounds
    const osmPlaygrounds = await runOSMQuery({
      bounds,
      type: "playground",
      timeout: 5,
      limit: 25,
    });

    if (osmPlaygrounds.length === 0) {
      return NextResponse.json([]);
    }

    // Process playgrounds - extract only basic data from OSM
    const playgrounds: Playground[] = osmPlaygrounds.map((playground) => ({
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

    return NextResponse.json(playgrounds);
  } catch (error) {
    console.error("Error fetching playgrounds from OSM:", error);
    return NextResponse.json(
      { error: "Failed to fetch playgrounds" },
      { status: 500 }
    );
  }
}