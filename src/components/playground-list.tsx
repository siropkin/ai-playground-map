"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UNNAMED_PLAYGROUND } from "@/lib/constants";
import { formatEnumString, formatOsmIdentifier } from "@/lib/utils";
import Link from "next/link";
import { MapPin } from "lucide-react";

export function PlaygroundList({
  displayEmptyState,
}: {
  displayEmptyState?: boolean;
}) {
  const { playgrounds, requestFlyTo } = usePlaygrounds();

  if (!playgrounds?.length) {
    return displayEmptyState ? (
      <Card className="bg-background/95 flex w-[100%] flex-col items-center justify-center gap-0 overflow-hidden p-8 shadow-lg backdrop-blur-sm transition-shadow">
        <CardContent className="flex flex-col items-center p-0">
          <div className="text-muted-foreground mb-2 text-5xl">🔍</div>
          <h3 className="mb-1 font-semibold">No playgrounds found</h3>
          <p className="text-muted-foreground text-center text-sm">
            Try zooming out, moving the map, or adjusting the filters to find
            more playgrounds.
          </p>
        </CardContent>
      </Card>
    ) : null;
  }

  return (
    <div className="flex flex-col space-y-2">
      {playgrounds.map((playground) => {
        const name = playground.name || UNNAMED_PLAYGROUND;
        const displayImage = playground.images?.[0];
        return (
          <Card
            key={playground.id}
            className="bg-background/95 flex min-h-[200px] flex-row gap-0 overflow-hidden py-0 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl"
          >
            <CardHeader className="flex w-1/3 gap-0 p-0">
              <div className="h-full w-full flex-1 items-center justify-center bg-zinc-200 dark:bg-zinc-700">
                {!playground.enriched ? (
                  <Skeleton className="h-full w-full rounded-r-none" />
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
                  <div className="text-muted-foreground flex h-full w-full items-center justify-center text-4xl" />
                )}
              </div>
            </CardHeader>

            <CardContent className="flex w-2/3 flex-col gap-2 p-4">
              {!playground.enriched ? (
                <Skeleton className="h-4 w-full" />
              ) : name ? (
                <Link
                  href="/playgrounds/[id]"
                  as={`/playgrounds/${formatOsmIdentifier(playground.osmId, playground.osmType)}`}
                  className="underline"
                  aria-label={`View details about ${name}`}
                >
                  <h3 className="font-semibold">{name}</h3>
                </Link>
              ) : null}

              {!playground.enriched ? (
                <Skeleton className="h-16 w-full" />
              ) : playground.description ? (
                <div className="text-muted-foreground text-xs">
                  {playground.description}
                </div>
              ) : null}

              {!playground.enriched ? (
                <Skeleton className="h-4 w-full" />
              ) : playground.features?.length ? (
                <div className="flex flex-wrap gap-1">
                  {playground.features.map((value, i) => (
                    <Badge
                      className="max-w-full truncate"
                      variant="outline"
                      key={i}
                    >
                      <span className="truncate">
                        {formatEnumString(value)}
                      </span>
                    </Badge>
                  ))}
                </div>
              ) : null}

              {!playground.enriched ? (
                <Skeleton className="h-4 w-full" />
              ) : playground.address ? (
                <div
                  className="text-muted-foreground flex cursor-pointer text-xs underline"
                  onClick={() => {
                    requestFlyTo([playground.lon, playground.lat]);
                  }}
                  aria-label={`See ${name} on the map`}
                >
                  <MapPin className="mr-1 h-4 w-4 shrink-0" />
                  <span>{playground.address}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
