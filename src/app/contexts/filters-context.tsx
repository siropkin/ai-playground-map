"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { FilterState, MapBounds } from "@/lib/types";
import {
  getFilterStateFromUrl,
  updateUrlWithFilters,
} from "@/lib/filter-utils";

interface FiltersContextType {
  filters: FilterState;
  mapBounds: MapBounds | null;
  setMapBounds: (bounds: MapBounds) => void;
  toggleAgeRange: (ageRange: string) => void;
  toggleAccess: (access: string) => void;
  toggleFeature: (feature: string) => void;
  clearFilters: () => void;
  isFilterActive: (filterType: string, value: string) => boolean;
}

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>({
    ageRanges: [],
    access: [],
    features: [],
  });
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize filters from URL on client-side
  useEffect(() => {
    const urlFilters = getFilterStateFromUrl();
    setFilters(urlFilters);
    setIsInitialized(true);
  }, []);

  // Update URL when filters change (but only after initialization)
  useEffect(() => {
    if (isInitialized) {
      updateUrlWithFilters(filters);
    }
  }, [filters, isInitialized]);

  const toggleAgeRange = (ageRange: string) => {
    setFilters((prev) => {
      const newAgeRanges = prev.ageRanges.includes(ageRange)
        ? prev.ageRanges.filter((a) => a !== ageRange)
        : [...prev.ageRanges, ageRange];

      return {
        ...prev,
        ageRanges: newAgeRanges,
      };
    });
  };

  const toggleAccess = (access: string) => {
    setFilters((prev) => {
      const newAccess = prev.access.includes(access)
        ? prev.access.filter((a) => a !== access)
        : [...prev.access, access];

      return {
        ...prev,
        access: newAccess,
      };
    });
  };

  const toggleFeature = (feature: string) => {
    setFilters((prev) => {
      const newFeatures = prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature];

      return {
        ...prev,
        features: newFeatures,
      };
    });
  };

  const clearFilters = () => {
    setFilters({ ageRanges: [], access: [], features: [] });
  };

  const isFilterActive = (filterType: string, value: string): boolean => {
    switch (filterType) {
      case "age":
        return filters.ageRanges.includes(value);
      case "access":
        return filters.access.includes(value);
      case "feature":
        return filters.features.includes(value);
      default:
        return false;
    }
  };

  return (
    <FiltersContext.Provider
      value={{
        filters,
        mapBounds,
        setMapBounds,
        toggleAgeRange,
        toggleAccess,
        toggleFeature,
        clearFilters,
        isFilterActive,
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
