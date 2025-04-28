"use client";

import type { Playground } from "@/lib/types";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFilters } from "@/contexts/filters-context";
import { getPlaygroundsForBounds } from "@/data/playgrounds";

interface PlaygroundsContextType {
  playgrounds: Playground[];
  loading: boolean;
  error: string | null;
}

const PlaygroundsContext = createContext<PlaygroundsContextType | undefined>(
  undefined,
);

export function PlaygroundsProvider({ children }: { children: ReactNode }) {
  // const { filters, mapBounds } = useFilters();
  const { mapBounds } = useFilters();

  const [playgrounds, setPlaygrounds] = useState<Playground[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          const playgroundsForBounds = await getPlaygroundsForBounds(mapBounds);
          setPlaygrounds(playgroundsForBounds);
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

  // const filteredPlaygrounds = useMemo(
  //   () =>
  //     playgrounds.filter((playground) => {
  //       // Filter by access
  //       if (filters.accesses && filters.accesses.length > 0) {
  //         const hasAllAccesses = filters.accesses.every(
  //           (access) => playground.access === access,
  //         );
  //         if (!hasAllAccesses) return false;
  //       }
  //
  //       // Filter by ages
  //       if (filters.ages && filters.ages.length > 0) {
  //         const hasAllAgeRanges = filters.ages.every((ageRange) =>
  //           playground.ages.includes(ageRange),
  //         );
  //         if (!hasAllAgeRanges) return false;
  //       }
  //
  //       // Filter by features
  //       if (filters.features && filters.features.length > 0) {
  //         const hasAllFeatures = filters.features.every((feature) =>
  //           playground.features.includes(feature),
  //         );
  //         if (!hasAllFeatures) return false;
  //       }
  //
  //       return true;
  //     }),
  //   [playgrounds, filters],
  // );

  return (
    <PlaygroundsContext.Provider
      value={{
        // playgrounds: filteredPlaygrounds,
        playgrounds,
        loading,
        error,
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
