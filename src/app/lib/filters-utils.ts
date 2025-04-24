import type { FilterState } from "@/types/types";

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
  if (typeof window === "undefined") {
    return;
  }

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
