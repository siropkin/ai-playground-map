import type { MapBounds } from "@/lib/types";

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
  window.history.pushState({}, "", `${url.pathname}?${params.toString()}`);
}

// import type { FilterCriteria } from "@/lib/types";
//
// export function getFilterStateFromUrl(): FilterCriteria {
//   if (typeof window === "undefined") {
//     return { ageRanges: [], access: [], features: [] };
//   }
//
//   const params = new URLSearchParams(window.location.search);
//
//   return {
//     ageRanges: params.getAll("age"),
//     access: params.getAll("access"),
//     features: params.getAll("feature"),
//   };
// }
//
// export function updateUrlWithFilters(filters: FilterCriteria) {
//   if (typeof window === "undefined") {
//     return;
//   }
//
//   const url = new URL(window.location.href);
//   const params = new URLSearchParams(url.search);
//
//   // Clear existing filter params
//   params.delete("age");
//   params.delete("access");
//   params.delete("feature");
//
//   filters.ageRanges.forEach((age) => {
//     params.append("age", age);
//   });
//
//   filters.access.forEach((access) => {
//     params.append("access", access);
//   });
//
//   filters.features.forEach((feature) => {
//     params.append("feature", feature);
//   });
//
//   // Update URL without reloading the page
//   window.history.pushState({}, "", `${url.pathname}?${params.toString()}`);
// }
