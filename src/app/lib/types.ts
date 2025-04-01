export interface Filter {
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
  location?: {
    lat: number;
    lng: number;
  };
}
