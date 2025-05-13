import { NextRequest, NextResponse } from "next/server";
import { fetchOSMPlacesDetails } from "@/lib/osm";
import { OSMPlaceDetails } from "@/types/osm";

export async function POST(request: NextRequest) {
  try {
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

    // Fetch details from OSM
    const details: OSMPlaceDetails[] = await fetchOSMPlacesDetails({ items });

    return NextResponse.json(details);
  } catch (error) {
    console.error("Error fetching playground details:", error);
    return NextResponse.json(
      { error: "Failed to fetch playground details" },
      { status: 500 }
    );
  }
}