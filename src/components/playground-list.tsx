"use client";

// import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { Badge } from "@/components/ui/badge";

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
      {playgrounds.map((playground) => {
        // const displayPhoto = playground.photos?.[0];
        const name = playground.name || "Unnamed Playground";

        return (
          <Card
            key={playground.id}
            className="bg-background/95 flex min-h-[200px] cursor-pointer flex-row gap-0 overflow-hidden py-0 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl"
            onClick={() => {
              requestFlyTo([playground.lon, playground.lat]);
            }}
          >
            <CardHeader className="flex w-1/3 gap-0 p-0">
              <div className="h-full w-full flex-1 items-center justify-center bg-zinc-200 dark:bg-zinc-700">
                {/*{displayPhoto ? (*/}
                {/*  <Image*/}
                {/*    className="h-full w-full object-cover"*/}
                {/*    // src={displayPhoto.photo_reference}*/}
                {/*    src={*/}
                {/*      displayPhoto.streetview_params*/}
                {/*        ? JSON.stringify(displayPhoto.streetview_params)*/}
                {/*        : displayPhoto.photo_reference*/}
                {/*    }*/}
                {/*    alt={`Photo of ${playground.name}`}*/}
                {/*    width={Math.min(displayPhoto.width, 300)}*/}
                {/*    height={Math.min(displayPhoto.height, 300)}*/}
                {/*    priority={index < 3}*/}
                {/*  />*/}
                {/*) : (*/}
                {/*  <div className="text-muted-foreground flex h-full w-full items-center justify-center text-4xl" />*/}
                {/*)}*/}
                <div className="text-muted-foreground flex h-full w-full items-center justify-center text-4xl" />
              </div>
            </CardHeader>

            <CardContent className="flex w-2/3 flex-col gap-2 p-4">
              {name && <h3 className="font-semibold">{name}</h3>}

              {playground.description && (
                <div className="text-muted-foreground text-xs">
                  {playground.description}
                </div>
              )}

              {playground.osmTags && (
                <div className="flex flex-wrap gap-1">
                  {/* Render osmTags as badges */}
                  {Object.entries(playground.osmTags).map(([key, value]) => (
                    <Badge
                      className="max-w-full truncate"
                      variant="outline"
                      key={key}
                    >
                      <span className="truncate">
                        {key}: {value}
                      </span>
                    </Badge>
                  ))}
                </div>
              )}

              {playground.address && (
                <div className="text-muted-foreground flex items-center text-xs">
                  📍
                  <span className="truncate">{playground.address}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
