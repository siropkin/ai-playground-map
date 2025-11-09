"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useTheme } from "next-themes";
import { MapPin } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { FeatureCollection, Point } from "geojson";

import type { Playground } from "@/types/playground";
import { MapBounds } from "@/types/map";
import { useFilters } from "@/contexts/filters-context";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { PlaygroundPreview } from "@/components/playground-preview";
import { TierBadge } from "@/components/tier-badge";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";

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
    return { south: 0, north: 0, west: 0, east: 0, zoom: 0 };
  }
  const bounds = map.getBounds();
  if (!bounds) {
    return { south: 0, north: 0, west: 0, east: 0, zoom: 0 };
  }
  return {
    south: bounds.getSouth(),
    north: bounds.getNorth(),
    west: bounds.getWest(),
    east: bounds.getEast(),
    zoom: map.getZoom(),
  };
};

const createGeoJson = (
  playgrounds: Playground[],
): FeatureCollection<Point, { id: number; name: string; tier: string | null }> => {
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
        tier: playground.enriched ? (playground.tier || "neighborhood") : "neighborhood",
      },
    })),
  };
};

// Wrap with React.memo to prevent unnecessary re-renders
export const MapView = React.memo(function MapView() {
  const { theme } = useTheme();
  const { mapBounds, setMapBounds } = useFilters();
  const { playgrounds, flyToCoords, clearFlyToRequest, loading, selectPlayground, enrichPlayground, selectedPlayground, clearSelectedPlayground, requestFlyTo } =
    usePlaygrounds();

  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const popupRootRef = useRef<Root | null>(null);
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
            duration: 800, // Fast animation (800ms instead of default 2000ms)
          });
        }
      },
      (error) => {
        console.error("Error fetching location:", error);
        alert("Oops! Can't get your location. Maybe geolocation is blocked?");
      },
    );
  }, []);

  // Memoize GeoJSON data to prevent recreation on every render
  const playgroundsGeoJson = useMemo((): FeatureCollection<
    Point,
    { id: number; name: string; tier: string | null }
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
          data: playgroundsGeoJson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 15,
        });
      } else {
        (currentMap.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource).setData(
          playgroundsGeoJson,
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
            "circle-color": [
              "match",
              ["get", "tier"],
              "star", "#f59e0b", // Amber-500 for Star
              "gem", "#a855f7", // Purple-500 for Gem
              mapColors.point, // Default for neighborhood
            ],
            "circle-radius": [
              "match",
              ["get", "tier"],
              "star", 8, // Larger for Star
              "gem", 7, // Slightly larger for Gem
              6, // Default for neighborhood
            ],
            "circle-stroke-width": [
              "match",
              ["get", "tier"],
              "star", 2, // Thicker stroke for Star
              "gem", 2, // Thicker stroke for Gem
              1, // Default for neighborhood
            ],
            "circle-stroke-color": [
              "match",
              ["get", "tier"],
              "star", "#fbbf24", // Amber-400 for Star stroke
              "gem", "#c084fc", // Purple-400 for Gem stroke
              mapColors.pointStroke, // Default for neighborhood
            ],
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
            "text-halo-width": 2, // Thicker white border for better readability
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
      e.originalEvent.preventDefault();
      const feature = e.features?.[0];
      if (feature?.properties && feature.properties.id) {
        const playground = playgrounds.find(
          (p) => p.osmId === feature.properties!.id
        );
        if (playground) {
          // Close existing popup before selecting new one to prevent race condition
          if (popupRef.current) {
            popupRef.current.remove();
            if (popupRootRef.current) {
              const rootToUnmount = popupRootRef.current;
              setTimeout(() => rootToUnmount.unmount(), 0);
              popupRootRef.current = null;
            }
            popupRef.current = null;
          }

          selectPlayground(playground);
          // Trigger enrichment if not already enriched
          if (!playground.enriched) {
            enrichPlayground(playground.osmId);
          }
        }
      }
    };

    const handleLabelClick = (
      e: mapboxgl.MapMouseEvent & {
        features?: mapboxgl.MapboxGeoJSONFeature[];
      },
    ) => {
      e.originalEvent.stopPropagation();
      e.originalEvent.preventDefault();
      const feature = e.features?.[0];
      if (feature?.properties && feature.properties.id) {
        const playground = playgrounds.find(
          (p) => p.osmId === feature.properties!.id
        );
        if (playground) {
          // Close existing popup before selecting new one to prevent race condition
          if (popupRef.current) {
            popupRef.current.remove();
            if (popupRootRef.current) {
              const rootToUnmount = popupRootRef.current;
              setTimeout(() => rootToUnmount.unmount(), 0);
              popupRootRef.current = null;
            }
            popupRef.current = null;
          }

          selectPlayground(playground);
          // Trigger enrichment if not already enriched
          if (!playground.enriched) {
            enrichPlayground(playground.osmId);
          }
        }
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
  }, [isMapLoaded, playgrounds, selectPlayground, enrichPlayground]);

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
        duration: 800, // Fast animation (800ms instead of default 2000ms)
        essential: true,
      });
      clearFlyToRequest();
    }
  }, [flyToCoords, clearFlyToRequest]);

  // Desktop popup management
  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    // Check if desktop (768px+)
    const isDesktop = window.innerWidth >= 768;
    if (!isDesktop) return; // Mobile uses Sheet instead

    // Clean up existing popup with delay to prevent flicker
    if (popupRef.current) {
      popupRef.current.remove();
      if (popupRootRef.current) {
        // Defer unmount to avoid race condition with React rendering
        const rootToUnmount = popupRootRef.current;
        setTimeout(() => rootToUnmount.unmount(), 0);
        popupRootRef.current = null;
      }
      popupRef.current = null;
    }

    // Create popup if playground selected
    if (selectedPlayground) {
      // Get the latest playground data from the array (in case it was enriched)
      const currentPlayground = playgrounds.find(p => p.osmId === selectedPlayground.osmId) || selectedPlayground;

      const popupNode = document.createElement("div");

      // Create popup at playground location with smart positioning
      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: "400px",
        className: "playground-popup",
        anchor: 'left', // Position popup to the right of marker to avoid sidebar
        offset: 25, // Offset to the right from marker
      })
        .setLngLat([currentPlayground.lon, currentPlayground.lat])
        .setDOMContent(popupNode)
        .addTo(map.current);

      // Handle popup close
      popup.on("close", () => {
        clearSelectedPlayground();
      });

      // Render React component into popup
      const root = createRoot(popupNode);
      root.render(
        <div className="flex flex-col">
          {/* Header with title and space for close button */}
          <div className="flex items-center justify-between gap-3 px-3 pb-0 pt-3 sm:pb-3">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <h3 className="text-base font-semibold truncate max-w-[280px]">
                {currentPlayground.name || UNNAMED_PLAYGROUND}
              </h3>
              {currentPlayground.enriched && currentPlayground.tier && (
                <TierBadge tier={currentPlayground.tier} size="sm" className="flex-shrink-0" />
              )}
            </div>
            {/* Space reserved for Mapbox close button */}
            <div className="w-6 h-6 flex-shrink-0" />
          </div>
          {/* Content */}
          <div className="px-2 pb-2 pt-2 sm:pt-0">
            <PlaygroundPreview
              playground={currentPlayground}
              onViewDetails={clearSelectedPlayground}
              onFlyTo={(coords) => {
                requestFlyTo(coords);
                clearSelectedPlayground();
              }}
              hideTitle
              hideTierBadge
              hideBottomIndicators
            />
          </div>
        </div>
      );

      popupRef.current = popup;
      popupRootRef.current = root;
    }

    // Cleanup on unmount
    return () => {
      if (popupRef.current) {
        popupRef.current.remove();
      }
      if (popupRootRef.current) {
        // Defer unmount to avoid race condition with React rendering
        const rootToUnmount = popupRootRef.current;
        setTimeout(() => rootToUnmount.unmount(), 0);
      }
    };
  }, [selectedPlayground, playgrounds, isMapLoaded, clearSelectedPlayground, requestFlyTo]);

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
      {loading && (
        <div className="text-muted-foreground bg-background/90 absolute top-2 left-1/2 z-11 -translate-x-1/2 transform rounded px-2.5 py-1.5 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Spinner className="size-3" />
            <span>Loading playgrounds...</span>
          </div>
        </div>
      )}
    </div>
  );
});
