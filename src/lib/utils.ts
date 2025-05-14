import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MapBounds } from "@/types/map";
import { OSMPlaceDetails } from "@/types/osm";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to format enum-like strings (e.g., 'park_district' -> 'Park District')
export function formatEnumString(str: string | undefined | null): string {
  if (!str) return "";
  return str.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

// Helper function to format age range
export function getAgeRange(ageMin: number | null, ageMax: number | null) {
  if (!ageMin && !ageMax) return null;
  if (!ageMin) return `Ages 0-${ageMax}`;
  if (!ageMax) return `Ages ${ageMin}+`;
  return `Ages ${ageMin}-${ageMax}`;
}

export function roundMapBounds(bounds: MapBounds | null): MapBounds | null {
  if (!bounds) {
    return null;
  }

  return {
    south: parseFloat(bounds.south.toFixed(4)),
    north: parseFloat(bounds.north.toFixed(4)),
    west: parseFloat(bounds.west.toFixed(4)),
    east: parseFloat(bounds.east.toFixed(4)),
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

export function getOSMKey(id: number, type: string): string {
  const typeMap: Record<string, string> = {
    node: "N",
    way: "W",
    relation: "R",
  };
  return `${typeMap[type] || "N"}${id}`;
}

export function formatOSMAddress(d: OSMPlaceDetails) {
  // E Street NE, Washington, DC 20002
  if (!d.address) {
    return null;
  }
  return `${d.address.road}, ${d.address.city}, ${d.address.state} ${d.address.postcode}`;
}
