// Tier types (now determined by Gemini AI)
export type PlaygroundTier = "neighborhood" | "gem" | "star";

export type Playground = {
  id: number;
  name: string | null;
  description: string | null;
  lat: number;
  lon: number;
  address: string | null;
  // Location data from geocoding (used for image search)
  city?: string;
  region?: string; // state/province
  country?: string; // ISO 3166-1 alpha-2 code (e.g., "US")
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
  accessibility: string[] | null;
  // Tier rating from Gemini AI
  tier: PlaygroundTier | null;
  tierReasoning: string | null; // AI explanation for the tier
};
