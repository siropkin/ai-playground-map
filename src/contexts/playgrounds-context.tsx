"use client";

import { Playground } from "@/types/playground";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useDebounce } from "@/lib/hooks";
import { useFilters } from "@/contexts/filters-context";
import { AGE_GROUPS } from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";
import { MapBounds } from "@/types/map";
import { OSMPlaceDetails } from "@/types/osm";

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

// Fetch basic playground data from OSM
export async function getPlaygroundsForBounds(
  bounds: MapBounds,
): Promise<Playground[]> {
  try {
    const url = new URL("/api/playgrounds", window.location.origin);
    url.searchParams.append("south", bounds.south.toString());
    url.searchParams.append("north", bounds.north.toString());
    url.searchParams.append("west", bounds.west.toString());
    url.searchParams.append("east", bounds.east.toString());

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error fetching playgrounds from OSM API:", error);
    return [];
  }
}

// Enrich playground data with Google Places information
export async function playgroundsDetails(
  playgrounds: Playground[],
): Promise<OSMPlaceDetails[]> {
  if (!playgrounds.length) return [];

  try {
    const response = await fetch("/api/playgrounds/details", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playgrounds }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Error enriching playgrounds with Google data:", error);
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
      const playgroundsForBounds = await getPlaygroundsForBounds(mapBounds);
      setPlaygrounds(playgroundsForBounds);

      // Queue non-enriched playgrounds for enrichment
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
  const debouncedFetchPlaygrounds = useDebounce(fetchPlaygrounds, 1000);

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
        const enriched = await playgroundsDetails(pendingEnrichment);

        // Update the playgrounds state with enriched data
        setPlaygrounds((prev) => {
          const updatedPlaygrounds = [...prev];

          // Replace each enriched playground in the array
          enriched.forEach((enrichedPlayground) => {
            const index = updatedPlaygrounds.findIndex(
              (p) => p.id === enrichedPlayground.osm_id,
            );
            if (index !== -1) {
              console.log(enrichedPlayground);
              // Return enriched playground data
              const name =
                enrichedPlayground?.localname ||
                enrichedPlayground?.names?.name ||
                updatedPlaygrounds[index].name;
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

        // Clear pending enrichment
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
