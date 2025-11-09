"use server";

import { clearAIInsightsCache } from "@/lib/cache";
import { clearImagesCache } from "@/lib/images";
import { getAllPossibleCacheKeys } from "@/lib/cache-keys";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// TODO: Move report issues table to env params
// TODO: Create lib file for report issues
interface ReportIssueParams {
  playgroundId: string;
  issueType: "wrong-location" | "incorrect-info" | "inappropriate-content" | "other";
  description: string;
  userEmail: string | null;
}

export async function reportIssue({
  playgroundId,
  issueType,
  description,
  userEmail,
}: ReportIssueParams) {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from("playground_issues").insert({
      playground_id: playgroundId,
      issue_type: issueType,
      description,
      user_email: userEmail,
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
  name,
  city,
  region,
  country,
}: {
  playgroundId: string;
  lat: number;
  lon: number;
  osmId?: string;
  name?: string;
  city?: string;
  region?: string;
  country?: string;
}) {
  try {
    // Get all possible cache keys with proper version prefixes
    const { aiInsightsKeys, imageKeys } = getAllPossibleCacheKeys({
      osmId,
      lat,
      lon,
      name,
      city,
      region,
      country,
    });

    // Clear all AI insights cache keys
    for (const cacheKey of aiInsightsKeys) {
      await clearAIInsightsCache({ cacheKey });
    }

    // Clear all image cache keys
    for (const cacheKey of imageKeys) {
      await clearImagesCache({ cacheKey });
    }

    revalidatePath(`/playgrounds/${playgroundId}`);

    console.log(`[Actions] ✅ Cleared cache for playground ${playgroundId}`);
    return { success: true, message: "Playground cache cleared successfully" };
  } catch (error) {
    console.error("[Actions] ❌ Error clearing playground cache:", error);
    return { success: false, message: "Failed to clear playground cache" };
  }
}
