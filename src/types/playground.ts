export type AccessibilityInfo = {
  wheelchair_accessible: boolean;
  surface_type: string | null;
  transfer_stations: boolean;
  ground_level_activities: number | null;
  sensory_friendly: {
    quiet_zones: boolean;
    tactile_elements: boolean;
    visual_aids: boolean;
  } | null;
  shade_coverage: string | null;
  accessible_parking: {
    available: boolean;
    van_accessible: boolean;
    distance_to_playground: string | null;
  } | null;
  accessible_restrooms: {
    available: boolean;
    adult_changing_table: boolean;
  } | null;
};

export type Playground = {
  id: number;
  name: string | null;
  description: string | null;
  lat: number;
  lon: number;
  address: string | null;
  features: string[] | null;
  parking: string | null;
  sources: string[] | null;
  images:
    | {
        image_url: string;
        origin_url: string;
        height: number;
        width: number;
      }[]
    | null;
  osmId: number;
  osmType: "node" | "way" | "relation";
  osmTags: Record<string, string> | null;
  enriched: boolean | null;
  accessibility: AccessibilityInfo | null;
};
