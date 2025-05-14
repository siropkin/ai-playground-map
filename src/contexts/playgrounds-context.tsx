"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Playground } from "@/types/playground";
import { useFilters } from "@/contexts/filters-context";
import {
  fetchPlaygrounds as apiFetchPlaygrounds,
  fetchMultiplePlaygroundDetails as apiFetchMultiplePlaygroundDetails,
  generatePlaygroundAiInsights as apiGeneratePlaygroundAiInsight,
} from "@/lib/api";
import { useDebounce } from "@/lib/hooks";

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

export function PlaygroundsProvider({ children }: { children: ReactNode }) {
  const { mapBounds } = useFilters();

  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [pendingEnrichment, setPendingEnrichment] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<FlyToCoordinates | null>(null);

  const fetchPlaygrounds = useCallback(
    async (signal?: AbortSignal) => {
      if (!mapBounds) return;

      setLoading(true);
      setError(null);

      try {
        const playgroundsForBounds = await apiFetchPlaygrounds(
          mapBounds,
          signal,
        );
        if (!signal?.aborted) {
          setPlaygrounds(playgroundsForBounds);
          setPendingEnrichment(playgroundsForBounds);
        }
      } catch (err) {
        if (
          !(err instanceof DOMException && err.name === "AbortError") &&
          !signal?.aborted
        ) {
          console.error("Error fetching playgrounds:", err);
          setError("Failed to load playgrounds. Please try again.");
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [mapBounds],
  );

  const debouncedFetchPlaygrounds = useDebounce(fetchPlaygrounds, 1500);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async (signal?: AbortSignal) => {
      debouncedFetchPlaygrounds(signal);
    };
    fetchData(controller.signal);
    return () => {
      controller.abort();
    };
  }, [debouncedFetchPlaygrounds]);

  useEffect(() => {
    if (pendingEnrichment.length === 0) return;

    const performEnrichment = async (signal?: AbortSignal) => {
      setEnriching(true);

      try {
        const details = await apiFetchMultiplePlaygroundDetails(
          pendingEnrichment,
          signal,
        );

        if (signal?.aborted) return;

        await Promise.all(
          details.map(async (d) => {
            if (!d.formatted_address) {
              return;
            }

            const aiInsight = await apiGeneratePlaygroundAiInsight(
              d.formatted_address,
              signal,
            );

            if (signal?.aborted) {
              return;
            }

            setPlaygrounds((prev) => {
              return prev.map((p) =>
                p.osmId === d.osm_id
                  ? {
                      ...p,
                      name: aiInsight?.name || p.name,
                      description: aiInsight?.description || p.description,
                      address: d.formatted_address,
                      features: aiInsight?.features || p.features,
                      parking: aiInsight?.parking || p.parking,
                      sources: aiInsight?.sources || p.sources,
                      images: aiInsight?.images || p.images,
                      enriched: true,
                    }
                  : p,
              );
            });
          }),
        );

        setPendingEnrichment([]);
      } catch (err) {
        if (
          !(err instanceof DOMException && err.name === "AbortError") &&
          !signal?.aborted
        ) {
          console.error("Error enriching playgrounds:", err);
        }
      } finally {
        if (!signal?.aborted) {
          setEnriching(false);
        }
      }
    };

    const controller = new AbortController();

    const fetchData = async () => {
      await performEnrichment(controller.signal);
    };

    fetchData();

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
