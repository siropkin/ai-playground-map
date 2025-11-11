import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/constants";

export default function StructuredDataHome() {
  // WebSite schema with search action
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // Organization schema for rich branding
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: "GPM",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/api/og/home`,
      width: 1200,
      height: 630,
    },
    description: SITE_DESCRIPTION,
    sameAs: [
      // Add your social media profiles here when available
      // "https://twitter.com/goodplaygroundmap",
      // "https://facebook.com/goodplaygroundmap",
    ],
  };

  // FAQ schema for common questions
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I find playgrounds near me?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Use the search box or allow location access to see playgrounds near you. You can filter by features like swings, slides, accessibility features, and more.",
        },
      },
      {
        "@type": "Question",
        name: "Are the playground photos real?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! We use AI to find and verify real photos of playgrounds from trusted sources, giving you an accurate view before you visit.",
        },
      },
      {
        "@type": "Question",
        name: "Can I see playground features and amenities?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely! Each playground listing includes detailed information about available features like swings, slides, climbing structures, shade, parking, and accessibility features.",
        },
      },
      {
        "@type": "Question",
        name: "How accurate is the playground information?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "We source our data from OpenStreetMap and enhance it with AI-powered photo verification and feature detection to provide the most accurate playground information available.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
