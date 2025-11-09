import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();

    // Delete all AI insights cache entries
    const { error } = await supabase
      .from("ai_insights_cache")
      .delete()
      .neq("cache_key", ""); // Delete all entries (neq with empty string matches all)

    if (error) {
      console.error("Error clearing cache:", error);
      return NextResponse.json(
        { error: "Failed to clear cache", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "AI insights cache cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
