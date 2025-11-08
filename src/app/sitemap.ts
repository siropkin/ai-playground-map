import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages only
  // Note: Playground pages are dynamically generated from OSM data
  // and are infinite in number, so they're not included in the sitemap
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];
}
