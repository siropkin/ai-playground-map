export async function fetchGooglePlacesNearby({
  latitude,
  longitude,
  radius,
  type,
}: {
  latitude: number;
  longitude: number;
  radius: number;
  type: string;
}) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Google API key is not defined");
    }
    const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${apiKey}`;
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

export async function resolveGooglePlacePhotoReferences({
  photoReference,
  maxWidth,
}: {
  photoReference: string;
  maxWidth: number;
}) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key is not defined");
    }
    const endpoint = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "HEAD",
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(
        `Google Maps API error: ${response.status} ${response.statusText}`,
      );
    }
    return response.url;
  } catch (error) {
    console.error("Error resolving Google place photo references:", error);
    return null;
  }
}
