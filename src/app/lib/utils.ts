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
