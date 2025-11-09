"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
import { calculatePlaygroundTier } from "@/lib/tier-calculator";
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
  selectedPlayground: Playground | null;
  selectPlayground: (playground: Playground) => void;
  clearSelectedPlayground: () => void;
}

const PlaygroundsContext = createContext<PlaygroundsContextType | undefined>(
  undefined,
);

export function PlaygroundsProvider({ children }: { children: ReactNode }) {
  const { mapBounds } = useFilters();

  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<FlyToCoordinates | null>(null);
  const [selectedPlayground, setSelectedPlayground] = useState<Playground | null>(null);

  // Abort controller for canceling enrichment requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref to store enrichPlaygroundsBatch function for eager enrichment
  const enrichPlaygroundsBatchRef = useRef<(ids: number[]) => Promise<void>>(() => Promise.resolve());

  const localFetchPlaygrounds = useCallback(
    async (signal?: AbortSignal) => {
      if (!mapBounds) return;

      setLoading(true);
      setError(null);

      try {
        const playgroundsForBounds = await searchPlaygrounds(mapBounds, signal);
        if (!signal?.aborted) {
          // Merge new OSM data with existing enriched AI data
          let newPlaygroundIds: number[] = [];
          setPlaygrounds((prevPlaygrounds) => {
            const enrichedMap = new Map(
              prevPlaygrounds
                .filter(p => p.enriched)
                .map(p => [p.osmId, p])
            );

            const updatedPlaygrounds = playgroundsForBounds.map(newPlayground => {
              const existingEnriched = enrichedMap.get(newPlayground.osmId);

              if (existingEnriched) {
                // Merge: use fresh OSM data but preserve AI-enriched fields
                return {
                  ...newPlayground, // Fresh OSM data (coordinates, address, tags)
                  // Preserve AI-enriched fields
                  name: existingEnriched.name,
                  description: existingEnriched.description,
                  features: existingEnriched.features,
                  parking: existingEnriched.parking,
                  sources: existingEnriched.sources,
                  images: existingEnriched.images,
                  accessibility: existingEnriched.accessibility,
                  tier: existingEnriched.tier,
                  tierScore: existingEnriched.tierScore,
                  enriched: true,
                };
              }

              // Track new (non-enriched) playgrounds for eager enrichment
              newPlaygroundIds.push(newPlayground.osmId);

              // New playground - ensure tier fields are null
              return {
                ...newPlayground,
                tier: null,
                tierScore: null,
              };
            });

            return updatedPlaygrounds;
          });

          // Eagerly enrich new playgrounds from cache immediately after fetch
          if (newPlaygroundIds.length > 0 && !signal?.aborted) {
            // Process in batches of 5
            for (let i = 0; i < newPlaygroundIds.length; i += 5) {
              const batch = newPlaygroundIds.slice(i, i + 5);
              enrichPlaygroundsBatchRef.current(batch);
            }
          }
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
    if (!mapBounds) return;

    const controller = new AbortController();
    debouncedFetchPlaygrounds(controller.signal);

    // Abort previous request when bounds change to prevent race conditions
    return () => {
      controller.abort();
    };
    // debouncedFetchPlaygrounds is stable, no need to include in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapBounds]);

  // Enrich a single playground
  const enrichPlayground = useCallback(
    async (playgroundId: number) => {
      const playground = playgrounds.find((p) => p.osmId === playgroundId);
      if (!playground || playground.enriched) return;

      try {
        const osmIdFormatted = playground.osmType && playground.osmId
          ? `${playground.osmType[0].toUpperCase()}${playground.osmId}`
          : undefined;

        // PERFORMANCE OPTIMIZATION: Try cache-only check first with osmId
        // This saves 100-500ms of Nominatim reverse geocoding for cached results
        let insight = await generatePlaygroundAiInsights({
          name: playground.name || undefined,
          osmId: osmIdFormatted,
          signal: abortControllerRef.current?.signal,
        });

        // If cache miss and we have osmId, fetch location and try full enrichment
        if (!insight && osmIdFormatted) {
          const location = await fetchLocationData(
            playground.lat,
            playground.lon,
            abortControllerRef.current?.signal,
          );

          if (!location) return;

          insight = await generatePlaygroundAiInsights({
            location,
            name: playground.name || undefined,
            osmId: osmIdFormatted,
            signal: abortControllerRef.current?.signal,
          });
        }

        // Calculate tier from insights
        const tierResult = calculatePlaygroundTier(insight);

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
                  accessibility: insight?.accessibility || p.accessibility,
                  tier: tierResult.tier,
                  tierScore: tierResult.score,
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
            osmId: p.osmType && p.osmId
              ? `${p.osmType[0].toUpperCase()}${p.osmId}`
              : undefined,
          })),
          signal: abortControllerRef.current?.signal,
        });

        // Update playgrounds with insights
        setPlaygrounds((prev) =>
          prev.map((p) => {
            const result = results.find((r) => r.playgroundId === p.osmId);
            if (!result) return p; // No result for this playground

            // Calculate tier from insights
            const tierResult = calculatePlaygroundTier(result.insights);

            // Mark as enriched even if insights is null (enrichment completed but found nothing)
            return {
              ...p,
              name: result.insights?.name || p.name,
              description: result.insights?.description || p.description,
              features: result.insights?.features || p.features,
              parking: result.insights?.parking || p.parking,
              sources: result.insights?.sources || p.sources,
              images: result.insights?.images || p.images,
              accessibility: result.insights?.accessibility || p.accessibility,
              tier: tierResult.tier,
              tierScore: tierResult.score,
              enriched: true, // Always mark as enriched, even if insights is null
            };
          }),
        );
      } catch (error) {
        console.error("Error enriching playgrounds batch:", error);
      }
    },
    [playgrounds],
  );

  // Update ref when enrichPlaygroundsBatch changes
  useEffect(() => {
    enrichPlaygroundsBatchRef.current = enrichPlaygroundsBatch;
  }, [enrichPlaygroundsBatch]);

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

  const selectPlayground = useCallback((playground: Playground) => {
    setSelectedPlayground(playground);
  }, []);

  const clearSelectedPlayground = useCallback(() => {
    setSelectedPlayground(null);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      playgrounds,
      loading,
      error,
      flyToCoords,
      requestFlyTo,
      clearFlyToRequest,
      enrichPlayground,
      enrichPlaygroundsBatch,
      selectedPlayground,
      selectPlayground,
      clearSelectedPlayground,
    }),
    [
      playgrounds,
      loading,
      error,
      flyToCoords,
      requestFlyTo,
      clearFlyToRequest,
      enrichPlayground,
      enrichPlaygroundsBatch,
      selectedPlayground,
      selectPlayground,
      clearSelectedPlayground,
    ],
  );

  return (
    <PlaygroundsContext.Provider value={contextValue}>
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
