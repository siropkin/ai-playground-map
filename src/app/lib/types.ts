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
  ages: string[];
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
  ages: string[];
  access: string[];
  features: string[];
}
