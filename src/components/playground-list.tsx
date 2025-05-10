"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { formatAddress, formatEnumString, getAgeRange } from "@/lib/utils";

export function PlaygroundList({
  showEmptyState,
}: {
  showEmptyState?: boolean;
}) {
  const { playgrounds, requestFlyTo } = usePlaygrounds();

  if (!playgrounds?.length) {
    return showEmptyState ? (
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
      {playgrounds.map((playground, index) => {
        const primaryPhoto = playground.photos?.find((p) => p.isPrimary);
        const displayPhoto = primaryPhoto || playground.photos?.[0];
        const ageRange = getAgeRange(playground.ageMin, playground.ageMax);

        return (
          <Card
            key={playground.id}
            className={`bg-background/95 flex cursor-pointer flex-row gap-0 overflow-hidden py-0 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl ${
              !playground.isApproved
                ? "border-2 border-amber-500 dark:border-amber-600"
                : ""
            }`}
            onClick={() => {
              requestFlyTo([playground.longitude, playground.latitude]);
            }}
          >
            <CardHeader className="flex w-1/3 gap-0 p-0">
              <div className="h-full w-full flex-1 items-center justify-center bg-zinc-200 dark:bg-zinc-700">
                {displayPhoto ? (
                  <Image
                    className="h-full w-full object-cover"
                    src={displayPhoto.filename}
                    alt={displayPhoto.caption || `Photo of ${playground.name}`}
                    width={100}
                    height={300}
                    priority={index < 3}
                    unoptimized={true}
                  />
                ) : (
                  <div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
                    No image
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex w-2/3 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{playground.name}</h3>
                {!playground.isApproved && (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                    Not approved
                  </Badge>
                )}
              </div>

              {playground.description && (
                <div className="text-muted-foreground text-xs">
                  {playground.description}
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-1 empty:hidden">
                {/* Access Type Badge */}
                {playground.accessType && (
                  <Badge variant="outline">
                    {formatEnumString(playground.accessType)}
                  </Badge>
                )}

                {/* Age Range Badge */}
                {ageRange && <Badge variant="outline">{ageRange}</Badge>}

                {/* Surface Type Badge (Optional but useful) */}
                {playground.surfaceType && (
                  <Badge variant="outline">
                    {formatEnumString(playground.surfaceType)} Surface
                  </Badge>
                )}

                {/* Features Badges */}
                {playground.features?.slice(0, 2).map((feature) => (
                  <Badge variant="outline" key={feature}>
                    {formatEnumString(feature)}
                  </Badge>
                ))}

                {playground.features?.length > 2 && (
                  <Badge variant="outline">
                    +{playground.features.length - 2} more
                  </Badge>
                )}
              </div>

              <div className="text-muted-foreground mt-2 flex items-center text-xs">
                <MapPin className="mr-1 h-4 w-4 shrink-0" />
                <span className="truncate">{formatAddress(playground)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
