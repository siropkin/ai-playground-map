import { Playground } from "@/types/playground";
import { MapBounds } from "@/types/map";
import { OSMPlaceDetails } from "@/types/osm";
import { PerplexityInsights } from "@/types/perplexity";

/**
 * Client-side function to fetch playgrounds from the API
 */
export async function fetchPlaygrounds(
  bounds: MapBounds,
  signal?: AbortSignal,
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
 * Client-side function to fetch playgrounds details from the API
 */
export async function fetchMultiplePlaygroundDetails(
  playgrounds: Playground[],
  signal?: AbortSignal,
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
 * Client-side function to generate a playground description from the API
 */
export async function generatePlaygroundAiInsights(
  address: string,
  signal?: AbortSignal,
): Promise<PerplexityInsights | null> {
  try {
    const response = await fetch("/api/playgrounds/ai-insights", {
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
    return data.insights;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.log("Generate playground AI insights request was aborted");
      return null;
    }
    console.error("Error generating playground AI insights:", error);
    return null;
  }
}
