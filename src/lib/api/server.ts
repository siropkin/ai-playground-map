import { cache } from "react";
import { Playground } from "@/types/playground";
import { fetchMultipleOSMPlaceDetails } from "@/lib/osm";
import { GoogleMapsPlaceDetails } from "@/types/google-maps";
import { getMultipleGoogleMapsPlaceDetails } from "@/lib/google-maps";
import {
  fetchPerplexityInsights,
  fetchPerplexityInsightsWithCache,
} from "@/lib/perplexity";

async function _fetchPlaygroundById(id: string): Promise<Playground | null> {
  try {
    const [osmPlaceDetails] = await fetchMultipleOSMPlaceDetails({
      osmIds: [id],
    });

    if (!osmPlaceDetails) {
      return null;
    }

    if (!osmPlaceDetails.lat || !osmPlaceDetails.lon) {
      return null;
    }

    // Create the base playground object
    const playground: Playground = {
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

    // Enrich with Google Maps data
    const items = [
      {
        id: playground.osmId,
        type: (playground.osmType || "").toString(),
        lat: playground.lat,
        lon: playground.lon,
      },
    ];

    // Use Google Maps for reverse geocoding instead of OSM
    const details: GoogleMapsPlaceDetails[] =
      await getMultipleGoogleMapsPlaceDetails({
        items,
      });

    if (details.length > 0 && details[0].formatted_address) {
      playground.address = details[0].formatted_address;

      const aiInsight = await fetchPerplexityInsightsWithCache(
        playground.address,
      );

      if (aiInsight) {
        playground.name = aiInsight.name || playground.name;
        playground.description =
          aiInsight.description || playground.description;
        playground.features = aiInsight.features || playground.features;
        playground.parking = aiInsight.parking || playground.parking;
        playground.sources = aiInsight.sources || playground.sources;
        playground.images = aiInsight.images || playground.images;
        playground.enriched = true;
      }
    }

    return playground;
  } catch (error) {
    console.error("Error fetching playground details:", error);
    return null;
  }
}

export const fetchPlaygroundById = cache(_fetchPlaygroundById);
