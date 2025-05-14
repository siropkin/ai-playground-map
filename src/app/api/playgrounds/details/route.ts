import { NextRequest, NextResponse } from "next/server";
import { OSMPlaceDetails } from "@/types/osm";
import { getMultipleOSMPlaceDetails } from "@/lib/osm";

export async function POST(
  request: NextRequest,
): Promise<NextResponse<{ error: string }> | NextResponse<OSMPlaceDetails[]>> {
  const signal = request.signal;

  try {
    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    const body = await request.json();
    const { playgrounds } = body as {
      playgrounds: { osmId: number; osmType: string }[];
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
      type: playground.osmType,
    }));

    const details: OSMPlaceDetails[] = await getMultipleOSMPlaceDetails({
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

    console.error("Error fetching playgrounds details from OSM:", error);
    return NextResponse.json(
      { error: "Failed to fetch playgrounds details" },
      { status: 500 },
    );
  }
}
