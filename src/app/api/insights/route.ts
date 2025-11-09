import { NextRequest, NextResponse } from "next/server";

import { AIInsights, AILocation } from "@/types/ai-insights";
import { fetchGeminiInsightsWithCache } from "@/lib/gemini";

export async function POST(
  request: NextRequest,
): Promise<
  | NextResponse<{ error: string }>
  | NextResponse<{ insights: AIInsights | null }>
> {
  const signal = request.signal;

  try {
    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    const body = await request.json();
    const { location, name, osmId } = body as {
      location?: AILocation;
      name?: string;
      osmId?: string;
    };

    // Require either osmId (for cache-only check) or full location (for API call)
    if (!osmId && (!location || typeof location.latitude !== "number" || typeof location.longitude !== "number" || !location.country)) {
      return NextResponse.json(
        { error: "Either osmId or valid location with latitude, longitude, and country is required" },
        { status: 400 },
      );
    }

    const insight = await fetchGeminiInsightsWithCache({
      location,
      name,
      osmId,
      signal,
    });

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    return NextResponse.json({ insights: insight });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    console.error("Error generating playground AI insights:", error);
    return NextResponse.json(
      { error: "Failed to generate playground AI insights" },
      { status: 500 },
    );
  }
}
