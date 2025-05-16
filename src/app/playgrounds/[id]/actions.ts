"use server";

import {
  clearGoogleMapsPlaceDetailsCache,
  clearPerplexityInsightsCache,
} from "@/lib/cache";
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
      console.error("Error reporting issue:", error);
      return { success: false, message: "Failed to report issue" };
    }

    return { success: true, message: "Issue reported successfully" };
  } catch (error) {
    console.error("Error reporting issue:", error);
    return { success: false, message: "Failed to report issue" };
  }
}

export async function clearPlaygroundCacheAction({
  playgroundId,
  lat,
  lon,
  address,
}: {
  playgroundId: string;
  lat: number;
  lon: number;
  address: string;
}) {
  try {
    if (!address) {
      return { success: false, message: "No address provided" };
    }

    await clearPerplexityInsightsCache({ address });
    await clearGoogleMapsPlaceDetailsCache({ lat, lon });

    revalidatePath(`/playgrounds/${playgroundId}`);

    return { success: true, message: "Playground cache cleared successfully" };
  } catch (error) {
    console.error("Error clearing playground cache:", error);
    return { success: false, message: "Failed to clear playground cache" };
  }
}
