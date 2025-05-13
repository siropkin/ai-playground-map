import { NextRequest, NextResponse } from "next/server";

import { fetchOSMPlacesDetails } from "@/lib/osm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { playgrounds } = body;

    if (!Array.isArray(playgrounds) || playgrounds.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty playgrounds array" },
        { status: 400 },
      );
    }

    const results = await fetchOSMPlacesDetails({
      items: playgrounds.map((playground) => ({
        id: playground.osmId,
        type: playground.osmType,
      })),
    });

    return NextResponse.json({ results });
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
