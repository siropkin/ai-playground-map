import Link from "next/link";
import Image from "next/image";
import { MapPin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { playgrounds } from "@/lib/placeholder-data";

export default function PlaygroundList() {
  return (
    <div className="flex w-full flex-col gap-4">
      {playgrounds.map((playground) => (
        <Link href={`/playground/${playground.id}`} key={playground.id}>
          <Card className="overflow-hidden bg-white">
            <div className="relative">
              <Image
                src={playground.image || "/playground-placeholder.svg"}
                alt={playground.name}
                width={300}
                height={200}
                className="h-48 w-full object-cover"
              />
              <button
                className="absolute top-2 right-2 rounded-full bg-white/80 p-1.5"
                aria-label={
                  playground.bookmarked
                    ? "Remove from bookmarks"
                    : "Add to bookmarks"
                }
              >
                <Star
                  className={`h-5 w-5 ${playground.bookmarked ? "fill-yellow-400 text-yellow-400" : "text-gray-500"}`}
                />
              </button>
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">{playground.name}</h3>
                <div className="flex items-center">
                  <Star className="mr-1 h-4 w-4 fill-yellow-400 text-yellow-400" />
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
                {playground.features.map((feature) => (
                  <Badge variant="outline" key={feature}>
                    {feature}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
