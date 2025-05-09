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

// Helper function to get today's open hours
export function getTodayOpenHours(openHours: Playground["openHours"]) {
  if (!openHours) {
    return "No info available";
  }
  const days: (keyof Playground["openHours"])[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const today = days[new Date().getDay()];
  const hours = openHours[today];
  if (!hours || hours.closed) return "Closed today";
  return `${hours.open}–${hours.close}`;
}

// Function to format the address of a playground
export function formatAddress(playground: Playground): string {
  const arr = [
    playground.address,
    playground.city,
    playground.state,
    playground.zipCode,
  ].filter(Boolean);
  return arr.join(", ") || "No address available";
}
