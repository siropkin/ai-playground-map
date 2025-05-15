import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MapBounds } from "@/types/map";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to format enum-like strings (e.g., 'surface:synthetic_rubberized' -> 'Surface: Synthetic Rubberized')
export function formatEnumString(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .replace(/_/g, " ")
    .replace(/:/g, ": ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function roundMapBounds(bounds: MapBounds | null): MapBounds | null {
  if (!bounds) {
    return null;
  }

  return {
    south: parseFloat(bounds.south.toFixed(6)),
    north: parseFloat(bounds.north.toFixed(6)),
    west: parseFloat(bounds.west.toFixed(6)),
    east: parseFloat(bounds.east.toFixed(6)),
  };
}

export function getMapBoundsStateFromUrl(): MapBounds | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  const south = params.get("south");
  const north = params.get("north");
  const west = params.get("west");
  const east = params.get("east");

  const bounds = {
    south: parseFloat(south || ""),
    north: parseFloat(north || ""),
    west: parseFloat(west || ""),
    east: parseFloat(east || ""),
  };

  if (
    isNaN(bounds.south) ||
    isNaN(bounds.north) ||
    isNaN(bounds.west) ||
    isNaN(bounds.east)
  ) {
    return null;
  }

  return bounds;
}

export function updateUrlWithMapBounds(bounds: MapBounds | null) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  if (bounds) {
    params.set("south", String(bounds.south));
    params.set("north", String(bounds.north));
    params.set("west", String(bounds.west));
    params.set("east", String(bounds.east));
  } else {
    params.delete("south");
    params.delete("north");
    params.delete("west");
    params.delete("east");
  }

  if (params.toString()) {
    window.history.pushState({}, "", `${url.pathname}?${params.toString()}`);
  } else {
    window.history.pushState({}, "", url.pathname);
  }
}

export function formatOsmIdentifier(id: number, type: string | null): string {
  const typeMap: Record<string, string> = {
    node: "N",
    way: "W",
    relation: "R",
  };
  return `${typeMap[type || "node"] || "N"}${id}`;
}
