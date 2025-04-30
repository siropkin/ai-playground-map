"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { AccessType, FeatureType, OpenHours } from "@/types/playground";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatEnumString } from "@/lib/utils";

// const ACCESS_TYPES: AccessType[] = [
//   "public",
//   "private",
//   "school",
//   "community_center",
//   "park_district",
//   "hoa",
//   "mall_indoor",
// ];

const ACCESS_TYPES: AccessType[] = [
  "public",
  "school",
  "community_center",
  "mall_indoor",
];

// const FEATURE_TYPES: FeatureType[] = [
//   "swings",
//   "baby_swings",
//   "slides",
//   "spiral_slide",
//   "climbing_wall",
//   "rope_course",
//   "monkey_bars",
//   "balance_beam",
//   "sandpit",
//   "water_play",
//   "zip_line",
//   "see_saw",
//   "spinning_equipment",
//   "shade_structure",
//   "picnic_tables",
//   "benches",
//   "restrooms",
//   "parking_lot",
//   "bike_rack",
//   "dog_friendly",
//   "sensory_play",
//   "musical_instruments",
//   "fitness_equipment",
//   "walking_trails",
//   "wheelchair_accessible",
//   "water_fountain",
// ];

const FEATURE_TYPES: FeatureType[] = [
  "swings",
  "slides",
  "climbing_wall",
  "monkey_bars",
  "sandpit",
  "water_play",
  "see_saw",
  "shade_structure",
  "picnic_tables",
  "benches",
  "restrooms",
  "parking_lot",
  "wheelchair_accessible",
];

interface PhotoUpload {
  file: File;
  preview: string;
  caption: string;
  isPrimary: boolean;
}

// Helper: resolve short URL to real Google Maps URL via backend
async function resolveShortUrl(shortUrl: string): Promise<string> {
  try {
    const res = await fetch("/api/resolve-google-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: shortUrl }),
    });
    if (!res.ok) return shortUrl;
    const data = await res.json();
    return data.resolvedUrl || shortUrl;
  } catch {
    return shortUrl;
  }
}

// Helper: extract lat/lng from Google Maps URL (also supports !3dLAT!4dLNG and /search/LAT,LNG)
function extractLatLng(url: string): { lat: string; lng: string } | null {
  // Try to match @lat,lng
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) return { lat: atMatch[1], lng: atMatch[2] };

  // Try to match /?q=lat,lng
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) return { lat: qMatch[1], lng: qMatch[2] };

  // Try to match !3dLAT!4dLNG
  const dMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (dMatch) return { lat: dMatch[1], lng: dMatch[2] };

  // Try to match /search/lat,lng (with optional space or %20 and + or -)
  const searchMatch = url.match(
    /\/search\/([+]?-?\d+(?:\.\d+)?),\s*([+]?-?\d+(?:\.\d+)?)/,
  );
  if (searchMatch) {
    return {
      lat: searchMatch[1].replace(/^\+/, ""), // Remove leading +
      lng: searchMatch[2].replace(/^\+/, ""), // Remove leading +
    };
  }

  return null;
}

// Helper: reverse geocode using Nominatim
async function reverseGeocode(lat: string, lng: string) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    return data;
  } catch {
    return {};
  }
}

export function AddPlaygroundDialog() {
  const [open, setOpen] = useState(false);

  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const googleInputRef = useRef<HTMLInputElement>(null);
  // Form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureType[]>([]);
  const [openHours, setOpenHours] = useState<OpenHours | null>(null);
  const [accessType, setAccessType] = useState<AccessType | null>(null);

  // Handler for Google Maps link input
  const handleGoogleMapsUrl = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const url = e.target.value;
    setGoogleMapsUrl(url);

    if (!url) {
      return;
    }

    // Step 1: resolve short URL
    let resolvedUrl = url;
    if (url.includes("goo.gl")) {
      resolvedUrl = await resolveShortUrl(url);
    }

    // Step 2: extract latitude/longitude
    const coords = extractLatLng(resolvedUrl);
    if (!coords) {
      return;
    }

    // Step 3: reverse geocode for address, city, state, zipCode, name
    const geocodeData = await reverseGeocode(coords.lat, coords.lng);

    setLatitude(coords.lat);
    setLongitude(coords.lng);
    setAddress(geocodeData.display_name || "");
    setCity(
      geocodeData.address?.city ||
        geocodeData.address?.town ||
        geocodeData.address?.village ||
        geocodeData.address?.hamlet ||
        geocodeData.address?.suburb ||
        "",
    );
    setState(geocodeData.address?.state || "");
    setZipCode(geocodeData.address?.postcode || "");
    setName(
      geocodeData.address?.amenity ||
        geocodeData.address?.road ||
        geocodeData.address?.neighbourhood ||
        "",
    );
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      // Add features as JSON string
      formData.append("features", JSON.stringify(selectedFeatures));

      // Add open hours as JSON string
      formData.append("openHours", JSON.stringify(openHours));

      // Add photos
      formData.append("photoCount", photos.length.toString());
      photos.forEach((photo, index) => {
        formData.append(`photo${index}`, photo.file);
        formData.append(`caption${index}`, photo.caption);
        formData.append(`isPrimary${index}`, photo.isPrimary.toString());
      });

      const response = await fetch("/api/playgrounds", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit playground");
      }

      const data = await response.json();
      setSuccess(data.id);
    } catch (err: any) {
      setError(
        err.message || "An error occurred while submitting the playground",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      setSuccess(null);

      // Google
      setGoogleMapsUrl("");
      setShowGoogleInput(false);

      // Form
      setName("");
      setDescription("");
      setLatitude("");
      setLongitude("");
      setAddress("");
      setCity("");
      setState("");
      setZipCode("");
      setPhotos([]);
      setSelectedFeatures([]);
      setOpenHours(null);
      setAccessType(null);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>Add playground</Button>
      </DialogTrigger>

      <DialogContent>
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Success!</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <div className="rounded-md bg-green-100 p-2 text-green-700">
                Thank you for your submission! We will review your playground
                soon.
              </div>

              <div>
                While your playground is not yet visible on the map, you can
                reach it by direct link{" "}
              </div>
            </div>

            <DialogFooter>
              <Link href={`/playground/${success}`}>
                <Button onClick={() => setOpen(false)}>View playground</Button>
              </Link>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add playground</DialogTitle>
              <DialogDescription>
                If you want to add a playground, please fill out this form. We
                will review it shortly.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-md bg-red-100 p-2 text-red-700">
                {error}
              </div>
            )}

            {!showGoogleInput && (
              <Button
                className="my-2"
                type="button"
                onClick={() => {
                  setShowGoogleInput(true);
                  setTimeout(() => googleInputRef.current?.focus(), 0);
                }}
              >
                Autofill with Google Maps link
              </Button>
            )}

            {showGoogleInput && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="googleMapsUrl" className="text-right">
                  Google Maps Link
                </Label>
                <Input
                  id="googleMapsUrl"
                  name="googleMapsUrl"
                  type="text"
                  className="col-span-3"
                  value={googleMapsUrl}
                  onChange={handleGoogleMapsUrl}
                  placeholder="Paste Google Maps share link"
                  ref={googleInputRef}
                />
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    className="col-span-3"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="latitude" className="text-right">
                      Latitude
                    </Label>
                    <Input
                      id="latitude"
                      name="latitude"
                      type="text"
                      className="col-span-3"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="longitude" className="text-right">
                      Longitude
                    </Label>
                    <Input
                      id="longitude"
                      name="longitude"
                      type="text"
                      className="col-span-3"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="address" className="text-right">
                    Address (optional)
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    className="col-span-3"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="flex hidden flex-col gap-2">
                  <Label htmlFor="city" className="text-right">
                    City (optional)
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    type="text"
                    className="col-span-3"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="flex hidden flex-col gap-2">
                  <Label htmlFor="state" className="text-right">
                    State (optional)
                  </Label>
                  <Input
                    id="state"
                    name="state"
                    type="text"
                    className="col-span-3"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  />
                </div>

                <div className="flex hidden flex-col gap-2">
                  <Label htmlFor="zipCode" className="text-right">
                    Zip Code (optional)
                  </Label>
                  <Input
                    id="zipCode"
                    name="zipCode"
                    type="text"
                    className="col-span-3"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="description" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    className="col-span-3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="accessType" className="text-right">
                    Access
                  </Label>
                  <Input
                    type="hidden"
                    name="accessType"
                    value={accessType || ""}
                  />
                  <div className="mb-2 flex flex-wrap gap-2">
                    {ACCESS_TYPES.map((type) => (
                      <Badge
                        key={type}
                        variant={accessType === type ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setAccessType(type)}
                      >
                        {formatEnumString(type)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="features" className="text-right">
                    Features
                  </Label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {FEATURE_TYPES.map((type) => (
                      <Badge
                        key={type}
                        variant={
                          selectedFeatures.includes(type)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedFeatures((prev) =>
                            prev.includes(type)
                              ? prev.filter((f) => f !== type)
                              : [...prev, type],
                          );
                        }}
                      >
                        {formatEnumString(type)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit playground"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
