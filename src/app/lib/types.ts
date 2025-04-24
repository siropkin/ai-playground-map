export interface FilterButton {
  label: string;
  ariaLabel: string;
}

export interface Playground {
  id: number;
  name: string;
  address: string;
  description: string;
  hours: string;
  ageRange: string;
  features: string[];
  access: "Free" | "Community" | "Paid";
  images: string[];
  rating: number;
  reviews: number;
  distance?: string;
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
  ageRanges: string[];
  access: string[];
  features: string[];
}

export interface PlaygroundFormData {
  name: string;
  address: string;
  description: string;
  hours: string;
  ageRange: string;
  access: "Free" | "Community" | "Paid";
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
