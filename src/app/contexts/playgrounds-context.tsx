"use client";

import type { Playground } from "@/types/playground";
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
import { useFilters } from "@/contexts/filters-context";
import { getPlaygroundsForBounds } from "@/data/playgrounds";
import { AGE_GROUPS } from "@/lib/constants";

const MAX_ZOOM_LEVEL_TO_FETCH_DATA = 5;

type FlyToCoordinates = [number, number]; // [longitude, latitude]

interface PlaygroundsContextType {
  playgrounds: Playground[];
  loading: boolean;
  error: string | null;
  flyToCoords: FlyToCoordinates | null;
  requestFlyTo: (coords: FlyToCoordinates) => void;
  clearFlyToRequest: () => void;
}

const PlaygroundsContext = createContext<PlaygroundsContextType | undefined>(
  undefined,
);

export function PlaygroundsProvider({ children }: { children: ReactNode }) {
  const { mapBounds, accesses, ages, features } = useFilters();

  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<FlyToCoordinates | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFetchPlaygrounds = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        if (mapBounds) {
          const zoomLevel = Math.max(
            Math.abs(mapBounds.north - mapBounds.south),
            Math.abs(mapBounds.east - mapBounds.west),
          );

          if (zoomLevel <= MAX_ZOOM_LEVEL_TO_FETCH_DATA) {
            const playgroundsForBounds =
              await getPlaygroundsForBounds(mapBounds);
            setPlaygrounds(playgroundsForBounds);
          } else {
            setPlaygrounds([]);
          }
        }
      } catch (err) {
        console.error("Error fetching playgrounds:", err);
        setError("Failed to load playgrounds. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [mapBounds]);

  useEffect(() => {
    debouncedFetchPlaygrounds();

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debouncedFetchPlaygrounds]);

  const filteredPlaygrounds = useMemo(() => {
    const accessSet = accesses && accesses.length ? new Set(accesses) : null;
    const ageSet = ages && ages.length ? new Set(ages) : null;
    const featureSet = features && features.length ? new Set(features) : null;

    return playgrounds.filter((playground) => {
      // Filter by access
      if (accessSet && !accessSet.has(playground.accessType)) {
        return false;
      }

      // Filter by ages (check if playground's age range overlaps with any selected age group)
      if (ageSet) {
        const matchesAge = AGE_GROUPS.some((group: any) => {
          if (!ageSet.has(group.key)) return false;
          return (
            playground.ageMin <= group.max && playground.ageMax >= group.min
          );
        });
        if (!matchesAge) return false;
      }

      // Filter by features (must include all selected features)
      if (featureSet) {
        if (
          !features!.every((feature) => playground.features.includes(feature))
        ) {
          return false;
        }
      }

      return true;
    });
  }, [playgrounds, accesses, ages, features]);

  const requestFlyTo = useCallback((coords: FlyToCoordinates) => {
    setFlyToCoords(coords);
  }, []);

  const clearFlyToRequest = useCallback(() => {
    setFlyToCoords(null);
  }, []);

  return (
    <PlaygroundsContext.Provider
      value={{
        playgrounds: filteredPlaygrounds,
        loading,
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
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
