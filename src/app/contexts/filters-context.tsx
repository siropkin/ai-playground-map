"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from "react";
import { useSearchParams } from "next/navigation";
import type { MapBounds } from "@/types/playground";
import {
  getMapBoundsStateFromUrl,
  roundMapBounds,
  updateUrlWithMapBounds,
} from "@/lib/filters-utils";

interface FiltersContextType {
  mapBounds: MapBounds | null;
  setMapBounds: (bounds: MapBounds) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const searchParams = useSearchParams();

  // Update map bounds only if they have changed
  const updateMapBounds = useCallback((bounds: MapBounds) => {
    setMapBounds((prevState) => {
      const roundedBounds = roundMapBounds(bounds);
      if (
        prevState &&
        prevState.south === roundedBounds.south &&
        prevState.north === roundedBounds.north &&
        prevState.west === roundedBounds.west &&
        prevState.east === roundedBounds.east
      ) {
        return prevState;
      }
      return roundedBounds;
    });
  }, []);

  // Load map bounds from URL when the component mounts
  useEffect(() => {
    const urlBounds = getMapBoundsStateFromUrl();
    if (urlBounds) {
      setMapBounds(roundMapBounds(urlBounds));
    }
    setIsInitialized(true);
  }, []);

  // Update URL when filters change (but only after initialization)
  useEffect(() => {
    if (isInitialized && mapBounds) {
      updateUrlWithMapBounds(roundMapBounds(mapBounds));
    }
  }, [mapBounds, isInitialized]);

  // Update URL when URL parameters change and map bounds where removed (but only after initialization)
  useEffect(() => {
    if (isInitialized && mapBounds) {
      const hasAllBounds =
        searchParams.has("south") &&
        searchParams.has("north") &&
        searchParams.has("west") &&
        searchParams.has("east");
      if (!hasAllBounds) {
        updateUrlWithMapBounds(roundMapBounds(mapBounds));
      }
    }
  }, [mapBounds, isInitialized, searchParams]);

  return (
    <FiltersContext.Provider
      value={{
        mapBounds,
        setMapBounds: updateMapBounds,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
