import { OSMPlaceDetails, OSMQueryResults } from "@/types/osm";
import { MapBounds } from "@/types/map";

// Function run OSM query via Overpass API
export async function runOSMQuery({
  bounds,
  leisure,
  timeout,
  limit,
  signal,
}: {
  bounds: MapBounds;
  leisure: string;
  timeout: number;
  limit: number;
  signal?: AbortSignal;
}): Promise<OSMQueryResults[]> {
  if (signal?.aborted) {
    return [];
  }

  const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const query = `
    [out:json][timeout:${timeout}];
    nwr["leisure"="${leisure}"](${box});
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

  return data.elements;
}

// Function to fetch multiple places details from OSM
export async function fetchMultipleOSMPlaceDetails({
  osmIds,
  signal,
}: {
  osmIds: string[];
  signal?: AbortSignal;
}): Promise<OSMPlaceDetails[]> {
  if (signal?.aborted) {
    return [];
  }

  if (!Array.isArray(osmIds) || osmIds.length === 0) {
    return [];
  }

  const response = await fetch(
    `https://nominatim.openstreetmap.org/lookup?osm_ids=${osmIds}&addressdetails=1&format=json`,
    {
      signal,
      headers: {
        "User-Agent": "GoodPlaygroundMap/1.0 (ivan.seredkin@gmail.com)",
        Referer: "https://www.goodplaygroundmap.com/",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Nominatim API error: ${response.status} ${response.statusText}`,
    );
  }

  return await response.json();
}
