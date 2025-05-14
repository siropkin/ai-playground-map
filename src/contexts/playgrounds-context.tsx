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
import { OSMPlaceDetails } from "@/types/osm";
import { useDebounce } from "@/lib/hooks";
import {
  fetchPlaygrounds as apiGetPlaygrounds,
  fetchPlaygroundDetails as apiGetPlaygroundDetails,
  fetchPlaygroundDescription,
} from "@/lib/api";
import { PerplexityAIQueryData } from "@/types/perplexity";

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

const formatAddress = (d: OSMPlaceDetails) => {
  // E Street NE, Washington, DC 20002
  if (!d.address) {
    return null;
  }
  return `${d.address.road}, ${d.address.city}, ${d.address.state} ${d.address.postcode}`;
};

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
  const fetchPlaygrounds = useCallback(
    async (signal?: AbortSignal) => {
      if (!mapBounds) return;

      setLoading(true);
      setError(null);

      try {
        const playgroundsForBounds = await apiGetPlaygrounds(mapBounds, signal);

        // Check if the request was aborted before updating state
        if (!signal?.aborted) {
          setPlaygrounds(playgroundsForBounds);

          const nonEnriched = playgroundsForBounds.filter((p) => !p.enriched);
          if (nonEnriched.length > 0) {
            setPendingEnrichment(nonEnriched);
          }
        }
      } catch (err) {
        // Only update error state if not aborted
        if (
          !(err instanceof DOMException && err.name === "AbortError") &&
          !signal?.aborted
        ) {
          console.error("Error fetching playgrounds:", err);
          setError("Failed to load playgrounds. Please try again.");
        }
      } finally {
        // Only update loading state if not aborted
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [mapBounds],
  );

  // Debounce the fetch to avoid too many requests when panning/zooming
  const debouncedFetchPlaygrounds = useDebounce(fetchPlaygrounds, 1500);

  // Fetch basic playground data when bounds change
  useEffect(() => {
    // Create a controller for this effect instance
    const controller = new AbortController();

    const fetchData = async () => {
      // Call the debounced function which will eventually trigger fetchPlaygrounds
      debouncedFetchPlaygrounds();
    };

    fetchData();

    // Cleanup function to abort fetch if component unmounts or dependencies change
    return () => {
      controller.abort();
    };
  }, [debouncedFetchPlaygrounds]);

  // Enrich playgrounds with Google data when pendingEnrichment changes
  useEffect(() => {
    if (pendingEnrichment.length === 0) return;

    const performEnrichment = async (signal?: AbortSignal) => {
      setEnriching(true);

      try {
        const details = await apiGetPlaygroundDetails(
          pendingEnrichment,
          signal,
        );

        // Check if request was aborted
        if (signal?.aborted) return;

        // Update address and enriched flag
        setPlaygrounds((prev) =>
          prev.map((p) => {
            const enriched = details.find(
              (d: OSMPlaceDetails) => d.osm_id === p.id,
            );
            return enriched
              ? {
                  ...p,
                  address: formatAddress(enriched),
                  enriched: true,
                }
              : p;
          }),
        );

        // Fetch and set playground descriptions using OpenAI
        const descriptions: Record<string, PerplexityAIQueryData | null> = {};

        await Promise.all(
          details.map(async (enrichedPlayground: OSMPlaceDetails) => {
            const address = formatAddress(enrichedPlayground);
            if (address) {
              // Use the same signal for all description requests
              const desc = await fetchPlaygroundDescription(address, signal);

              // Only update if not aborted
              if (!signal?.aborted) {
                descriptions[enrichedPlayground.osm_id] = desc;
              }
            }
          }),
        );

        // Check if the main request was aborted before updating state
        if (!signal?.aborted) {
          setPlaygrounds((prev) =>
            prev.map((p) => {
              const desc = descriptions[p.id];
              return desc
                ? {
                    ...p,
                    name: desc.name || p.name,
                    description: desc.description || p.description,
                  }
                : p;
            }),
          );

          setPendingEnrichment([]);
        }
      } catch (err) {
        // Only update error state if not aborted
        if (
          !(err instanceof DOMException && err.name === "AbortError") &&
          !signal?.aborted
        ) {
          console.error("Error enriching playgrounds:", err);
        }
      } finally {
        // Only update loading state if not aborted
        if (!signal?.aborted) {
          setEnriching(false);
        }
      }
    };

    // Create a controller for this effect instance
    const controller = new AbortController();

    const fetchData = async () => {
      await performEnrichment();
    };

    fetchData();

    // Cleanup function to abort fetch if component unmounts or dependencies change
    return () => {
      controller.abort();
    };
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
