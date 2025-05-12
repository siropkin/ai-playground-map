import { NextRequest, NextResponse } from "next/server";

import { MapBounds } from "@/types/playground";
import { getOSMPlaygrounds } from "@/lib/osm";

// Get playgrounds for boundaries
export async function GET(req: NextRequest) {
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
    const osmPlaygrounds = await getOSMPlaygrounds({
      bounds,
      timeout: 5,
      limit: 25,
    });

    if (osmPlaygrounds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Process playgrounds - extract only basic data from OSM
    const results = [];

    for (const playground of osmPlaygrounds) {
      // Extract coordinates from the playground data
      let lat: number | undefined;
      let lon: number | undefined;

      if (playground.type === "node" && playground.lat && playground.lon) {
        // Node type has direct lat/lon
        lat = playground.lat;
        lon = playground.lon;
      } else if (playground.geometry && playground.geometry.length > 0) {
        // Way or relation type has geometry array
        // Calculate centroid from all geometry points
        const points = playground.geometry;
        const sumLat = points.reduce(
          (sum: number, point: any) => sum + point.lat,
          0,
        );
        const sumLon = points.reduce(
          (sum: number, point: any) => sum + point.lon,
          0,
        );
        lat = sumLat / points.length;
        lon = sumLon / points.length;
      } else if (playground.bounds) {
        // Fallback to center of bounds
        lat = (playground.bounds.minlat + playground.bounds.maxlat) / 2;
        lon = (playground.bounds.minlon + playground.bounds.maxlon) / 2;
      }

      if (!lat || !lon) {
        continue;
      }

      // Add basic playground data from OSM
      results.push({
        id: playground.id,
        osmId: playground.id,
        name: playground.tags?.name || "Playground",
        description: playground.tags?.description || null,
        lat,
        lon,
        address: null,
        osmTags: playground.tags || {},
        enriched: false,
      });
    }

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
