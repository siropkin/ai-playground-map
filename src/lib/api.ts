import { Playground } from "@/types/playground";
import { MapBounds } from "@/types/map";
import { OSMPlaceDetails } from "@/types/osm";

/**
 * Client-side function to fetch playgrounds from the API
 */
export async function fetchPlaygrounds(
  bounds: MapBounds,
  signal?: AbortSignal
): Promise<Playground[]> {
  try {
    const response = await fetch("/api/playgrounds/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bounds }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.log("Fetch playgrounds request was aborted");
      return [];
    }
    console.error("Error fetching playgrounds:", error);
    return [];
  }
}

/**
 * Client-side function to fetch playground details from the API
 */
export async function fetchPlaygroundDetails(
  playgrounds: Playground[],
  signal?: AbortSignal
): Promise<OSMPlaceDetails[]> {
  try {
    if (!playgrounds.length) return [];

    const response = await fetch("/api/playgrounds/details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playgrounds }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.log("Fetch playground details request was aborted");
      return [];
    }
    console.error("Error fetching playground details:", error);
    return [];
  }
}

/**
 * Client-side function to fetch a playground description from the API
 */
export async function fetchPlaygroundDescription(
  address: string,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const response = await fetch("/api/playgrounds/description", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.description;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.log("Fetch playground description request was aborted");
      return null;
    }
    console.error("Error fetching playground description:", error);
    return null;
  }
}