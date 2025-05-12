import { NextRequest, NextResponse } from "next/server";

import { MapBounds } from "@/types/playground";
import { getOSMPlaygrounds } from "@/lib/osm";
import {
  fetchGooglePlaceDetails,
  fetchGooglePlacesNearby,
  resolveGooglePlacePhotoReferences,
} from "@/lib/google";
import { findClosestPlace } from "@/lib/utils";

// Get playgrounds for boundaries
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

    // Fetch OSM playgrounds
    const osmPlaygrounds = await getOSMPlaygrounds({
      bounds,
      timeout: 5,
      limit: 25,
    });

    if (osmPlaygrounds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Process playgrounds
    const results = [];

    for (const playground of osmPlaygrounds) {
      // Extract coordinates from the playground data
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

      let googlePlace = null;
      let googlePlaceDetails = null;
      if (&& lat && lon) {
        const types = [
          { type: "playground", radius: 10 },
          { type: "park", radius: 50 },
        ];
        for (const type of types) {
          const placesNearby = await fetchGooglePlacesNearby({
            lat: lat,
            lon: lon,
            radius: type.radius,
            type: type.type,
          });

          if (placesNearby.length) {
            const closest = findClosestPlace(placesNearby, lat, lon);
            if (closest.place && closest.distance < type.radius) {
              googlePlace = closest.place;
              break;
            }
          }
        }
      }

      const photos = await Promise.all(
        (googlePlace?.photos || []).map(
          async (photo: { photo_reference: string }) => {
            const photoUrl = await resolveGooglePlacePhotoReferences({
              photoReference: photo.photo_reference,
              maxWidth: 640,
            });
            return {
              src: photoUrl,
              caption: googlePlace?.name,
            };
          },
        ),
      );

      if (googlePlace) {
        googlePlaceDetails = await fetchGooglePlaceDetails({
          placeId: googlePlace.place_id,
          fields: [
            "formatted_address",
            "generativeSummary",
            "reviewSummary",
            "reviews",
          ],
        });
      }

      // Combine results for this playground
      results.push({
        id: playground.id,
        name: googlePlace?.name || playground.tags?.name || "Playground",
        description:
          googlePlaceDetails?.generativeSummary?.overview?.text ||
          playground.tags?.description,
        lat,
        lon,
        address: googlePlaceDetails?.formattedAddress || null,
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error(
      "Error in playground get API:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
