"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Clock, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MapViewSingle from "@/components/map-view-single";
import { mockPlaygrounds } from "@/data/mockPlaygrounds";
import type { Playground } from "@/types/types";

export default function PlaygroundDetail({
  params,
}: {
  params: { id: string };
}) {
  const [playground, setPlayground] = useState<Playground | null>(null);

  useEffect(() => {
    // Find the playground by ID
    const foundPlayground = mockPlaygrounds.find(
      (p) => p.id === Number.parseInt(params.id),
    );
    setPlayground(foundPlayground || null);
  }, [params.id]);

  if (!playground) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold">Playground not found</h2>
        <Link href="/" className="mt-4 inline-block">
          <Button>Back to Map</Button>
        </Link>
      </div>
    );
  }

  return (
    <main className="pb-16">
      <div className="relative h-64">
        <Image
          src={playground.images[0] || "/placeholders/playground.svg"}
          alt={playground.name}
          fill
          className="object-cover"
        />
        <div className="absolute top-0 right-0 left-0 flex items-center p-4">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="mr-auto rounded-full bg-white/80 dark:bg-gray-800/80"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="container py-4">
        <div className="flex items-start justify-between">
          <h1 className="text-2xl font-bold">{playground.name}</h1>
          <div className="flex items-center">
            <span className="text-sm font-medium">{playground.rating}</span>
            <span className="text-muted-foreground ml-1 text-xs">
              ({playground.reviews})
            </span>
          </div>
        </div>

        <div className="text-muted-foreground mt-1 flex items-center text-sm">
          <MapPin className="mr-1 h-3.5 w-3.5" />
          <span>{playground.address}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
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

        <div className="mt-6 grid grid-cols-2 gap-2">
          <div className="flex items-center rounded-lg border p-3">
            <Clock className="text-muted-foreground mr-2 h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-xs">Hours</p>
              <p className="text-sm font-medium">{playground.hours}</p>
            </div>
          </div>
          <div className="flex items-center rounded-lg border p-3">
            <Calendar className="text-muted-foreground mr-2 h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-xs">Age Range</p>
              <p className="text-sm font-medium">{playground.ageRange} years</p>
            </div>
          </div>
          <div className="flex items-center rounded-lg border p-3">
            <DollarSign className="text-muted-foreground mr-2 h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-xs">Access</p>
              <p className="text-sm font-medium">{playground.access}</p>
            </div>
          </div>
          <div className="flex items-center rounded-lg border p-3">
            <MapPin className="text-muted-foreground mr-2 h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-xs">Directions</p>
              <p className="text-primary text-sm font-medium">Get directions</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="about" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
          <TabsContent value="about" className="mt-4">
            <p className="text-muted-foreground text-sm">
              {playground.description}
            </p>

            <h3 className="mt-4 mb-2 font-semibold">Features</h3>
            <div className="grid grid-cols-2 gap-2">
              {playground.features.map((feature) => (
                <div key={feature} className="flex items-center">
                  <div className="bg-primary mr-2 h-2 w-2 rounded-full"></div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <h3 className="mt-4 mb-2 font-semibold">Location</h3>
            <div className="h-48 overflow-hidden rounded-lg">
              <MapViewSingle
                location={playground.location}
                name={playground.name}
              />
            </div>
          </TabsContent>
          <TabsContent value="photos" className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              {playground.images.map((image, index) => (
                <div
                  key={index}
                  className="relative aspect-square overflow-hidden rounded-lg"
                >
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`${playground.name} photo ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="reviews" className="mt-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <span className="text-lg font-semibold">
                    {playground.rating}
                  </span>
                  <span className="text-muted-foreground ml-1 text-sm">
                    ({playground.reviews} reviews)
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {[1, 2, 3].map((review) => (
                <div key={review} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="bg-muted mr-2 h-8 w-8 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">User Name</p>
                        <p className="text-muted-foreground text-xs">
                          2 weeks ago
                        </p>
                      </div>
                    </div>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill={star <= 4 ? "currentColor" : "none"}
                          stroke="currentColor"
                          className={`h-3 w-3 ${star <= 4 ? "text-yellow-400" : "text-muted-foreground"}`}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm">
                    Great playground! My kids loved the slides and swings. Very
                    clean and well-maintained.
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
