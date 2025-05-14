import { NextRequest, NextResponse } from "next/server";
import { getMultipleGoogleMapsPlaceDetails } from "@/lib/google-maps";
import { Playground } from "@/types/playground";
import { GoogleMapsPlaceDetails } from "@/types/google-maps";

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<{ error: string }> | NextResponse<GoogleMapsPlaceDetails[]>
> {
  const signal = request.signal;

  try {
    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    const body = await request.json();
    const { playgrounds } = body as {
      playgrounds: Playground[];
    };

    if (
      !playgrounds ||
      !Array.isArray(playgrounds) ||
      playgrounds.length === 0
    ) {
      return NextResponse.json(
        { error: "Invalid or empty playgrounds array provided" },
        { status: 400 },
      );
    }

    const items = playgrounds.map((playground) => ({
      id: playground.osmId,
      type: (playground.osmType || "").toString(),
      lat: playground.lat,
      lon: playground.lon,
    }));

    // Use Google Maps for reverse geocoding instead of OSM
    const details: GoogleMapsPlaceDetails[] =
      await getMultipleGoogleMapsPlaceDetails({
        items,
        signal,
      });

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    return NextResponse.json(details);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    console.error(
      "Error fetching playgrounds details from Google Maps:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to fetch playgrounds details from Google Maps" },
      { status: 500 },
    );
  }
}
