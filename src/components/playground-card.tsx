"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge } from "@/components/tier-badge";
import ImageCarousel from "@/components/image-carousel";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { formatEnumString } from "@/lib/utils";
import { Playground } from "@/types/playground";
import {
  MapPin,
  ArrowRight,
  Accessibility,
  ParkingCircle,
  Navigation,
  Share2,
  Shapes,
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

export type PlaygroundCardVariant = "compact" | "preview" | "detailed";

interface PlaygroundCardProps {
  playground: Playground;
  variant?: PlaygroundCardVariant;
  onViewDetails?: () => void;
  onFlyTo?: (coords: [number, number]) => void;
  onBack?: () => void;
  hideTitle?: boolean;
  hideTierBadge?: boolean;
  className?: string;
}

/**
 * Unified PlaygroundCard component with three density variants:
 * - compact: List items (scannable overview)
 * - preview: Map popup/sheet (enough info to decide)
 * - detailed: Full details sidebar/sheet (complete information)
 */
export function PlaygroundCard({
  playground,
  variant = "preview",
  onViewDetails,
  onFlyTo,
  onBack,
  hideTitle = false,
  hideTierBadge = false,
  className = "",
}: PlaygroundCardProps) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isParkingExpanded, setIsParkingExpanded] = useState(false);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  const name = playground.name || UNNAMED_PLAYGROUND;
  const displayImage = playground.images?.[0];

  // Text truncation logic
  const isDescriptionLong = playground.description && playground.description.length > 150;
  const isParkingLong = playground.parking && playground.parking.length > 150;

  // Share functionality
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Create URL with playground centered in view
    const url = new URL(window.location.origin);
    url.searchParams.set('playground', playground.osmId.toString());

    // Add map bounds centered on the playground (zoom level 15 for detail)
    const zoom = 15;
    const latOffset = 0.01; // Approximate bounds for zoom 15
    const lonOffset = 0.01;

    url.searchParams.set('south', (playground.lat - latOffset).toString());
    url.searchParams.set('north', (playground.lat + latOffset).toString());
    url.searchParams.set('west', (playground.lon - lonOffset).toString());
    url.searchParams.set('east', (playground.lon + lonOffset).toString());
    url.searchParams.set('zoom', zoom.toString());

    try {
      // Always copy to clipboard first
      await navigator.clipboard.writeText(url.toString());
      toast.success("Link copied to clipboard!");

      // Additionally trigger native share on mobile if available
      if (navigator.share && /mobile/i.test(navigator.userAgent)) {
        const shareData = {
          title: name,
          text: `Check out ${name}`,
          url: url.toString(),
        };
        // Don't await - let it open asynchronously
        navigator.share(shareData).catch(() => {
          // User cancelled share dialog, but link is already copied
        });
      }
    } catch (error) {
      // Clipboard write failed
      console.error("Copy failed:", error);
      toast.error("Failed to copy link");
    }
  };

  // Directions functionality
  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const { lat, lon } = playground;

    // Detect platform and use appropriate maps URL
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const directionsUrl = isIOS
      ? `maps://maps.google.com/maps?daddr=${lat},${lon}&amp;ll=`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

    window.open(directionsUrl, "_blank");
  };

  // COMPACT VARIANT - List items
  if (variant === "compact") {
    return (
      <Card
        className={`bg-background/95 flex min-h-[200px] cursor-pointer flex-row gap-0 overflow-hidden py-0 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl ${className}`}
        onClick={() => onFlyTo?.([playground.lon, playground.lat])}
      >
        {/* Image Section - 1/3 width */}
        <CardHeader className="relative flex w-1/3 gap-0 p-0">
          <div className="h-full w-full flex-1 items-center justify-center">
            {!playground.enriched ? (
              <div className="relative h-full w-full bg-zinc-200 dark:bg-zinc-700">
                <Skeleton className="h-full w-full rounded-r-none" />
                <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
                  Thinking...
                </div>
              </div>
            ) : displayImage ? (
              <Image
                className="h-full w-full object-cover"
                src={displayImage.image_url}
                alt={`Photo of ${name}`}
                width={displayImage.width}
                height={displayImage.height}
                unoptimized={true}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-emerald-100 text-sm text-emerald-700/80 dark:from-sky-950/50 dark:to-emerald-950/50 dark:text-emerald-200/70">
                No image
              </div>
            )}
          </div>

          {/* Tier Badge - Top Right */}
          {playground.enriched && !hideTierBadge && playground.tier && (
            <div className="absolute right-2 top-2">
              <TierBadge tier={playground.tier} variant="compact" />
            </div>
          )}

          {/* Info Indicators - Bottom Left */}
          {playground.enriched && (playground.parking || playground.accessibility?.length) && (
            <div className="absolute bottom-2 left-2 flex gap-1.5">
              {playground.parking && (
                <div className="bg-background/90 flex items-center rounded-full p-1.5 backdrop-blur-sm">
                  <ParkingCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
              {playground.accessibility && playground.accessibility.length > 0 && (
                <div className="bg-background/90 flex items-center rounded-full p-1.5 backdrop-blur-sm">
                  <Accessibility className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </CardHeader>

        {/* Content Section - 2/3 width */}
        <CardContent className="flex w-2/3 flex-col gap-2 p-4">
          <div className="flex flex-1 flex-col gap-2">
            {/* Title */}
            {!playground.enriched ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <h3 className="truncate font-semibold">{name}</h3>
            )}

            {/* Description - 3 lines max */}
            {!playground.enriched ? (
              <Skeleton className="h-12 w-full" />
            ) : playground.description ? (
              <p className="text-muted-foreground line-clamp-3 text-xs">
                {playground.description}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs italic">
                This playground&apos;s keeping its secrets (even from AI) 🤷
              </p>
            )}

            {/* Features - Top 3 only */}
            {!playground.enriched ? (
              <Skeleton className="h-4 w-full" />
            ) : playground.features?.length ? (
              <div className="flex flex-wrap gap-1">
                {playground.features.slice(0, 3).map((value, i) => (
                  <Badge
                    className="max-w-[calc(100%-0.25rem)] truncate text-xs"
                    variant="outline"
                    key={i}
                  >
                    <span className="truncate">{formatEnumString(value)}</span>
                  </Badge>
                ))}
                {playground.features.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{playground.features.length - 3}
                  </Badge>
                )}
              </div>
            ) : null}

            {/* Address - 1 line */}
            {!playground.enriched ? (
              <Skeleton className="h-4 w-full" />
            ) : playground.address ? (
              <div className="text-muted-foreground mr-1 flex items-center text-xs">
                <span className="truncate">{playground.address}</span>
                <MapPin className="ml-2 h-4 w-4 shrink-0" />
              </div>
            ) : null}
          </div>

          {/* View Details Button */}
          {playground.enriched && onViewDetails && (
            <div className="pt-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails();
                }}
              >
                <span className="flex items-center justify-center">
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // PREVIEW & DETAILED VARIANTS - Share common structure
  const isDetailed = variant === "detailed";

  return (
    <div className={`flex h-full flex-col gap-3 ${className}`}>
      {/* Back Button (detailed only) */}
      {isDetailed && onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="self-start"
        >
          <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
          Back to List
        </Button>
      )}

      {/* Image Section */}
      <div className={`relative ${isDetailed ? "h-64" : "h-48"} w-full flex-shrink-0 overflow-hidden rounded-lg`}>
        {!playground.enriched ? (
          <div className="relative h-full w-full bg-zinc-200 dark:bg-zinc-700">
            <Skeleton className="h-full w-full" />
            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
              Thinking...
            </div>
          </div>
        ) : playground.images && playground.images.length > 1 ? (
          <ImageCarousel
            images={playground.images.map((image) => ({
              filename: image.image_url,
              alt: `Photo of ${name}`,
            }))}
            className="h-full w-full"
            unoptimized={true}
          />
        ) : displayImage ? (
          <Image
            className="h-full w-full object-cover"
            src={displayImage.image_url}
            alt={`Photo of ${name}`}
            width={displayImage.width}
            height={displayImage.height}
            unoptimized={true}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-emerald-100 text-sm text-emerald-700/80 dark:from-sky-950/50 dark:to-emerald-950/50 dark:text-emerald-200/70">
            No image
          </div>
        )}

        {/* Tier Badge - Top Right */}
        {playground.enriched && !hideTierBadge && playground.tier && (
          <div className="absolute right-2 top-2 z-10">
            <TierBadge tier={playground.tier} variant="compact" />
          </div>
        )}

        {/* Info Indicators - Bottom Left */}
        {playground.enriched && (playground.parking || playground.accessibility?.length) && (
          <div className="absolute bottom-2 left-2 flex gap-1.5">
            {playground.parking && (
              <div className="bg-background/90 flex items-center rounded-full p-1.5 backdrop-blur-sm">
                <ParkingCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            {playground.accessibility && playground.accessibility.length > 0 && (
              <div className="bg-background/90 flex items-center rounded-full p-1.5 backdrop-blur-sm">
                <Accessibility className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {/* Title + Quick Actions */}
        {!hideTitle && (
          <div className="flex items-start justify-between gap-2">
            {!playground.enriched ? (
              <Skeleton className="h-6 w-3/4" />
            ) : (
              <h3 className={`font-semibold ${isDetailed ? "text-2xl" : "text-lg"}`}>
                {name}
              </h3>
            )}
            {playground.enriched && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  aria-label="Share"
                  className="h-8 w-8 shrink-0"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDirections}
                  aria-label="Get Directions"
                  className="h-8 w-8 shrink-0"
                >
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {!playground.enriched ? (
          <Skeleton className="h-16 w-full" />
        ) : playground.description ? (
          <div className="text-muted-foreground text-sm">
            <p className={!isDescriptionExpanded && isDescriptionLong && !isDetailed ? "line-clamp-3" : ""}>
              {playground.description}
            </p>
            {isDescriptionLong && !isDetailed && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDescriptionExpanded(!isDescriptionExpanded);
                }}
                className="text-foreground mt-1 cursor-pointer text-xs underline hover:no-underline"
              >
                {isDescriptionExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm italic">
            <p>This playground&apos;s keeping its secrets (even from AI) 🤷</p>
          </div>
        )}

        {/* Why This Is Special (preview & detailed, star/gem only) */}
        {playground.enriched &&
          playground.tier &&
          playground.tier !== "neighborhood" &&
          playground.tierReasoning && (
            <div className="flex items-start gap-2 rounded-lg border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-pink-50/50 p-3 dark:border-purple-800/50 dark:from-purple-950/20 dark:to-pink-950/20">
              <span className="flex-shrink-0 text-base leading-5">
                {playground.tier === "star" ? "⭐" : "💎"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium leading-5 text-purple-900 dark:text-purple-200">
                  Why This Is Special
                </p>
                <p className="text-muted-foreground mt-2 text-sm text-purple-800 dark:text-purple-300">
                  {playground.tierReasoning}
                </p>
              </div>
            </div>
          )}

        {/* Features */}
        {!playground.enriched ? (
          <Skeleton className="h-20 w-full" />
        ) : playground.features?.length ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Shapes className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Features</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {playground.features.map((value, i) => (
                  <Badge
                    className="max-w-[calc(100%-0.25rem)] truncate text-xs sm:max-w-full"
                    variant="outline"
                    key={i}
                  >
                    <span className="truncate">{formatEnumString(value)}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Accessibility Info */}
        {!playground.enriched ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <Accessibility className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Accessibility Features</p>
              {playground.accessibility && playground.accessibility.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {playground.accessibility.map((feature, i) => (
                    <Badge variant="outline" key={i} className="text-xs">
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
        )}

        {/* Parking Info */}
        {!playground.enriched ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <ParkingCircle className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Parking</p>
              <div className="mt-1">
                {playground.parking ? (
                  <div>
                    <p className={`text-muted-foreground text-sm ${!isParkingExpanded && isParkingLong && !isDetailed ? "line-clamp-3" : ""}`}>
                      {playground.parking}
                    </p>
                    {isParkingLong && !isDetailed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsParkingExpanded(!isParkingExpanded);
                        }}
                        className="text-foreground mt-1 cursor-pointer text-xs underline hover:no-underline"
                      >
                        {isParkingExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    No parking information available
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Address */}
        {!playground.enriched ? (
          <Skeleton className="h-6 w-full" />
        ) : playground.address ? (
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <MapPin className="text-muted-foreground mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Address</p>
              {onFlyTo ? (
                <button
                  className="text-muted-foreground mt-1 cursor-pointer text-sm underline hover:text-foreground"
                  onClick={() => onFlyTo([playground.lon, playground.lat])}
                  aria-label={`See ${name} on the map`}
                >
                  {playground.address}
                </button>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm">{playground.address}</p>
              )}
            </div>
          </div>
        ) : null}

        {/* Mini Map (detailed only) */}
        {isDetailed && playground.address && (
          <div className="overflow-hidden rounded-lg">
            <iframe
              width="100%"
              height="200"
              frameBorder="0"
              style={{ border: 0 }}
              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY || ""}&q=${playground.lat},${playground.lon}&zoom=15`}
              allowFullScreen
            ></iframe>
          </div>
        )}

        {/* CTA Buttons (preview only - not detailed) */}
        {!isDetailed && (
          <div className="mt-auto flex gap-2 border-t pt-3">
            <Button
              variant="default"
              className="flex-1 gap-2"
              onClick={handleDirections}
            >
              <Navigation className="h-4 w-4" />
              Get Directions
            </Button>
            {onViewDetails && playground.enriched && (
              <Button variant="outline" className="flex-1" onClick={onViewDetails}>
                View Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
