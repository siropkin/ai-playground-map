import { OSMPlaceDetails } from "@/types/osm";
import { createClient } from "@/lib/supabase/server";

// Cache TTL (30 days in milliseconds)
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Playground description cache functions
 */
export async function getDescriptionFromCache(
  address: string,
): Promise<string | null> {
  try {
    const supabase = await createClient();

    // Get the cached description
    const { data, error } = await supabase
      .from("playground_descriptions")
      .select("description, created_at")
      .eq("address", address)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if the cache is still valid
    const createdAt = new Date(data.created_at).getTime();
    const now = Date.now();

    if (now - createdAt > CACHE_TTL_MS) {
      // Cache expired, delete the entry
      await supabase
        .from("playground_descriptions")
        .delete()
        .eq("address", address);

      return null;
    }

    return data.description;
  } catch (error) {
    console.error("Error getting description from cache:", error);
    return null;
  }
}

export async function saveDescriptionToCache(
  address: string,
  description: string,
): Promise<void> {
  try {
    const supabase = await createClient();

    // Upsert the description (insert if not exists, update if exists)
    const { error } = await supabase.from("playground_descriptions").upsert(
      {
        address,
        description,
        created_at: new Date().toISOString(),
      },
      { onConflict: "address" },
    );

    if (error) {
      console.error("Error saving description to cache:", error);
    }
  } catch (error) {
    console.error("Error saving description to cache:", error);
  }
}

/**
 * OSM place details cache functions
 */
export async function getOSMDetailsFromCache(
  osmType: string,
  osmId: string,
): Promise<OSMPlaceDetails | null> {
  try {
    const supabase = await createClient();

    // Get the cached details
    const { data, error } = await supabase
      .from("osm_place_details")
      .select("details, created_at")
      .eq("osm_type", osmType)
      .eq("osm_id", osmId)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if the cache is still valid
    const createdAt = new Date(data.created_at).getTime();
    const now = Date.now();

    if (now - createdAt > CACHE_TTL_MS) {
      // Cache expired, delete the entry
      await supabase
        .from("osm_place_details")
        .delete()
        .eq("osm_type", osmType)
        .eq("osm_id", osmId);

      return null;
    }

    return data.details as OSMPlaceDetails;
  } catch (error) {
    console.error("Error getting OSM details from cache:", error);
    return null;
  }
}

export async function saveOSMDetailsToCache(
  detail: OSMPlaceDetails,
): Promise<void> {
  try {
    const supabase = await createClient();

    // Upsert the details (insert if not exists, update if exists)
    const { error } = await supabase.from("osm_place_details").upsert(
      {
        osm_type: detail.osm_type,
        osm_id: detail.osm_id.toString(),
        details: detail,
        created_at: new Date().toISOString(),
      },
      { onConflict: "osm_type, osm_id" },
    );

    if (error) {
      console.error("Error saving OSM details to cache:", error);
    }
  } catch (error) {
    console.error("Error saving OSM details to cache:", error);
  }
}

export async function getMultipleOSMDetailsFromCache(
  items: { id: string; type: string }[],
): Promise<{
  cachedDetails: OSMPlaceDetails[];
  uncachedItems: { id: string; type: string }[];
}> {
  try {
    const supabase = await createClient();
    const now = Date.now();

    // Prepare arrays for results
    const cachedDetails: OSMPlaceDetails[] = [];
    const uncachedItems: { id: string; type: string }[] = [];

    // Process items in batches to avoid query size limitations
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Build filter conditions for the batch
      const filterConditions = batch
        .map((item) => {
          return `(osm_type.eq.${item.type},osm_id.eq.${item.id})`;
        })
        .join(",");

      // Get cached details for the batch
      const { data, error } = await supabase
        .from("osm_place_details")
        .select("osm_type, osm_id, details, created_at")
        .or(filterConditions);

      if (error || !data) {
        // If there's an error, consider all items in this batch as uncached
        uncachedItems.push(...batch);
        continue;
      }

      // Process each item in the batch
      for (const item of batch) {
        const cacheEntry = data.find(
          (entry) => entry.osm_type === item.type && entry.osm_id === item.id,
        );

        if (cacheEntry) {
          const createdAt = new Date(cacheEntry.created_at).getTime();

          if (now - createdAt < CACHE_TTL_MS) {
            // Cache is valid
            cachedDetails.push(cacheEntry.details as OSMPlaceDetails);
          } else {
            // Cache expired
            uncachedItems.push(item);

            // Delete expired entry
            await supabase
              .from("osm_place_details")
              .delete()
              .eq("osm_type", item.type)
              .eq("osm_id", item.id);
          }
        } else {
          // Not in cache
          uncachedItems.push(item);
        }
      }
    }

    return { cachedDetails, uncachedItems };
  } catch (error) {
    console.error("Error getting multiple OSM details from cache:", error);
    // If there's an error, consider all items as uncached
    return { cachedDetails: [], uncachedItems: items };
  }
}

export async function saveMultipleOSMDetailsToCache(
  details: OSMPlaceDetails[],
): Promise<void> {
  try {
    if (!details.length) return;

    const supabase = await createClient();
    const now = new Date().toISOString();

    // Prepare data for upsert
    const upsertData = details.map((detail) => ({
      osm_type: detail.osm_type,
      osm_id: detail.osm_id.toString(),
      details: detail,
      created_at: now,
    }));

    // Process in batches to avoid request size limitations
    const batchSize = 10;
    for (let i = 0; i < upsertData.length; i += batchSize) {
      const batch = upsertData.slice(i, i + batchSize);

      const { error } = await supabase
        .from("osm_place_details")
        .upsert(batch, { onConflict: "osm_type, osm_id" });

      if (error) {
        console.error("Error saving batch of OSM details to cache:", error);
      }
    }
  } catch (error) {
    console.error("Error saving multiple OSM details to cache:", error);
  }
}
