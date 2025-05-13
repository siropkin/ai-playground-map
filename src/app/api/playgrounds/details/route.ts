import { NextRequest, NextResponse } from "next/server";
import { fetchOSMPlacesDetails } from "@/lib/osm";
import { OSMPlaceDetails } from "@/types/osm";

export async function POST(request: NextRequest) {
  // Get the AbortSignal from the request
  const signal = request.signal;
  
  try {
    // Check if the request has been aborted
    if (signal?.aborted) {
      return NextResponse.json(
        { error: "Request aborted" },
        { status: 499 }
      );
    }
    
    const body = await request.json();
    const { playgrounds } = body as {
      playgrounds: { id: number; osmId: number; osmType: string }[]
    };

    if (!playgrounds || !Array.isArray(playgrounds) || playgrounds.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty playgrounds array provided" },
        { status: 400 }
      );
    }

    // Format the items for the OSM details fetch
    const items = playgrounds.map((playground) => ({
      id: String(playground.osmId), // Convert number to string
      type: String(playground.osmType), // Ensure type is string
    }));

    // Fetch details from OSM with the AbortSignal
    const details: OSMPlaceDetails[] = await fetchOSMPlacesDetails({
      items,
      signal
    });

    // Check if the request has been aborted after the fetch
    if (signal?.aborted) {
      return NextResponse.json(
        { error: "Request aborted" },
        { status: 499 }
      );
    }

    return NextResponse.json(details);
  } catch (error) {
    // Handle aborted requests
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request aborted" },
        { status: 499 }
      );
    }
    
    console.error("Error fetching playground details:", error);
    return NextResponse.json(
      { error: "Failed to fetch playground details" },
      { status: 500 }
    );
  }
}