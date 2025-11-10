import { NextRequest, NextResponse } from "next/server";
import { fetchPlaygroundImages } from "@/lib/images";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const signal = request.signal;

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    const body = await request.json();
    const { playgroundName, city, region, country, osmId } = body as {
      playgroundName: string;
      city?: string;
      region?: string;
      country?: string;
      osmId?: string;
    };

    if (!playgroundName) {
      return NextResponse.json(
        { error: "playgroundName is required" },
        { status: 400 },
      );
    }

    const images = await fetchPlaygroundImages({
      playgroundName,
      city,
      region,
      country,
      osmId,
      signal,
    });

    return NextResponse.json({ images });
  } catch (error) {
    console.error("[API /images] ❌ Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 },
    );
  }
}
