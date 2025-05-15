import { NextRequest, NextResponse } from "next/server";
import { PerplexityInsights } from "@/types/perplexity";
import {
  fetchPerplexityInsights,
  fetchPerplexityInsightsWithCache,
} from "@/lib/perplexity";

export async function POST(
  request: NextRequest,
): Promise<
  | NextResponse<{ error: string }>
  | NextResponse<{ insights: PerplexityInsights | null }>
> {
  const signal = request.signal;

  try {
    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    const body = await request.json();
    const { address } = body as { address: string };

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Valid address is required" },
        { status: 400 },
      );
    }

    const aiInsight = await fetchPerplexityInsightsWithCache(address, signal);

    if (signal?.aborted) {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }

    return NextResponse.json({ insights: aiInsight });
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
