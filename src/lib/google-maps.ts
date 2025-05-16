import { GoogleMapsPlaceDetails } from "@/types/google-maps";
import {
  fetchGoogleMapsPlaceDetailsFromCache,
  saveGoogleMapsPlaceDetailsToCache,
} from "@/lib/cache";

// Function to fetch playground details from Google Maps API using Places API
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

  const radius = parseInt(process.env.GOOGLE_MAPS_NEARBYSEARCH_RADIUS || "50");
  const nearbySearchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius}&type=playground&key=${apiKey}`;
  const nearbyResponse = await fetch(nearbySearchUrl, { signal });

  if (!nearbyResponse.ok) {
    throw new Error(
      `Google Maps API error: ${nearbyResponse.status} ${nearbyResponse.statusText}`,
    );
  }

  const nearbyData = await nearbyResponse.json();

  if (
    nearbyData.status !== "OK" ||
    !nearbyData.results ||
    nearbyData.results.length === 0
  ) {
    // Fallback to geocoding if no playgrounds found
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;
    const geocodeResponse = await fetch(geocodeUrl, { signal });

    if (!geocodeResponse.ok) {
      throw new Error(
        `Google Maps API error: ${geocodeResponse.status} ${geocodeResponse.statusText}`,
      );
    }

    const geocodeData = await geocodeResponse.json();

    if (
      geocodeData.status !== "OK" ||
      !geocodeData.results ||
      geocodeData.results.length === 0
    ) {
      console.error("Google Maps API returned no results:", geocodeData);
      return null;
    }

    return geocodeData.results[0];
  } else {
    return nearbyData.results[0];
  }
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
