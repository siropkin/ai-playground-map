import mapboxgl from "mapbox-gl";
import type { Playground } from "@/types/types";
import { useEffect, useRef } from "react";

export const PlaygroundMarker = ({
  map,
  playground,
}: {
  map: mapboxgl.Map | null;
  playground: Playground;
}) => {
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    markerRef.current = new mapboxgl.Marker({ color: "#ef4444" })
      .setLngLat([playground.location.lng, playground.location.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<h3>${playground.name}</h3>`))
      .addTo(map);

    return () => {
      markerRef.current?.remove();
    };
  }, [map, playground]);

  return null;
};
