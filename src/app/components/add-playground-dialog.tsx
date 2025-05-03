"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Upload, Plus } from "lucide-react";

import { AccessType, FeatureType, OpenHours } from "@/types/playground";
import { AGE_GROUPS, ACCESS_TYPES, FEATURE_TYPES } from "@/lib/constants";
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
import { cn, formatEnumString } from "@/lib/utils";

interface PhotoUpload {
  file: File;
  preview: string;
  caption: string;
  isPrimary: boolean;
}

const MAX_PHOTOS = 5;
const sortedAccessTypes = [...ACCESS_TYPES].sort();
const sortedFeatureTypes = [...FEATURE_TYPES].sort();

// Helper: resolve short URL to real Google Maps URL via backend
async function resolveGoogleUrl(shortUrl: string): Promise<string> {
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
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`;
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
  const googleInputRef = useRef<HTMLInputElement>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [isGoogleAutofillLoading, setIsGoogleAutofillLoading] = useState(false);

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
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureType[]>([]);
  const [openHours, setOpenHours] = useState<OpenHours | null>(null);
  const [accessType, setAccessType] = useState<AccessType | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle photo input
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 3 - photos.length);
    setPhotos((prev) => [
      ...prev,
      ...files.map((file, i) => ({
        file,
        preview: URL.createObjectURL(file),
        caption: "",
        isPrimary: prev.length === 0 && i === 0, // First photo is primary if none yet
      })),
    ]);
    e.target.value = ""; // Reset input
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const newPhotos = prev.filter((_, i) => i !== index);
      // Ensure at least one is primary
      if (!newPhotos.some((p) => p.isPrimary) && newPhotos[0]) {
        newPhotos[0].isPrimary = true;
      }
      return newPhotos;
    });
  }

  function updatePhotoCaption(index: number, caption: string) {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[index].caption = caption;
      return newPhotos;
    });
  }

  function setPrimaryPhoto(index: number) {
    setPhotos((prev) => prev.map((p, i) => ({ ...p, isPrimary: i === index })));
  }

  // Handler for Google Maps link input
  const handleGoogleMapsUrl = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const url = e.target.value;
    setGoogleMapsUrl(url);

    if (!url) {
      return;
    }

    setIsGoogleAutofillLoading(true);

    // Step 1: resolve short URL
    let resolvedUrl = url;
    if (url.includes("goo.gl")) {
      resolvedUrl = await resolveGoogleUrl(url);
    }

    // Step 2: extract latitude/longitude
    const coords = extractLatLng(resolvedUrl);
    if (coords) {
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
    }

    setIsGoogleAutofillLoading(false);
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

      // Transform selectedAgeGroups to ageMin and ageMax
      if (selectedAgeGroups.length > 0) {
        const selected = AGE_GROUPS.filter((g) =>
          selectedAgeGroups.includes(g.key),
        );
        const ageMin = Math.min(...selected.map((g) => g.min));
        const ageMax = Math.max(...selected.map((g) => g.max));
        formData.append("ageMin", ageMin.toString());
        formData.append("ageMax", ageMax.toString());
      } else {
        formData.append("ageMin", "");
        formData.append("ageMax", "");
      }

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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(
          err.message || "An error occurred while submitting the playground",
        );
      } else {
        setError("An error occurred while submitting the playground");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      setSuccess(null);
      setError(null);

      // Google
      setGoogleMapsUrl("");
      setShowGoogleInput(false);
      setIsGoogleAutofillLoading(false);

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
      setSelectedAgeGroups([]);
      setSelectedFeatures([]);
      setOpenHours(null);
      setAccessType(null);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:block">Add playground</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="h-full w-full max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[80vh] sm:rounded-lg">
        {success ? (
          <>
            <DialogHeader className="flex flex-col items-center">
              <DialogTitle>Success!</DialogTitle>
              <DialogDescription>
                Your playground has been successfully submitted!
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-2 text-center">
              <div className="rounded-md bg-green-100 p-2 text-green-700">
                Thank you for your submission! We will review your playground
                soon.
                <br />
                While your playground is not yet visible on the map, you can
                reach it by direct link 👇
              </div>
              <Link href={`/playground/${success}`} className="mt-2">
                <Button onClick={() => setOpen(false)}>View playground</Button>
              </Link>
            </div>
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
                disabled={isGoogleAutofillLoading || isSubmitting}
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
                  disabled={isGoogleAutofillLoading || isSubmitting}
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
                    disabled={isGoogleAutofillLoading || isSubmitting}
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
                      disabled={isGoogleAutofillLoading || isSubmitting}
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
                      disabled={isGoogleAutofillLoading || isSubmitting}
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
                    disabled={isGoogleAutofillLoading || isSubmitting}
                  />
                </div>

                <div className="hidden">
                  <div className="flex flex-col gap-2">
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
                      disabled={isGoogleAutofillLoading || isSubmitting}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
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
                      disabled={isGoogleAutofillLoading || isSubmitting}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
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
                      disabled={isGoogleAutofillLoading || isSubmitting}
                    />
                  </div>
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
                    disabled={isGoogleAutofillLoading || isSubmitting}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="accessType" className="text-right">
                    Access (optional)
                  </Label>
                  <Input
                    type="hidden"
                    name="accessType"
                    value={accessType || ""}
                  />
                  <div className="mb-2 flex flex-wrap gap-2">
                    {sortedAccessTypes.map((type) => (
                      <Badge
                        key={type}
                        variant={accessType === type ? "default" : "outline"}
                        className={cn("cursor-pointer", {
                          "pointer-events-none opacity-50":
                            isGoogleAutofillLoading || isSubmitting,
                        })}
                        onClick={() => setAccessType(type)}
                      >
                        {formatEnumString(type)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Age group badges */}
                <div className="flex flex-col gap-2">
                  <Label className="text-right">Ages</Label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {AGE_GROUPS.map((group) => (
                      <Badge
                        key={group.key}
                        variant={
                          selectedAgeGroups.includes(group.key)
                            ? "default"
                            : "outline"
                        }
                        className={cn("cursor-pointer", {
                          "pointer-events-none opacity-50":
                            isGoogleAutofillLoading || isSubmitting,
                        })}
                        onClick={() => {
                          setSelectedAgeGroups((prev) =>
                            prev.includes(group.key)
                              ? prev.filter((k) => k !== group.key)
                              : [...prev, group.key],
                          );
                        }}
                      >
                        {group.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="features" className="text-right">
                    Features (optional)
                  </Label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {sortedFeatureTypes.map((type) => (
                      <Badge
                        key={type}
                        variant={
                          selectedFeatures.includes(type)
                            ? "default"
                            : "outline"
                        }
                        className={cn("cursor-pointer", {
                          "pointer-events-none opacity-50":
                            isGoogleAutofillLoading || isSubmitting,
                        })}
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

                <div className="flex flex-col gap-2">
                  <Label htmlFor="features" className="text-right">
                    Photos (optional, max {MAX_PHOTOS})
                  </Label>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      {photos.map((photo, index) => (
                        <div
                          key={index}
                          className="relative h-34 w-34 overflow-hidden rounded-md border border-gray-300"
                        >
                          <Image
                            src={photo.preview}
                            alt={`Preview ${index + 1}`}
                            className="h-full w-full object-cover"
                            width={300}
                            height={300}
                            unoptimized={true}
                          />
                          <div className="absolute inset-0 flex flex-col justify-between bg-black/40 p-2 opacity-0 transition-opacity hover:opacity-100">
                            <div className="flex justify-end space-x-1">
                              <button
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                disabled={
                                  isGoogleAutofillLoading || isSubmitting
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={photo.caption}
                                onChange={(e) =>
                                  updatePhotoCaption(index, e.target.value)
                                }
                                placeholder="Caption"
                                className="w-full rounded border border-gray-300 bg-white/90 px-2 py-1 text-xs"
                                disabled={
                                  isGoogleAutofillLoading || isSubmitting
                                }
                              />
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  id={`primary-${index}`}
                                  name="primaryPhoto"
                                  checked={photo.isPrimary}
                                  onChange={() => setPrimaryPhoto(index)}
                                  className="text-primary focus:ring-primary h-3 w-3 border-gray-300"
                                  disabled={
                                    isGoogleAutofillLoading || isSubmitting
                                  }
                                />
                                <label
                                  htmlFor={`primary-${index}`}
                                  className="ml-1 text-xs text-white"
                                >
                                  Primary
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {photos.length < MAX_PHOTOS && (
                        <div className="flex h-34 w-34 items-center justify-center rounded-md border border-dashed border-gray-300 hover:border-gray-400">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoSelect}
                            accept="image/*"
                            className="hidden"
                            multiple
                            disabled={isGoogleAutofillLoading || isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-muted-foreground flex h-full w-full cursor-pointer flex-col items-center justify-center space-y-1 outline-none hover:text-gray-700"
                            disabled={isGoogleAutofillLoading || isSubmitting}
                          >
                            <Upload className="h-4 w-4" />
                            <span className="text-xs">Upload Photo</span>
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Click on a photo to add a caption or set as primary. The
                      primary photo will be displayed as the main image.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isGoogleAutofillLoading || isSubmitting}
                >
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
