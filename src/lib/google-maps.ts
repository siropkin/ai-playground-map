import { GoogleMapsPlaceDetails } from "@/types/google-maps";
import {
  fetchGoogleMapsPlaceDetailsFromCache,
  saveGoogleMapsPlaceDetailsToCache,
} from "@/lib/cache";

// Helper function to calculate Haversine distance between two points
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

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
    "places.location",
    "places.types",
    "places.photos",
    "places.rating",
    "places.userRatingCount",
    "places.businessStatus",
    "places.websiteUri",
    "places.reviews",
    "places.generativeSummary",
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
    } catch {
      // ignore
    }
    throw new Error(
      `Google Maps API error: ${nearbyResponse.status} ${nearbyResponse.statusText}. Body: ${errorBody}`,
    );
  }

  const responseData = await nearbyResponse.json();

  if (responseData.places && responseData.places.length > 0) {
    const place = responseData.places[0];

    // Check if location data is available for the found place
    if (
      place.location &&
      typeof place.location.latitude === "number" &&
      typeof place.location.longitude === "number"
    ) {
      const distance = calculateHaversineDistance(
        lat,
        lon,
        place.location.latitude,
        place.location.longitude,
      );

      // Check if the place is within the specified radius
      if (distance <= radius) {
        return place as GoogleMapsPlaceDetails;
      } else {
        console.debug(
          `Found playground '${
            place.displayName?.text || place.id
          }' but it is ${distance.toFixed(
            0,
          )}m away (search radius was ${radius}m). Discarding as too far.`,
        );
      }
    } else {
      console.debug(
        `Found playground '${
          place.displayName?.text || place.id
        }' but it's missing valid location data. Discarding.`,
      );
    }
  } else {
    console.debug(
      "Google Maps Nearby Search (New) did not yield a suitable playground within the specified criteria.",
    );
  }

  const geocodeResponse = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`,
    { signal },
  );

  if (signal?.aborted) {
    return null;
  }

  if (!geocodeResponse.ok) {
    throw new Error(
      `Google Maps API error (geocode fallback): ${geocodeResponse.status} ${geocodeResponse.statusText}`,
    );
  }

  const data = await geocodeResponse.json();

  if (data.status !== "OK" || !data.results || data.results.length === 0) {
    console.error(
      "Google Maps API (geocode fallback) returned no results or an error:",
      data.status,
      data.error_message,
    );
    return null;
  }

  return {
    id: data.results[0].place_id,
    formattedAddress: data.results[0].formatted_address,
  } as GoogleMapsPlaceDetails;
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

  // If freshDetails now includes 'location', it will be cached.
  // Ensure GoogleMapsPlaceDetails type and cache handling are okay with this.
  await saveGoogleMapsPlaceDetailsToCache({ lat, lon, details: freshDetails });

  return freshDetails;
}
