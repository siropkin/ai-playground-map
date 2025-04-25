"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePlaygrounds } from "@/contexts/playgrounds-context";

export function PlaygroundList() {
  const { playgrounds } = usePlaygrounds();

  if (playgrounds.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-2">
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
              </div>
              <div className="text-muted-foreground mt-1 flex items-center text-sm">
                <MapPin className="mr-1 h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{playground.address}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline">{playground.access}</Badge>
                <Badge variant="outline">Ages {playground.ages}</Badge>
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
