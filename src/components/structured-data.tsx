import { Playground } from "@/types/playground";
import { SITE_NAME, SITE_URL, UNNAMED_PLAYGROUND } from "@/lib/constants";

interface StructuredDataProps {
  playground: Playground;
}

export default function StructuredData({ playground }: StructuredDataProps) {
  const name = playground.name || UNNAMED_PLAYGROUND;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Place",
    name,
    description:
      playground.description || `${name} is a playground for children`,
    address: playground.address
      ? {
          "@type": "PostalAddress",
          streetAddress: playground.address,
        }
      : undefined,
    geo: {
      "@type": "GeoCoordinates",
      latitude: playground.lat,
      longitude: playground.lon,
    },
    url: `${SITE_URL}?playground=${playground.osmId}`,
    image: playground.images?.[0]?.image_url,
    amenityFeature:
      playground.features && playground.features.length > 0
        ? playground.features.map((feature) => ({
            "@type": "LocationFeatureSpecification",
            name: feature,
          }))
        : undefined,
    additionalType: "https://schema.org/Playground",
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
