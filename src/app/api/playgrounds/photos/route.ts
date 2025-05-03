import { NextRequest, NextResponse } from "next/server";
import { createPlaygroundPhotoMetadata } from "@/data/playgrounds";

export async function POST(req: NextRequest) {
  try {
    const { playgroundId, filename, caption, isPrimary } = await req.json();
    if (!playgroundId || !filename) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const result = await createPlaygroundPhotoMetadata({
      playgroundId,
      filename,
      caption,
      isPrimary,
    });
    if (result.success) {
      return NextResponse.json({ success: true }, { status: 201 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
