import { createClient } from "@/lib/supabase/server";
import { AIInsights } from "@/types/ai-insights";

const AI_INSIGHTS_CACHE_TTL_MS = parseInt(
  process.env.AI_INSIGHTS_CACHE_TTL_MS || "7776000000",
); // Cache TTL (90 days in milliseconds, was 1 year)
const AI_INSIGHTS_CACHE_TABLE_NAME =
  process.env.AI_INSIGHTS_CACHE_TABLE_NAME ||
  "ai_insights_cache";

// Function to get AI insights from cache
// Cache invalidation: Version is in cache_key (e.g., "v17-tier-fields-fixed:N123456")
// cacheKey can be either an OSM ID or coordinates
export async function fetchAIInsightsFromCache({
  cacheKey,
}: {
  cacheKey: string;
}): Promise<AIInsights | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(AI_INSIGHTS_CACHE_TABLE_NAME)
      .select(
        "name, description, features, parking, sources, images, accessibility, tier, tier_reasoning, created_at",
      )
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) {
      return null;
    }

    // Check TTL and data validity
    const createdAt = new Date(data.created_at).getTime();
    const now = Date.now();

    if (
      now - createdAt > AI_INSIGHTS_CACHE_TTL_MS ||
      data.name === null ||
      data.description === null
    ) {
      await supabase
        .from(AI_INSIGHTS_CACHE_TABLE_NAME)
        .delete()
        .eq("cache_key", cacheKey);

      return null;
    }

    const result = {
      name: data.name,
      description: data.description,
      features: data.features,
      parking: data.parking,
      sources: data.sources,
      images: data.images,
      accessibility: data.accessibility,
      // Tier fields (added in v17) - now properly selected from database
      tier: data.tier ?? null,
      tier_reasoning: data.tier_reasoning ?? null,
    };

    console.log(`[CacheAI] 📖 Retrieved "${result.name}" (${result.tier})`);

    return result;
  } catch (error) {
    console.error("[CacheAI] ❌ Error getting AI insights from cache:", error);
    return null;
  }
}

// Function to save AI insights to cache
// Cache invalidation: Version is in cache_key (e.g., "v17-tier-fields-fixed:N123456")
export async function saveAIInsightsToCache({
  cacheKey,
  insights,
}: {
  cacheKey: string;
  insights: AIInsights;
}): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from(AI_INSIGHTS_CACHE_TABLE_NAME)
      .upsert(
        {
          cache_key: cacheKey,
          name: insights.name,
          description: insights.description,
          features: insights.features,
          parking: insights.parking,
          sources: insights.sources,
          images: insights.images,
          accessibility: insights.accessibility,
          tier: insights.tier,
          tier_reasoning: insights.tier_reasoning,
          created_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" },
      );

    if (error) {
      console.error("[CacheAI] ❌ Error saving AI insights to cache:", error);
    } else {
      console.log(`[CacheAI] ✅ Saved "${insights.name}" (${insights.tier})`);
    }
  } catch (error) {
    console.error("[CacheAI] ❌ Error saving AI insights to cache:", error);
  }
}

// Function to clear AI insights cache
// cacheKey can be either an OSM ID (e.g., "N123456") or coordinates (e.g., "40.748817,-73.985428")
export async function clearAIInsightsCache({
  cacheKey,
}: {
  cacheKey: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from(AI_INSIGHTS_CACHE_TABLE_NAME)
      .delete()
      .eq("cache_key", cacheKey);

    if (error) {
      console.error("[CacheAI] ❌ Error clearing AI insights cache:", error);
    } else {
      console.log(`[CacheAI] 🗑️ Cleared cache for ${cacheKey}`);
    }
  } catch (error) {
    console.error("[CacheAI] ❌ Error clearing AI insights cache:", error);
  }
}

/**
 * Bulk clear AI insights cache for multiple playgrounds
 * Useful for admin operations and batch invalidation
 */
export async function bulkClearAIInsightsCache({
  cacheKeys,
}: {
  cacheKeys: string[];
}): Promise<{ success: boolean; deletedCount: number }> {
  if (cacheKeys.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  try {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from(AI_INSIGHTS_CACHE_TABLE_NAME)
      .delete({ count: "exact" })
      .in("cache_key", cacheKeys);

    if (error) {
      console.error("[CacheAI] ❌ Error bulk clearing AI insights cache:", error);
      return { success: false, deletedCount: 0 };
    }

    console.log(`[CacheAI] 🗑️ Bulk cleared ${count || 0} cache entries`);
    return { success: true, deletedCount: count || 0 };
  } catch (error) {
    console.error("[CacheAI] ❌ Error bulk clearing AI insights cache:", error);
    return { success: false, deletedCount: 0 };
  }
}

/**
 * Clear AI insights cache by pattern matching
 * Useful for clearing all playgrounds in a specific region or with specific prefix
 * Example: clearAIInsightsCacheByPattern('v17-tier-fields-fixed:N%') clears all nodes
 */
export async function clearAIInsightsCacheByPattern({
  pattern,
}: {
  pattern: string;
}): Promise<{ success: boolean; deletedCount: number }> {
  try {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from(AI_INSIGHTS_CACHE_TABLE_NAME)
      .delete({ count: "exact" })
      .like("cache_key", pattern);

    if (error) {
      console.error("[CacheAI] ❌ Error clearing AI insights cache by pattern:", error);
      return { success: false, deletedCount: 0 };
    }

    console.log(`[CacheAI] 🗑️ Cleared ${count || 0} cache entries matching pattern: ${pattern}`);
    return { success: true, deletedCount: count || 0 };
  } catch (error) {
    console.error("[CacheAI] ❌ Error clearing AI insights cache by pattern:", error);
    return { success: false, deletedCount: 0 };
  }
}

/**
 * Batch fetch multiple cache entries at once (optimized for performance)
 * Returns a Map of cacheKey -> insights for all found entries
 * Cache invalidation: Version is in cache_key (e.g., "v17-tier-fields-fixed:N123456")
 */
export async function batchFetchAIInsightsFromCache({
  cacheKeys,
}: {
  cacheKeys: string[];
}): Promise<Map<string, AIInsights>> {
  const results = new Map<string, AIInsights>();

  if (cacheKeys.length === 0) {
    return results;
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(AI_INSIGHTS_CACHE_TABLE_NAME)
      .select(
        "cache_key, name, description, features, parking, sources, images, accessibility, tier, tier_reasoning, created_at",
      )
      .in("cache_key", cacheKeys);

    if (error || !data) {
      console.error("[CacheAI] ❌ Error batch fetching from cache:", error);
      return results;
    }

    const now = Date.now();
    const keysToDelete: string[] = [];

    // Process each cached entry
    for (const row of data) {
      // Check TTL and data validity
      const createdAt = new Date(row.created_at).getTime();
      if (
        now - createdAt > AI_INSIGHTS_CACHE_TTL_MS ||
        row.name === null ||
        row.description === null
      ) {
        keysToDelete.push(row.cache_key);
        continue;
      }

      // Valid cache entry - add to results
      results.set(row.cache_key, {
        name: row.name,
        description: row.description,
        features: row.features,
        parking: row.parking,
        sources: row.sources,
        images: row.images,
        accessibility: row.accessibility,
        // Tier fields (added in v17) - now properly selected from database
        tier: row.tier ?? null,
        tier_reasoning: row.tier_reasoning ?? null,
      });
    }

    // Clean up expired/invalid entries in background
    if (keysToDelete.length > 0) {
      supabase
        .from(AI_INSIGHTS_CACHE_TABLE_NAME)
        .delete()
        .in("cache_key", keysToDelete)
        .then(({ error }) => {
          if (error) {
            console.error("[CacheAI] ❌ Error deleting invalid cache entries:", error);
          }
        });
    }

    console.log(
      `[CacheAI] 📦 Batch fetched ${results.size}/${cacheKeys.length} entries`,
    );

    return results;
  } catch (error) {
    console.error("[CacheAI] ❌ Error batch fetching AI insights from cache:", error);
    return results;
  }
}

