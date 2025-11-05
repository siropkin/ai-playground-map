"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { Playground } from "@/types/playground";
import { useFilters } from "@/contexts/filters-context";
import {
  searchPlaygrounds,
  fetchLocationData,
  generatePlaygroundAiInsights,
  generatePlaygroundAiInsightsBatch,
} from "@/lib/api/client";
import { useDebounce } from "@/lib/hooks";

type FlyToCoordinates = [number, number]; // [longitude, latitude]

interface PlaygroundsContextType {
  playgrounds: Playground[];
  loading: boolean;
  error: string | null;
  flyToCoords: FlyToCoordinates | null;
  requestFlyTo: (coords: FlyToCoordinates) => void;
  clearFlyToRequest: () => void;
  enrichPlayground: (playgroundId: number) => Promise<void>;
  enrichPlaygroundsBatch: (playgroundIds: number[]) => Promise<void>;
}

const PlaygroundsContext = createContext<PlaygroundsContextType | undefined>(
  undefined,
);

export function PlaygroundsProvider({ children }: { children: ReactNode }) {
  const { mapBounds } = useFilters();

  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<FlyToCoordinates | null>(null);

  // Abort controller for canceling enrichment requests
  const abortControllerRef = useRef<AbortController | null>(null);

  const localFetchPlaygrounds = useCallback(
    async (signal?: AbortSignal) => {
      if (!mapBounds) return;

      setLoading(true);
      setError(null);

      try {
        const playgroundsForBounds = await searchPlaygrounds(mapBounds, signal);
        if (!signal?.aborted) {
          setPlaygrounds(playgroundsForBounds);
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

  const debouncedFetchPlaygrounds = useDebounce(localFetchPlaygrounds, 1000);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async (signal?: AbortSignal) => {
      debouncedFetchPlaygrounds(signal);
    };
    fetchData(controller.signal);
    // TODO: This is the abort controller place. If user move map too fast - I think it worth to abort then continue and save the results
    // return () => {
    //   controller.abort();
    // };
  }, [debouncedFetchPlaygrounds]);

  // Enrich a single playground
  const enrichPlayground = useCallback(
    async (playgroundId: number) => {
      const playground = playgrounds.find((p) => p.osmId === playgroundId);
      if (!playground || playground.enriched) return;

      try {
        const location = await fetchLocationData(
          playground.lat,
          playground.lon,
          abortControllerRef.current?.signal,
        );

        if (!location) return;

        const insight = await generatePlaygroundAiInsights({
          location,
          name: playground.name || undefined,
          signal: abortControllerRef.current?.signal,
        });

        setPlaygrounds((prev) =>
          prev.map((p) =>
            p.osmId === playgroundId
              ? {
                  ...p,
                  name: insight?.name || p.name,
                  description: insight?.description || p.description,
                  features: insight?.features || p.features,
                  parking: insight?.parking || p.parking,
                  sources: insight?.sources || p.sources,
                  images: insight?.images || p.images,
                  enriched: true,
                }
              : p,
          ),
        );
      } catch (error) {
        console.error(`Error enriching playground ${playgroundId}:`, error);
      }
    },
    [playgrounds],
  );

  // Enrich multiple playgrounds in a batch (max 5)
  const enrichPlaygroundsBatch = useCallback(
    async (playgroundIds: number[]) => {
      const playgroundsToEnrich = playgrounds
        .filter((p) => playgroundIds.includes(p.osmId) && !p.enriched)
        .slice(0, 5); // Limit to 5 per batch

      if (playgroundsToEnrich.length === 0) return;

      try {
        const results = await generatePlaygroundAiInsightsBatch({
          playgrounds: playgroundsToEnrich.map((p) => ({
            id: p.osmId,
            lat: p.lat,
            lon: p.lon,
            name: p.name || undefined,
          })),
          signal: abortControllerRef.current?.signal,
        });

        // Update playgrounds with insights
        setPlaygrounds((prev) =>
          prev.map((p) => {
            const result = results.find((r) => r.playgroundId === p.osmId);
            if (!result || !result.insights) return p;

            return {
              ...p,
              name: result.insights.name || p.name,
              description: result.insights.description || p.description,
              features: result.insights.features || p.features,
              parking: result.insights.parking || p.parking,
              sources: result.insights.sources || p.sources,
              images: result.insights.images || p.images,
              enriched: true,
            };
          }),
        );
      } catch (error) {
        console.error("Error enriching playgrounds batch:", error);
      }
    },
    [playgrounds],
  );

  // Cleanup on unmount
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

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
        error,
        flyToCoords,
        requestFlyTo,
        clearFlyToRequest,
        enrichPlayground,
        enrichPlaygroundsBatch,
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
