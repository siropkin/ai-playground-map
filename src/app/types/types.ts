export interface FilterButton {
  label: string;
  ariaLabel: string;
}

export type AgeRangeType =
  | "6-23 months"
  | "2-5 years"
  | "5-12 years"
  | "13+ years";

export type AccessType = "Free" | "Community" | "Paid";

export interface Playground {
  id: number;
  name: string;
  address: string;
  description: string;
  hours: string;
  ageRanges: AgeRangeType[];
  features: string[];
  access: AccessType;
  images: string[];
  rating: number;
  reviews: number;
  location: {
    lat: number;
    lng: number;
  };
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface FilterState {
  ageRanges: AgeRangeType[];
  accesses: AccessType[];
  features: string[];
}

export interface PlaygroundFormData {
  name: string;
  address: string;
  description: string;
  hours: string;
  ageRanges: AgeRangeType[];
  access: AccessType;
  features: string[];
  images: string[];
  rating: number;
  lat: number;
  lng: number;
}

export interface Feature {
  id: number;
  name: string;
}

export interface AgeRange {
  id: number;
  name: AgeRangeType;
}
