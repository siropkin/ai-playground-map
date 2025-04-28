"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, Point } from "geojson";
import { useTheme } from "next-themes";
import { useFilters } from "@/contexts/filters-context";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import type { Playground } from "@/lib/types";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

const SOURCE_ID = "playgrounds";
const CLUSTER_LAYER_ID = "clusters";
const CLUSTER_COUNT_LAYER_ID = "cluster-count";
const UNCLUSTERED_POINT_LAYER_ID = "unclustered-point";
const UNCLUSTERED_LABEL_LAYER_ID = "unclustered-label";
const DEFAULT_CENTER: [number, number] = [-73.9712, 40.7831]; // New York City
const DEFAULT_ZOOM = 12;

const getMapTheme = (theme: string | undefined) => {
  return theme === "light"
    ? "mapbox://styles/mapbox/light-v9"
    : "mapbox://styles/mapbox/dark-v9";
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
  const { setMapBounds } = useFilters();
  const { playgrounds } = usePlaygrounds();

  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const playgroundsGeoJson = useCallback(() => {
    return createGeoJson(playgrounds || []);
  }, [playgrounds]);

  const addMapDataLayers = useCallback(
    (currentMap: mapboxgl.Map | null, currentTheme: string | undefined) => {
      if (!currentMap) {
        return;
      }

      const pointColor = currentTheme === "dark" ? "#FFFFFF" : "#000000";
      const labelColor = currentTheme === "dark" ? "#FFFFFF" : "#000000";
      const clusterBackgroundColor =
        currentTheme === "dark" ? "#FFFFFF" : "#000000";
      const clusterTextColor = currentTheme === "dark" ? "#000000" : "#FFFFFF";

      if (!currentMap.getSource(SOURCE_ID)) {
        currentMap.addSource(SOURCE_ID, {
          type: "geojson",
          data: playgroundsGeoJson(),
          cluster: true,
          clusterMaxZoom: 9,
          clusterRadius: 15,
        });
      } else {
        (currentMap.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
          playgroundsGeoJson(),
        );
      }

      // Layer for Clusters (Circles)
      if (!currentMap.getLayer(CLUSTER_LAYER_ID)) {
        currentMap.addLayer({
          id: CLUSTER_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": clusterBackgroundColor,
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
            "circle-stroke-color": clusterTextColor, // Contrast border
          },
        });
      }

      // Layer for Cluster Counts (Text)
      if (!currentMap.getLayer(CLUSTER_COUNT_LAYER_ID)) {
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
            "text-color": clusterTextColor,
          },
        });
      }

      // Layer for Unclustered Points (Circles)
      if (!currentMap.getLayer(UNCLUSTERED_POINT_LAYER_ID)) {
        currentMap.addLayer({
          id: UNCLUSTERED_POINT_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": pointColor,
            "circle-radius": 10,
            "circle-stroke-width": 1,
            "circle-stroke-color": currentTheme === "dark" ? "#000" : "#fff", // Contrast stroke
          },
        });
      }

      // Layer for Unclustered Point Labels (Playground Name)
      if (!currentMap.getLayer(UNCLUSTERED_LABEL_LAYER_ID)) {
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
            "text-color": labelColor,
            "text-halo-color": currentTheme === "dark" ? "#000000" : "#FFFFFF", // Halo for better readability
            "text-halo-width": 1,
          },
        });
      }
    },
    [playgroundsGeoJson],
  );

  const setMapStyle = useCallback(
    (currentMap: mapboxgl.Map, currentTheme: string | undefined) => {
      currentMap.setStyle(getMapTheme(currentTheme));
    },
    [],
  );

  useEffect(() => {
    if (map.current || !mapContainer) {
      return undefined;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer,
        style: getMapTheme(theme),
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });

      map.current.on("load", () => {
        setIsMapLoaded(true);
        setMapBounds(getMapBounds(map.current));
      });

      map.current.on("moveend", () => {
        setMapBounds(getMapBounds(map.current));
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      map.current?.remove();
      map.current = null;
      setIsMapLoaded(false);
    };
  }, [mapContainer, theme, setMapBounds]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (map.current && isMapLoaded) {
      const waiting = () => {
        if (!map.current!.isStyleLoaded()) {
          timeout = setTimeout(waiting, 200);
        } else {
          addMapDataLayers(map.current, theme);
        }
      };
      waiting();
    }
    return () => {
      clearTimeout(timeout);
    };
  }, [isMapLoaded, theme, addMapDataLayers]);

  useEffect(() => {
    if (map.current && isMapLoaded) {
      setMapStyle(map.current, theme);
    }
  }, [theme, isMapLoaded, setMapStyle]);

  return (
    <>
      <div ref={setMapContainer} className="h-full w-full" />
    </>
  );
}
