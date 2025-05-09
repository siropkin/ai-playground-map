"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useCallback,
} from "react";
import { usePathname } from "next/navigation";

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
  approvals: boolean[] | null;
  setApprovals: (approvals: boolean[] | null) => void;
  accesses: AccessType[] | null;
  setAccesses: (accessTypes: AccessType[] | null) => void;
  ages: string[] | null;
  setAges: (ages: string[] | null) => void;
  features: FeatureType[] | null;
  setFeatures: (features: FeatureType[] | null) => void;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [approvals, setApprovals] = useState<boolean[] | null>(null);
  const [accesses, setAccesses] = useState<AccessType[] | null>(null);
  const [ages, setAges] = useState<string[] | null>(null);
  const [features, setFeatures] = useState<FeatureType[] | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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

  // Load filters from URL when the component mounts
  useEffect(() => {
    const urlMapBounds = getMapBoundsStateFromUrl();
    setMapBounds(urlMapBounds ? roundMapBounds(urlMapBounds) : null);

    const urlFilters = getFilterStateFromUrl();
    setApprovals(urlFilters?.approvals || null);
    setAccesses(urlFilters?.accesses || null);
    setAges(urlFilters?.ages || null);
    setFeatures(urlFilters?.features || null);

    setIsInitialized(true);
  }, []);

  // Update URL when filters change (but only after initialization)
  useEffect(() => {
    if (isInitialized && pathname === "/") {
      updateUrlWithMapBounds(roundMapBounds(mapBounds));
    }
  }, [isInitialized, pathname, mapBounds]);

  // Update URL when filters change (but only after initialization)
  useEffect(() => {
    if (isInitialized && pathname === "/") {
      updateUrlWithFilters({
        approvals,
        accesses,
        ages,
        features,
      });
    }
  }, [isInitialized, pathname, approvals, accesses, ages, features]);

  return (
    <FiltersContext.Provider
      value={{
        mapBounds,
        setMapBounds: updateMapBounds,
        approvals,
        setApprovals,
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
