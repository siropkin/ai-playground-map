"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function PlaygroundDetail({
  params,
}: {
  params: Promise<PlaygroundDetailParams>;
}) {
  const resolvedParams = use(params);
  const [playground, setPlayground] = useState<Playground | null>(null);

  useEffect(() => {
    const fetchPlayground = async () => {
      const p = await getPlaygroundById(resolvedParams.id);
      setPlayground(p);
    };
    fetchPlayground();
  }, []);

  if (!playground) {
    return null;
  }

  const coverPhoto =
    playground.photos.find((p) => p.isPrimary)?.filename ||
    playground.photos[0]?.filename;

  // Google Maps link
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${playground.latitude},${playground.longitude}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex flex-col items-start gap-8 md:flex-row">
        <div className="w-full md:w-1/2">
          <div className="relative mb-4 aspect-square overflow-hidden rounded-lg">
            {coverPhoto ? (
              <Image
                src={coverPhoto}
                alt={playground.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex h-full w-full items-center justify-center bg-gray-200 text-center dark:bg-gray-700">
                No photo available
              </div>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-1/2">
          <h1 className="mb-2 text-2xl font-bold">{playground.name}</h1>
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge variant="outline">{capitalize(playground.accessType)}</Badge>
            <Badge variant="outline">
              Ages {playground.ageMin}–{playground.ageMax}
            </Badge>
            <Badge variant="outline">
              {capitalize(playground.surfaceType || "Not specified")}
            </Badge>
          </div>
          <div className="text-muted-foreground mb-2 flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4" />
            <span>
              {playground.address}, {playground.city}, {playground.state}{" "}
              {playground.zipCode}
            </span>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary ml-2 underline"
            >
              Get directions
            </a>
          </div>
          <div className="mb-2 flex items-center gap-2 text-sm">
            <Clock className="text-muted-foreground h-4 w-4" />
            <span>
              <span className="text-muted-foreground">Today&apos;s Hours:</span>{" "}
              {getTodayOpenHours(playground.openHours)}
            </span>
          </div>
          <div className="mb-4">
            <p className="text-muted-foreground text-sm">
              {playground.description}
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-semibold">Features</h3>
            <div className="flex flex-wrap gap-2">
              {playground.features.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  No features listed
                </span>
              ) : (
                playground.features.map((feature) => (
                  <span
                    key={feature}
                    className="bg-primary/10 text-primary border-primary/20 rounded-full border px-3 py-1 text-xs font-medium"
                  >
                    {capitalize(feature)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-10">
        <h3 className="mb-2 font-semibold">Location</h3>
        <div className="h-64 overflow-hidden rounded-lg">
          <MapViewSingle playground={playground} />
        </div>
      </div>
      {playground.photos.length > 1 && (
        <div className="mt-10">
          <h3 className="mb-2 font-semibold">Photos</h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {playground.photos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden rounded-lg"
              >
                <Image
                  src={photo.filename || "/placeholder.svg"}
                  alt={photo.caption || `${playground.name} photo ${index + 1}`}
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
        </div>
      )}
    </div>
  );
}
