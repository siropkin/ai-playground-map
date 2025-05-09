import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Use fetch with redirect: "follow" to resolve the short URL
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });

    return NextResponse.json({ resolvedUrl: response.url });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
