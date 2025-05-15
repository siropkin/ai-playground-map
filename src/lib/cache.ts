import { GoogleMapsPlaceDetails } from "@/types/google-maps";
import { createClient } from "@/lib/supabase/server";
import { PerplexityInsights } from "@/types/perplexity";

// TODO: Move to env params?
const PERPLEXITY_CACHE_TTL_MS = 365 * 24 * 60 * 60 * 1000; // Cache TTL (1 year in milliseconds)
const PERPLEXITY_INSIGHTS_CACHE_TABLE_NAME = "perplexity_insights_cache";
const PLACE_DETAILS_CACHE_TABLE_NAME = "place_details_cache";

export async function fetchPerplexityInsightsFromCache(
  address: string,
): Promise<PerplexityInsights | null> {
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

export async function savePerplexityInsightsToCache(
  address: string,
  insights: PerplexityInsights,
): Promise<void> {
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

// Google Maps cache functions
export async function getMultipleGoogleMapsPlaceDetailsFromCache(
  items: { id: number; type: string; lat: number; lon: number }[],
): Promise<{
  cachedDetails: GoogleMapsPlaceDetails[];
  uncachedItems: { id: number; type: string; lat: number; lon: number }[];
}> {
  try {
    if (!items.length) return { cachedDetails: [], uncachedItems: [] };

    const supabase = await createClient();
    const now = Date.now();

    const cachedDetails: GoogleMapsPlaceDetails[] = [];
    const uncachedItems: {
      id: number;
      type: string;
      lat: number;
      lon: number;
    }[] = [];

    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const filterConditions = batch
        .map((item) => {
          return `(osm_type.eq.${item.type},osm_id.eq.${item.id})`;
        })
        .join(",");

      const { data, error } = await supabase
        .from(PLACE_DETAILS_CACHE_TABLE_NAME)
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

          if (now - createdAt < PERPLEXITY_CACHE_TTL_MS) {
            // Convert Google Maps details to OSM format for compatibility
            const googleDetails = cacheEntry.details as GoogleMapsPlaceDetails;
            cachedDetails.push(googleDetails);
          } else {
            uncachedItems.push(item);

            await supabase
              .from(PLACE_DETAILS_CACHE_TABLE_NAME)
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
    console.error("Error getting Google Maps details from cache:", error);
    return { cachedDetails: [], uncachedItems: items };
  }
}

export async function saveMultipleGoogleMapsPlaceDetailsToCache(
  details: GoogleMapsPlaceDetails[],
): Promise<void> {
  try {
    if (!details.length) return;

    const supabase = await createClient();
    const now = new Date().toISOString();

    const upsertData = details.map((detail) => ({
      osm_type: detail.osm_type,
      osm_id: (detail.osm_id || 0).toString(),
      details: detail,
      created_at: now,
    }));

    const batchSize = 10;
    for (let i = 0; i < upsertData.length; i += batchSize) {
      const batch = upsertData.slice(i, i + batchSize);

      const { error } = await supabase
        .from(PLACE_DETAILS_CACHE_TABLE_NAME)
        .upsert(batch, { onConflict: "osm_type, osm_id" });

      if (error) {
        console.error("Error saving Google Maps details to cache:", error);
      }
    }
  } catch (error) {
    console.error("Error saving Google Maps details to cache:", error);
  }
}
