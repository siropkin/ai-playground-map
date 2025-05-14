import { GoogleMapsPlaceDetails } from "@/types/google-maps";
import {
  getMultipleGoogleMapsPlaceDetailsFromCache,
  saveMultipleGoogleMapsPlaceDetailsToCache,
} from "@/lib/cache";

// Function to get address from Google Maps API using reverse geocoding
export async function getGoogleMapsReverseGeocoding({
  lat,
  lon,
  signal,
}: {
  lat: number;
  lon: number;
  signal?: AbortSignal;
}): Promise<GoogleMapsPlaceDetails | null> {
  if (signal?.aborted) {
    return null;
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("Google Maps API key is missing");
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`,
    { signal },
  );

  if (!response.ok) {
    throw new Error(
      `Google Maps API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    console.error("Google Maps API returned no results:", data);
    return null;
  }

  return data.results[0];
}

// Function to get multiple place details from Google Maps
export async function getMultipleGoogleMapsPlaceDetails({
  items,
  signal,
}: {
  items: { id: number; type: string; lat: number; lon: number }[];
  signal?: AbortSignal;
}): Promise<GoogleMapsPlaceDetails[]> {
  if (signal?.aborted) {
    return [];
  }

  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  // Try to get cached details first
  const { cachedDetails, uncachedItems } =
    await getMultipleGoogleMapsPlaceDetailsFromCache(items);

  let fetchedDetails: GoogleMapsPlaceDetails[] = [];
  if (uncachedItems.length > 0 && !signal?.aborted) {
    // Fetch details for uncached items
    const promises = uncachedItems.map(
      async (item: { id: number; type: string; lat: number; lon: number }) => {
        const googleDetails = await getGoogleMapsReverseGeocoding({
          lat: item.lat,
          lon: item.lon,
          signal,
        });

        if (!googleDetails) return null;

        // Add OSM ID and type to the Google Maps details
        googleDetails.osm_id = item.id;
        googleDetails.osm_type = item.type;

        // Save to cache
        await saveMultipleGoogleMapsPlaceDetailsToCache([googleDetails]);

        return googleDetails;
      },
    );

    const results = await Promise.all(promises);
    fetchedDetails = results.filter(
      (result: unknown): result is GoogleMapsPlaceDetails => result !== null,
    );
  }

  return [...cachedDetails, ...fetchedDetails];
}
