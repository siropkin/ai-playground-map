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
import {
  fetchPlaygrounds as apiGetPlaygrounds,
  fetchPlaygroundDetails as apiGetPlaygroundDetails,
  fetchPlaygroundDescription
} from "@/lib/api";

type FlyToCoordinates = [number, number]; // [longitude, latitude]

interface PlaygroundsContextType {
  playgrounds: Playground[];
  loading: boolean;
  enriching: boolean;
  error: string | null;
  flyToCoords: FlyToCoordinates | null;
  requestFlyTo: (coords: FlyToCoordinates) => void;
  clearFlyToRequest: () => void;
  getPlaygroundDescription: (address: string) => Promise<string | null>;
}

const PlaygroundsContext = createContext<PlaygroundsContextType | undefined>(
  undefined,
);


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
      const playgroundsForBounds = await apiGetPlaygrounds(mapBounds);
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
    if (pendingEnrichment.length === 0) return;

    const performEnrichment = async () => {
      setEnriching(true);
      try {
        const details = await apiGetPlaygroundDetails(pendingEnrichment);

        // Update address and enriched flag
        setPlaygrounds((prev) =>
          prev.map((p) => {
            const enriched = details.find((d: OSMPlaceDetails) => d.osm_id === p.id);
            return enriched
              ? {
                  ...p,
                  address: enriched.display_name,
                  enriched: true,
                }
              : p;
          }),
        );

        // Fetch and set playground descriptions using OpenAI
        const descriptions: Record<string, string | null> = {};
        await Promise.all(
          details.map(async (enrichedPlayground: OSMPlaceDetails) => {
            const address = enrichedPlayground?.display_name;
            if (address) {
              const desc = await fetchPlaygroundDescription(address);
              descriptions[enrichedPlayground.osm_id] = desc;
            }
          }),
        );
        setPlaygrounds((prev) =>
          prev.map((p) =>
            descriptions[p.id] ? { ...p, description: descriptions[p.id] } : p,
          ),
        );

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
        getPlaygroundDescription: fetchPlaygroundDescription, // Expose in context
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
