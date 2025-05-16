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
  const nearbySearchUrl = `https://places.googleapis.com/v1/places:searchNearby`;

  const fieldMask = [
    "places.id",
    "places.name",
    "places.displayName",
    "places.formattedAddress",
    "places.types",
    "places.photos",
    "places.rating",
    "places.userRatingCount",
    "places.businessStatus",
    "places.websiteUri",
    "places.reviews",
    "places.generativeSummary",
    "places.reviewSummary",
  ].join(",");

  const requestBody = {
    includedTypes: ["playground"],
    maxResultCount: 1,
    locationRestriction: {
      circle: {
        center: {
          latitude: lat,
          longitude: lon,
        },
        radius: radius,
      },
    },
  };

  const nearbyResponse = await fetch(nearbySearchUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (signal?.aborted) {
    return null;
  }

  if (!nearbyResponse.ok) {
    let errorBody = "";
    try {
      errorBody = await nearbyResponse.text();
    } catch (e) {
      // ignore
    }
    throw new Error(
      `Google Maps API error: ${nearbyResponse.status} ${nearbyResponse.statusText}. Body: ${errorBody}`,
    );
  }

  const responseData = await nearbyResponse.json();

  if (responseData.places && responseData.places.length > 0) {
    return responseData.places[0] as GoogleMapsPlaceDetails;
  } else {
    console.error(
      "Google Maps Nearby Search (New) returned no places or unexpected data",
    );
  }

  const geocodeResponse = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`,
    { signal },
  );

  if (!geocodeResponse.ok) {
    throw new Error(
      `Google Maps API error: ${geocodeResponse.status} ${geocodeResponse.statusText}`,
    );
  }

  const data = await geocodeResponse.json();

  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    console.error("Google Maps API returned no results:", data);
    return null;
  }

  return {
    id: data.results[0].place_id,
    formattedAddress: data.results[0].formatted_address,
  };
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
