"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";

export default function PlaygroundList() {
  const { playgrounds, loading, error } = usePlaygrounds();

  if (loading) {
    return (
      <div className="bg-background/95 rounded-lg p-4 text-center shadow-lg backdrop-blur-sm">
        <p className="text-muted-foreground">Loading playgrounds...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 rounded-lg p-4 text-center shadow-lg backdrop-blur-sm">
        <p className="text-destructive">{error}</p>
        {/*<button*/}
        {/*  onClick={playgrounds}*/}
        {/*  className="text-primary mt-2 text-sm hover:underline"*/}
        {/*>*/}
        {/*  Try again*/}
        {/*</button>*/}
      </div>
    );
  }

  if (playgrounds.length === 0) {
    return (
      <div className="bg-background/95 rounded-lg p-4 text-center shadow-lg backdrop-blur-sm">
        <p className="text-muted-foreground">
          No playgrounds match your filters
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4">
      {playgrounds.map((playground) => (
        <Link href={`/playground/${playground.id}`} key={playground.id}>
          <Card className="bg-background/95 overflow-hidden shadow-lg backdrop-blur-sm">
            <div className="relative">
              <Image
                src={playground.images[0] || "/placeholders/playground.svg"}
                alt={playground.name}
                width={300}
                height={200}
                className="h-48 w-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">{playground.name}</h3>
                <div className="flex items-center">
                  <span className="text-sm font-medium">
                    {playground.rating}
                  </span>
                  <span className="text-muted-foreground ml-1 text-xs">
                    ({playground.reviews})
                  </span>
                </div>
              </div>
              <div className="text-muted-foreground mt-1 flex items-center text-sm">
                <MapPin className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{playground.address}</span>
                <span className="ml-2 flex-shrink-0">
                  {playground.distance}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline">{playground.access}</Badge>
                <Badge variant="outline">Ages {playground.ageRange}</Badge>
                {playground.features.slice(0, 3).map((feature) => (
                  <Badge variant="outline" key={feature}>
                    {feature}
                  </Badge>
                ))}
                {playground.features.length > 3 && (
                  <Badge variant="outline">
                    +{playground.features.length - 3} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
