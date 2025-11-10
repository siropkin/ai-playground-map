"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { MapLegend } from "@/components/map-legend";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";

// Safely set Mapbox access token with proper error handling
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (!mapboxToken) {
  console.error(
    "[MapView] ❌ Mapbox Access Token is not set. Map will not function.",
  );
}
mapboxgl.accessToken = mapboxToken || "";

const SOURCE_ID = "playgrounds";
const CLUSTER_LAYER_ID = "clusters";
const CLUSTER_COUNT_LAYER_ID = "cluster-count";
const UNCLUSTERED_POINT_LAYER_ID = "unclustered-point";
const UNCLUSTERED_POINT_HIT_LAYER_ID = "unclustered-point-hit";
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
        // Tier colors
        star: "#f59e0b", // Amber-500
        starStroke: "#fbbf24", // Amber-400
        gem: "#a855f7", // Purple-500
        gemStroke: "#c084fc", // Purple-400
        neighborhood: "#4b5563", // Gray-600
        neighborhoodStroke: "#FFFFFF",
        // Text colors
        label: "#374151", // Gray-700 for better readability
        labelHalo: "#FFFFFF",
        tierText: "#FFFFFF", // White text on colored backgrounds
        neighborhoodText: "#FFFFFF", // White text on neighborhood clusters
      }
    : {
        // Tier colors
        star: "#f59e0b", // Amber-500
        starStroke: "#fbbf24", // Amber-400
        gem: "#a855f7", // Purple-500
        gemStroke: "#c084fc", // Purple-400
        neighborhood: "#6b7280", // Gray-500
        neighborhoodStroke: "#374151", // Gray-700
        // Text colors
        label: "#d1d5db", // Gray-300 for better readability
        labelHalo: "#000000",
        tierText: "#FFFFFF", // White text on colored backgrounds
        neighborhoodText: "#000000", // Black text on neighborhood clusters (light mode)
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
): FeatureCollection<
  Point,
  { id: number; name: string; tier: string | null }
> => {
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
        tier: playground.enriched
          ? playground.tier || "neighborhood"
          : "neighborhood",
      },
    })),
  };
};

// Wrap with React.memo to prevent unnecessary re-renders
export const MapView = React.memo(function MapView() {
  const { theme } = useTheme();
  const { mapBounds, setMapBounds } = useFilters();
  const {
    playgrounds,
    flyToCoords,
    clearFlyToRequest,
    loading,
    selectPlayground,
    enrichPlayground,
    selectedPlayground,
    clearSelectedPlayground,
    loadImagesForPlayground,
  } = usePlaygrounds();

  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [geolocationStatus, setGeolocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const geolocationStatusRef = useRef<'pending' | 'granted' | 'denied'>('pending'); // Sync ref for moveend handler
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null);
  const userAccuracyCircle = useRef<string | null>(null);
  const hasAutocentered = useRef<boolean>(false);

  // Helper function to create/update user location marker
  const updateUserLocationMarker = useCallback((
    currentMap: mapboxgl.Map,
    longitude: number,
    latitude: number,
    accuracy?: number
  ) => {
    // Remove old marker if exists
    if (userLocationMarker.current) {
      userLocationMarker.current.remove();
    }

    // Remove old accuracy circle if exists
    if (userAccuracyCircle.current && currentMap.getLayer(userAccuracyCircle.current)) {
      currentMap.removeLayer(userAccuracyCircle.current);
    }
    if (userAccuracyCircle.current && currentMap.getSource(userAccuracyCircle.current)) {
      currentMap.removeSource(userAccuracyCircle.current);
    }

    // Add accuracy circle if accuracy is provided
    if (accuracy) {
      const circleId = 'user-location-accuracy';
      userAccuracyCircle.current = circleId;

      // Create a circle GeoJSON
      const circleGeoJSON = {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [longitude, latitude]
        },
        properties: {}
      };

      currentMap.addSource(circleId, {
        type: 'geojson',
        data: circleGeoJSON
      });

      currentMap.addLayer({
        id: circleId,
        type: 'circle',
        source: circleId,
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, accuracy * Math.pow(2, 20) / 156543.03392] // Convert meters to pixels at zoom 0
            ],
            base: 2
          },
          'circle-color': '#4285F4',
          'circle-opacity': 0.1,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#4285F4',
          'circle-stroke-opacity': 0.3
        }
      });
    }

    // Create the user location marker (blue dot)
    const el = document.createElement('div');
    el.className = 'user-location-marker';
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#4285F4';
    el.style.border = '3px solid white';
    el.style.boxShadow = '0 0 10px rgba(66, 133, 244, 0.5)';
    el.style.cursor = 'pointer';

    userLocationMarker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(currentMap);
  }, []);

  // Request geolocation on mount (runs once)
  useEffect(() => {
    const hasExistingBounds = !!mapBounds;

    if (hasExistingBounds) {
      console.log("[MapView] 🔗 URL/session bounds exist, setting geolocation status to resolved");
      setGeolocationStatus('denied'); // Mark as resolved so data loads
      geolocationStatusRef.current = 'denied';
    }

    console.log("[MapView] 📍 Starting geolocation check...");
    if ('geolocation' in navigator) {
      // Use watchPosition to continuously listen for location updates
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("[MapView] ✓ User location detected:", latitude, longitude);

          setUserLocation([longitude, latitude]);

          // Only fly to user location if we don't have existing bounds
          if (!hasExistingBounds && map.current) {
            console.log("[MapView] 🚁 Flying to user location");
            const [lng, lat] = [longitude, latitude];
            const latOffset = 0.01;
            const lonOffset = 0.01;

            // Set status BEFORE flying so moveend event can update bounds
            setGeolocationStatus('granted');
            geolocationStatusRef.current = 'granted';

            map.current.fitBounds(
              [
                [lng - lonOffset, lat - latOffset],
                [lng + lonOffset, lat + latOffset],
              ],
              { duration: 1500 },
            );
          } else if (!hasExistingBounds) {
            // Map not ready yet, just update status
            setGeolocationStatus('granted');
            geolocationStatusRef.current = 'granted';
          } else {
            // Has existing bounds, just show the marker without flying
            console.log("[MapView] 📍 Showing user location marker (not flying)");
          }
        },
        (error) => {
          console.log("[MapView] ℹ️ Geolocation denied or error:", error.message);

          // Only fly to DC if we don't have existing bounds
          if (!hasExistingBounds && map.current) {
            console.log("[MapView] 🚁 Flying to default location (DC)");

            // Set status BEFORE flying so moveend event can update bounds
            setGeolocationStatus('denied');
            geolocationStatusRef.current = 'denied';

            map.current.fitBounds(
              [
                [DEFAULT_BOUNDS.west, DEFAULT_BOUNDS.south],
                [DEFAULT_BOUNDS.east, DEFAULT_BOUNDS.north],
              ],
              { duration: 1500 },
            );
          } else if (!hasExistingBounds) {
            // Map not ready yet, just update status
            setGeolocationStatus('denied');
            geolocationStatusRef.current = 'denied';
          }
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000
        }
      );

      // Cleanup: stop watching when component unmounts
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      console.log("[MapView] ℹ️ Geolocation not supported");
      if (!hasExistingBounds) {
        setGeolocationStatus('denied');
        geolocationStatusRef.current = 'denied';
      }
    }
  }, [mapBounds]);

  const handleNearMeClick = useCallback(() => {
    if (!navigator.geolocation) {
      console.error("[MapView] ❌ Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation([longitude, latitude]);

        if (map.current) {
          updateUserLocationMarker(map.current, longitude, latitude, accuracy);
          map.current.flyTo({
            center: [longitude, latitude],
            zoom: 14,
            duration: 800,
          });
        }
      },
      (error) => {
        console.error("[MapView] ❌ Error fetching location:", error);
        let errorMessage = "Can't get your location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please try again.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }

        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [updateUserLocationMarker]);

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
          clusterProperties: {
            // Track if cluster has any star tier playgrounds
            hasStar: [
              "any",
              ["case", ["==", ["get", "tier"], "star"], true, false],
            ],
            // Track if cluster has any gem tier playgrounds
            hasGem: [
              "any",
              ["case", ["==", ["get", "tier"], "gem"], true, false],
            ],
          },
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
            "circle-color": [
              "case",
              ["get", "hasStar"],
              mapColors.star,
              ["get", "hasGem"],
              mapColors.gem,
              mapColors.neighborhood,
            ],
            "circle-radius": [
              "step",
              ["get", "point_count"],
              15,
              100,
              20,
              750,
              25,
            ],
            "circle-stroke-width": [
              "case",
              ["get", "hasStar"],
              2,
              ["get", "hasGem"],
              2,
              1,
            ],
            "circle-stroke-color": [
              "case",
              ["get", "hasStar"],
              mapColors.starStroke,
              ["get", "hasGem"],
              mapColors.gemStroke,
              mapColors.neighborhoodStroke,
            ],
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
            "text-color": [
              "case",
              ["get", "hasStar"],
              mapColors.tierText,
              ["get", "hasGem"],
              mapColors.tierText,
              mapColors.neighborhoodText,
            ],
          },
        });
      }

      // Layer for Unclustered Points - Invisible hit area for better touch targets
      if (!currentMap.getLayer(UNCLUSTERED_POINT_HIT_LAYER_ID)) {
        currentMap.addLayer({
          id: UNCLUSTERED_POINT_HIT_LAYER_ID,
          type: "circle",
          source: SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "transparent",
            "circle-radius": 20, // Larger hit area for easier tapping
            "circle-opacity": 0,
          },
        });
      }

      // Layer for Unclustered Points (Circles) - Visual layer
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
              "star",
              mapColors.star,
              "gem",
              mapColors.gem,
              mapColors.neighborhood,
            ],
            "circle-radius": [
              "match",
              ["get", "tier"],
              "star",
              10,
              "gem",
              10,
              9,
            ],
            "circle-stroke-width": [
              "match",
              ["get", "tier"],
              "star",
              2,
              "gem",
              2,
              1,
            ],
            "circle-stroke-color": [
              "match",
              ["get", "tier"],
              "star",
              mapColors.starStroke,
              "gem",
              mapColors.gemStroke,
              mapColors.neighborhoodStroke,
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

    console.log("[MapView] 🗺️ Initializing map");

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer,
        style: getMapStyle(theme),
        center: [0, 20], // Center on world
        zoom: 1.5, // Zoomed out world view
      });

      if (mapBounds) {
        // URL params present - use them immediately
        console.log("[MapView] ℹ️ Restoring from URL params:", mapBounds);
        map.current.fitBounds(
          [
            [mapBounds.west, mapBounds.south],
            [mapBounds.east, mapBounds.north],
          ],
          { animate: false },
        );
      }

      map.current.on("load", () => {
        setIsMapLoaded(true);
        // Only set map bounds if we have URL params (don't save world view)
        if (mapBounds) {
          setMapBounds(getMapBounds(map.current));
        }
      });

      // Only update URL when geolocation is resolved (not pending)
      map.current.on("moveend", () => {
        console.log("[MapView] 📍 moveend - status:", geolocationStatusRef.current);
        if (geolocationStatusRef.current !== 'pending') {
          setMapBounds(getMapBounds(map.current));
        }
      });
    } catch (error) {
      setError(
        "Oops! The map is taking a timeout on the swings. Check back soon!",
      );
      console.error("[MapView] ❌ Error initializing map:", error);
    }
  }, [mapContainer, theme, mapBounds, setMapBounds, geolocationStatus]);

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
          (p) => p.osmId === feature.properties!.id,
        );
        if (playground) {
          // Toggle behavior: if clicking the same playground, close it
          if (
            selectedPlayground &&
            selectedPlayground.osmId === playground.osmId
          ) {
            clearSelectedPlayground();
            return;
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
          (p) => p.osmId === feature.properties!.id,
        );
        if (playground) {
          // Toggle behavior: if clicking the same playground, close it
          if (
            selectedPlayground &&
            selectedPlayground.osmId === playground.osmId
          ) {
            clearSelectedPlayground();
            return;
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

    // Unclustered Points - Hit Layer (larger touch target)
    map.current.on("click", UNCLUSTERED_POINT_HIT_LAYER_ID, handlePointClick);
    map.current.on("mouseenter", UNCLUSTERED_POINT_HIT_LAYER_ID, handleMouseEnter);
    map.current.on("mouseleave", UNCLUSTERED_POINT_HIT_LAYER_ID, handleMouseLeave);

    // Unclustered Points - Visual Layer
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
        // Unclustered Points - Hit Layer
        map.current.off("click", UNCLUSTERED_POINT_HIT_LAYER_ID, handlePointClick);
        map.current.off(
          "mouseenter",
          UNCLUSTERED_POINT_HIT_LAYER_ID,
          handleMouseEnter,
        );
        map.current.off(
          "mouseleave",
          UNCLUSTERED_POINT_HIT_LAYER_ID,
          handleMouseLeave,
        );
        // Unclustered Points - Visual Layer
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
  }, [
    isMapLoaded,
    playgrounds,
    selectPlayground,
    enrichPlayground,
    selectedPlayground,
    clearSelectedPlayground,
  ]);

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
        zoom: Math.max(zoom, 17),
        duration: 800, // Fast animation (800ms instead of default 2000ms)
        essential: true,
      });
      clearFlyToRequest();
    }
  }, [flyToCoords, clearFlyToRequest]);

  // Desktop: No popup needed - handled by sidebar in page.tsx
  // Mobile: Handled by PlaygroundPreviewSheet component
  // This effect only triggers image loading when needed
  useEffect(() => {
    if (!selectedPlayground) return;

    // Get the latest playground data
    const currentPlayground =
      playgrounds.find((p) => p.osmId === selectedPlayground.osmId) ||
      selectedPlayground;

    // Lazy-load images when playground is selected and enriched
    if (currentPlayground.enriched && !currentPlayground.images) {
      loadImagesForPlayground(currentPlayground.osmId);
    }
  }, [
    playgrounds,
    selectedPlayground,
    loadImagesForPlayground,
  ]);

  // Update user location marker when map loads and location is available
  useEffect(() => {
    if (map.current && isMapLoaded && userLocation) {
      console.log("[MapView] ✓ Displaying user location marker at:", userLocation);
      updateUserLocationMarker(map.current, userLocation[0], userLocation[1]);

      // Auto-center on user location only on initial load (once) and only if no URL params exist
      if (!hasAutocentered.current && !mapBounds) {
        console.log("[MapView] ✓ Auto-centering on user location (first load, no URL params)");
        hasAutocentered.current = true;
        map.current.flyTo({
          center: userLocation,
          zoom: 14,
          duration: 800,
        });
      } else if (mapBounds) {
        console.log("[MapView] ℹ️ Skipping auto-center (URL params present)");
        hasAutocentered.current = true; // Mark as autocentered to prevent future attempts
      }
    }
  }, [isMapLoaded, userLocation, updateUserLocationMarker, mapBounds]);

  useEffect(() => {
    return () => {
      // Cleanup user location marker
      if (userLocationMarker.current) {
        userLocationMarker.current.remove();
        userLocationMarker.current = null;
      }

      // Cleanup accuracy circle
      if (userAccuracyCircle.current && map.current) {
        if (map.current.getLayer(userAccuracyCircle.current)) {
          map.current.removeLayer(userAccuracyCircle.current);
        }
        if (map.current.getSource(userAccuracyCircle.current)) {
          map.current.removeSource(userAccuracyCircle.current);
        }
        userAccuracyCircle.current = null;
      }

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
      <MapLegend />
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
      {loading && geolocationStatus !== 'pending' && (
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
