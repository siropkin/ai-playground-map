import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
  if (!ageMin) return `Ages up to ${ageMax}`;
  if (!ageMax) return `Ages ${ageMin}+`;
  return `Ages ${ageMin}-${ageMax}`;
}
