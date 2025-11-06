import { createClient } from "@/lib/supabase/server";
import { PerplexityInsights } from "@/types/perplexity";

const PERPLEXITY_CACHE_TTL_MS = parseInt(
  process.env.PERPLEXITY_CACHE_TTL_MS || "31536000000",
); // Cache TTL (1 year in milliseconds)
const PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME =
  process.env.PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME ||
  "perplexity_insights_cache";

// Schema version for Perplexity cache
// Increment this when the prompt or response structure changes
// Old cache entries will be automatically invalidated
const CURRENT_SCHEMA_VERSION = 1;

// Function to get AI insights from cache
// cacheKey can be either an OSM ID (e.g., "N123456") or coordinates (e.g., "40.748817,-73.985428")
export async function fetchPerplexityInsightsFromCache({
  cacheKey,
}: {
  cacheKey: string;
}): Promise<PerplexityInsights | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME)
      .select(
        "name, description, features, parking, sources, images, created_at, schema_version",
      )
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) {
      return null;
    }

    // Check schema version first - invalidate if outdated
    if (data.schema_version !== CURRENT_SCHEMA_VERSION) {
      await supabase
        .from(PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME)
        .delete()
        .eq("cache_key", cacheKey);

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
        .eq("cache_key", cacheKey);

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
// cacheKey can be either an OSM ID (e.g., "N123456") or coordinates (e.g., "40.748817,-73.985428")
export async function savePerplexityInsightsToCache({
  cacheKey,
  insights,
}: {
  cacheKey: string;
  insights: PerplexityInsights;
}): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from(PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME)
      .upsert(
        {
          cache_key: cacheKey,
          name: insights.name,
          description: insights.description,
          features: insights.features,
          parking: insights.parking,
          sources: insights.sources,
          images: insights.images,
          created_at: new Date().toISOString(),
          schema_version: CURRENT_SCHEMA_VERSION,
        },
        { onConflict: "cache_key" },
      );

    if (error) {
      console.error("Error saving AI insights to cache:", error);
    }
  } catch (error) {
    console.error("Error saving AI insights to cache:", error);
  }
}

// Function to clear Perplexity insights cache
// cacheKey can be either an OSM ID (e.g., "N123456") or coordinates (e.g., "40.748817,-73.985428")
export async function clearPerplexityInsightsCache({
  cacheKey,
}: {
  cacheKey: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from(PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME)
      .delete()
      .eq("cache_key", cacheKey);

    if (error) {
      console.error("Error clearing Perplexity insights cache:", error);
    }
  } catch (error) {
    console.error("Error clearing Perplexity insights cache:", error);
  }
}

