import { Playground } from "@/types/playground";
import { MapBounds } from "@/types/map";
import { OSMPlaceDetails } from "@/types/osm";

/**
 * Client-side function to fetch playgrounds from the API
 */
export async function fetchPlaygrounds(bounds: MapBounds): Promise<Playground[]> {
  try {
    const response = await fetch("/api/playgrounds/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bounds }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching playgrounds:", error);
    return [];
  }
}

/**
 * Client-side function to fetch playground details from the API
 */
export async function fetchPlaygroundDetails(
  playgrounds: Playground[]
): Promise<OSMPlaceDetails[]> {
  try {
    if (!playgrounds.length) return [];

    const response = await fetch("/api/playgrounds/details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playgrounds }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching playground details:", error);
    return [];
  }
}

/**
 * Client-side function to fetch a playground description from the API
 */
export async function fetchPlaygroundDescription(
  address: string
): Promise<string | null> {
  try {
    const response = await fetch("/api/playgrounds/description", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.description;
  } catch (error) {
    console.error("Error fetching playground description:", error);
    return null;
  }
}