import { NextRequest, NextResponse } from "next/server";
import { 
  createPlaygroundPhotoMetadata,
  updatePlaygroundPhotoMetadata,
  deletePlaygroundPhoto
} from "@/data/playgrounds";
import { APP_ADMIN_ROLE } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

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

export async function PUT(req: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (!data?.user || data.user.role !== APP_ADMIN_ROLE) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    const { playgroundId, filename, caption, isPrimary } = await req.json();
    if (!playgroundId || !filename) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    
    const result = await updatePlaygroundPhotoMetadata({
      playgroundId,
      filename,
      caption,
      isPrimary,
    });
    
    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 });
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

export async function DELETE(req: NextRequest) {
  try {
    // Check if user is admin
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (!data?.user || data.user.role !== APP_ADMIN_ROLE) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    const url = new URL(req.url);
    const playgroundId = url.searchParams.get("playgroundId");
    const filename = url.searchParams.get("filename");

    if (!playgroundId || !filename) {
      return NextResponse.json(
        { error: "Playground ID and filename are required" },
        { status: 400 },
      );
    }
    
    const result = await deletePlaygroundPhoto(Number(playgroundId), filename);
    
    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
