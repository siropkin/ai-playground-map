export async function fetchGooglePlacesNearby({
  lat,
  lon,
  radius,
  type,
}: {
  lat: number;
  lon: number;
  radius: number;
  type: string;
}) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is not defined");
    }
    const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${radius}&type=${type}&key=${apiKey}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(
        `Google Maps API error: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error fetching Google nearby places:", error);
    return [];
  }
}

/**
 * Fetches the formatted address for a specific coordinate using Google Geocoding API
 */
export async function fetchGooglePlacesForCoordinates({
  lat,
  lon,
}: {
  lat: number;
  lon: number;
}) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is not defined");
    }
    const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(
        `Google Geocoding API error: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error fetching Google address for coordinates:", error);
    return [];
  }
}

export async function fetchGooglePlaceDetails({
  placeId,
  fields,
}: {
  placeId: string;
  fields: string[];
}) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is not defined");
    }
    const endpoint = `https://places.googleapis.com/v1/places/${placeId}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fields.join(","),
      },
    });
    if (!response.ok) {
      throw new Error(
        `Google Places API error: ${response.status} ${response.statusText}`,
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching Google place details:", error);
    return null;
  }
}

/**
 * Fetches street view photos for a specific coordinate using Google Street View API
 * Returns an array of photo references that can be used to construct image URLs
 */
export async function fetchGoogleStreetViewPhotos({
  lat,
  lon,
  heading = 0,
  fov = 90,
  pitch = 0,
}: {
  lat: number;
  lon: number;
  heading?: number;
  fov?: number;
  pitch?: number;
}) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is not defined");
    }

    // Check if Street View is available at this location
    const metadataEndpoint = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lon}&key=${apiKey}`;
    const metadataResponse = await fetch(metadataEndpoint);
    if (!metadataResponse.ok) {
      throw new Error(
        `Google Street View API error: ${metadataResponse.status} ${metadataResponse.statusText}`,
      );
    }

    const metadata = await metadataResponse.json();
    if (metadata.status !== "OK") {
      return [];
    }

    // Generate photo references for different headings to get a 360° view
    const headings = [0, 90, 180, 270]; // North, East, South, West

    return headings.map((heading) => ({
      photo_reference: `streetview_${lat}_${lon}_${heading}`,
      width: 600,
      height: 400,
      html_attributions: [],
      streetview_params: {
        location: `${lat},${lon}`,
        size: "600x400",
        heading,
        fov,
        pitch,
      },
    }));
  } catch (error) {
    console.error("Error fetching Google Street View photos:", error);
    return [];
  }
}
