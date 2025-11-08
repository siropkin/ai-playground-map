import { Playground } from "@/types/playground";
import { runOSMQuery } from "@/lib/osm";

/**
 * Fetches nearby playgrounds within a specified radius (in km) from a center point
 * Uses OSM Overpass API to query playgrounds
 */
export async function fetchNearbyPlaygrounds({
  lat,
  lon,
  radiusKm = 2,
  limit = 10,
  excludeOsmId,
}: {
  lat: number;
  lon: number;
  radiusKm?: number;
  limit?: number;
  excludeOsmId?: number;
}): Promise<Playground[]> {
  try {
    // Calculate approximate bounding box
    // 1 degree latitude ≈ 111km
    // 1 degree longitude ≈ 111km * cos(latitude)
    const latDelta = radiusKm / 111;
    const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const bounds = {
      north: lat + latDelta,
      south: lat - latDelta,
      east: lon + lonDelta,
      west: lon - lonDelta,
      zoom: 14, // Not used for this query but required by the type
    };

    const osmResults = await runOSMQuery({
      bounds,
      leisure: "playground",
      timeout: 10,
      limit: limit + 1, // Fetch one extra in case we need to exclude current
    });

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
      .filter(
        (playground) =>
          playground.lat &&
          playground.lon &&
          playground.osmId !== excludeOsmId, // Exclude the current playground
      )
      .slice(0, limit); // Ensure we don't exceed limit after filtering

    return playgrounds;
  } catch (error) {
    console.error("Error fetching nearby playgrounds:", error);
    return [];
  }
}
