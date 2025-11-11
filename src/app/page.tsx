import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";
import { fetchPlaygroundByIdWithCache } from "@/lib/api/server";
import HomeClient from "@/components/home-client";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const playgroundId = params.playground;

  // If there's a playground ID in the URL, generate playground-specific metadata
  if (playgroundId && typeof playgroundId === "string") {
    try {
      const playground = await fetchPlaygroundByIdWithCache(playgroundId);

      if (playground) {
        const playgroundName = playground.name || "Local Playground";
        const description = playground.description
          ? (playground.description.length > 160
              ? playground.description.substring(0, 157) + "..."
              : playground.description)
          : SITE_DESCRIPTION;

        // Use Gemini-generated image search queries as SEO keywords
        // These are location-specific, descriptive queries that improve discoverability
        const keywords = playground.imageSearchQueries || [
          playgroundName,
          `${playgroundName} ${playground.city || ""}`.trim(),
          "playground",
          "kids playground",
          "family activities",
        ];

        return {
          title: `${playgroundName} | ${SITE_NAME}`,
          description,
          keywords, // SEO boost with AI-generated keywords from cache
          openGraph: {
            title: playgroundName,
            description,
            images: [
              {
                url: `/api/og/playgrounds/${playgroundId}`,
                width: 1200,
                height: 630,
                alt: playgroundName,
              },
            ],
            type: "website",
            locale: "en_US",
            url: `${SITE_URL}/?playground=${playgroundId}`,
          },
          twitter: {
            card: "summary_large_image",
            title: playgroundName,
            description,
            images: [`/api/og/playgrounds/${playgroundId}`],
          },
        };
      }
    } catch (error) {
      console.error(`Failed to generate metadata for playground ${playgroundId}:`, error);
      // Fall through to default metadata
    }
  }

  // Default home page metadata
  return {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    openGraph: {
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: "/api/og/home",
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
      type: "website",
      locale: "en_US",
      url: SITE_URL,
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
      images: ["/api/og/home"],
    },
  };
}

export default async function Home() {
  return <HomeClient />;
}
