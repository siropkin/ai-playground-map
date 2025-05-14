import { OSMPlaceDetails, OSMQueryData } from "@/types/osm";
import { MapBounds } from "@/types/map";
import {
  getMultipleOSMDetailsFromCache,
  saveMultipleOSMDetailsToCache,
} from "@/lib/cache";

// Function to fetch playgrounds from Overpass API
// https://wiki.openstreetmap.org/wiki/Key:playground
export async function runOSMQuery({
  bounds,
  type,
  timeout,
  limit,
  signal,
}: {
  bounds: MapBounds;
  type: string;
  timeout: number;
  limit: number;
  signal?: AbortSignal;
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
      signal,
    });

    if (!response.ok) {
      throw new Error(
        `Overpass API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return data.elements || [];
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.log("OSM query was aborted");
      return [];
    }

    console.error(
      "Error fetching OSM data:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

export async function fetchOSMPlacesDetails({
  items,
  signal,
}: {
  items: { id: string; type: string }[];
  signal?: AbortSignal;
}): Promise<OSMPlaceDetails[]> {
  try {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    // Check if request was aborted
    if (signal?.aborted) {
      return [];
    }

    // Map OSM types to Nominatim types
    const typeMap: Record<string, string> = {
      node: "N",
      way: "W",
      relation: "R",
    };

    // Get cached items from Supabase
    const { cachedDetails, uncachedItems } =
      await getMultipleOSMDetailsFromCache(items);

    let fetchedDetails: OSMPlaceDetails[] = [];
    if (uncachedItems.length > 0 && !signal?.aborted) {
      // Build osm_ids param: e.g. N123,W456,R789
      const osmIds = uncachedItems
        .map((item) => `${typeMap[item.type] || "N"}${item.id}`)
        .join(",");

      const endpoint = `https://nominatim.openstreetmap.org/lookup?osm_ids=${osmIds}&addressdetails=1&format=json`;

      const response = await fetch(endpoint, { signal });

      if (!response.ok) {
        throw new Error(
          `Nominatim API error: ${response.status} ${response.statusText}`,
        );
      }

      fetchedDetails = await response.json();

      // Save fetched details to Supabase cache
      if (fetchedDetails.length > 0) {
        await saveMultipleOSMDetailsToCache(fetchedDetails);
      }
    }

    return [...cachedDetails, ...fetchedDetails];
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.log("OSM details fetch was aborted");
      return [];
    }

    console.error("Error fetching OSM details for ids:", error);
    return [];
  }
}
