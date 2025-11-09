import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Delete all perplexity cache entries
    const { error } = await supabase
      .from("perplexity_insights_cache")
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
      message: "Perplexity cache cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}
