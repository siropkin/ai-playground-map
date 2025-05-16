"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, Point } from "geojson";

import type { Playground } from "@/types/playground";
import { MapBounds } from "@/types/map";
import { useFilters } from "@/contexts/filters-context";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { Button } from "@/components/ui/button";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { formatOsmIdentifier } from "@/lib/utils";

// Safely set Mapbox access token with proper error handling
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (!mapboxToken) {
  console.error("Mapbox Access Token is not set. Map will not function.");
}
mapboxgl.accessToken = mapboxToken || "";

const SOURCE_ID = "playgrounds";
const CLUSTER_LAYER_ID = "clusters";
const CLUSTER_COUNT_LAYER_ID = "cluster-count";
const UNCLUSTERED_POINT_LAYER_ID = "unclustered-point";
const UNCLUSTERED_LABEL_LAYER_ID = "unclustered-label";
const DEFAULT_BOUNDS = {
  south: 38.806,
  north: 38.9971,
  west: -77.2768,
  east: -76.8077,
}; // Washington DC

const getMapStyle = (theme: string | undefined) => {
  return theme === "light"
    ? "mapbox://styles/mapbox/light-v9"
    : "mapbox://styles/mapbox/dark-v9";
};

const getMapColors = (theme: string | undefined) => {
  return theme === "light"
    ? {
        point: "#000000",
        pointStroke: "#FFFFFF",
        label: "#000000",
        clusterBg: "#000000",
        clusterText: "#FFFFFF",
        labelHalo: "#FFFFFF",
      }
    : {
        point: "#FFFFFF",
        pointStroke: "#000000",
        label: "#FFFFFF",
        clusterBg: "#FFFFFF",
        clusterText: "#000000",
        labelHalo: "#000000",
      };
};

const getMapBounds = (map: mapboxgl.Map | null): MapBounds => {
  if (!map) {
    return { south: 0, north: 0, west: 0, east: 0 };
  }
  const bounds = map.getBounds();
  if (!bounds) {
    return { south: 0, north: 0, west: 0, east: 0 };
  }
  return {
    south: bounds.getSouth(),
    north: bounds.getNorth(),
    west: bounds.getWest(),
    east: bounds.getEast(),
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
        coordinates: [playground.lon, playground.lat],
      },
      properties: {
        id: playground.osmId,
        type: (playground.osmType || "").toString(),
        name: playground.enriched ? playground.name || UNNAMED_PLAYGROUND : "",
      },
    })),
  };
};

export function MapView() {
  const { theme } = useTheme();
  const { mapBounds, setMapBounds } = useFilters();
  const { playgrounds, flyToCoords, clearFlyToRequest, loading, enriching } =
    usePlaygrounds();
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
        alert("Oops! Can’t get your location. Maybe geolocation is blocked?");
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
          clusterMaxZoom: 14,
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
            "text-offset": [1.3, 0],
            "text-anchor": "left",
            "text-justify": "left",
            "text-size": 11,
            "text-allow-overlap": false,
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
      });

      if (mapBounds) {
        map.current.fitBounds(
          [
            [mapBounds.west, mapBounds.south],
            [mapBounds.east, mapBounds.north],
          ],
          { animate: false },
        );
        // } else if (navigator.geolocation) {
        //   navigator.geolocation.getCurrentPosition(
        //     (position) => {
        //       const { latitude, longitude } = position.coords;
        //       map.current?.flyTo({
        //         center: [longitude, latitude],
        //         zoom: 14,
        //         essential: true,
        //       });
        //     },
        //     (error) => {
        //       map.current.fitBounds(
        //         [
        //           [DEFAULT_BOUNDS.west, DEFAULT_BOUNDS.south],
        //           [DEFAULT_BOUNDS.east, DEFAULT_BOUNDS.north],
        //         ],
        //         { animate: false },
        //       );
        //       console.error("Error fetching location:", error);
        //     },
        //   );
      } else {
        map.current.fitBounds(
          [
            [DEFAULT_BOUNDS.west, DEFAULT_BOUNDS.south],
            [DEFAULT_BOUNDS.east, DEFAULT_BOUNDS.north],
          ],
          { animate: false },
        );
      }

      map.current.on("load", () => {
        setMapBounds(getMapBounds(map.current));
        setIsMapLoaded(true);
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
    if (!map.current || !isMapLoaded) {
      return undefined;
    }

    const handleStyleData = () => {
      if (map.current) {
        addOrUpdateMapDataLayers(map.current, theme);
      }
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
        router.push(
          `/playgrounds/${formatOsmIdentifier(feature.properties.id, feature.properties.type)}`,
        );
      }
    };

    const handleLabelClick = (
      e: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      },
    ) => {
      e.originalEvent.stopPropagation();
      const feature = e.features?.[0];
      if (feature?.properties?.id) {
        router.push(`/playgrounds/${feature.properties.id}`);
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
      if (!map.current) return;

      const source = map.current.getSource(SOURCE_ID) as
        | mapboxgl.GeoJSONSource
        | undefined;

      if (!source || typeof source.getClusterExpansionZoom !== "function") {
        return;
      }

      // Get the zoom level needed to expand this cluster
      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (!err && feature.geometry.type === "Point") {
          const coordinates = feature.geometry.coordinates as [number, number];
          if (map.current) {
            map.current.easeTo({
              center: coordinates,
              zoom: (zoom || 0) + 4,
            });
          }
        }
      });
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

    // Unclustered Points
    map.current.on("click", UNCLUSTERED_POINT_LAYER_ID, handlePointClick);
    map.current.on("mouseenter", UNCLUSTERED_POINT_LAYER_ID, handleMouseEnter);
    map.current.on("mouseleave", UNCLUSTERED_POINT_LAYER_ID, handleMouseLeave);

    // Unclustered Labels
    map.current.on("click", UNCLUSTERED_LABEL_LAYER_ID, handleLabelClick);
    map.current.on("mouseenter", UNCLUSTERED_LABEL_LAYER_ID, handleMouseEnter);
    map.current.on("mouseleave", UNCLUSTERED_LABEL_LAYER_ID, handleMouseLeave);

    // Clusters
    map.current.on("click", CLUSTER_LAYER_ID, handleClusterClick);
    map.current.on("mouseenter", CLUSTER_LAYER_ID, handleMouseEnter);
    map.current.on("mouseleave", CLUSTER_LAYER_ID, handleMouseLeave);

    return () => {
      if (map.current) {
        // Unclustered Points
        map.current.off("click", UNCLUSTERED_POINT_LAYER_ID, handlePointClick);
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
        // Unclustered Labels
        map.current.off("click", UNCLUSTERED_LABEL_LAYER_ID, handleLabelClick);
        map.current.off(
          "mouseenter",
          UNCLUSTERED_LABEL_LAYER_ID,
          handleMouseEnter,
        );
        map.current.off(
          "mouseleave",
          UNCLUSTERED_LABEL_LAYER_ID,
          handleMouseLeave,
        );
        // Clusters
        map.current.off("click", CLUSTER_LAYER_ID, handleClusterClick);
        map.current.off("mouseenter", CLUSTER_LAYER_ID, handleMouseEnter);
        map.current.off("mouseleave", CLUSTER_LAYER_ID, handleMouseLeave);
        // Reset cursor just in case
        map.current.getCanvas().style.cursor = "";
      }
    };
  }, [isMapLoaded, router]);

  useEffect(() => {
    if (map.current) {
      updateMapStyle(map.current, theme);
    }
  }, [theme, updateMapStyle]);

  useEffect(() => {
    if (map.current && flyToCoords) {
      const zoom = map.current.getZoom();
      map.current.flyTo({
        center: flyToCoords,
        zoom: Math.max(zoom, 16),
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

  // Add effect to disable/enable map interactions based on enriching state
  useEffect(() => {
    if (!map.current || !isMapLoaded) {
      return;
    }

    if (enriching) {
      // Disable map interactions when enriching
      map.current.dragPan.disable();
      map.current.scrollZoom.disable();
      map.current.doubleClickZoom.disable();
      map.current.touchZoomRotate.disable();
      map.current.keyboard.disable();
    } else {
      // Re-enable map interactions when not enriching
      map.current.dragPan.enable();
      map.current.scrollZoom.enable();
      map.current.doubleClickZoom.enable();
      map.current.touchZoomRotate.enable();
      map.current.keyboard.enable();
    }
  }, [enriching, isMapLoaded]);

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
      <div className="absolute right-4 bottom-10 z-1 flex md:right-4 md:bottom-8">
        <Button
          variant="outline"
          aria-label="Center map on my location"
          onClick={handleNearMeClick}
        >
          <MapPin className="h-4 w-4" />
          <span className="hidden md:block">Near me</span>
        </Button>
      </div>
      {(loading || enriching) && (
        <div className="text-muted-foreground bg-background/80 absolute top-2 left-1/2 z-11 -translate-x-1/2 transform rounded px-2 py-1 text-xs whitespace-nowrap backdrop-blur-sm">
          {loading ? "Loading playgrounds..." : "Enriching playgrounds..."}
        </div>
      )}
    </div>
  );
}
