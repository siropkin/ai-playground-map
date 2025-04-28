"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, Point } from "geojson";

import { useFilters } from "@/contexts/filters-context";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { Button } from "@/components/ui/button";
import type { Playground } from "@/types/playground";

if (!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
  console.error("Mapbox Access Token is not set. Map will not function.");
}
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

const SOURCE_ID = "playgrounds";
const CLUSTER_LAYER_ID = "clusters";
const CLUSTER_COUNT_LAYER_ID = "cluster-count";
const UNCLUSTERED_POINT_LAYER_ID = "unclustered-point";
const UNCLUSTERED_LABEL_LAYER_ID = "unclustered-label";
const DEFAULT_BOUNDS: [[number, number], [number, number]] = [
  [-74.2709, 40.48972],
  [-73.7042, 40.93288],
]; // New Your City

const getMapStyle = (theme: string | undefined) => {
  return theme === "light"
    ? "mapbox://styles/mapbox/light-v9"
    : "mapbox://styles/mapbox/dark-v9";
};

const getMapColors = (theme: string | undefined) => {
  return theme === "light"
    ? {
        point: "#000000",
        label: "#000000",
        clusterBg: "#000000",
        clusterText: "#FFFFFF",
        pointStroke: "#FFFFFF",
        labelHalo: "#FFFFFF",
      }
    : {
        point: "#FFFFFF",
        label: "#FFFFFF",
        clusterBg: "#FFFFFF",
        clusterText: "#000000",
        pointStroke: "#000000",
        labelHalo: "#000000",
      };
};

const getMapBounds = (map: mapboxgl.Map | null) => {
  if (!map) {
    return { south: 0, north: 0, west: 0, east: 0 };
  }
  const bounds = map.getBounds();
  return {
    south: bounds!.getSouth(),
    north: bounds!.getNorth(),
    west: bounds!.getWest(),
    east: bounds!.getEast(),
  };
};

const createGeoJson = (
  playgrounds: Playground[],
): FeatureCollection<Point, { id: number; name: string }> => {
  return {
    type: "FeatureCollection",
    features: playgrounds.map((playground) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [playground.longitude, playground.latitude],
      },
      properties: {
        id: playground.id,
        name: playground.name,
      },
    })),
  };
};

export function MapView() {
  const { theme } = useTheme();
  const { mapBounds, setMapBounds } = useFilters();
  const { playgrounds, flyToCoords, clearFlyToRequest } = usePlaygrounds();
  const router = useRouter(); // Get router instance

  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playgroundsGeoJson = useCallback((): FeatureCollection<
    Point,
    { id: number; name: string }
  > => {
    return createGeoJson(playgrounds || []);
  }, [playgrounds]);

  const updateMapStyle = useCallback(
    (currentMap: mapboxgl.Map, currentTheme: string | undefined) => {
      currentMap.setStyle(getMapStyle(currentTheme));
    },
    [],
  );

  const updateMapDataLayers = useCallback(
    (currentMap: mapboxgl.Map | null, currentTheme: string | undefined) => {
      if (!currentMap) {
        return;
      }

      const source = currentMap.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(playgroundsGeoJson());
        return;
      }

      const mapColors = getMapColors(currentTheme);

      // Source for GeoJSON data
      currentMap.addSource(SOURCE_ID, {
        type: "geojson",
        data: playgroundsGeoJson(),
        cluster: true,
        clusterMaxZoom: 9,
        clusterRadius: 15,
      });

      // Layer for Clusters (Circles)
      currentMap.addLayer({
        id: CLUSTER_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": mapColors.clusterBg,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15, // Small clusters
            100,
            20, // Medium clusters
            750,
            25, // Large clusters
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": mapColors.clusterText,
        },
      });

      // Layer for Cluster Counts (Text)
      currentMap.addLayer({
        id: CLUSTER_COUNT_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": mapColors.clusterText,
        },
      });

      // Layer for Unclustered Points (Circles)
      currentMap.addLayer({
        id: UNCLUSTERED_POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": mapColors.point,
          "circle-radius": 10,
          "circle-stroke-width": 1,
          "circle-stroke-color": mapColors.pointStroke,
        },
      });

      // Layer for Unclustered Point Labels (Playground Name)
      currentMap.addLayer({
        id: UNCLUSTERED_LABEL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "text-field": ["get", "name"], // Get the 'name' property from GeoJSON features
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-offset": [1.5, 0], // Offset text slightly to the right [x, y]
          "text-anchor": "left", // Anchor text to the left of the point
          "text-justify": "left",
          "text-size": 12,
          "text-allow-overlap": true, // Prevent labels overlapping points/other labels if desired
          "text-optional": false, // Hide label if it doesn't fit
        },
        paint: {
          "text-color": mapColors.label,
          "text-halo-color": mapColors.labelHalo,
          "text-halo-width": 1,
        },
      });
    },
    [playgroundsGeoJson],
  );

  const handleNearMeClick = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Oops! Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (map.current) {
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 14,
          });
        }
      },
      (error) => {
        console.error("Error fetching location:", error);
        alert("Oops! Unable to fetch your location. Please try again.");
      },
    );
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer) {
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer,
        style: getMapStyle(theme),
        attributionControl: false,
      });

      if (mapBounds) {
        map.current.fitBounds(
          [
            [mapBounds.west, mapBounds.south],
            [mapBounds.east, mapBounds.north],
          ],
          {
            animate: false,
          },
        );
      } else {
        map.current.fitBounds(DEFAULT_BOUNDS, {
          animate: false,
        });
      }

      map.current.on("load", () => {
        setIsMapLoaded(true);
        setMapBounds(getMapBounds(map.current));
      });

      map.current.on("moveend", () => {
        setMapBounds(getMapBounds(map.current));
      });
    } catch (error) {
      setError(
        "Oops! The map is taking a timeout on the swings. Check back soon!",
      );
      console.error("Error initializing map:", error);
    }
  }, [mapContainer, theme, mapBounds, setMapBounds]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (map.current && isMapLoaded) {
      const waiting = () => {
        if (!map.current!.isStyleLoaded()) {
          timeout = setTimeout(waiting, 200);
        } else {
          updateMapDataLayers(map.current, theme);
        }
      };
      waiting();
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [isMapLoaded, theme, updateMapDataLayers]);

  useEffect(() => {
    if (map.current && isMapLoaded) {
      updateMapStyle(map.current, theme);
    }
  }, [theme, isMapLoaded, updateMapStyle]);

  useEffect(() => {
    if (map.current && flyToCoords) {
      map.current.flyTo({
        center: flyToCoords,
        zoom: 14,
        essential: true,
      });
      clearFlyToRequest();
    }
  }, [flyToCoords, clearFlyToRequest]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) {
      return undefined;
    }

    const handlePointClick = (
      e: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      },
    ) => {
      e.originalEvent.stopPropagation();
      const feature = e.features?.[0];
      if (feature && feature.properties?.id) {
        router.push(`/playground/${feature.properties.id}`);
      }
    };

    const handleMouseEnter = () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = "pointer";
      }
    };

    const handleMouseLeave = () => {
      if (map.current) {
        map.current.getCanvas().style.cursor = "";
      }
    };

    map.current.on("click", UNCLUSTERED_POINT_LAYER_ID, handlePointClick);
    map.current.on("mouseenter", UNCLUSTERED_POINT_LAYER_ID, handleMouseEnter);
    map.current.on("mouseleave", UNCLUSTERED_POINT_LAYER_ID, handleMouseLeave);

    return () => {
      if (map.current) {
        try {
          map.current.off(
            "click",
            UNCLUSTERED_POINT_LAYER_ID,
            handlePointClick,
          );
          map.current.off(
            "mouseenter",
            UNCLUSTERED_POINT_LAYER_ID,
            handleMouseEnter,
          );
          map.current.off(
            "mouseleave",
            UNCLUSTERED_POINT_LAYER_ID,
            handleMouseLeave,
          );
          map.current.getCanvas().style.cursor = "";
        } catch (error) {}
      }
    };
  }, [isMapLoaded, router]);

  useEffect(() => {
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [theme]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {error}
      </div>
    );
  }

  return (
    <>
      <div ref={setMapContainer} className="h-full w-full" />
      <div className="absolute right-4 bottom-4 z-10">
        <Button
          variant="outline"
          aria-label="Filter by near me"
          onClick={handleNearMeClick}
        >
          <MapPin className="h-4 w-4" />
          <span>Near me</span>
        </Button>
      </div>
    </>
  );
}
