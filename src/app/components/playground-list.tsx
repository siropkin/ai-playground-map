"use client";

import Image from "next/image";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { formatEnumString, getAgeRange } from "@/lib/utils";

export function PlaygroundList() {
  const { playgrounds, requestFlyTo } = usePlaygrounds();

  if (!playgrounds?.length) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-3">
      {playgrounds.map((playground, index) => {
        const primaryPhoto = playground.photos?.find((p) => p.isPrimary);
        const displayPhoto = primaryPhoto || playground.photos?.[0];
        const ageRange = getAgeRange(playground.ageMin, playground.ageMax);

        return (
          <Card
            key={playground.id}
            className="bg-background/95 cursor-pointer gap-0 overflow-hidden py-0 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl"
            onClick={() => {
              requestFlyTo([playground.longitude, playground.latitude]);
            }}
          >
            <CardHeader className="gap-0 p-0">
              <div className="relative h-48 w-full bg-zinc-200 dark:bg-zinc-700">
                {displayPhoto ? (
                  <Image
                    className="h-full w-full object-cover"
                    src={displayPhoto.filename}
                    alt={displayPhoto.caption || `Photo of ${playground.name}`}
                    width={300}
                    height={200}
                    priority={index < 3}
                  />
                ) : (
                  <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                    <span>No Image Available</span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">{playground.name}</h3>
              </div>

              <div className="text-muted-foreground mt-1 flex items-center text-sm">
                <MapPin className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">
                  {playground.address}, {playground.city}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {/* Access Type Badge */}
                {playground.accessType && (
                  <Badge variant="outline">
                    {formatEnumString(playground.accessType)}
                  </Badge>
                )}

                {/* Age Range Badge */}
                <Badge variant="outline">{ageRange}</Badge>

                {/* Surface Type Badge (Optional but useful) */}
                {playground.surfaceType && (
                  <Badge variant="outline">
                    {formatEnumString(playground.surfaceType)} Surface
                  </Badge>
                )}

                {/* Features Badges */}
                {playground.features?.slice(0, 2).map(
                  (
                    feature, // Show fewer features initially to save space
                  ) => (
                    <Badge variant="outline" key={feature}>
                      {formatEnumString(feature)}
                    </Badge>
                  ),
                )}

                {playground.features?.length > 2 && (
                  <Badge variant="outline">
                    +{playground.features.length - 2} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
