"use server";

import { clearPerplexityInsightsCache } from "@/lib/cache";
import { revalidatePath } from "next/cache";

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
