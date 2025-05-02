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

import type { MapBounds, AccessType, FeatureType } from "@/types/playground";
import {
  roundMapBounds,
  getMapBoundsStateFromUrl,
  updateUrlWithMapBounds,
  getFilterStateFromUrl,
  updateUrlWithFilters,
} from "@/lib/filters-utils";

interface FiltersContextType {
  mapBounds: MapBounds | null;
  setMapBounds: (bounds: MapBounds) => void;
  accesses: AccessType[] | null;
  setAccesses: (accessTypes: AccessType[] | null) => void;
  ages: string[] | null;
  setAges: (ages: string[] | null) => void;
  features: FeatureType[] | null;
  setFeatures: (features: FeatureType[] | null) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [accesses, setAccesses] = useState<AccessType[] | null>(null);
  const [ages, setAges] = useState<string[] | null>(null);
  const [features, setFeatures] = useState<FeatureType[] | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const searchParams = useSearchParams();

  console.log("filters", {
    mapBounds,
    accesses,
    ages,
    features,
    isInitialized,
  });

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

  // Load filters from URL when the component mounts
  useEffect(() => {
    const urlMapBounds = getMapBoundsStateFromUrl();
    if (urlMapBounds) {
      setMapBounds(roundMapBounds(urlMapBounds));
    }
    const urlFilters = getFilterStateFromUrl();
    if (urlFilters) {
      setAccesses(urlFilters.accesses);
      setAges(urlFilters.ages);
      setFeatures(urlFilters.features);
    }
    setIsInitialized(true);
  }, []);

  // Update URL when filters change (but only after initialization)
  useEffect(() => {
    if (isInitialized && mapBounds) {
      updateUrlWithMapBounds(roundMapBounds(mapBounds));
    }
  }, [isInitialized, mapBounds]);

  // Update URL when URL parameters change and map bounds where removed (but only after initialization)
  useEffect(() => {
    if (isInitialized && mapBounds && window.location.pathname === "/") {
      const hasAllBounds =
        searchParams.has("south") &&
        searchParams.has("north") &&
        searchParams.has("west") &&
        searchParams.has("east");
      if (!hasAllBounds) {
        updateUrlWithMapBounds(roundMapBounds(mapBounds));
      }
    }
  }, [isInitialized, mapBounds, searchParams]);

  // Update URL when filters change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      updateUrlWithFilters({
        accesses: accesses || [],
        ages: ages || [],
        features: features || [],
      });
    }
  }, [isInitialized, accesses, ages, features]);

  // Update URL when URL parameters change and filters where removed (but only after initialization)
  useEffect(() => {
    if (isInitialized && window.location.pathname === "/") {
      const hasAllFilters =
        searchParams.has("access") &&
        searchParams.has("age") &&
        searchParams.has("feature");
      if (!hasAllFilters) {
        updateUrlWithFilters({
          accesses: accesses || [],
          ages: ages || [],
          features: features || [],
        });
      }
    }
  }, [isInitialized, accesses, ages, features, searchParams]);

  return (
    <FiltersContext.Provider
      value={{
        mapBounds,
        setMapBounds: updateMapBounds,
        accesses,
        setAccesses,
        ages,
        setAges,
        features,
        setFeatures,
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
