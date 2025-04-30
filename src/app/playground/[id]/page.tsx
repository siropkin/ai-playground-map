import Image from "next/image";
import { MapPin, Clock } from "lucide-react";

import type { Playground } from "@/types/playground";
import { getPlaygroundById } from "@/data/playgrounds";
import { Badge } from "@/components/ui/badge";
import MapViewSingle from "@/components/map-view-single";
import { formatEnumString, getAgeRange } from "@/lib/utils";

type PlaygroundDetailParams = { id: string };

function getTodayOpenHours(openHours: Playground["openHours"]) {
  if (!openHours) {
    return "No info available";
  }
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

function formatAddress(playground: Playground): string {
  const arr = [
    playground.address,
    playground.city,
    playground.state,
    playground.zipCode,
  ].filter(Boolean);
  return arr.join(", ") || "No address available";
}

export default async function PlaygroundDetail({
  params,
}: {
  params: Promise<PlaygroundDetailParams>;
}) {
  const resolvedParams = await params;
  const playground = await getPlaygroundById(resolvedParams.id);

  if (!playground) {
    return null;
  }

  const coverPhoto =
    playground.photos.find((p: { isPrimary: boolean }) => p.isPrimary)
      ?.filename || playground.photos[0]?.filename;

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${playground.latitude},${playground.longitude}`;

  const ageRange = getAgeRange(playground.ageMin, playground.ageMax);

  return (
    <div className="mx-auto flex max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      {/* Main details */}
      <div className="flex flex-col gap-8 md:flex-row">
        {/* Left side - Main image */}
        <div className="w-full md:w-1/2">
          <div className="aspect-square overflow-hidden rounded-lg bg-zinc-100 md:aspect-[4/3] dark:bg-zinc-800">
            {coverPhoto ? (
              <Image
                src={coverPhoto}
                alt={playground.name}
                width={600}
                height={450}
                className="h-full w-full object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-muted-foreground">
                  No Image Available
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Details */}
        <div className="w-full md:w-1/2">
          <h1 className="mb-2 text-3xl font-bold">{playground.name}</h1>

          {/* Categories */}
          <div className="mb-4 flex flex-wrap gap-2">
            {playground.accessType && (
              <Badge className="px-2 py-1 text-xs">
                {formatEnumString(playground.accessType)}
              </Badge>
            )}
            {playground.surfaceType && (
              <Badge className="px-2 py-1 text-xs">
                {formatEnumString(playground.surfaceType)}
              </Badge>
            )}
            {ageRange && (
              <Badge className="px-2 py-1 text-xs">{ageRange}</Badge>
            )}
          </div>

          {/* Address */}
          <div className="mb-6">
            <h3 className="text-muted-foreground text-sm font-medium">
              Address
            </h3>
            <p className="text-sm leading-relaxed">
              {formatAddress(playground)}
            </p>
            <span className="text-muted-foreground text-sm">
              {" "}
              (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                get directions
              </a>
              )
            </span>
          </div>

          {/* Hours */}
          <div className="mb-6 flex hidden items-start gap-2 text-sm">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-medium">Today&apos;s Hours</p>
              <p>{getTodayOpenHours(playground.openHours)}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-muted-foreground text-sm font-medium">
              Description
            </h3>
            <p className="text-sm leading-relaxed">
              {playground.description || "No description available"}
            </p>
          </div>

          {/* Features */}
          <div className="mb-6">
            <h3 className="text-muted-foreground mb-1 text-sm font-medium">
              Features
            </h3>
            <div className="flex flex-wrap gap-2">
              {playground.features.length === 0 ? (
                <p className="text-sm leading-relaxed">No features listed</p>
              ) : (
                playground.features.map((feature: string) => (
                  <span
                    key={feature}
                    className="bg-primary/10 text-primary border-primary/20 rounded-full border px-3 py-1 text-xs font-medium"
                  >
                    {formatEnumString(feature)}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location section */}
      <div className="mt-12">
        <h2 className="mb-4 text-xl font-semibold">Location</h2>
        <div className="h-64 w-full overflow-hidden rounded-lg">
          <MapViewSingle playground={playground} />
        </div>
      </div>

      {/* Photos section */}
      {playground.photos.length > 1 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-semibold">Photos</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {playground.photos.map(
              (
                photo: { filename: string; caption?: string },
                index: number,
              ) => (
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
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                  {photo.caption && (
                    <div className="absolute right-0 bottom-0 left-0 bg-black/50 p-1 text-xs text-white">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
