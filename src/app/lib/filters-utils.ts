import type { AccessType, FeatureType, MapBounds } from "@/types/playground";
import type { FilterCriteria } from "@/types/filter";

export function roundMapBounds(bounds: MapBounds): MapBounds {
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

  if (!south || !north || !west || !east) {
    return null;
  }

  return {
    south: parseFloat(south),
    north: parseFloat(north),
    west: parseFloat(west),
    east: parseFloat(east),
  };
}

export function updateUrlWithMapBounds(bounds: MapBounds | null) {
  if (typeof window === "undefined" || !bounds) {
    return;
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  params.set("south", String(bounds.south));
  params.set("north", String(bounds.north));
  params.set("west", String(bounds.west));
  params.set("east", String(bounds.east));
  window.history.replaceState({}, "", `${url.pathname}?${params.toString()}`);
}

export function getFilterStateFromUrl(): FilterCriteria | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);

  return {
    accesses: params.getAll("access") as AccessType[],
    ages: params.getAll("age"),
    features: params.getAll("feature") as FeatureType[],
  };
}

export function updateUrlWithFilters(filters: FilterCriteria) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  params.delete("access");
  params.delete("age");
  params.delete("feature");

  filters.accesses.forEach((access) => {
    params.append("access", access);
  });
  filters.ages.forEach((age) => {
    params.append("age", age);
  });
  filters.features.forEach((feature) => {
    params.append("feature", feature);
  });
  window.history.pushState({}, "", `${url.pathname}?${params.toString()}`);
}
