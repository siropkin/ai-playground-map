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
import MapViewSingle from "@/components/map-view-single";
import ImageCarousel from "@/components/image-carousel";
import StructuredData from "@/components/structured-data";
import { formatEnumString, formatOsmIdentifier } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ParkingCircle } from "lucide-react";
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
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            </div>
          )}
        </div>

        {/* Header with Title and Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold sm:text-4xl">
              {playground.name || UNNAMED_PLAYGROUND}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
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
            No description available
          </p>
        )}

        {/* Features */}
        {playground.features && playground.features.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {playground.features.map((feature: string) => (
              <Badge key={feature} variant="outline" className="text-xs">
                {formatEnumString(feature)}
              </Badge>
            ))}
          </div>
        )}

        {/* Parking Info */}
        {playground.parking && (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <ParkingCircle className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Parking</p>
              <p className="text-muted-foreground text-sm">{playground.parking}</p>
            </div>
          </div>
        )}

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
                <MapViewSingle playground={playground} />
              </div>
            </div>
          </div>
        )}

        {/* Map only (when no address) */}
        {!playground.address && (
          <div className="overflow-hidden rounded-lg">
            <div className="h-80 w-full">
              <MapViewSingle playground={playground} />
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
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
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
