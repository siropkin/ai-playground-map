"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";

import type { Playground } from "@/types/playground";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { formatOsmIdentifier } from "@/lib/utils";

interface MapViewSingleProps {
  playground: Playground;
  nearbyPlaygrounds?: Playground[];
}

const getMapStyle = (theme: string | undefined) => {
  return theme === "light"
    ? "mapbox://styles/mapbox/light-v9"
    : "mapbox://styles/mapbox/dark-v9";
};

const getMapColors = (theme: string | undefined) => {
  return theme === "light"
    ? {
        current: "#000000", // Black for current playground (matches main map)
        currentStroke: "#FFFFFF",
        currentHalo: "#FFFFFF",
        nearby: "#94a3b8", // Gray for nearby playgrounds
        nearbyStroke: "#FFFFFF",
        nearbyHalo: "#FFFFFF",
      }
    : {
        current: "#FFFFFF", // White for current playground in dark mode
        currentStroke: "#000000",
        currentHalo: "#000000",
        nearby: "#64748b",
        nearbyStroke: "#000000",
        nearbyHalo: "#000000",
      };
};

export default function MapViewSingle({
  playground,
  nearbyPlaygrounds = [],
}: MapViewSingleProps) {
  const { theme } = useTheme();
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (map.current || !mapContainer) {
      return;
    }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer,
      style: getMapStyle(theme),
      center: [playground.lon, playground.lat],
      zoom: 16.5, // Zoomed in closer to the playground
    });

    map.current.on("load", () => {
      const colors = getMapColors(theme);

      // Add current playground
      map.current!.addSource("current-playground", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [playground.lon, playground.lat],
              },
              properties: {
                id: playground.osmId,
                type: (playground.osmType || "").toString(),
                name: playground.name || UNNAMED_PLAYGROUND,
                isCurrent: true,
              },
            },
          ],
        },
      });

      // Add current playground marker (matches main map size)
      map.current!.addLayer({
        id: "current-point",
        type: "circle",
        source: "current-playground",
        paint: {
          "circle-color": colors.current,
          "circle-radius": 10, // Matches main map
          "circle-stroke-width": 1, // Matches main map
          "circle-stroke-color": colors.currentStroke,
        },
      });

      // Add current playground label (matches main map style)
      map.current!.addLayer({
        id: "current-label",
        type: "symbol",
        source: "current-playground",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"], // Matches main map
          "text-offset": [1.3, 0], // Right side, matches main map
          "text-anchor": "left", // Matches main map
          "text-size": 11, // Matches main map
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": colors.current,
          "text-halo-color": colors.currentHalo,
          "text-halo-width": 2, // Thicker white border (user's preference)
        },
      });

      // Add nearby playgrounds if they exist
      if (nearbyPlaygrounds.length > 0) {
        map.current!.addSource("nearby-playgrounds", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: nearbyPlaygrounds.map((pg) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [pg.lon, pg.lat],
              },
              properties: {
                id: pg.osmId,
                type: (pg.osmType || "").toString(),
                name: pg.name || UNNAMED_PLAYGROUND,
                isCurrent: false,
              },
            })),
          },
        });

        // Add nearby playground markers (smaller)
        map.current!.addLayer({
          id: "nearby-points",
          type: "circle",
          source: "nearby-playgrounds",
          paint: {
            "circle-color": colors.nearby,
            "circle-radius": 8,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": colors.nearbyStroke,
          },
        });

        // Add nearby playground labels (smaller, grayed out)
        map.current!.addLayer({
          id: "nearby-labels",
          type: "symbol",
          source: "nearby-playgrounds",
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-offset": [1.3, 0], // Right side, matches main map
            "text-anchor": "left", // Matches main map
            "text-size": 10, // Slightly smaller than current
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": colors.nearby,
            "text-halo-color": colors.nearbyHalo,
            "text-halo-width": 2, // Thicker white border
          },
        });

        // Change cursor to pointer on nearby playground hover
        map.current!.on("mouseenter", "nearby-points", () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = "pointer";
          }
        });

        map.current!.on("mouseleave", "nearby-points", () => {
          if (map.current) {
            map.current.getCanvas().style.cursor = "";
          }
        });

        // Handle clicks on nearby playgrounds
        map.current!.on("click", "nearby-points", (e) => {
          if (!e.features || e.features.length === 0) return;

          const feature = e.features[0];
          const osmId = feature.properties?.id;
          const osmType = feature.properties?.type;

          if (osmId && osmType) {
            const playgroundId = formatOsmIdentifier(osmId, osmType);
            router.push(`/playgrounds/${playgroundId}`);
          }
        });

        // Show popup on hover over nearby playgrounds
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
        });

        map.current!.on("mouseenter", "nearby-points", (e) => {
          if (!e.features || e.features.length === 0) return;

          const feature = e.features[0];
          const geometry = feature.geometry as { type: string; coordinates: [number, number] };
          const coordinates: [number, number] = [geometry.coordinates[0], geometry.coordinates[1]];
          const name = feature.properties?.name || UNNAMED_PLAYGROUND;

          popup
            .setLngLat(coordinates)
            .setHTML(`<div class="text-sm font-medium p-1">${name}</div>`)
            .addTo(map.current!);
        });

        map.current!.on("mouseleave", "nearby-points", () => {
          popup.remove();
        });
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapContainer, playground, nearbyPlaygrounds, theme, router]);

  return <div ref={setMapContainer} className="h-full w-full" />;
}
