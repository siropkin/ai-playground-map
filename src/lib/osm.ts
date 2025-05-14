import { OSMPlaceDetails, OSMQueryResponse } from "@/types/osm";
import { MapBounds } from "@/types/map";
import {
  getMultipleOSMPlaceDetailsFromCache,
  saveMultipleOSMPlaceDetailsToCache,
} from "@/lib/cache";
import { getOSMKey } from "@/lib/utils";

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

// Function to get multiple places details from OSM
export async function getMultipleOSMPlaceDetails({
  items,
  signal,
}: {
  items: { id: number; type: string }[];
  signal?: AbortSignal;
}): Promise<OSMPlaceDetails[]> {
  if (signal?.aborted) {
    return [];
  }

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const { cachedDetails, uncachedItems } =
    await getMultipleOSMPlaceDetailsFromCache(items);

  let fetchedDetails: OSMPlaceDetails[] = [];
  if (uncachedItems.length > 0 && !signal?.aborted) {
    const osmIds = uncachedItems
      .map((item) => getOSMKey(item.id, item.type))
      .join(",");

    const response = await fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=${osmIds}&addressdetails=1&format=json`,
      { signal },
    );

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`,
      );
    }

    fetchedDetails = await response.json();

    if (fetchedDetails.length > 0) {
      await saveMultipleOSMPlaceDetailsToCache(fetchedDetails);
    }
  }

  return [...cachedDetails, ...fetchedDetails];
}
