"use client";

import {
  AccessType,
  FeatureType,
  MapBounds,
  OpenHours,
  Playground,
  PlaygroundPhoto,
  SurfaceType,
} from "@/types/playground";
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
// import { getPlaygroundsForBounds } from "@/data/playgrounds";
import {
  AGE_GROUPS,
  APP_ADMIN_ROLE,
  MAX_ZOOM_LEVEL_TO_FETCH_DATA,
} from "@/lib/constants";
import { useAuth } from "@/contexts/auth-context";

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
export async function getPlaygroundsForBounds(
  bounds: MapBounds,
): Promise<Playground[]> {
  try {
    // Construct the URL with bounds parameters
    const url = new URL("/api/playgrounds/research", window.location.origin);
    url.searchParams.append("south", bounds.south.toString());
    url.searchParams.append("north", bounds.north.toString());
    url.searchParams.append("west", bounds.west.toString());
    url.searchParams.append("east", bounds.east.toString());

    // Fetch data from the research API
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (
      !data.results ||
      !Array.isArray(data.results) ||
      data.results.length === 0
    ) {
      return [];
    }

    // Transform the research API data to match the Playground type
    const playgrounds: Playground[] = data.results.map(
      (result: any, index: number) => {
        const osmData = result.osmData;
        const googleData = result.googleData;
        console.log(index, "OSM Data:", osmData);
        console.log(index, "Google Data:", googleData);
        // Default values for required fields
        const defaultOpenHours: OpenHours = {
          monday: { open: "09:00", close: "18:00" },
          tuesday: { open: "09:00", close: "18:00" },
          wednesday: { open: "09:00", close: "18:00" },
          thursday: { open: "09:00", close: "18:00" },
          friday: { open: "09:00", close: "18:00" },
          saturday: { open: "09:00", close: "18:00" },
          sunday: { open: "09:00", close: "18:00" },
        };

        // Extract city, state, zip from address if available
        let city = "";
        let state = "";
        let zipCode = "";

        if (googleData?.googleMapsData?.address) {
          const addressParts = googleData.googleMapsData.address.split(", ");
          if (addressParts.length >= 3) {
            city = addressParts[addressParts.length - 3] || "";

            // Last part might contain state and zip
            const stateZip = addressParts[addressParts.length - 2] || "";
            const stateZipMatch = stateZip.match(
              /([A-Z]{2})\s+(\d{5}(-\d{4})?)/,
            );

            if (stateZipMatch) {
              state = stateZipMatch[1] || "";
              zipCode = stateZipMatch[2] || "";
            } else {
              state = stateZip;
            }
          }
        }

        // Create photos array from Google data
        const photos: PlaygroundPhoto[] = [];

        if (googleData?.photos && Array.isArray(googleData.photos)) {
          // Find the photo with the highest rating to set as primary
          let primaryPhotoIndex = 0;

          // If we have a rating, use the first photo as primary (most relevant)
          if (
            googleData.googleMapsData?.rating &&
            googleData.googleMapsData.rating !== "N/A"
          ) {
            primaryPhotoIndex = 0;
          }

          googleData.photos.forEach((photo: any, photoIndex: number) => {
            if (photo.url) {
              photos.push({
                filename: photo.url,
                caption:
                  googleData.googleMapsData?.name ||
                  osmData.name ||
                  "Playground",
                isPrimary: photoIndex === primaryPhotoIndex,
                createdAt: new Date().toISOString(),
              });
            }
          });
        }

        // Extract features from OSM tags
        const features: FeatureType[] = [];

        if (osmData.tags) {
          // Map OSM tags to our feature types
          if (osmData.tags.swing) features.push("swings");
          if (osmData.tags.slide) features.push("slides");
          if (osmData.tags.climbing) features.push("climbing_wall");
          if (osmData.tags.water) features.push("water_play");
          if (osmData.tags.sand) features.push("sandpit");
          if (osmData.tags.bench) features.push("benches");
          if (osmData.tags.toilet) features.push("restrooms");
          if (osmData.tags.parking) features.push("parking_lot");
          if (osmData.tags.wheelchair) features.push("wheelchair_accessible");
          if (osmData.tags.drinking_water) features.push("water_fountain");
        }

        return {
          id: parseInt(osmData.id) || index + 1,
          name:
            googleData?.googleMapsData?.name ||
            osmData.name ||
            "Unnamed Playground",
          description:
            osmData.tags?.description ||
            "A playground found through area research.",
          latitude: osmData.latitude,
          longitude: osmData.longitude,
          address: googleData?.googleMapsData?.address || "Address unavailable",
          city,
          state,
          zipCode,
          ageMin: 2, // Default age range
          ageMax: 12,
          openHours: defaultOpenHours,
          accessType: "public" as AccessType, // Default to public
          surfaceType: "grass" as SurfaceType, // Default surface type
          features,
          photos,
          isApproved: true, // Auto-approve research results
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
    );

    return playgrounds;
  } catch (error) {
    console.error("Error fetching playgrounds from research API:", error);
    return [];
  }
}

export function PlaygroundsProvider({ children }: { children: ReactNode }) {
  const { mapBounds, approvals, accesses, ages, features } = useFilters();
  const { user } = useAuth();

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
            // Fetch playgrounds from the research API instead of the database
            // This will get data from OpenStreetMap and Google Maps
            const playgroundsForBounds =
              await getPlaygroundsForBounds(mapBounds);

            console.log("Fetched playgrounds:", playgroundsForBounds);
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
    const isAdmin = user?.role === APP_ADMIN_ROLE;
    const accessSet = accesses && accesses.length ? new Set(accesses) : null;
    const ageSet = ages && ages.length ? new Set(ages) : null;
    const featureSet = features && features.length ? new Set(features) : null;

    return playgrounds.filter((playground) => {
      // Filter isn't approved if it's not admin
      if (!isAdmin && !playground.isApproved) {
        return false;
      }

      // Filter by approval
      if (
        approvals &&
        approvals.length &&
        !approvals.includes(playground.isApproved)
      ) {
        return false;
      }

      // Filter by access
      if (accessSet && !accessSet.has(playground.accessType)) {
        return false;
      }

      // Filter by ages (check if playground's age range overlaps with any selected age group)
      if (ageSet) {
        const matchesAge = AGE_GROUPS.some(
          (group: { key: string; min: number; max: number }) => {
            if (!ageSet.has(group.key)) return false;
            return (
              playground.ageMin <= group.max && playground.ageMax >= group.min
            );
          },
        );
        if (!matchesAge) return false;
      }

      // Filter by features (must include all selected features)
      if (featureSet && features) {
        if (
          !features.every((feature) => playground.features.includes(feature))
        ) {
          return false;
        }
      }

      return true;
    });
  }, [playgrounds, approvals, accesses, ages, features, user]);

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
    throw new Error("usePlaygrounds must be used within a PlaygroundsProvider");
  }
  return context;
}
