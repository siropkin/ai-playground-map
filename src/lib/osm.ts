import { OSMPlaceDetails, OSMQueryData } from "@/types/osm";
import { MapBounds } from "@/types/map";

// Function to fetch playgrounds from Overpass API
// https://wiki.openstreetmap.org/wiki/Key:playground
export async function runOSMQuery({
  bounds,
  type,
  timeout,
  limit,
}: {
  bounds: MapBounds;
  type: string;
  timeout: number;
  limit: number;
}): Promise<OSMQueryData[]> {
  try {
    const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

    const query = `
      [out:json][timeout:${timeout}];
      nwr["leisure"="${type}"](${box});
      out body center ${limit};
    `;

    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(
        `Overpass API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return data.elements || [];
  } catch (error) {
    console.error(
      "Error fetching OSM data:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

export async function fetchOSMPlacesDetails({
  items,
}: {
  items: { id: string; type: string }[];
}): Promise<OSMPlaceDetails[]> {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    // Map OSM types to Nominatim types
    const typeMap: Record<string, string> = {
      node: "N",
      way: "W",
      relation: "R",
    };

    // Build osm_ids param: e.g. N123,W456,R789
    const osmIds = items
      .map((item) => `${typeMap[item.type] || "N"}${item.id}`)
      .join(",");

    const endpoint = `https://nominatim.openstreetmap.org/lookup?osm_ids=${osmIds}&addressdetails=1&format=json`;

    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching OSM details for ids:", error);
    return [];
  }
}
