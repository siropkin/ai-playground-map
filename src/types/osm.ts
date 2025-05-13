export type OSMQueryData =
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

export type OSMPlaceDetails = {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  address: {
    road?: string;
    quarter?: string;
    suburb?: string;
    city?: string;
    state?: string;
    "ISO3166-2-lvl4"?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    [key: string]: string | undefined;
  };
  boundingbox: [string, string, string, string];
};
