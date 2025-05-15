import { NextRequest, NextResponse } from "next/server";

import { GoogleMapsPlaceDetails } from "@/types/google-maps";
import { fetchGoogleMapsDetailsWithCache } from "@/lib/google-maps";

export async function POST(
  request: NextRequest,
): Promise<
  | NextResponse<{ error: string }>
  | NextResponse<{ details: GoogleMapsPlaceDetails | null }>
> {
  const signal = request.signal;

  try {
    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    const body = await request.json();
    const { lat, lon } = body as {
      lat: number;
      lon: number;
    };

    if (lat == null || lon == null) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 },
      );
    }

    const details = await fetchGoogleMapsDetailsWithCache({
      lat,
      lon,
      signal,
    });

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    return NextResponse.json({ details });
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
