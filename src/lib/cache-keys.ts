/**
 * Centralized cache key generation
 *
 * This module provides consistent cache key generation across all services.
 * All cache keys include version prefixes for safe schema evolution.
 *
 * Key Formats:
 * - AI Insights: "v17-tier-fields-fixed:{osmId}" or "v17-tier-fields-fixed:{lat},{lon}"
 * - Images: "v8:{osmId}" or "v8:{name}-{city}-{region}"
 * - OSM Query: "v1:osm:{north}:{south}:{east}:{west}:{zoom}"
 */

/**
 * Cache versions - increment to invalidate all cached data
 * These versions are embedded in cache keys (e.g., "v17-tier-fields-fixed:N123456")
 * When you increment the version, old cache entries will never be found (automatic invalidation)
 *
 * To invalidate all caches, update these environment variables in .env.local:
 * - AI_INSIGHTS_CACHE_VERSION="v18" (e.g., after prompt changes)
 * - IMAGES_CACHE_VERSION="v2" (e.g., after changing image sources)
 * - OSM_CACHE_VERSION="v2" (e.g., after changing OSM query logic)
 */
export const AI_INSIGHTS_CACHE_VERSION =
  process.env.AI_INSIGHTS_CACHE_VERSION || "v17-tier-fields-fixed";
export const IMAGES_CACHE_VERSION =
  process.env.IMAGES_CACHE_VERSION || "v10";
export const OSM_CACHE_VERSION =
  process.env.OSM_CACHE_VERSION || "v1";

/**
 * Build AI insights cache key
 * Prefers OSM ID over coordinates for stability
 */
export function buildAIInsightsCacheKey(params: {
  osmId?: string;
  lat?: number;
  lon?: number;
}): string {
  if (params.osmId) {
    return `${AI_INSIGHTS_CACHE_VERSION}:${params.osmId}`;
  }

  if (params.lat != null && params.lon != null) {
    return `${AI_INSIGHTS_CACHE_VERSION}:${params.lat.toFixed(6)},${params.lon.toFixed(6)}`;
  }

  throw new Error("Either osmId or lat/lon coordinates must be provided");
}

/**
 * Build images cache key
 * Prefers OSM ID over name-based key for stability
 */
export function buildImagesCacheKey(params: {
  osmId?: string;
  name?: string;
  city?: string;
  region?: string;
  country?: string;
}): string {
  // Prefer OSM ID for stable cache keys
  if (params.osmId) {
    return `${IMAGES_CACHE_VERSION}:${params.osmId}`;
  }

  // Fallback to name-based key
  if (params.name) {
    const location = params.city || params.region || params.country;
    const baseCacheKey = location ? `${params.name}-${location}` : params.name;
    return `${IMAGES_CACHE_VERSION}:${baseCacheKey}`;
  }

  throw new Error("Either osmId or name must be provided");
}

/**
 * Parse cache key to extract OSM ID (if present)
 * Used for cache invalidation
 */
export function extractOsmIdFromCacheKey(cacheKey: string): string | null {
  // Try AI insights format: "v17-tier-fields-fixed:N123456"
  const aiMatch = cacheKey.match(/^v\d+-[^:]+:([NWR]\d+)$/);
  if (aiMatch) {
    return aiMatch[1];
  }

  // Try images format: "v1:N123456"
  const imgMatch = cacheKey.match(/^v\d+:([NWR]\d+)$/);
  if (imgMatch) {
    return imgMatch[1];
  }

  return null;
}

/**
 * Get all possible cache keys for a playground (for invalidation)
 * Returns array of keys to try when clearing cache
 */
export function getAllPossibleCacheKeys(params: {
  osmId?: string;
  lat: number;
  lon: number;
  name?: string;
  city?: string;
  region?: string;
  country?: string;
}): {
  aiInsightsKeys: string[];
  imageKeys: string[];
} {
  const aiInsightsKeys: string[] = [];
  const imageKeys: string[] = [];

  // AI insights keys
  if (params.osmId) {
    aiInsightsKeys.push(buildAIInsightsCacheKey({ osmId: params.osmId }));
  }
  aiInsightsKeys.push(buildAIInsightsCacheKey({ lat: params.lat, lon: params.lon }));

  // Image keys
  if (params.osmId) {
    imageKeys.push(buildImagesCacheKey({ osmId: params.osmId }));
  }
  if (params.name) {
    imageKeys.push(buildImagesCacheKey({
      name: params.name,
      city: params.city,
      region: params.region,
      country: params.country,
    }));
  }

  return { aiInsightsKeys, imageKeys };
}

/**
 * Clear all cache entries for a single playground
 * Convenience function that clears both AI insights and images
 *
 * @example
 * await invalidatePlaygroundCache({
 *   osmId: "N123456",
 *   lat: 40.7484,
 *   lon: -73.9857,
 *   name: "Central Park Playground",
 *   city: "New York"
 * });
 */
export async function invalidatePlaygroundCache(params: {
  osmId?: string;
  lat: number;
  lon: number;
  name?: string;
  city?: string;
  region?: string;
  country?: string;
}): Promise<{
  success: boolean;
  aiInsightsCleared: number;
  imagesCleared: number;
}> {
  const { bulkClearAIInsightsCache } = await import("@/lib/cache");
  const { bulkClearImagesCache } = await import("@/lib/images");

  const { aiInsightsKeys, imageKeys } = getAllPossibleCacheKeys(params);

  const [aiResult, imagesResult] = await Promise.all([
    bulkClearAIInsightsCache({ cacheKeys: aiInsightsKeys }),
    bulkClearImagesCache({ cacheKeys: imageKeys }),
  ]);

  return {
    success: aiResult.success && imagesResult.success,
    aiInsightsCleared: aiResult.deletedCount,
    imagesCleared: imagesResult.deletedCount,
  };
}
