import { Playground } from "@/types/playground";
import { fetchMultipleOSMPlaceDetails } from "@/lib/osm";
import { fetchPerplexityInsightsWithCache } from "@/lib/perplexity";
import { PerplexityLocation } from "@/types/perplexity";
import { parseOsmIdentifier } from "@/lib/utils";

export async function fetchPlaygroundByIdWithCache(id: string): Promise<Playground | null> {
  let playground: Playground | null = null;

  try {
    // Parse OSM identifier to ensure it has the correct format (N/W/R prefix)
    const osmId = parseOsmIdentifier(id);

    const [osmPlaceDetails] = await fetchMultipleOSMPlaceDetails({
      osmIds: [osmId],
    });

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
    };

    // Build location object from OSM address data
    const location: PerplexityLocation = {
      latitude: playground.lat,
      longitude: playground.lon,
      city: osmPlaceDetails.address.city,
      region: osmPlaceDetails.address.state,
      country: osmPlaceDetails.address.country_code?.toUpperCase() || "US",
    };

    const insight = await fetchPerplexityInsightsWithCache({
      location,
      name: playground.name || undefined,
      osmId: osmId,
    });

    if (insight) {
      playground.name = insight.name || playground.name;
      playground.description = insight.description || playground.description;
      playground.features = insight.features || playground.features;
      playground.parking = insight.parking || playground.parking;
      playground.sources = insight.sources || playground.sources;
      playground.images = insight.images || playground.images;
      playground.enriched = true;
    }

    return playground;
  } catch (error) {
    console.error("Error fetching playground details:", error);
    return playground;
  }
}
