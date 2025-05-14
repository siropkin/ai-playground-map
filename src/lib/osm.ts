import { OSMQueryResponse } from "@/types/osm";
import { MapBounds } from "@/types/map";

// Function run OSM query via Overpass API
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
}): Promise<OSMQueryResponse[]> {
  if (signal?.aborted) {
    return [];
  }

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

  return data.elements;
}
