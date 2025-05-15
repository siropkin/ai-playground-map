import { Playground } from "@/types/playground";
import { MapBounds } from "@/types/map";
import { PerplexityInsights } from "@/types/perplexity";
import { GoogleMapsPlaceDetails } from "@/types/google-maps";

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
 * Client-side function to fetch playgrounds details from the API
 */
export async function fetchPlaygroundDetails(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<GoogleMapsPlaceDetails | null> {
  try {
    const response = await fetch("/api/details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lat, lon }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.details;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }
    console.error("Error fetching playground details:", error);
    return null;
  }
}

/**
 * Client-side function to generate a playground description from the API
 */
export async function generatePlaygroundAiInsights({
  address,
  lat,
  lon,
  signal,
}: {
  address: string;
  lat?: number;
  lon?: number;
  signal?: AbortSignal;
}): Promise<PerplexityInsights | null> {
  try {
    const response = await fetch("/api/insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address, lat, lon }),
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
