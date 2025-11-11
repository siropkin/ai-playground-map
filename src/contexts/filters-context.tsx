"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
  useMemo,
} from "react";
import { usePathname } from "next/navigation";

import {
  roundMapBounds,
  getMapBoundsStateFromUrl,
  updateUrlWithMapBounds,
  getMapBoundsFromSession,
} from "@/lib/utils";
import { MapBounds } from "@/types/map";
import { useDebounce } from "@/lib/hooks";

interface FiltersContextType {
  mapBounds: MapBounds | null;
  setMapBounds: (bounds: MapBounds) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);

  // Update map bounds only if they have changed
  const updateMapBounds = useCallback((bounds: MapBounds) => {
    setMapBounds((prevState) => {
      const roundedBounds = roundMapBounds(bounds);
      if (
        prevState &&
        prevState.south === roundedBounds?.south &&
        prevState.north === roundedBounds?.north &&
        prevState.west === roundedBounds?.west &&
        prevState.east === roundedBounds?.east
      ) {
        return prevState;
      }
      return roundedBounds;
    });
  }, []);

  // Load filters from URL or session storage when the component mounts
  useEffect(() => {
    // Priority: URL params > session storage > null
    let initialBounds = getMapBoundsStateFromUrl();

    if (!initialBounds) {
      // No URL params, check session storage
      initialBounds = getMapBoundsFromSession();

      if (initialBounds) {
        // Update URL to match session storage
        updateUrlWithMapBounds(initialBounds);
      }
    }

    setMapBounds(initialBounds ? roundMapBounds(initialBounds) : null);
    setIsInitialized(true);
  }, []);

  // Debounced URL update to prevent janky navigation during map movements
  const debouncedUpdateUrl = useDebounce((bounds: MapBounds | null) => {
    updateUrlWithMapBounds(bounds);
  }, 500);

  // Update URL when map bounds change (but only after initialization)
  useEffect(() => {
    if (isInitialized && pathname === "/") {
      debouncedUpdateUrl(roundMapBounds(mapBounds));
    }
    // debouncedUpdateUrl is stable, no need to include in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, pathname, mapBounds]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      mapBounds,
      setMapBounds: updateMapBounds,
    }),
    [mapBounds, updateMapBounds],
  );

  return (
    <FiltersContext.Provider value={contextValue}>
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
