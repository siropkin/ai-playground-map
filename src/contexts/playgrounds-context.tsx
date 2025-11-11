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
  generatePlaygroundAiInsightsBatch,
  fetchPlaygroundImages,
} from "@/lib/api/client";
// Tier calculation now done by Gemini AI - no longer needed locally
import { useDebounce } from "@/lib/hooks";
import { isValidImageUrl } from "@/lib/utils";

type FlyToCoordinates = [number, number]; // [longitude, latitude]

// Validate accessibility data structure to reject old/malformed cache data
function validateAccessibility(accessibility: unknown): Playground["accessibility"] {
  // New format: array of strings (v6+)
  if (Array.isArray(accessibility)) {
    // Validate it's an array of strings
    if (accessibility.every(item => typeof item === "string")) {
      return accessibility;
    }
    return null;
  }

  // Old format: object (v5 and earlier) - reject
  if (accessibility && typeof accessibility === "object") {
    return null;
  }

  return null;
}

interface PlaygroundsContextType {
  playgrounds: Playground[];
  loading: boolean;
  error: string | null;
  flyToCoords: FlyToCoordinates | null;
  requestFlyTo: (coords: FlyToCoordinates) => void;
  clearFlyToRequest: () => void;
  enrichPlayground: (playgroundId: number) => Promise<void>;
  enrichPlaygroundsBatch: (playgroundIds: number[]) => Promise<void>;
  loadImagesForPlayground: (playgroundId: number) => Promise<void>;
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
  const [selectedPlaygroundId, setSelectedPlaygroundId] = useState<number | null>(null);

  // Abort controller for canceling enrichment requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref to store enrichPlaygroundsBatch function for eager enrichment
  const enrichPlaygroundsBatchRef = useRef<(ids: number[]) => Promise<void>>(() => Promise.resolve());

  // Track recently enriched playgrounds to prevent duplicate requests
  const recentlyEnrichedRef = useRef<Map<number, number>>(new Map()); // playgroundId -> timestamp

  // Track which playgrounds we've already queued for enrichment to avoid re-processing
  const enrichmentQueuedRef = useRef<Set<number>>(new Set()); // playgroundId set

  const localFetchPlaygrounds = useCallback(
    async (signal?: AbortSignal) => {
      if (!mapBounds) return;

      setLoading(true);
      setError(null);

      try {
        const playgroundsForBounds = await searchPlaygrounds(mapBounds, signal);
        if (!signal?.aborted) {
          // Merge new OSM data with existing enriched AI data
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
                  // Preserve AI-enriched fields (validate accessibility to reject old schema)
                  name: existingEnriched.name,
                  description: existingEnriched.description,
                  features: existingEnriched.features,
                  parking: existingEnriched.parking,
                  sources: existingEnriched.sources,
                  images: existingEnriched.images,
                  accessibility: validateAccessibility(existingEnriched.accessibility),
                  tier: existingEnriched.tier,
                  tierReasoning: existingEnriched.tierReasoning,
                  imageSearchQueries: existingEnriched.imageSearchQueries,
                  enriched: true,
                };
              }

              // Check if new playground already has enrichment data from API
              if (newPlayground.enriched) {
                return newPlayground;
              }

              // New unenriched playground - ensure tier fields are null
              return {
                ...newPlayground,
                tier: null,
                tierReasoning: null,
              };
            });

            return updatedPlaygrounds;
          });
        }
      } catch (err) {
        if (
          !(err instanceof DOMException && err.name === "AbortError") &&
          !signal?.aborted
        ) {
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

  // ✅ OPTIMIZATION COMPLETE: /api/search now checks cache and returns enrichment data if available
  // This eliminates unnecessary cache-hit requests on page refresh (see src/app/api/search/route.ts:128-174)
  //
  // COMMENTED OUT: Auto-enrichment effect disabled - now handled by /api/search
  // Kept here for reference in case we need client-side enrichment fallback
  // useEffect(() => {
  //   // Filter for unenriched playgrounds that haven't been queued yet
  //   const unenrichedPlaygrounds = playgrounds.filter(
  //     p => !p.enriched && !enrichmentQueuedRef.current.has(p.osmId)
  //   );

  //   if (unenrichedPlaygrounds.length === 0) return;

  //   console.log(`[ContextPlaygrounds] 🚀 Auto-enriching ${unenrichedPlaygrounds.length} new unenriched playgrounds`);

  //   // Mark these as queued to prevent re-processing
  //   unenrichedPlaygrounds.forEach(p => enrichmentQueuedRef.current.add(p.osmId));

  //   // Calculate map center for distance-based prioritization
  //   const mapCenter = mapBounds ? {
  //     lat: (mapBounds.north + mapBounds.south) / 2,
  //     lon: (mapBounds.east + mapBounds.west) / 2,
  //   } : null;

  //   // Sort playgrounds by distance from center (center-to-edge prioritization)
  //   const sortedPlaygrounds = mapCenter
  //     ? [...unenrichedPlaygrounds].sort((a, b) => {
  //         const distA = Math.sqrt(
  //           Math.pow(a.lat - mapCenter.lat, 2) +
  //           Math.pow(a.lon - mapCenter.lon, 2)
  //         );
  //         const distB = Math.sqrt(
  //           Math.pow(b.lat - mapCenter.lat, 2) +
  //           Math.pow(b.lon - mapCenter.lon, 2)
  //         );
  //         return distA - distB;
  //       })
  //     : unenrichedPlaygrounds;

  //   const allPlaygroundIds = sortedPlaygrounds.map(p => p.osmId);

  //   // Process in batches of 5 sequentially to avoid overwhelming the backend
  //   // Center playgrounds (most likely visible) will be enriched first
  //   // NOTE: AI enrichment no longer fetches images - images loaded separately
  //   (async () => {
  //     for (let i = 0; i < allPlaygroundIds.length; i += 5) {
  //       const batch = allPlaygroundIds.slice(i, i + 5);
  //       await enrichPlaygroundsBatchRef.current(batch);
  //     }
  //   })();
  // }, [playgrounds, mapBounds]);

  // Enrich a single playground
  // Uses batch API internally for consistency (AI insights only, no images)
  const enrichPlayground = useCallback(
    async (playgroundId: number) => {
      await enrichPlaygroundsBatchRef.current([playgroundId]);
    },
    [], // Uses ref to avoid circular dependency
  );

  // Enrich multiple playgrounds in a batch (max 5)
  // NOTE: This only fetches AI insights - use loadImagesForPlayground for images
  const enrichPlaygroundsBatch = useCallback(
    async (playgroundIds: number[]) => {
      // Filter out recently enriched playgrounds (within last 5 seconds)
      const now = Date.now();
      const DEDUPE_WINDOW = 5000; // 5 seconds
      const filteredIds = playgroundIds.filter(id => {
        const lastEnriched = recentlyEnrichedRef.current.get(id);
        return !lastEnriched || (now - lastEnriched) > DEDUPE_WINDOW;
      });

      if (filteredIds.length === 0) {
        return;
      }

      // Mark these playgrounds as being enriched
      filteredIds.forEach(id => recentlyEnrichedRef.current.set(id, now));

      // Clean up old entries (older than 10 seconds)
      const cutoff = now - 10000;
      for (const [id, timestamp] of recentlyEnrichedRef.current.entries()) {
        if (timestamp < cutoff) {
          recentlyEnrichedRef.current.delete(id);
        }
      }

      // Get current playground state using setState callback to avoid stale closures
      let playgroundsToEnrich: Playground[] = [];
      await new Promise<void>(resolve => {
        setPlaygrounds((prev) => {
          playgroundsToEnrich = prev
            .filter((p) => filteredIds.includes(p.osmId))
            .slice(0, 5); // Limit to 5 per batch
          resolve();
          return prev; // Don't modify state here
        });
      });

      if (playgroundsToEnrich.length === 0) {
        return;
      }

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

        // Update playgrounds with insights and location data
        setPlaygrounds((prev) =>
          prev.map((p) => {
            const result = results.find((r) => r.playgroundId === p.osmId);
            if (!result) return p; // No result for this playground

            // Remove from queued set since enrichment completed
            enrichmentQueuedRef.current.delete(p.osmId);

            // Filter out invalid image URLs from old cache (x-raw-image:// format from Gemini pre-v5.0.0)
            const validImages = result.insights?.images?.filter(img =>
              isValidImageUrl(img.image_url)
            ) || null;

            // Tier now comes directly from Gemini AI (no local calculation)
            // Mark as enriched even if insights is null (enrichment completed but found nothing)
            return {
              ...p,
              name: result.insights?.name || p.name,
              description: result.insights?.description || p.description,
              features: result.insights?.features || p.features,
              parking: result.insights?.parking || p.parking,
              sources: result.insights?.sources || p.sources,
              images: validImages && validImages.length > 0 ? validImages : p.images,
              accessibility: validateAccessibility(result.insights?.accessibility) || p.accessibility,
              tier: result.insights?.tier || null,
              tierReasoning: result.insights?.tier_reasoning || null,
              // Store location data for later image fetching
              city: result.location?.city || p.city,
              region: result.location?.region || p.region,
              country: result.location?.country || p.country,
              // Store Gemini-generated image search queries
              imageSearchQueries: result.insights?.image_search_queries || null,
              enriched: true, // Always mark as enriched, even if insights is null
            };
          }),
        );
      } catch {
        // Remove from queued set on error so they can be retried
        filteredIds.forEach(id => enrichmentQueuedRef.current.delete(id));
      }
    },
    [], // No dependencies - we get playgrounds from setState callback
  );

  // Load images for a specific playground (lazy loading on visibility)
  // Uses separate image service (src/lib/images.ts) - not Gemini
  const loadImagesForPlayground = useCallback(
    async (playgroundId: number) => {
      // Get playground from current state
      let playground: Playground | undefined;
      await new Promise<void>(resolve => {
        setPlaygrounds((prev) => {
          playground = prev.find((p) => p.osmId === playgroundId);
          resolve();
          return prev;
        });
      });

      // Skip if playground not found, already has images, or not enriched yet
      if (!playground || playground.images || !playground.enriched) {
        return;
      }

      // Skip if no name (can't search for images without a name)
      if (!playground.name) {
        return;
      }

      try {
        const osmIdFormatted = playground.osmType && playground.osmId
          ? `${playground.osmType[0].toUpperCase()}${playground.osmId}`
          : undefined;

        // Fetch images from Google Custom Search (separate service)
        // Use location data from AI enrichment for better search accuracy
        const images = await fetchPlaygroundImages({
          playgroundName: playground.name,
          city: playground.city, // From AI enrichment geocoding
          region: playground.region, // From AI enrichment geocoding
          country: playground.country, // From AI enrichment geocoding
          osmId: osmIdFormatted,
          signal: abortControllerRef.current?.signal,
          imageSearchQueries: playground.imageSearchQueries || null, // Use Gemini-generated queries
        });

        // Update only if we got images
        if (images && images.length > 0) {
          setPlaygrounds((prev) =>
            prev.map((p) =>
              p.osmId === playgroundId
                ? {
                    ...p,
                    images,
                  }
                : p,
            ),
          );
        }
      } catch {
        // Silently fail - images are optional
      }
    },
    [], // No dependencies - we get playground from setState callback
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
    setSelectedPlaygroundId(playground.osmId);
    // Update URL with query param
    const url = new URL(window.location.href);
    url.searchParams.set('playground', playground.osmId.toString());
    window.history.pushState({}, '', url.toString());
  }, []);

  const clearSelectedPlayground = useCallback(() => {
    setSelectedPlaygroundId(null);
    // Remove query param from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('playground');
    window.history.pushState({}, '', url.toString());
  }, []);

  // Initialize from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playgroundId = params.get('playground');

    if (playgroundId) {
      setSelectedPlaygroundId(parseInt(playgroundId, 10));
    }
  }, []);

  // Derive selectedPlayground from playgrounds array to always get latest data
  const selectedPlayground = useMemo(() => {
    if (!selectedPlaygroundId) return null;
    return playgrounds.find(p => p.osmId === selectedPlaygroundId) || null;
  }, [selectedPlaygroundId, playgrounds]);

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
      loadImagesForPlayground,
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
      loadImagesForPlayground,
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
