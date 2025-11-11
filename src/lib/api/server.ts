import { Playground } from "@/types/playground";
import { fetchMultipleOSMPlaceDetails } from "@/lib/osm";
import { fetchGeminiInsightsWithCache } from "@/lib/gemini";
import { fetchPlaygroundImages } from "@/lib/images";
import { AILocation } from "@/types/ai-insights";
import { parseOsmIdentifier } from "@/lib/utils";

export async function fetchPlaygroundByIdWithCache(id: string): Promise<Playground | null> {
  let playground: Playground | null = null;

  try {
    // Parse OSM identifier to ensure it has the correct format (N/W/R prefix)
    const osmId = parseOsmIdentifier(id);

    let osmPlaceDetails;

    // If ID doesn't have a prefix (just a number), try all three types
    if (/^\d+$/.test(id)) {
      // Try Node, Way, and Relation in order (most playgrounds are nodes or ways)
      const osmIds = [`N${id}`, `W${id}`, `R${id}`];
      const results = await fetchMultipleOSMPlaceDetails({ osmIds });
      osmPlaceDetails = results.find(result => result && result.type === "playground");
    } else {
      // Has prefix, use it directly
      const [result] = await fetchMultipleOSMPlaceDetails({ osmIds: [osmId] });
      osmPlaceDetails = result;
    }

    if (!osmPlaceDetails) {
      return null;
    }

    if (osmPlaceDetails?.type !== "playground") {
      return null;
    }

    playground = {
      id: osmPlaceDetails.osm_id,
      name: osmPlaceDetails.name || null,
      description: null,
      lat: parseFloat(osmPlaceDetails.lat),
      lon: parseFloat(osmPlaceDetails.lon),
      features: null,
      parking: null,
      sources: null,
      address: osmPlaceDetails.display_name || null,
      images: null,
      osmId: osmPlaceDetails.osm_id,
      osmType: osmPlaceDetails.osm_type,
      osmTags: null,
      enriched: false,
      accessibility: null,
      tier: null,
      tierReasoning: null,
    };

    // Build location object from OSM address data
    const location: AILocation = {
      latitude: playground.lat,
      longitude: playground.lon,
      city: osmPlaceDetails.address.city,
      region: osmPlaceDetails.address.state,
      country: osmPlaceDetails.address.country_code?.toUpperCase() || "US",
    };

    // Construct the correct osmId from the found playground (not the initial parsed one)
    const typePrefix = osmPlaceDetails.osm_type.charAt(0).toUpperCase();
    const correctOsmId = `${typePrefix}${osmPlaceDetails.osm_id}`;

    // Start AI and Images in parallel when possible
    // Images depend on having at least some name (OSM name or later AI-updated name)
    const insightPromise = fetchGeminiInsightsWithCache({
      location,
      name: playground.name || undefined,
      osmId: correctOsmId,
    });

    // Wait for AI insights first to get image_search_queries
    const insight = await insightPromise;

    if (insight) {
      playground.name = insight.name || playground.name;
      playground.description = insight.description || playground.description;
      playground.features = insight.features || playground.features;
      playground.parking = insight.parking || playground.parking;
      playground.sources = insight.sources || playground.sources;
      playground.accessibility = insight.accessibility || playground.accessibility;
      playground.tier = insight.tier || playground.tier;
      playground.tierReasoning = insight.tier_reasoning || playground.tierReasoning;
      playground.imageSearchQueries = insight.image_search_queries || null;
      playground.enriched = true;
    }

    // Fetch images with Gemini-generated queries
    // Note: Images are NOT stored in ai_insights_cache anymore (v17 migration)
    if (playground.enriched && playground.name) {
      let images = null;
      try {

        images = await fetchPlaygroundImages({
          playgroundName: playground.name,
          city: osmPlaceDetails.address.city,
          region: osmPlaceDetails.address.state,
          country: osmPlaceDetails.address.country_code,
          osmId: correctOsmId,
          imageSearchQueries: insight?.image_search_queries || null,
        });
      } catch {
        images = null;
      }
      if (images) {
        playground.images = images;
      }
    }

    return playground;
  } catch (error) {
    console.error("[API Server] ❌ Error fetching playground details:", error);
    return playground;
  }
}
