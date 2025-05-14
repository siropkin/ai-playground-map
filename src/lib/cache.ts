import { OSMPlaceDetails } from "@/types/osm";
import { createClient } from "@/lib/supabase/server";

const CACHE_TTL_MS = 365 * 24 * 60 * 60 * 1000; // Cache TTL (1 year in milliseconds)
const OSM_PLACE_DETAILS_TABLE_NAME = "osm_place_details";
const AI_INSIGHTS_TABLE_NAME = "playground_descriptions";

export async function getMultipleOSMPlaceDetailsFromCache(
  items: { id: number; type: string }[],
): Promise<{
  cachedDetails: OSMPlaceDetails[];
  uncachedItems: { id: number; type: string }[];
}> {
  try {
    if (!items.length) return { cachedDetails: [], uncachedItems: [] };

    const supabase = await createClient();
    const now = Date.now();

    const cachedDetails: OSMPlaceDetails[] = [];
    const uncachedItems: { id: number; type: string }[] = [];

    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const filterConditions = batch
        .map((item) => {
          return `(osm_type.eq.${item.type},osm_id.eq.${item.id})`;
        })
        .join(",");

      const { data, error } = await supabase
        .from(OSM_PLACE_DETAILS_TABLE_NAME)
        .select("osm_type, osm_id, details, created_at")
        .or(filterConditions);

      if (error || !data) {
        uncachedItems.push(...batch);
        continue;
      }

      for (const item of batch) {
        const cacheEntry = data.find(
          (entry) => entry.osm_type === item.type && entry.osm_id === item.id,
        );

        if (cacheEntry) {
          const createdAt = new Date(cacheEntry.created_at).getTime();

          if (now - createdAt < CACHE_TTL_MS) {
            cachedDetails.push(cacheEntry.details as OSMPlaceDetails);
          } else {
            uncachedItems.push(item);

            await supabase
              .from(OSM_PLACE_DETAILS_TABLE_NAME)
              .delete()
              .eq("osm_type", item.type)
              .eq("osm_id", item.id);
          }
        } else {
          uncachedItems.push(item);
        }
      }
    }

    return { cachedDetails, uncachedItems };
  } catch (error) {
    console.error("Error getting multiple OSM details from cache:", error);
    return { cachedDetails: [], uncachedItems: items };
  }
}

export async function saveMultipleOSMPlaceDetailsToCache(
  details: OSMPlaceDetails[],
): Promise<void> {
  try {
    if (!details.length) return;

    const supabase = await createClient();
    const now = new Date().toISOString();

    const upsertData = details.map((detail) => ({
      osm_type: detail.osm_type,
      osm_id: detail.osm_id.toString(),
      details: detail,
      created_at: now,
    }));

    const batchSize = 10;
    for (let i = 0; i < upsertData.length; i += batchSize) {
      const batch = upsertData.slice(i, i + batchSize);

      const { error } = await supabase
        .from(OSM_PLACE_DETAILS_TABLE_NAME)
        .upsert(batch, { onConflict: "osm_type, osm_id" });

      if (error) {
        console.error("Error saving multiple OSM details to cache:", error);
      }
    }
  } catch (error) {
    console.error("Error saving multiple OSM details to cache:", error);
  }
}

export async function getAiInsightsFromCache(
  address: string,
): Promise<string | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from(AI_INSIGHTS_TABLE_NAME)
      .select("description, created_at")
      .eq("address", address)
      .single();

    if (error || !data) {
      return null;
    }

    const createdAt = new Date(data.created_at).getTime();
    const now = Date.now();

    if (now - createdAt > CACHE_TTL_MS) {
      await supabase
        .from(AI_INSIGHTS_TABLE_NAME)
        .delete()
        .eq("address", address);

      return null;
    }

    return data.description;
  } catch (error) {
    console.error("Error getting AI insights from cache:", error);
    return null;
  }
}

export async function saveAiInsightsToCache(
  address: string,
  description: string,
): Promise<void> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from(AI_INSIGHTS_TABLE_NAME).upsert(
      {
        address,
        description,
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
