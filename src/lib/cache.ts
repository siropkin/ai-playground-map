import { createClient } from "@/lib/supabase/server";
import { PerplexityInsights } from "@/types/perplexity";

const PERPLEXITY_CACHE_TTL_MS = parseInt(
  process.env.PERPLEXITY_CACHE_TTL_MS || "31536000000",
); // Cache TTL (1 year in milliseconds)
const PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME =
  process.env.PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME ||
  "perplexity_insights_cache";

// Function to get AI insights from cache
export async function fetchPerplexityInsightsFromCache({
  address,
}: {
  address: string;
}): Promise<PerplexityInsights | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME)
      .select(
        "name, description, features, parking, sources, images, created_at",
      )
      .eq("address", address)
      .single();

    if (error || !data) {
      return null;
    }

    const createdAt = new Date(data.created_at).getTime();
    const now = Date.now();

    if (
      now - createdAt > PERPLEXITY_CACHE_TTL_MS ||
      data.name === null ||
      data.description === null
    ) {
      await supabase
        .from(PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME)
        .delete()
        .eq("address", address);

      return null;
    }

    return {
      name: data.name,
      description: data.description,
      features: data.features,
      parking: data.parking,
      sources: data.sources,
      images: data.images,
    };
  } catch (error) {
    console.error("Error getting AI insights from cache:", error);
    return null;
  }
}

// Function to save AI insights to cache
export async function savePerplexityInsightsToCache({
  address,
  insights,
}: {
  address: string;
  insights: PerplexityInsights;
}): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from(PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME)
      .upsert(
        {
          address,
          name: insights.name,
          description: insights.description,
          features: insights.features,
          parking: insights.parking,
          sources: insights.sources,
          images: insights.images,
          created_at: new Date().toISOString(),
        },
        { onConflict: "address" },
      );

    if (error) {
      console.error("Error saving AI insights to cache:", error);
    }
  } catch (error) {
    console.error("Error saving AI insights to cache:", error);
  }
}

// Function to clear Perplexity insights cache
export async function clearPerplexityInsightsCache({
  address,
}: {
  address: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from(PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME)
      .delete()
      .eq("address", address);

    if (error) {
      console.error("Error clearing Perplexity insights cache:", error);
    }
  } catch (error) {
    console.error("Error clearing Perplexity insights cache:", error);
  }
}

