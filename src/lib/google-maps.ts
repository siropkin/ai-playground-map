import { GoogleMapsPlaceDetails } from "@/types/google-maps";
import {
  fetchGoogleMapsPlaceDetailsFromCache,
  saveGoogleMapsPlaceDetailsToCache,
} from "@/lib/cache";

// Function to fetch address from Google Maps API using reverse geocoding
export async function fetchGoogleMapsDetails({
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

// Function to fetch address from Google Maps API with caching
export async function fetchGoogleMapsDetailsWithCache({
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

  const cachedDetails = await fetchGoogleMapsPlaceDetailsFromCache({
    lat,
    lon,
  });
  if (cachedDetails) {
    return cachedDetails;
  }

  const freshDetails = await fetchGoogleMapsDetails({ lat, lon, signal });

  if (signal?.aborted || !freshDetails) {
    return null;
  }

  await saveGoogleMapsPlaceDetailsToCache({ lat, lon, details: freshDetails });

  return freshDetails;
}
