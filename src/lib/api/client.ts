import { Playground } from "@/types/playground";
import { MapBounds } from "@/types/map";
import { AIInsights, AILocation } from "@/types/ai-insights";
import { PlaygroundImage } from "@/lib/images";

/**
 * Client-side function to search for playgrounds in the API
 */
export async function searchPlaygrounds(
  bounds: MapBounds,
  signal?: AbortSignal,
): Promise<Playground[]> {
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-origin": "internal",
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
      return [];
    }
    console.error("[API Client] ❌ Error fetching playgrounds:", error);
    return [];
  }
}

/**
 * Client-side function to get structured location data from coordinates
 */
export async function fetchLocationData(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<AILocation | null> {
  try {
    const response = await fetch("/api/osm-location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-origin": "internal",
      },
      body: JSON.stringify({ lat, lon }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.location;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    console.error("[API Client] ❌ Error fetching location data:", error);
    return null;
  }
}

/**
 * Client-side function to generate a playground description from the API
 */
export async function generatePlaygroundAiInsights({
  location,
  name,
  osmId,
  signal,
}: {
  location?: AILocation;
  name?: string;
  osmId?: string;
  signal?: AbortSignal;
}): Promise<AIInsights | null> {
  try {
    const response = await fetch("/api/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-origin": "internal",
      },
      body: JSON.stringify({ location, name, osmId }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.insights;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    console.error("[API Client] ❌ Error generating playground AI insights:", error);
    return null;
  }
}

/**
 * Client-side function to enrich multiple playgrounds in a single batch request
 * NOTE: This does NOT fetch images - use src/lib/images.ts instead
 */
export async function generatePlaygroundAiInsightsBatch({
  playgrounds,
  signal,
}: {
  playgrounds: Array<{
    id: number;
    lat: number;
    lon: number;
    name?: string;
    osmId?: string;
  }>;
  signal?: AbortSignal;
}): Promise<
  Array<{
    playgroundId: number;
    insights: AIInsights | null;
  }>
> {
  try {
    const response = await fetch("/api/insights-batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-origin": "internal",
      },
      body: JSON.stringify({ playgrounds }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return [];
    }
    console.error("[API Client] ❌ Error generating batch playground AI insights:", error);
    return [];
  }
}

/**
 * Client-side function to fetch playground images
 */
export async function fetchPlaygroundImages({
  playgroundName,
  city,
  region,
  country,
  osmId,
  signal,
}: {
  playgroundName: string;
  city?: string;
  region?: string;
  country?: string;
  osmId?: string;
  signal?: AbortSignal;
}): Promise<PlaygroundImage[] | null> {
  try {
    const response = await fetch("/api/images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-origin": "internal",
      },
      body: JSON.stringify({ playgroundName, city, region, country, osmId }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.images || null;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    console.error("[API Client] ❌ Error fetching playground images:", error);
    return null;
  }
}
