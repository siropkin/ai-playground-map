export type Playground = {
  id: number;
  name: string;
  description: string;
  lat: number;
  lon: number;
  address: string;
};

export type AccessType =
  | "public"
  | "private"
  | "school"
  | "community_center"
  | "park_district"
  | "hoa"
  | "mall_indoor";

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

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
