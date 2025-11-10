import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MapBounds } from "@/types/map";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatOsmIdentifier(id: number, type: string | null): string {
  const typeMap: Record<string, string> = {
    node: "N",
    way: "W",
    relation: "R",
  };
  return `${typeMap[type || "node"] || "N"}${id}`;
}

// Parse OSM identifier from URL format (e.g., "N979923607" or "979923607")
export function parseOsmIdentifier(identifier: string): string {
  // If it already has a prefix (N, W, or R), return as is
  if (/^[NWR]\d+$/.test(identifier)) {
    return identifier;
  }
  // If it's just a number, assume it's a node and add N prefix
  if (/^\d+$/.test(identifier)) {
    return `N${identifier}`;
  }
  // Otherwise return as is (might be invalid, but let API handle it)
  return identifier;
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
    south: parseFloat(bounds.south.toFixed(7)),
    north: parseFloat(bounds.north.toFixed(7)),
    west: parseFloat(bounds.west.toFixed(7)),
    east: parseFloat(bounds.east.toFixed(7)),
    zoom: parseFloat(bounds.zoom.toFixed(1)),
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
  const zoom = params.get("zoom");

  const bounds = {
    south: parseFloat(south || ""),
    north: parseFloat(north || ""),
    west: parseFloat(west || ""),
    east: parseFloat(east || ""),
    zoom: parseFloat(zoom || "12"), // Default zoom level
  };

  if (
    isNaN(bounds.south) ||
    isNaN(bounds.north) ||
    isNaN(bounds.west) ||
    isNaN(bounds.east) ||
    isNaN(bounds.zoom)
  ) {
    return null;
  }

  return bounds;
}

const SESSION_STORAGE_KEY = "mapBounds";

export function saveMapBoundsToSession(bounds: MapBounds | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (bounds) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(bounds));
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to save map bounds to session storage:", error);
  }
}

export function getMapBoundsFromSession(): MapBounds | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const bounds = JSON.parse(stored);

    // Validate the stored data
    if (
      typeof bounds.south === "number" &&
      typeof bounds.north === "number" &&
      typeof bounds.west === "number" &&
      typeof bounds.east === "number" &&
      typeof bounds.zoom === "number" &&
      !isNaN(bounds.south) &&
      !isNaN(bounds.north) &&
      !isNaN(bounds.west) &&
      !isNaN(bounds.east) &&
      !isNaN(bounds.zoom)
    ) {
      return bounds;
    }

    return null;
  } catch (error) {
    console.error("Failed to load map bounds from session storage:", error);
    return null;
  }
}

export function updateUrlWithMapBounds(bounds: MapBounds | null) {
  if (typeof window === "undefined") {
    return;
  }

  // Save to session storage
  saveMapBoundsToSession(bounds);

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  if (bounds) {
    params.set("south", bounds.south.toFixed(7));
    params.set("north", bounds.north.toFixed(7));
    params.set("west", bounds.west.toFixed(7));
    params.set("east", bounds.east.toFixed(7));
    params.set("zoom", bounds.zoom.toFixed(1));
  } else {
    params.delete("south");
    params.delete("north");
    params.delete("west");
    params.delete("east");
    params.delete("zoom");
  }

  if (params.toString()) {
    window.history.pushState({}, "", `${url.pathname}?${params.toString()}`);
  } else {
    window.history.pushState({}, "", url.pathname);
  }
}

/**
 * Extract domain from URL, removing www prefix
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
