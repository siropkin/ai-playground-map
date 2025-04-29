export type Playground = {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  ageMin: number;
  ageMax: number;
  openHours: OpenHours;
  accessType: AccessType;
  surfaceType: SurfaceType;
  features: FeatureType[]; // relationship
  photos: PlaygroundPhoto[]; // relationship
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
};

export type AccessType =
  | "public"
  | "private"
  | "school"
  | "community_center"
  | "park_district"
  | "hoa"
  | "mall_indoor";

export type SurfaceType =
  | "grass"
  | "sand"
  | "mulch"
  | "rubber_tiles"
  | "poured_rubber"
  | "turf"
  | "dirt"
  | "concrete"
  | "asphalt";

export type FeatureType =
  | "swings"
  | "baby_swings"
  | "slides"
  | "spiral_slide"
  | "climbing_wall"
  | "rope_course"
  | "monkey_bars"
  | "balance_beam"
  | "sandpit"
  | "water_play"
  | "zip_line"
  | "see_saw"
  | "spinning_equipment"
  | "shade_structure"
  | "picnic_tables"
  | "benches"
  | "restrooms"
  | "parking_lot"
  | "bike_rack"
  | "dog_friendly"
  | "sensory_play"
  | "musical_instruments"
  | "fitness_equipment"
  | "walking_trails"
  | "wheelchair_accessible"
  | "water_fountain";

export type OpenHours = {
  [day in DayOfWeek]: {
    open: string; // "09:00"
    close: string; // "18:00"
    closed?: boolean; // if closed on that day
  };
};

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type PlaygroundPhoto = {
  filename: string; // e.g., 'playground-photos/19/d3486ae9-136a-4cbf-bb68-f2c3edc56e0a.jpg'
  caption: string;
  isPrimary: boolean; // true if it's the cover photo
  createdAt: string; // ISO date string
};

export type Feature = {
  id: number;
  name: FeatureType;
  description: string;
  createdAt: string;
};

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
