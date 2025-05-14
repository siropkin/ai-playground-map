export type OSMQueryResponse =
  | {
      type: "node";
      id: number;
      lat: number;
      lon: number;
      tags: Record<string, string>;
    }
  | {
      type: "way";
      id: number;
      center: { lat: number; lon: number };
      nodes: number[];
      tags: Record<string, string>;
    }
  | {
      type: "relation";
      id: number;
      center: { lat: number; lon: number };
      members: { type: "node" | "way" | "relation"; ref: number }[];
      tags: Record<string, string>;
    };
