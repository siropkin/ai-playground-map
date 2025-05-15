import { cache } from "react";

import { Playground } from "@/types/playground";
import { fetchMultipleOSMPlaceDetails } from "@/lib/osm";
import { fetchGoogleMapsDetailsWithCache } from "@/lib/google-maps";
import { fetchPerplexityInsightsWithCache } from "@/lib/perplexity";

async function fetchPlaygroundById(id: string): Promise<Playground | null> {
  let playground: Playground | null = null;

  try {
    const [osmPlaceDetails] = await fetchMultipleOSMPlaceDetails({
      osmIds: [id],
    });

    if (osmPlaceDetails?.type !== "playground") {
      return null;
    }

    playground = {
      id: osmPlaceDetails.osm_id,
      name: null,
      description: null,
      lat: parseFloat(osmPlaceDetails.lat),
      lon: parseFloat(osmPlaceDetails.lon),
      features: null,
      parking: null,
      sources: null,
      address: null,
      images: null,
      osmId: osmPlaceDetails.osm_id,
      osmType: osmPlaceDetails.osm_type,
      osmTags: null,
      enriched: false,
    };

    const details = await fetchGoogleMapsDetailsWithCache({
      lat: playground.lat,
      lon: playground.lon,
    });

    if (details) {
      playground.address = details.formatted_address;

      const insight = await fetchPerplexityInsightsWithCache({
        address: playground.address,
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
    }

    return playground;
  } catch (error) {
    console.error("Error fetching playground details:", error);
    return playground;
  }
}

export const fetchPlaygroundByIdWithCache = cache(fetchPlaygroundById);
