// Tier types (now determined by Gemini AI)
export type PlaygroundTier = "neighborhood" | "gem" | "star";

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
  accessibility: string[] | null;
  // Tier rating from Gemini AI
  tier: PlaygroundTier | null;
  tierReasoning: string | null; // AI explanation for the tier
};
