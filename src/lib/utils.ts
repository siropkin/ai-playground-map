import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Playground } from "@/types/playground";

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

//
export function findClosestPlace(
  places: any[],
  latitude: number,
  longitude: number,
) {
  let closest = null;
  let minDist = Number.POSITIVE_INFINITY;

  for (const candidate of places) {
    if (candidate.geometry && candidate.geometry.location) {
      const dLat =
        ((candidate.geometry.location.lat - latitude) * Math.PI) / 180;
      const dLon =
        ((candidate.geometry.location.lng - longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((latitude * Math.PI) / 180) *
          Math.cos((candidate.geometry.location.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = 6371000 * c; // Earth radius in meters

      if (distance < minDist) {
        minDist = distance;
        closest = candidate;
      }
    }
  }

  return { place: closest, distance: minDist };
}
