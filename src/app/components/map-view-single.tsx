"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";

interface MapViewSingleProps {
  location: {
    lat: number;
    lng: number;
  };
  name: string;
}

export default function MapViewSingle({ location, name }: MapViewSingleProps) {
  const { theme } = useTheme();

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current) return;

    // Use environment variable for the token
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style:
        theme === "light"
          ? "mapbox://styles/mapbox/light-v11"
          : "mapbox://styles/mapbox/dark-v11",
      center: [location.lng, location.lat],
      zoom: 15,
      attributionControl: false,
    });

    // Add marker for the playground
    new mapboxgl.Marker({ color: "#ef4444" })
      .setLngLat([location.lng, location.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>${name}</h3>`))
      .addTo(map.current);

    return () => map.current?.remove();
  }, [location, name]);

  // change map style on theme change
  useEffect(() => {
    if (map.current) {
      map.current.setStyle(
        theme === "light"
          ? "mapbox://styles/mapbox/light-v11"
          : "mapbox://styles/mapbox/dark-v11",
      );
    }
  }, [theme]);

  return <div ref={mapContainer} className="h-full w-full" />;
}
