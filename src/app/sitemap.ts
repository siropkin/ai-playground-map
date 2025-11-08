import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();

  // Fetch all playgrounds
  const { data: playgrounds } = await supabase
    .from("playgrounds")
    .select("id, updated_at")
    .order("id", { ascending: true });

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // Dynamic playground pages
  const playgroundPages: MetadataRoute.Sitemap =
    playgrounds?.map((playground) => ({
      url: `${SITE_URL}/playgrounds/${playground.id}`,
      lastModified: playground.updated_at
        ? new Date(playground.updated_at)
        : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })) || [];

  return [...staticPages, ...playgroundPages];
}
