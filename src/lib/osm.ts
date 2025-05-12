import { MapBounds } from "@/types/playground";

// Function to fetch playgrounds from Overpass API
// https://wiki.openstreetmap.org/wiki/Key:playground
export async function getOSMPlaygrounds({
  bounds,
  timeout,
  limit,
}: {
  bounds: MapBounds;
  timeout: number;
  limit: number;
}) {
  try {
    const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
    const query = `
      [out:json][timeout:${timeout}];
      nwr["leisure"="playground"](${box});
      out geom ${limit};
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
