/**
 * Image Loading Service
 *
 * Handles fetching and caching playground images from Google Custom Search API.
 * This is completely separate from AI insights (Gemini) service.
 *
 * Features:
 * - Google Custom Search integration
 * - 1-year cache TTL
 * - SafeSearch enabled
 * - Photo-only results
 *
 * Rate Limits:
 * - Free tier: 100 queries/day
 * - Paid: $5 per 1000 queries
 */

import { searchImages, buildPlaygroundImageQuery } from "@/lib/google-image-search";
import { createClient } from "@/lib/supabase/server";

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
  process.env.IMAGES_CACHE_TTL_MS || "31536000000",
); // 1 year in milliseconds
const IMAGES_CACHE_TABLE_NAME = "playground_images_cache";

// Cache version - increment to invalidate all cached images
const IMAGES_CACHE_VERSION = "v1";

/**
 * Fetch images from cache
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
      .select("images, created_at, schema_version")
      .eq("cache_key", cacheKey)
      .single();

    if (error || !data) {
      return null;
    }

    // Check schema version
    if (data.schema_version !== IMAGES_CACHE_VERSION) {
      await supabase
        .from(IMAGES_CACHE_TABLE_NAME)
        .delete()
        .eq("cache_key", cacheKey);

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

    console.log(`[Images Cache] 📖 Cache hit for ${cacheKey}`);
    return data.images as PlaygroundImage[];
  } catch (error) {
    console.error("[Images Cache] ❌ Error fetching from cache:", error);
    return null;
  }
}

/**
 * Save images to cache
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
          schema_version: IMAGES_CACHE_VERSION,
        },
        { onConflict: "cache_key" },
      );

    if (error) {
      console.error("[Images Cache] ❌ Error saving to cache:", error);
    } else {
      console.log(`[Images Cache] ✅ Saved ${images.length} images for ${cacheKey}`);
    }
  } catch (error) {
    console.error("[Images Cache] ❌ Error saving to cache:", error);
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

    console.log(`[Images Cache] 🗑️ Cleared cache for ${cacheKey}`);
  } catch (error) {
    console.error("[Images Cache] ❌ Error clearing cache:", error);
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

  // Create cache key (prefer OSM ID for stability)
  const baseCacheKey = osmId || `${playgroundName}-${city || region || country}`;
  const cacheKey = `${IMAGES_CACHE_VERSION}:${baseCacheKey}`;

  // Try cache first
  const cachedImages = await fetchImagesFromCache({ cacheKey });
  if (cachedImages) {
    return cachedImages;
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
