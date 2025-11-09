"use server";

import { clearAIInsightsCache } from "@/lib/cache";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// TODO: Move report issues table to env params
// TODO: Create lib file for report issues
interface ReportIssueParams {
  playgroundId: string;
  description: string;
  contact: string | null;
}

export async function reportIssue({
  playgroundId,
  description,
  contact,
}: ReportIssueParams) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("playground_issues").insert({
      playground_id: playgroundId,
      description,
      contact,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[Actions] ❌ Error reporting issue:", error);
      return { success: false, message: "Failed to report issue" };
    }

    return { success: true, message: "Issue reported successfully" };
  } catch (error) {
    console.error("[Actions] ❌ Error reporting issue:", error);
    return { success: false, message: "Failed to report issue" };
  }
}

export async function clearPlaygroundCacheAction({
  playgroundId,
  lat,
  lon,
  osmId,
}: {
  playgroundId: string;
  lat: number;
  lon: number;
  osmId?: string;
}) {
  try {
    // Clear both possible cache keys to handle the inconsistency:
    // 1. OSM ID-based key (if available)
    // 2. Coordinate-based key (fallback)
    // This ensures we clear cached data regardless of which key was used when storing

    if (osmId) {
      await clearAIInsightsCache({ cacheKey: osmId });
    }

    // Also clear coordinate-based key for backward compatibility
    const coordinateCacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
    await clearAIInsightsCache({ cacheKey: coordinateCacheKey });

    revalidatePath(`/playgrounds/${playgroundId}`);

    return { success: true, message: "Playground cache cleared successfully" };
  } catch (error) {
    console.error("[Actions] ❌ Error clearing playground cache:", error);
    return { success: false, message: "Failed to clear playground cache" };
  }
}
