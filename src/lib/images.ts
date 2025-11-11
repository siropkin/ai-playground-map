/**
 * Image Loading Service
 *
 * Handles fetching and caching playground images from Google Custom Search API.
 * This is completely separate from AI insights (Gemini) service.
 *
 * Features:
 * - Google Custom Search integration
 * - 90-day cache TTL by default (configurable via IMAGES_CACHE_TTL_MS)
 * - SafeSearch enabled
 * - Photo-only results
 *
 * Rate Limits:
 * - Free tier: 100 queries/day
 * - Paid: $5 per 1000 queries
 */

import { searchImages, buildPlaygroundImageQuery } from "@/lib/google-image-search";
import { createClient } from "@/lib/supabase/server";
import { buildImagesCacheKey } from "@/lib/cache-keys";
import { isValidImageUrl } from "@/lib/utils";

export interface PlaygroundImage {
  image_url: string;
  origin_url: string;
  height: number;
  width: number;
  title?: string;
  thumbnail_url?: string;
}

// Cache configuration
const IMAGES_CACHE_TTL_MS = parseInt(
  process.env.IMAGES_CACHE_TTL_MS || "7776000000",
); // 90 days in milliseconds (was 1 year)
const IMAGES_CACHE_TABLE_NAME = "playground_images_cache";

/**
 * Fetch images from cache
 * Cache invalidation: Version is in cache_key (e.g., "v1:N123456")
 */
export async function fetchImagesFromCache({
  cacheKey,
}: {
  cacheKey: string;
}): Promise<PlaygroundImage[] | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(IMAGES_CACHE_TABLE_NAME)
      .select("images, created_at")
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) {
      return null;
    }

    // Check TTL
    const createdAt = new Date(data.created_at).getTime();
    const now = Date.now();

    if (now - createdAt > IMAGES_CACHE_TTL_MS) {
      await supabase
        .from(IMAGES_CACHE_TABLE_NAME)
        .delete()
        .eq("cache_key", cacheKey);

      return null;
    }

    console.log(`[CacheImages] 📖 Cache hit for ${cacheKey}`);
    return data.images as PlaygroundImage[];
  } catch (error) {
    console.error("[CacheImages] ❌ Error fetching from cache:", error);
    return null;
  }
}

/**
 * Save images to cache
 * Cache invalidation: Version is in cache_key (e.g., "v1:N123456")
 */
export async function saveImagesToCache({
  cacheKey,
  images,
}: {
  cacheKey: string;
  images: PlaygroundImage[];
}): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from(IMAGES_CACHE_TABLE_NAME)
      .upsert(
        {
          cache_key: cacheKey,
          images,
          created_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" },
      );

    if (error) {
      console.error("[CacheImages] ❌ Error saving to cache:", error);
    } else {
      console.log(`[CacheImages] ✅ Saved ${images.length} images for ${cacheKey}`);
    }
  } catch (error) {
    console.error("[CacheImages] ❌ Error saving to cache:", error);
  }
}

/**
 * Clear images cache for a specific playground
 */
export async function clearImagesCache({
  cacheKey,
}: {
  cacheKey: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase
      .from(IMAGES_CACHE_TABLE_NAME)
      .delete()
      .eq("cache_key", cacheKey);

    console.log(`[CacheImages] 🗑️ Cleared cache for ${cacheKey}`);
  } catch (error) {
    console.error("[CacheImages] ❌ Error clearing cache:", error);
  }
}

/**
 * Bulk clear images cache for multiple playgrounds
 * Useful for admin operations and batch invalidation
 */
export async function bulkClearImagesCache({
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
      .from(IMAGES_CACHE_TABLE_NAME)
      .delete({ count: "exact" })
      .in("cache_key", cacheKeys);

    if (error) {
      console.error("[CacheImages] ❌ Error bulk clearing images cache:", error);
      return { success: false, deletedCount: 0 };
    }

    console.log(`[CacheImages] 🗑️ Bulk cleared ${count || 0} cache entries`);
    return { success: true, deletedCount: count || 0 };
  } catch (error) {
    console.error("[CacheImages] ❌ Error bulk clearing images cache:", error);
    return { success: false, deletedCount: 0 };
  }
}

/**
 * Clear images cache by pattern matching
 * Useful for clearing all playgrounds with specific prefix
 * Example: clearImagesCacheByPattern('v1:N%') clears all node images
 */
export async function clearImagesCacheByPattern({
  pattern,
}: {
  pattern: string;
}): Promise<{ success: boolean; deletedCount: number }> {
  try {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from(IMAGES_CACHE_TABLE_NAME)
      .delete({ count: "exact" })
      .like("cache_key", pattern);

    if (error) {
      console.error("[CacheImages] ❌ Error clearing images cache by pattern:", error);
      return { success: false, deletedCount: 0 };
    }

    console.log(`[CacheImages] 🗑️ Cleared ${count || 0} cache entries matching pattern: ${pattern}`);
    return { success: true, deletedCount: count || 0 };
  } catch (error) {
    console.error("[CacheImages] ❌ Error clearing images cache by pattern:", error);
    return { success: false, deletedCount: 0 };
  }
}

/**
 * Fetch images for a playground with caching
 */
export async function fetchPlaygroundImages({
  playgroundName,
  city,
  region,
  country,
  osmId,
  signal,
}: {
  playgroundName: string;
  city?: string;
  region?: string;
  country?: string;
  osmId?: string;
  signal?: AbortSignal;
}): Promise<PlaygroundImage[] | null> {
  if (signal?.aborted) {
    return null;
  }

  // Create cache key using centralized function (prefer OSM ID for stability)
  const cacheKey = buildImagesCacheKey({
    osmId,
    name: playgroundName,
    city,
    region,
    country,
  });

  // Try cache first
  const cachedImages = await fetchImagesFromCache({ cacheKey });
  if (cachedImages) {
    // Filter out invalid/inaccessible image URLs (x-raw-image:// format from old cache)
    const validCachedImages = cachedImages.filter(img =>
      isValidImageUrl(img.image_url)
    );

    // If all cached images were invalid, treat as cache miss
    if (validCachedImages.length === 0) {
      console.log(`[Images] ⚠️ All ${cachedImages.length} cached images were invalid for "${playgroundName}"`);
      // Don't return null - fall through to fetch fresh images
    } else if (validCachedImages.length < cachedImages.length) {
      console.log(`[Images] 🚫 Filtered ${cachedImages.length - validCachedImages.length} invalid cached images for "${playgroundName}"`);
      // Write back cleaned cache to avoid repeatedly serving invalid entries
      try {
        await saveImagesToCache({ cacheKey, images: validCachedImages });
      } catch (err) {
        console.warn("[Images] ⚠️ Failed to write back cleaned cached images:", err);
      }
      return validCachedImages;
    } else {
      return cachedImages;
    }
  }

  // Cache miss - fetch from Google Custom Search
  try {
    const imageQuery = buildPlaygroundImageQuery({
      name: playgroundName,
      city,
      region,
      country,
    });

    const rawImages = await searchImages(imageQuery, {
      maxResults: 10,
      signal,
    });

    if (rawImages.length === 0) {
      console.log(`[Images] ⚠️ No images found for "${playgroundName}"`);
      return null;
    }

    // Save to cache
    await saveImagesToCache({ cacheKey, images: rawImages });

    console.log(`[Images] 🖼️ Found ${rawImages.length} images for "${playgroundName}"`);
    return rawImages;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return null;
    }

    console.error("[Images] ❌ Error fetching images:", error);
    return null;
  }
}
