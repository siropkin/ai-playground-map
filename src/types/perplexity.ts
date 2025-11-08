export type PerplexityLocation = {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string; // state/province
  country: string; // ISO 3166-1 alpha-2 code (e.g., "US")
};

export type PerplexityInsights = {
  name: string | null;
  description: string | null;
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
  accessibility: {
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
  } | null;
};
