import { Playground } from "@/types/playground";
import { MapBounds } from "@/types/map";
import { PerplexityInsights, PerplexityLocation } from "@/types/perplexity";

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
    console.error("Error fetching playgrounds:", error);
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
): Promise<PerplexityLocation | null> {
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
    console.error("Error fetching location data:", error);
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
  location: PerplexityLocation;
  name?: string;
  osmId?: string;
  signal?: AbortSignal;
}): Promise<PerplexityInsights | null> {
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
    console.error("Error generating playground AI insights:", error);
    return null;
  }
}

/**
 * Client-side function to enrich multiple playgrounds in a single batch request
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
    insights: PerplexityInsights | null;
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
    console.error("Error generating batch playground AI insights:", error);
    return [];
  }
}
