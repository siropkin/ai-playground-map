export type Playground = {
  id: number;
  name: string | null;
  description: string | null;
  lat: number;
  lon: number;
  address: string | null;
  osmId: number;
  osmType: "node" | "way" | "relation" | null;
  osmTags: Record<string, string> | null;
  enriched: boolean | null;
};
