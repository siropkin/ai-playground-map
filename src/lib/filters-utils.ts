import type { FilterCriteria } from "@/types/filter";
import { MapBounds } from "@/types/map";

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

export function getFilterStateFromUrl(): FilterCriteria | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  return {
    approvals: params.getAll("approved").map((value) => value === "true"),
    accesses: params.getAll("access"),
    ages: params.getAll("age"),
    features: params.getAll("feature"),
  } as FilterCriteria;
}

export function updateUrlWithFilters(filters: FilterCriteria) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  params.delete("approved");
  params.delete("access");
  params.delete("age");
  params.delete("feature");

  filters.approvals?.forEach((approved) => {
    params.append("approved", approved ? "true" : "false");
  });
  filters.accesses?.forEach((access) => {
    params.append("access", access);
  });
  filters.ages?.forEach((age) => {
    params.append("age", age);
  });
  filters.features?.forEach((feature) => {
    params.append("feature", feature);
  });
  if (params.toString()) {
    window.history.pushState({}, "", `${url.pathname}?${params.toString()}`);
  } else {
    window.history.pushState({}, "", url.pathname);
  }
}
