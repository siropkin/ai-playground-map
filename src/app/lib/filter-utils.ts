import type { Playground, MapBounds, FilterState } from "@/lib/types";

export function isPlaygroundInBounds(
  playground: Playground,
  bounds: MapBounds | null,
): boolean {
  if (!bounds) return true;

  const { lat, lng } = playground.location;
  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west
  );
}

export function filterPlaygrounds(
  playgrounds: Playground[],
  filters: FilterState,
  bounds: MapBounds | null,
): Playground[] {
  return playgrounds.filter((playground) => {
    // Filter by map bounds
    if (!isPlaygroundInBounds(playground, bounds)) {
      return false;
    }

    // Filter by age range
    if (filters.ageRanges.length > 0) {
      const playgroundMinAge = Number.parseInt(
        playground.ageRange.split("-")[0],
      );
      const playgroundMaxAge = Number.parseInt(
        playground.ageRange.split("-")[1],
      );

      const matchesAgeRange = filters.ageRanges.some((ageRange) => {
        if (ageRange === "0-3") return playgroundMinAge <= 3;
        if (ageRange === "4-7")
          return playgroundMinAge <= 7 && playgroundMaxAge >= 4;
        if (ageRange === "8+") return playgroundMaxAge >= 8;
        return false;
      });

      if (!matchesAgeRange) return false;
    }

    // Filter by access type
    if (
      filters.access.length > 0 &&
      !filters.access.includes(playground.access)
    ) {
      return false;
    }

    // Filter by features
    if (filters.features.length > 0) {
      const hasAllFeatures = filters.features.every((feature) =>
        playground.features.includes(feature),
      );
      if (!hasAllFeatures) return false;
    }

    return true;
  });
}

export function getFilterStateFromUrl(): FilterState {
  if (typeof window === "undefined") {
    return { ageRanges: [], access: [], features: [] };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    ageRanges: params.getAll("age"),
    access: params.getAll("access"),
    features: params.getAll("feature"),
  };
}

export function updateUrlWithFilters(filters: FilterState) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  // Clear existing filter params
  params.delete("age");
  params.delete("access");
  params.delete("feature");

  filters.ageRanges.forEach((age) => {
    params.append("age", age);
  });

  filters.access.forEach((access) => {
    params.append("access", access);
  });

  filters.features.forEach((feature) => {
    params.append("feature", feature);
  });

  // Update URL without reloading the page
  window.history.pushState({}, "", `${url.pathname}?${params.toString()}`);
}
