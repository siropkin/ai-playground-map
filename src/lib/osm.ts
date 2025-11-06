import { OSMPlaceDetails, OSMQueryResults } from "@/types/osm";
import { MapBounds } from "@/types/map";

// Multiple Overpass API endpoints for redundancy
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// Overpass API configuration
const OVERPASS_MAX_SIZE_BYTES = 536870912; // 512MB - prevents memory issues on Overpass servers

// Helper function for retry logic with exponential backoff
async function fetchWithRetry(
  fetchFn: () => Promise<Response>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchFn();

      // If response is OK or it's a client error (4xx), don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error (5xx) - retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    // Don't wait after the last attempt
    if (attempt < maxRetries - 1) {
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

// Function run OSM query via Overpass API with retry and fallback
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

  // Optimized Overpass QL query following best practices:
  // 1. Explicit timeout (reasonable for small area queries)
  // 2. Maxsize parameter to prevent memory issues
  // 3. Efficient query structure with minimal data output
  const query = `
    [out:json][timeout:${Math.min(timeout, 25)}][maxsize:${OVERPASS_MAX_SIZE_BYTES}];
    (
      node["leisure"="${leisure}"](${box});
      way["leisure"="${leisure}"](${box});
      relation["leisure"="${leisure}"](${box});
    );
    out center ${limit};
  `.trim();

  // Try each endpoint in sequence until one succeeds
  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) {
      return [];
    }

    try {
      const response = await fetchWithRetry(
        () => fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "GoodPlaygroundMap/1.0 (ivan.seredkin@gmail.com)",
          },
          body: `data=${encodeURIComponent(query)}`,
          signal,
        }),
        2, // 2 retries per endpoint
        1000,
      );

      if (!response.ok) {
        // Check for rate limiting
        if (response.status === 429 || response.status === 504) {
          const errorMsg = response.status === 429
            ? "Rate limited"
            : "Gateway timeout";
          throw new Error(`Overpass API ${errorMsg}: ${response.statusText}`);
        }
        throw new Error(
          `Overpass API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Handle Overpass API error responses that return 200 but contain errors
      if (data.remark && data.remark.includes("runtime error")) {
        throw new Error(`Overpass API runtime error: ${data.remark}`);
      }

      return data.elements || [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Overpass endpoint ${endpoint} failed:`, lastError.message);
      // Continue to next endpoint
    }
  }

  // All endpoints failed
  throw new Error(
    `All Overpass API endpoints failed. Last error: ${lastError?.message || "Unknown error"}. Try reducing the map area or waiting a moment before retrying.`,
  );
}

// Function to fetch multiple places details from OSM with retry logic
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

  try {
    const response = await fetchWithRetry(
      () => fetch(
        `https://nominatim.openstreetmap.org/lookup?osm_ids=${osmIds}&addressdetails=1&format=json`,
        {
          signal,
          headers: {
            "User-Agent": "GoodPlaygroundMap/1.0 (ivan.seredkin@gmail.com)",
            Referer: "https://www.goodplaygroundmap.com/",
          },
        },
      ),
      3, // 3 retries for Nominatim
      1000,
    );

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Nominatim API failed after retries:", error);
    throw error;
  }
}

// Function to batch reverse geocode multiple coordinates
export async function batchReverseGeocode({
  coordinates,
  signal,
}: {
  coordinates: Array<{ lat: number; lon: number }>;
  signal?: AbortSignal;
}): Promise<Array<{ lat: number; lon: number; data: Record<string, unknown> } | null>> {
  if (signal?.aborted) {
    return [];
  }

  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  // Use Promise.all with rate limiting via nominatimLimiter
  // Import nominatimLimiter at top of file if needed
  const results = await Promise.all(
    coordinates.map(async ({ lat, lon }) => {
      try {
        const response = await fetchWithRetry(
          () =>
            fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
              {
                signal,
                headers: {
                  "User-Agent": "GoodPlaygroundMap/1.0 (ivan.seredkin@gmail.com)",
                  Referer: "https://www.goodplaygroundmap.com/",
                },
              }
            ),
          3, // 3 retries
          1000
        );

        if (!response.ok) {
          throw new Error(
            `Nominatim API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        return { lat, lon, data };
      } catch (error) {
        console.error(`Reverse geocoding failed for ${lat},${lon}:`, error);
        return null;
      }
    })
  );

  return results;
}
