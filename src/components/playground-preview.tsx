"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { formatEnumString, formatOsmIdentifier } from "@/lib/utils";
import { Playground } from "@/types/playground";
import { MapPin } from "lucide-react";

interface PlaygroundPreviewProps {
  playground: Playground;
  onViewDetails?: () => void;
  onFlyTo?: (coords: [number, number]) => void;
  hideTitle?: boolean;
}

export function PlaygroundPreview({
  playground,
  onViewDetails,
  onFlyTo,
  hideTitle = false,
}: PlaygroundPreviewProps) {
  const name = playground.name || UNNAMED_PLAYGROUND;
  const displayImage = playground.images?.[0];

  const hasNoEnrichmentData =
    playground.enriched === true &&
    !playground.description &&
    !playground.features?.length &&
    !playground.images?.length &&
    (!playground.name || playground.name === UNNAMED_PLAYGROUND);

  const detailsUrl = `/playgrounds/${formatOsmIdentifier(playground.osmId, playground.osmType)}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Image Section */}
      <div className="relative h-48 w-full overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-700">
        {!playground.enriched ? (
          <div className="relative h-full w-full">
            <Skeleton className="h-full w-full" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Thinking...</span>
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
          <div className="text-muted-foreground flex h-full w-full items-center justify-center text-5xl" />
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col gap-2">
        {/* Title */}
        {!hideTitle && (
          <>
            {!playground.enriched ? (
              <Skeleton className="h-6 w-3/4" />
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{name}</h3>
                {playground.enriched && !hasNoEnrichmentData && (
                  <span
                    className="rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400"
                    title="AI-generated content may contain errors"
                  >
                    AI
                  </span>
                )}
              </div>
            )}
          </>
        )}

        {/* Description */}
        {!playground.enriched ? (
          <Skeleton className="h-16 w-full" />
        ) : hasNoEnrichmentData ? (
          <div className="text-muted-foreground text-sm italic">
            <p>No AI information available for this playground.</p>
          </div>
        ) : playground.description ? (
          <p className="text-muted-foreground line-clamp-3 text-sm">
            {playground.description}
          </p>
        ) : null}

        {/* Features */}
        {!playground.enriched ? (
          <Skeleton className="h-6 w-full" />
        ) : playground.features?.length ? (
          <div className="flex flex-wrap gap-1">
            {playground.features.slice(0, 5).map((value, i) => (
              <Badge className="max-w-full truncate" variant="outline" key={i}>
                <span className="truncate">{formatEnumString(value)}</span>
              </Badge>
            ))}
            {playground.features.length > 5 && (
              <Badge variant="outline">+{playground.features.length - 5}</Badge>
            )}
          </div>
        ) : null}

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

        {/* View Details Button */}
        {playground.enriched && (
          <Link href={detailsUrl} onClick={onViewDetails} className="mt-4">
            <Button variant="outline" className="w-full" size="lg">
              View Details
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
