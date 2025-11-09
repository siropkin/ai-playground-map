"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TierBadge } from "@/components/tier-badge";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { formatEnumString, formatOsmIdentifier } from "@/lib/utils";
import { Playground } from "@/types/playground";
import { MapPin, ArrowRight, Accessibility, Umbrella, Volume2, ParkingCircle } from "lucide-react";

interface PlaygroundPreviewProps {
  playground: Playground;
  onViewDetails?: () => void;
  onFlyTo?: (coords: [number, number]) => void;
  hideTitle?: boolean;
  hideTierBadge?: boolean;
}

export function PlaygroundPreview({
  playground,
  onViewDetails,
  onFlyTo,
  hideTitle = false,
  hideTierBadge = false,
}: PlaygroundPreviewProps) {
  const name = playground.name || UNNAMED_PLAYGROUND;
  const displayImage = playground.images?.[0];
  const detailsUrl = `/playgrounds/${formatOsmIdentifier(playground.osmId, playground.osmType)}`;

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Image Section */}
      <div className="relative h-48 w-full flex-shrink-0 overflow-hidden rounded-lg">
        {!playground.enriched ? (
          <div className="relative h-full w-full bg-zinc-200 dark:bg-zinc-700">
            <Skeleton className="h-full w-full" />
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

        {/* Tier Badge - Top right corner */}
        {!hideTierBadge && playground.enriched && playground.tier && (
          <TierBadge tier={playground.tier} size="sm" className="absolute right-2 top-2" />
        )}

        {/* Info Indicators - Only show when enriched */}
        {playground.enriched && (playground.parking || (playground.accessibility && (
          playground.accessibility.wheelchair_accessible ||
          playground.accessibility.surface_type ||
          playground.accessibility.transfer_stations ||
          (playground.accessibility.ground_level_activities !== null && playground.accessibility.ground_level_activities > 0) ||
          (playground.accessibility.sensory_friendly && (
            playground.accessibility.sensory_friendly.quiet_zones ||
            playground.accessibility.sensory_friendly.tactile_elements ||
            playground.accessibility.sensory_friendly.visual_aids
          )) ||
          (playground.accessibility.shade_coverage &&
            playground.accessibility.shade_coverage !== "none" &&
            playground.accessibility.shade_coverage !== "minimal") ||
          (playground.accessibility.accessible_parking?.available) ||
          (playground.accessibility.accessible_restrooms?.available)
        ))) && (
          <div className="absolute bottom-2 left-2 flex gap-1.5">
            {playground.parking && (
              <div className="bg-background/90 flex items-center rounded-full p-1.5 backdrop-blur-sm">
                <ParkingCircle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            {playground.accessibility && (
              playground.accessibility.wheelchair_accessible ||
              playground.accessibility.surface_type ||
              playground.accessibility.transfer_stations ||
              (playground.accessibility.ground_level_activities !== null && playground.accessibility.ground_level_activities > 0) ||
              (playground.accessibility.sensory_friendly && (
                playground.accessibility.sensory_friendly.quiet_zones ||
                playground.accessibility.sensory_friendly.tactile_elements ||
                playground.accessibility.sensory_friendly.visual_aids
              )) ||
              (playground.accessibility.shade_coverage &&
                playground.accessibility.shade_coverage !== "none" &&
                playground.accessibility.shade_coverage !== "minimal") ||
              (playground.accessibility.accessible_parking?.available) ||
              (playground.accessibility.accessible_restrooms?.available)
            ) && (
              <div className="bg-background/90 flex items-center rounded-full p-1.5 backdrop-blur-sm">
                <Accessibility className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col gap-2">
        {/* Content Area - grows to push button to bottom */}
        <div className="flex flex-1 flex-col gap-2">
          {/* Title */}
          {!hideTitle && (
            <>
              {!playground.enriched ? (
                <Skeleton className="h-6 w-3/4" />
              ) : (
                <h3 className="text-lg font-semibold">{name}</h3>
              )}
            </>
          )}

          {/* Description */}
          {!playground.enriched ? (
            <Skeleton className="h-16 w-full" />
          ) : playground.description ? (
            <p className="text-muted-foreground line-clamp-3 text-sm">
              {playground.description}
            </p>
          ) : (
            <div className="text-muted-foreground text-sm italic">
              <p>This playground&apos;s keeping its secrets (even from AI) 🤷</p>
            </div>
          )}

          {/* Features */}
          {!playground.enriched ? (
            <Skeleton className="h-6 w-full" />
          ) : playground.features?.length ? (
            <div className="flex flex-wrap gap-1">
              {playground.features.slice(0, 5).map((value, i) => (
                <Badge className="max-w-[calc(100%-0.25rem)] truncate sm:max-w-full" variant="outline" key={i}>
                  <span className="truncate">{formatEnumString(value)}</span>
                </Badge>
              ))}
              {playground.features.length > 5 && (
                <Badge variant="outline">+{playground.features.length - 5}</Badge>
              )}
            </div>
          ) : null}

          {/* Accessibility Info */}
          {!playground.enriched ? (
            <Skeleton className="h-6 w-full" />
          ) : (
            <div className="text-muted-foreground text-xs">
              <div className="font-medium">Accessibility:</div>
              {playground.accessibility ? (
                <div className="mt-1 space-y-0.5">
                  {playground.accessibility.wheelchair_accessible && (
                    <div className="flex items-center gap-1">
                      <Accessibility className="h-3 w-3 flex-shrink-0" />
                      <span>Wheelchair accessible</span>
                    </div>
                  )}
                  {playground.accessibility.sensory_friendly &&
                    (playground.accessibility.sensory_friendly.quiet_zones ||
                      playground.accessibility.sensory_friendly.tactile_elements ||
                      playground.accessibility.sensory_friendly.visual_aids) && (
                      <div className="flex items-center gap-1">
                        <Volume2 className="h-3 w-3 flex-shrink-0" />
                        <span>Sensory-friendly features</span>
                      </div>
                    )}
                  {playground.accessibility.shade_coverage &&
                    playground.accessibility.shade_coverage !== "none" &&
                    playground.accessibility.shade_coverage !== "minimal" && (
                      <div className="flex items-center gap-1">
                        <Umbrella className="h-3 w-3 flex-shrink-0" />
                        <span>
                          {playground.accessibility.shade_coverage
                            .split("-")
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(" ")}{" "}
                          shade
                        </span>
                      </div>
                    )}
                  {!playground.accessibility.wheelchair_accessible &&
                    !(
                      playground.accessibility.sensory_friendly &&
                      (playground.accessibility.sensory_friendly.quiet_zones ||
                        playground.accessibility.sensory_friendly.tactile_elements ||
                        playground.accessibility.sensory_friendly.visual_aids)
                    ) &&
                    (!playground.accessibility.shade_coverage ||
                      playground.accessibility.shade_coverage === "none" ||
                      playground.accessibility.shade_coverage === "minimal") && (
                      <div className="italic">No accessibility information available</div>
                    )}
                </div>
              ) : (
                <div className="mt-1 italic">No accessibility information available</div>
              )}
            </div>
          )}

          {/* Parking Info */}
          {!playground.enriched ? (
            <Skeleton className="h-6 w-full" />
          ) : (
            <div className="text-muted-foreground text-xs">
              <div className="font-medium">Parking:</div>
              <div className="mt-1">
                {playground.parking ? (
                  <div>{playground.parking}</div>
                ) : (
                  <div className="italic">No parking information available</div>
                )}
              </div>
            </div>
          )}

          {/* Address */}
          {!playground.enriched ? (
            <Skeleton className="h-6 w-full" />
          ) : playground.address && onFlyTo ? (
            <button
              className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm underline hover:text-foreground"
              onClick={() => onFlyTo([playground.lon, playground.lat])}
              aria-label={`See ${name} on the map`}
            >
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{playground.address}</span>
            </button>
          ) : null}
        </div>

        {/* View Details Button - stays at bottom */}
        {playground.enriched && (
          <Link href={detailsUrl} onClick={onViewDetails} className="mt-auto pt-4">
            <Button variant="outline" className="w-full" size="lg">
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
