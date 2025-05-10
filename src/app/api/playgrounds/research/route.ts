import { NextRequest, NextResponse } from "next/server";
import { Client } from "@googlemaps/google-maps-services-js";
import { MapBounds } from "@/types/playground";

// Initialize Google Maps client
const googleMapsClient = new Client({});

// Function to fetch playgrounds from Overpass API
async function fetchOSMPlaygrounds(bounds: MapBounds) {
  const box = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const query = `
    [out:json][timeout:25];
    nwr["leisure"="playground"](${box});
    out geom;
  `;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(
        `Overpass API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data.elements || [];
  } catch (error) {
    console.error(
      "Error fetching OSM data:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
}

// Function to fetch Google Maps data and photos for a playground
async function fetchGoogleMapsData(playground: any) {
  // Extract coordinates from the playground data
  // OSM data can come in different formats (node, way, relation)
  let lat: number | undefined;
  let lon: number | undefined;

  if (playground.type === "node" && playground.lat && playground.lon) {
    // Node type has direct lat/lon
    lat = playground.lat;
    lon = playground.lon;
  } else if (playground.geometry && playground.geometry.length > 0) {
    // Way or relation type has geometry array
    // Calculate centroid from all geometry points
    const points = playground.geometry;
    const sumLat = points.reduce(
      (sum: number, point: any) => sum + point.lat,
      0,
    );
    const sumLon = points.reduce(
      (sum: number, point: any) => sum + point.lon,
      0,
    );
    lat = sumLat / points.length;
    lon = sumLon / points.length;
  } else if (playground.bounds) {
    // Fallback to center of bounds
    lat = (playground.bounds.minlat + playground.bounds.maxlat) / 2;
    lon = (playground.bounds.minlon + playground.bounds.maxlon) / 2;
  }

  if (!lat || !lon) {
    return null;
  }

  // Check for Google Maps API key
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("Google Maps API key is not configured");
    return {
      error: "Google Maps API key not configured",
      note: "Unable to fetch Google Maps data due to missing API key",
    };
  }

  try {
    // First, try Text Search for precise matching
    let place;
    const query = playground.tags?.name
      ? `${playground.tags.name} playground`
      : "playground";

    const textSearch = await googleMapsClient.textSearch({
      params: {
        query: query, // Use the dynamic query instead of hardcoded "playground"
        location: { lat: lat, lng: lon },
        radius: 500, // Search within 500 meters
        key: apiKey,
      },
    });

    console.log(`Text search found ${textSearch.data.results.length} results`);

    // Be less restrictive in finding a place - take the first result if it's close enough
    if (textSearch.data.results.length > 0) {
      place = textSearch.data.results[0];
      console.log(`Selected place: ${place.name} (${place.place_id})`);
    }

    // Fallback to Nearby Search if Text Search fails
    if (!place) {
      console.log("Text search failed, trying nearby search");
      const nearbySearch = await googleMapsClient.placesNearby({
        params: {
          location: { lat: lat, lng: lon },
          radius: 300, // Increased radius for better coverage
          type: "park", // Look for parks which often include playgrounds
          key: apiKey,
        },
      });

      console.log(
        `Nearby search found ${nearbySearch.data.results.length} results`,
      );

      // Take the closest result
      if (nearbySearch.data.results.length > 0) {
        place = nearbySearch.data.results[0];
        console.log(`Selected nearby place: ${place.name} (${place.place_id})`);
      }
    }

    if (!place) {
      console.log(
        "No matching Google Maps place found for coordinates:",
        lat,
        lon,
      );
      return {
        googleMapsData: {
          name: playground.tags?.name || "Unnamed Playground",
          address: "Location data unavailable",
          types: [],
          rating: "N/A",
          userRatingsTotal: "N/A",
          placeId: "unknown",
        },
        photos: [{ note: "No Google Maps data available for this location" }],
      };
    }

    // Fetch detailed place information
    const placeDetails = await googleMapsClient.placeDetails({
      params: {
        place_id: place.place_id as string,
        fields: [
          "name",
          "formatted_address",
          "types",
          "rating",
          "user_ratings_total",
          "photos",
        ],
        key: apiKey,
      },
    });

    const details = placeDetails.data.result;

    const N = 5; // Number of photos to fetch
    // Fetch up to N photos
    const photos = [];
    if (details.photos && details.photos.length > 0) {
      console.log(
        `Found ${details.photos.length} photos for place ${details.name}`,
      );
      for (const photo of details.photos.slice(0, N)) {
        if (photo.photo_reference) {
          const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${apiKey}`;
          photos.push({
            url: photoUrl,
            html_attributions: photo.html_attributions || [],
          });
          console.log(
            `Added photo with reference: ${photo.photo_reference.substring(0, 10)}...`,
          );
        } else {
          console.log("Photo missing photo_reference");
        }
      }
    } else {
      console.log(
        `No photos found for place ${details.name || place.place_id}`,
      );
    }

    return {
      googleMapsData: {
        name: details.name,
        address: details.formatted_address,
        types: details.types,
        rating: details.rating || "N/A",
        userRatingsTotal: details.user_ratings_total || "N/A",
        placeId: place.place_id,
      },
      photos:
        photos.length > 0
          ? photos
          : [{ note: "No photos available for this playground" }],
    };
  } catch (error) {
    console.error(
      "Error fetching Google Maps data:",
      error instanceof Error ? error.message : String(error),
    );
    return { error: "Failed to fetch Google Maps data" };
  }
}

// Main handler for the API route
export async function GET(req: NextRequest) {
  try {
    // Extract map bounds from URL parameters
    const url = new URL(req.url);
    const south = parseFloat(url.searchParams.get("south") || "0");
    const north = parseFloat(url.searchParams.get("north") || "0");
    const west = parseFloat(url.searchParams.get("west") || "0");
    const east = parseFloat(url.searchParams.get("east") || "0");

    // Validate bounds
    if (isNaN(south) || isNaN(north) || isNaN(west) || isNaN(east)) {
      return NextResponse.json(
        { error: "Invalid map bounds parameters" },
        { status: 400 },
      );
    }

    if (
      south < -90 ||
      north > 90 ||
      west < -180 ||
      east > 180 ||
      south >= north ||
      west >= east
    ) {
      return NextResponse.json(
        { error: "Invalid map bounds values" },
        { status: 400 },
      );
    }

    const bounds: MapBounds = { south, north, west, east };

    // Optional limit parameter
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam) : 10;

    // Fetch OSM playgrounds
    const osmPlaygrounds = await fetchOSMPlaygrounds(bounds);

    if (osmPlaygrounds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Process playgrounds (limited by the limit parameter)
    const results = [];
    const playgroundsToProcess = osmPlaygrounds.slice(0, limit);

    for (const playground of playgroundsToProcess) {
      // Extract coordinates from the playground data
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (playground.type === "node" && playground.lat && playground.lon) {
        // Node type has direct lat/lon
        latitude = playground.lat;
        longitude = playground.lon;
      } else if (playground.geometry && playground.geometry.length > 0) {
        // Way or relation type has geometry array
        // Calculate centroid from all geometry points
        const points = playground.geometry;
        const sumLat = points.reduce(
          (sum: number, point: any) => sum + point.lat,
          0,
        );
        const sumLon = points.reduce(
          (sum: number, point: any) => sum + point.lon,
          0,
        );
        latitude = sumLat / points.length;
        longitude = sumLon / points.length;
      } else if (playground.bounds) {
        // Fallback to center of bounds
        latitude = (playground.bounds.minlat + playground.bounds.maxlat) / 2;
        longitude = (playground.bounds.minlon + playground.bounds.maxlon) / 2;
      }

      const osmData = {
        id: playground.id,
        type: playground.type,
        name: playground.tags?.name || "Unnamed Playground",
        latitude: latitude,
        longitude: longitude,
        bounds: playground.bounds,
        geometry: playground.geometry,
        tags: playground.tags,
      };

      // Fetch Google Maps data for the playground
      const googleData = await fetchGoogleMapsData(playground);

      // Combine results for this playground
      results.push({
        osmData,
        googleData,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error(
      "Error in playground research API:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
