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
import { Loading } from "@/components/Loading";

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
  const router = useRouter();

  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const addOrUpdateMapDataLayers = useCallback(
    (currentMap: mapboxgl.Map, currentTheme: string | undefined) => {
      const mapColors = getMapColors(currentTheme);

      // Source for GeoJSON data
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
            "circle-color": mapColors.clusterBg,
            "circle-radius": [
              "step",
              ["get", "point_count"],
              15,
              100,
              20,
              750,
              25,
            ],
            "circle-stroke-width": 1,
            "circle-stroke-color": mapColors.clusterText,
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
            "text-color": mapColors.clusterText,
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
            "circle-color": mapColors.point,
            "circle-radius": 10,
            "circle-stroke-width": 1,
            "circle-stroke-color": mapColors.pointStroke,
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
            "text-field": ["get", "name"],
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-offset": [1.5, 0],
            "text-anchor": "left",
            "text-justify": "left",
            "text-size": 12,
            "text-allow-overlap": true,
            "text-optional": false,
          },
          paint: {
            "text-color": mapColors.label,
            "text-halo-color": mapColors.labelHalo,
            "text-halo-width": 1,
          },
        });
      }
    },
    [playgroundsGeoJson],
  );

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
          { animate: false },
        );
      } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            map.current?.flyTo({
              center: [longitude, latitude],
              zoom: 14,
              essential: true,
            });
          },
          (error) => {
            map.current?.fitBounds(DEFAULT_BOUNDS, { animate: false });
            console.error("Error fetching location:", error);
          },
        );
      }

      map.current.on("load", () => {
        const zoom = map.current?.getZoom() || 0;
        if (zoom > 1) {
          setMapBounds(getMapBounds(map.current));
        }
        setIsMapLoaded(true);
      });

      map.current.on("moveend", () => {
        const zoom = map.current?.getZoom() || 0;
        if (zoom > 1) {
          setMapBounds(getMapBounds(map.current));
        }
      });
    } catch (error) {
      setError(
        "Oops! The map is taking a timeout on the swings. Check back soon!",
      );
      console.error("Error initializing map:", error);
    }
  }, [mapContainer, theme, mapBounds, setMapBounds]);

  useEffect(() => {
    if (!map.current || !isMapLoaded) {
      return undefined;
    }

    const handleStyleData = () => {
      addOrUpdateMapDataLayers(map.current!, theme);
    };

    map.current.on("styledata", handleStyleData);

    if (map.current.isStyleLoaded()) {
      addOrUpdateMapDataLayers(map.current, theme);
    }

    return () => {
      map.current?.off("styledata", handleStyleData);
    };
  }, [isMapLoaded, theme, addOrUpdateMapDataLayers]);

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
      if (feature?.properties?.id) {
        router.push(`/playground/${feature.properties.id}`);
      }
    };

    const handleClusterClick = (
      e: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      },
    ) => {
      e.originalEvent.stopPropagation();
      const feature = e.features?.[0];
      if (
        !feature?.properties?.cluster_id ||
        feature.geometry.type !== "Point"
      ) {
        return;
      }

      const clusterId = feature.properties.cluster_id;
      const source = map.current!.getSource(SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;

      if (!source || typeof source.getClusterExpansionZoom !== "function") {
        return;
      }

      // Get the zoom level needed to expand this cluster
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (!err && feature.geometry.type === "Point") {
          const coordinates = feature.geometry.coordinates as [number, number];
          map.current!.easeTo({
            center: coordinates,
            zoom: (zoom || 0) + 4,
          });
        }
      });
    };

    const handleMouseEnter = () => {
      map.current!.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeave = () => {
      map.current!.getCanvas().style.cursor = "";
    };

    // Unclustered Points
    map.current.on("click", UNCLUSTERED_POINT_LAYER_ID, handlePointClick);
    map.current.on("mouseenter", UNCLUSTERED_POINT_LAYER_ID, handleMouseEnter);
    map.current.on("mouseleave", UNCLUSTERED_POINT_LAYER_ID, handleMouseLeave);
    // Clusters
    map.current.on("click", CLUSTER_LAYER_ID, handleClusterClick);
    map.current.on("mouseenter", CLUSTER_LAYER_ID, handleMouseEnter);
    map.current.on("mouseleave", CLUSTER_LAYER_ID, handleMouseLeave);

    return () => {
      // Unclustered Points
      map.current!.off("click", UNCLUSTERED_POINT_LAYER_ID, handlePointClick);
      map.current!.off(
        "mouseenter",
        UNCLUSTERED_POINT_LAYER_ID,
        handleMouseEnter,
      );
      map.current!.off(
        "mouseleave",
        UNCLUSTERED_POINT_LAYER_ID,
        handleMouseLeave,
      );
      // Clusters
      map.current!.off("click", CLUSTER_LAYER_ID, handleClusterClick);
      map.current!.off("mouseenter", CLUSTER_LAYER_ID, handleMouseEnter);
      map.current!.off("mouseleave", CLUSTER_LAYER_ID, handleMouseLeave);
      // Reset cursor just in case
      map.current!.getCanvas().style.cursor = "";
    };
  }, [isMapLoaded, router]);

  useEffect(() => {
    if (map.current) {
      updateMapStyle(map.current, theme);
    }
  }, [theme, updateMapStyle]);

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
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        setIsMapLoaded(false);
      }
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {error}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={setMapContainer}
        className="absolute top-0 left-0 h-full w-full"
      />
      <div className="absolute right-4 bottom-4 z-10">
        <Button
          variant="outline"
          aria-label="Center map on my location"
          onClick={handleNearMeClick}
          className="bg-background/80 flex items-center gap-1 backdrop-blur-sm"
        >
          <MapPin className="h-4 w-4" />
          <span>Near me</span>
        </Button>
      </div>
      {!isMapLoaded && !error && <Loading />}
    </div>
  );
}
