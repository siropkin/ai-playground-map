"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "next-themes";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

// Mock data for playground locations
const playgroundLocations = [
  { id: 1, name: "Central Park Playground", lat: 40.7812, lng: -73.9665 },
  { id: 2, name: "Riverside Playground", lat: 40.8013, lng: -73.971 },
  { id: 3, name: "Community Garden Playground", lat: 40.7648, lng: -73.9808 },
  { id: 4, name: "Adventure Playground", lat: 40.758, lng: -73.9855 },
];

export default function MapView() {
  const { theme } = useTheme();

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(-73.9712);
  const [lat, setLat] = useState(40.7831);
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    // Initialize map only once
    if (map.current) return;

    // Ensure mapContainer exists
    if (!mapContainer.current) return;
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style:
          theme === "light"
            ? "mapbox://styles/mapbox/light-v11"
            : "mapbox://styles/mapbox/dark-v11",
        center: [lng, lat],
        zoom: zoom,
        type: "canvas",
      });

      // Add markers for playgrounds
      playgroundLocations.forEach((playground) => {
        if (map.current) {
          new mapboxgl.Marker({ color: "#ef4444" })
            .setLngLat([playground.lng, playground.lat])
            .setPopup(
              new mapboxgl.Popup().setHTML(`<h3>${playground.name}</h3>`),
            )
            .addTo(map.current);
        }
      });

      // Update state when map moves
      map.current.on("move", () => {
        if (map.current) {
          setLng(parseFloat(map.current.getCenter().lng.toFixed(4)));
          setLat(parseFloat(map.current.getCenter().lat.toFixed(4)));
          setZoom(parseFloat(map.current.getZoom().toFixed(2)));
        }
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

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
