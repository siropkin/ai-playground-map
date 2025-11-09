import { NextRequest, NextResponse } from "next/server";
import { AILocation } from "@/types/ai-insights";

/**
 * API endpoint to get structured location data from coordinates using Nominatim reverse geocoding
 */
export async function POST(
  request: NextRequest,
): Promise<
  | NextResponse<{ error: string }>
  | NextResponse<{ location: AILocation }>
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

    if (typeof lat !== "number" || typeof lon !== "number") {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required" },
        { status: 400 },
      );
    }

    // Call Nominatim reverse geocoding API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      {
        signal,
        headers: {
          "User-Agent": "GoodPlaygroundMap/1.0 (ivan.seredkin@gmail.com)",
          Referer: "https://www.goodplaygroundmap.com/",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    // Build location object from Nominatim response
    const location: AILocation = {
      latitude: lat,
      longitude: lon,
      city: data.address?.city || data.address?.town || data.address?.village,
      region: data.address?.state,
      country: data.address?.country_code?.toUpperCase() || "US",
    };

    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    console.error("Error fetching location data:", error);
    return NextResponse.json(
      { error: "Failed to fetch location data" },
      { status: 500 },
    );
  }
}
