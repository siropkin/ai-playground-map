"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";
import { useFilters } from "@/contexts/filters-context";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { PlaygroundMarker } from "@/components/playground-marker";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

const DEFAULT_CENTER: [number, number] = [-73.9712, 40.7831]; // New York City
const DEFAULT_ZOOM = 12;

const getMapBounds = (map: mapboxgl.Map | null) => {
  if (!map) {
    return {
      south: 0,
      north: 0,
      west: 0,
      east: 0,
    };
  }

  const bounds = map.getBounds();
  if (!bounds) {
    return {
      south: 0,
      north: 0,
      west: 0,
      east: 0,
    };
  }

  return {
    south: bounds.getSouth(),
    north: bounds.getNorth(),
    west: bounds.getWest(),
    east: bounds.getEast(),
  };
};

export default function MapView() {
  const { theme } = useTheme();
  const { setMapBounds } = useFilters();
  const { playgrounds } = usePlaygrounds();

  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current) {
      return;
    }

    if (!mapContainer) {
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer,
        style:
          theme === "light"
            ? "mapbox://styles/mapbox/light-v11"
            : "mapbox://styles/mapbox/dark-v11",
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });

      map.current.on("move", () => {
        setMapBounds(getMapBounds(map.current));
      });

      setMapBounds(getMapBounds(map.current));
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      map.current?.remove();
    };
  }, [mapContainer]);

  useEffect(() => {
    if (map.current) {
      map.current.setStyle(
        theme === "light"
          ? "mapbox://styles/mapbox/light-v11"
          : "mapbox://styles/mapbox/dark-v11",
      );
    }
  }, [theme]);

  return (
    <>
      <div ref={setMapContainer} className="h-full w-full" />
      {playgrounds.map((playground) => (
        <PlaygroundMarker
          key={playground.id}
          map={map.current}
          playground={playground}
        />
      ))}
    </>
  );
}
