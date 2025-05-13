"use client";

import { Playground } from "@/types/playground";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useFilters } from "@/contexts/filters-context";
import { MapBounds } from "@/types/map";
import { OSMPlaceDetails } from "@/types/osm";
import { useDebounce } from "@/lib/hooks";
import { runOSMQuery, fetchOSMPlacesDetails } from "@/lib/osm";

type FlyToCoordinates = [number, number]; // [longitude, latitude]

interface PlaygroundsContextType {
  playgrounds: Playground[];
  loading: boolean;
  enriching: boolean;
  error: string | null;
  flyToCoords: FlyToCoordinates | null;
  requestFlyTo: (coords: FlyToCoordinates) => void;
  clearFlyToRequest: () => void;
}

const PlaygroundsContext = createContext<PlaygroundsContextType | undefined>(
  undefined,
);

/**
 * Directly fetch playground data from OSM without going through an API route
 */
export async function runPlaygroundsSearch(
  bounds: MapBounds,
): Promise<Playground[]> {
  try {
    // Fetch OSM playgrounds directly
    const osmPlaygrounds = await runOSMQuery({
      bounds,
      type: "playground",
      timeout: 5,
      limit: 25,
    });

    if (osmPlaygrounds.length === 0) {
      return [];
    }

    // Process playgrounds - extract only basic data from OSM
    return osmPlaygrounds.map((playground) => ({
      id: playground.id,
      name: playground.tags?.name || null,
      description: playground.tags?.description || null,
      lat: playground.type === "node" ? playground.lat : playground.center?.lat,
      lon: playground.type === "node" ? playground.lon : playground.center?.lon,
      address: null,
      osmId: playground.id,
      osmType: playground.type,
      osmTags: playground.tags,
      enriched: false,
    }));
  } catch (error) {
    console.error("Error fetching playgrounds from OSM:", error);
    return [];
  }
}

/**
 * Directly fetch playground details without going through an API route
 */
export async function fetchPlaygroundsDetails(
  playgrounds: Playground[],
): Promise<OSMPlaceDetails[]> {
  if (!playgrounds.length) return [];

  try {
    return await fetchOSMPlacesDetails({
      items: playgrounds.map((playground) => ({
        id: String(playground.osmId), // Convert number to string
        type: String(playground.osmType), // Ensure type is string
      })),
    });
  } catch (error) {
    console.error("Error enriching playgrounds with OSM data:", error);
    return [];
  }
}

export function PlaygroundsProvider({ children }: { children: ReactNode }) {
  const { mapBounds } = useFilters();

  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<FlyToCoordinates | null>(null);

  // Track which playgrounds need enrichment
  const [pendingEnrichment, setPendingEnrichment] = useState<Playground[]>([]);

  // Fetch basic playground data when bounds change
  const fetchPlaygrounds = useCallback(async () => {
    if (!mapBounds) return;

    setLoading(true);
    setError(null);

    try {
      const playgroundsForBounds = await runPlaygroundsSearch(mapBounds);
      setPlaygrounds(playgroundsForBounds);

      const nonEnriched = playgroundsForBounds.filter((p) => !p.enriched);
      if (nonEnriched.length > 0) {
        setPendingEnrichment(nonEnriched);
      }
    } catch (err) {
      console.error("Error fetching playgrounds:", err);
      setError("Failed to load playgrounds. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [mapBounds]);

  // Debounce the fetch to avoid too many requests when panning/zooming
  const debouncedFetchPlaygrounds = useDebounce(fetchPlaygrounds, 1500);

  // Fetch basic playground data when bounds change
  useEffect(() => {
    debouncedFetchPlaygrounds();
  }, [debouncedFetchPlaygrounds]);

  // Enrich playgrounds with Google data when pendingEnrichment changes
  useEffect(() => {
    const performEnrichment = async () => {
      if (pendingEnrichment.length === 0) return;

      setEnriching(true);
      try {
        const details = await fetchPlaygroundsDetails(pendingEnrichment);

        setPlaygrounds((prev) => {
          const updatedPlaygrounds = [...prev];

          details.forEach((enrichedPlayground) => {
            const index = updatedPlaygrounds.findIndex(
              (p) => p.id === enrichedPlayground.osm_id,
            );
            if (index !== -1) {
              const name = updatedPlaygrounds[index].name;
              const address = enrichedPlayground?.display_name;
              updatedPlaygrounds[index] = {
                ...updatedPlaygrounds[index],
                name,
                address,
                enriched: true,
              };
            }
          });

          return updatedPlaygrounds;
        });

        setPendingEnrichment([]);
      } catch (err) {
        console.error("Error enriching playgrounds:", err);
      } finally {
        setEnriching(false);
      }
    };

    performEnrichment();
  }, [pendingEnrichment]);

  const requestFlyTo = useCallback((coords: FlyToCoordinates) => {
    setFlyToCoords(coords);
  }, []);

  const clearFlyToRequest = useCallback(() => {
    setFlyToCoords(null);
  }, []);

  return (
    <PlaygroundsContext.Provider
      value={{
        playgrounds,
        loading,
        enriching,
        error,
        flyToCoords,
        requestFlyTo,
        clearFlyToRequest,
      }}
    >
      {children}
    </PlaygroundsContext.Provider>
  );
}

export function usePlaygrounds() {
  const context = useContext(PlaygroundsContext);
  if (context === undefined) {
    throw new Error("usePlaygrounds must be used within a PlaygroundsProvider");
  }
  return context;
}
