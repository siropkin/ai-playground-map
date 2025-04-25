export type AgeGroup = "6-23 months" | "2-5 years" | "5-12 years" | "13+ years";

export type AccessLevel = "Free" | "Community" | "Paid";

export interface PlaygroundDetails {
  id: number;
  name: string;
  description: string;
  hours: string;
  access: AccessLevel;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  ages: AgeGroup[];
  features: string[];
  images: string[];
}

export interface PlaygroundFeature {
  id: number;
  name: string;
}

export interface PlaygroundAge {
  id: number;
  name: AgeGroup;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface FilterOption {
  label: string;
  ariaLabel: string;
}

export interface FilterCriteria {
  accesses: AccessLevel[];
  ages: AgeGroup[];
  features: string[];
}

// export interface PlaygroundFormData {
//   name: string;
//   description: string;
//   hours: string;
//   access: AccessType;
//   address: string;
//   lat: number;
//   lng: number;
//   ages: AgeType[];
//   features: string[];
//   images: string[];
// }
