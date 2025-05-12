import { NextRequest, NextResponse } from "next/server";

import {
  fetchGooglePlaceDetails,
  fetchGooglePlacesNearby,
  fetchGooglePlacesForCoordinates,
  fetchGoogleStreetViewPhotos,
} from "@/lib/google";
import { findClosestPlace } from "@/lib/utils";

// Enrich playground data with Google Places information
export async function POST(req: NextRequest) {
  try {
    // Extract playground data from request body
    const body = await req.json();
    const { playgrounds } = body;

    if (!Array.isArray(playgrounds) || playgrounds.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty playgrounds array" },
        { status: 400 },
      );
    }

    // Process and enrich each playground
    const enrichedPlaygrounds = await Promise.all(
      playgrounds.map(async (playground) => {
        // Skip if already enriched or missing coordinates
        if (playground.enriched || !playground.lat || !playground.lon) {
          return playground;
        }

        let googlePlace = null;
        let googlePlaceDetails = null;
        let streetViewPhotos: any[] = [];

        // Search for nearby Google Places
        const types = [
          { type: "playground", radius: 10 },
          { type: "park", radius: 50 },
        ];

        for (const type of types) {
          const placesNearby = await fetchGooglePlacesNearby({
            lat: playground.lat,
            lon: playground.lon,
            radius: type.radius,
            type: type.type,
          });

          if (placesNearby.length) {
            const closest = findClosestPlace(
              placesNearby,
              playground.lat,
              playground.lon,
            );
            if (closest.place && closest.distance < type.radius) {
              googlePlace = closest.place;
              break;
            }
          }
        }

        if (!googlePlace) {
          // Get formatted address for the coordinates
          const placesNearby = await fetchGooglePlacesForCoordinates({
            lat: playground.lat,
            lon: playground.lon,
          });

          if (placesNearby.length) {
            const closest = findClosestPlace(
              placesNearby,
              playground.lat,
              playground.lon,
            );

            if (closest.place && closest.distance < 10) {
              googlePlace = closest.place;
            }
          }

          // Get street view photos for the coordinates
          streetViewPhotos = await fetchGoogleStreetViewPhotos({
            lat: playground.lat,
            lon: playground.lon,
          });
        }

        // Fetch place details if we found a Google Place
        if (googlePlace) {
          googlePlaceDetails = await fetchGooglePlaceDetails({
            placeId: googlePlace.place_id,
            fields: [
              "formatted_address",
              "generativeSummary",
              "reviews",
              "reviewSummary",
            ],
          });
        }

        // Return enriched playground data
        return {
          ...playground,
          name: googlePlace?.name || playground.name,
          description:
            googlePlaceDetails?.generativeSummary?.overview?.text ||
            playground.description,
          address: googlePlaceDetails?.formattedAddress || playground.address,
          photos:
            streetViewPhotos || googlePlace?.photos || playground.photos || [],
          googlePlaceId: googlePlace?.place_id,
          reviews: googlePlaceDetails?.reviews,
          reviewSummary: googlePlaceDetails?.reviewSummary,
          enriched: true,
          enrichmentSource: googlePlace
            ? "google"
            : streetViewPhotos.length > 0
              ? "google_fallback"
              : "osm",
        };
      }),
    );

    return NextResponse.json({ results: enrichedPlaygrounds });
  } catch (error) {
    console.error(
      "Error in playground enrichment API:",
      error instanceof Error ? error.message : String(error),
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
