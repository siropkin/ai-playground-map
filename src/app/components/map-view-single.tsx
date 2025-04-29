"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import type { Playground } from "@/types/playground";

interface MapViewSingleProps {
  playground: Playground;
}

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
      }
    : {
        point: "#FFFFFF",
        pointStroke: "#000000",
      };
};

export default function MapViewSingle({ playground }: MapViewSingleProps) {
  const { theme } = useTheme();
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer) {
      return;
    }

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer,
      style: getMapStyle(theme),
      center: [playground.longitude, playground.latitude],
      zoom: 15,
      attributionControl: false,
    });

    map.current.on("load", () => {
      const colors = getMapColors(theme);

      map.current!.addSource("single-playground", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [playground.longitude, playground.latitude],
              },
              properties: {
                name: playground.name,
              },
            },
          ],
        },
      });

      map.current!.addLayer({
        id: "single-point",
        type: "circle",
        source: "single-playground",
        paint: {
          "circle-color": colors.point,
          "circle-radius": 10,
          "circle-stroke-width": 1,
          "circle-stroke-color": colors.pointStroke,
        },
      });

      map.current!.addLayer({
        id: "single-label",
        type: "symbol",
        source: "single-playground",
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-offset": [1.5, 0],
          "text-anchor": "left",
          "text-justify": "left",
          "text-size": 12,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": colors.point,
          "text-halo-color": colors.pointStroke,
          "text-halo-width": 1,
        },
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapContainer, playground, theme]);

  return <div ref={setMapContainer} className="h-full w-full" />;
}
