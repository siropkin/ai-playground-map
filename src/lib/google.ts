export async function getGooglePlacesNearby(
  location: { lat: number; lng: number },
  radius: number = 10,
  type: string = "playground",
) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key is not defined");
    }
    const endpoint = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=${radius}&type=${type}&key=${apiKey}`;
    const response = await fetch(endpoint);
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error fetching Google places nearby:", error);
    return [];
  }
}

export async function getGooglePlaceDetails(
  placeId: string,
  fields: string[] = ["*"],
) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key is not defined");
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
    return await response.json();
  } catch (error) {
    console.error("Error fetching Google place details:", error);
    return null;
  }
}

export async function resolveGooglePlacePhotoReferences(
  photo_reference: string,
  maxWidth: number = 400,
) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error("Google Maps API key is not defined");
    }
    const endpoint = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photo_reference}&key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: "HEAD",
      redirect: "follow",
    });
    return response.url;
  } catch (error) {
    console.error("Error resolving Google place photo references:", error);
    return null;
  }
}
