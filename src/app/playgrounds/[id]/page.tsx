import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import {
  SITE_NAME,
  SITE_URL,
  UNNAMED_PLAYGROUND,
  APP_ADMIN_ROLE,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { fetchPlaygroundByIdWithCache } from "@/lib/api/server";
import { fetchNearbyPlaygrounds } from "@/lib/api/nearby-playgrounds";
import MapViewSingle from "@/components/map-view-single";
import ImageCarousel from "@/components/image-carousel";
import StructuredData from "@/components/structured-data";
import { formatEnumString, formatOsmIdentifier } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/tier-badge";
import {
  MapPin,
  Navigation,
  ParkingCircle,
  Accessibility,
} from "lucide-react";
// Tier calculation now done by Gemini AI - no longer needed
import ClearCacheButton from "./clear-cache-button";
import ReportIssueForm from "./report-issue-form";
import CollapsibleSources from "./collapsible-sources";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const playground = await fetchPlaygroundByIdWithCache(resolvedParams.id);

  // Must call notFound() here, not return metadata, to ensure proper HTTP 404 status
  if (!playground) {
    notFound();
  }

  const name = playground.name || UNNAMED_PLAYGROUND;
  const title = `${name} | ${SITE_NAME}`;
  const description =
    playground.description ||
    `Explore ${name} details, features, and location.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og/playgrounds/${resolvedParams.id}`,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
      type: "website",
      locale: "en_US",
      url: `${SITE_URL}/playgrounds/${resolvedParams.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og/playgrounds/${resolvedParams.id}`],
    },
  };
}

export default async function PlaygroundDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const playground = await fetchPlaygroundByIdWithCache(resolvedParams.id);

  // This must be called at the page component level, not in the fetch function
  // to ensure proper HTTP 404 status
  if (!playground) {
    notFound();
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isAdmin = data?.user?.role === APP_ADMIN_ROLE;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${playground.lat},${playground.lon}`;

  // Fetch nearby playgrounds (within 2km radius)
  const nearbyPlaygrounds = await fetchNearbyPlaygrounds({
    lat: playground.lat,
    lon: playground.lon,
    radiusKm: 2,
    limit: 10,
    excludeOsmId: playground.osmId,
  });

  // Tier now comes directly from Gemini AI in the playground data
  const playgroundWithTier = playground;

  console.log('[Page] 🎯 Playground tier data:', {
    id: resolvedParams.id,
    name: playground.name,
    tier: playground.tier,
    tierReasoning: playground.tierReasoning ? playground.tierReasoning.substring(0, 50) + '...' : null,
    enriched: playground.enriched,
  });

  return (
    <>
      <StructuredData playground={playground} />
      <div className="mx-auto flex h-full max-w-4xl flex-1 flex-col gap-6 overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
        {/* Image Carousel - Full Width on Top */}
        <div className="w-full">
          {playground.images && playground.images.length > 0 ? (
            <ImageCarousel
              images={playground.images.map((image) => ({
                filename: image.image_url,
                alt: `${playground.name || UNNAMED_PLAYGROUND} photo`,
              }))}
              className="aspect-video w-full"
              unoptimized={true}
            />
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-emerald-100 dark:from-sky-950/50 dark:to-emerald-950/50">
                <span className="text-sm text-emerald-700/80 dark:text-emerald-200/70">No image</span>
              </div>
            </div>
          )}
        </div>

        {/* Header with Title and Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold sm:text-4xl">
                {playground.name || UNNAMED_PLAYGROUND}
              </h1>
              {playground.tier && playground.tier !== "neighborhood" && (
                <TierBadge tier={playground.tier} size="lg" />
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 flex-wrap gap-2">
            {/* Get Directions Button */}
            <Link href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
              <Button size="default" className="gap-2">
                <Navigation className="h-4 w-4" />
                Get Directions
              </Button>
            </Link>

            {/* Admin Actions */}
            {isAdmin && (
              <ClearCacheButton
                playgroundId={resolvedParams.id}
                lat={playground.lat}
                lon={playground.lon}
                osmId={formatOsmIdentifier(playground.osmId, playground.osmType)}
              />
            )}
          </div>
        </div>

        {/* Description */}
        {playground.description ? (
          <p className="text-sm leading-relaxed">{playground.description}</p>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            This playground&apos;s keeping its secrets (even from AI) 🤷
          </p>
        )}

        {/* Why This Is Special - Tier Reasoning from Gemini AI */}
        {playground.tier && playground.tier !== "neighborhood" && playground.tierReasoning && (
          <div className="flex items-start gap-2 rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50 p-3 dark:border-purple-800/50 dark:from-purple-950/20 dark:to-pink-950/20">
            <span className="flex-shrink-0 text-base leading-5">{playground.tier === "star" ? "⭐" : "💎"}</span>
            <div className="flex-1">
              <p className="text-sm font-medium leading-5 text-purple-900 dark:text-purple-200">Why This Is Special</p>
              <p className="text-muted-foreground mt-2 text-sm text-purple-800 dark:text-purple-300">{playground.tierReasoning}</p>
            </div>
          </div>
        )}


        {/* Features */}
        {playground.features && playground.features.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {playground.features.map((feature: string) => (
              <Badge key={feature} variant="outline" className="max-w-[calc(100%-0.5rem)] truncate text-xs sm:max-w-full">
                <span className="truncate">{formatEnumString(feature)}</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Accessibility Section */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <Accessibility className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Accessibility Features</p>
            {playground.accessibility && playground.accessibility.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {playground.accessibility.map((feature, i) => (
                  <Badge variant="outline" key={i} className="max-w-[calc(100%-0.5rem)] text-xs sm:max-w-full">
                    <span className="truncate">{formatEnumString(feature)}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-1 text-sm italic">
                No accessibility information available
              </p>
            )}
          </div>
        </div>

        {/* Parking Info */}
        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
          <ParkingCircle className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Parking</p>
            {playground.parking ? (
              <p className="text-muted-foreground text-sm">{playground.parking}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No parking information available
              </p>
            )}
          </div>
        </div>

        {/* Address & Map - Connected Section */}
        {playground.address && (
          <div className="flex flex-col gap-0">
            <div className="flex items-start gap-2 rounded-t-lg bg-muted/50 p-3">
              <MapPin className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-muted-foreground text-sm">{playground.address}</p>
              </div>
            </div>
            {/* Map */}
            <div className="overflow-hidden rounded-b-lg">
              <div className="h-80 w-full">
                <MapViewSingle
                  playground={playgroundWithTier}
                  nearbyPlaygrounds={nearbyPlaygrounds}
                />
              </div>
            </div>
          </div>
        )}

        {/* Map only (when no address) */}
        {!playground.address && (
          <div className="overflow-hidden rounded-lg">
            <div className="h-80 w-full">
              <MapViewSingle
                playground={playgroundWithTier}
                nearbyPlaygrounds={nearbyPlaygrounds}
              />
            </div>
          </div>
        )}

        {/* Sources Section */}
        {playground.sources && playground.sources.length > 0 && (
          <div className="border-t pt-6">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Sources
            </h2>
            <CollapsibleSources sources={playground.sources} />
          </div>
        )}

        {/* AI Disclaimer - Informational */}
        {playground.enriched && (
          <div className="border-t pt-6">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground flex-1">
                Some information on this page was generated by AI and may contain
                inaccuracies.
              </p>
              <ReportIssueForm playgroundId={resolvedParams.id} />
            </div>
          </div>
        )}

        {/* Report Issue (when no AI disclaimer) */}
        {!playground.enriched && (
          <div className="border-t pt-6">
            <div className="flex justify-end">
              <ReportIssueForm playgroundId={resolvedParams.id} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
