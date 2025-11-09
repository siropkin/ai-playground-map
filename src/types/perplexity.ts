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
  accessibility: string[] | null;
};
