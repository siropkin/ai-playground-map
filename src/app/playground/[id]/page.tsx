"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MapPin, Clock, Calendar, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MapViewSingle from "@/components/map-view-single";
import { getPlaygroundById } from "@/data/playgrounds";
import type { Playground } from "@/types/playground";

type PlaygroundDetailParams = { id: string };

function getTodayOpenHours(openHours: Playground["openHours"]) {
  if (!openHours) return "No hours available";
  const days: (keyof Playground["openHours"])[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const today = days[new Date().getDay()];
  const hours = openHours[today];
  if (!hours || hours.closed) return "Closed today";
  return `${hours.open}–${hours.close}`;
}

export default function PlaygroundDetail({
  params,
}: {
  params: Promise<PlaygroundDetailParams>;
}) {
  const resolvedParams = use(params);
  const [playground, setPlayground] = useState<Playground | null>(null);
  console.log(playground);
  useEffect(() => {
    const fetchPlayground = async () => {
      const p = await getPlaygroundById(resolvedParams.id);
      setPlayground(p);
    };
    fetchPlayground();
  }, []);

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

  const coverPhoto =
    playground.photos.find((p) => p.isPrimary)?.filename ||
    playground.photos[0]?.filename;

  return (
    <main className="pb-16">
      <div className="relative h-64">
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={playground.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gray-200 dark:bg-gray-700" />
        )}
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
        </div>

        <div className="text-muted-foreground mt-1 flex items-center text-sm">
          <MapPin className="mr-1 h-3.5 w-3.5" />
          <span>
            {playground.address}, {playground.city}, {playground.state}{" "}
            {playground.zipCode}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
          <Badge variant="outline">{playground.accessType}</Badge>
          <Badge variant="outline">
            Ages {playground.ageMin}–{playground.ageMax}
          </Badge>
          <Badge variant="outline">{playground.surfaceType}</Badge>
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
              <p className="text-muted-foreground text-xs">Today's Hours</p>
              <p className="text-sm font-medium">
                {getTodayOpenHours(playground.openHours)}
              </p>
            </div>
          </div>
          <div className="flex items-center rounded-lg border p-3">
            <Calendar className="text-muted-foreground mr-2 h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-xs">Age Range</p>
              <p className="text-sm font-medium">
                {playground.ageMin}–{playground.ageMax} years
              </p>
            </div>
          </div>
          <div className="flex items-center rounded-lg border p-3">
            <Layers className="text-muted-foreground mr-2 h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-xs">Surface</p>
              <p className="text-sm font-medium">{playground.surfaceType}</p>
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
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
              <MapViewSingle playground={playground} />
            </div>
          </TabsContent>
          <TabsContent value="photos" className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              {playground.photos.map((photo, index) => (
                <div
                  key={index}
                  className="relative aspect-square overflow-hidden rounded-lg"
                >
                  <Image
                    src={photo.filename || "/placeholder.svg"}
                    alt={
                      photo.caption || `${playground.name} photo ${index + 1}`
                    }
                    fill
                    className="object-cover"
                  />
                  {photo.caption && (
                    <div className="absolute right-0 bottom-0 left-0 bg-black/50 p-1 text-xs text-white">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
