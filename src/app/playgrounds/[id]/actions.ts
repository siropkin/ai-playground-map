"use server";

import { clearPerplexityInsightsCache } from "@/lib/cache";
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

export async function clearAiInsightsCacheAction(
  address: string,
  playgroundId: string,
) {
  try {
    if (!address) {
      return { success: false, message: "No address provided" };
    }

    await clearPerplexityInsightsCache({ address });

    revalidatePath(`/playgrounds/${playgroundId}`);

    return { success: true, message: "AI insights cache cleared successfully" };
  } catch (error) {
    console.error("Error clearing AI insights cache:", error);
    return { success: false, message: "Failed to clear AI insights cache" };
  }
}
