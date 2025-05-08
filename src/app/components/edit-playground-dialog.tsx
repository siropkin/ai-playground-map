"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Upload, Plus, Save, Edit } from "lucide-react";

import {
  AccessType,
  FeatureType,
  OpenHours,
  Playground,
} from "@/types/playground";
import {
  AGE_GROUPS,
  ACCESS_TYPES,
  FEATURE_TYPES,
  PHOTOS_BUCKET_NAME,
} from "@/lib/constants";
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
import { createClient } from "@/lib/supabase/client";

interface PhotoUpload {
  file: File;
  preview: string;
  caption: string;
  isPrimary: boolean;
}

interface ExistingPhoto {
  filename: string;
  caption: string;
  isPrimary: boolean;
  createdAt: string;
}

interface EditPlaygroundDialogProps {
  playground: Playground;
}

const MAX_PHOTOS = 5;
const sortedAccessTypes = [...ACCESS_TYPES].sort();
const sortedFeatureTypes = [...FEATURE_TYPES].sort();

export function EditPlaygroundDialog({
  playground,
}: EditPlaygroundDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState<string[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureType[]>([]);
  const [openHours, setOpenHours] = useState<OpenHours | null>(null);
  const [accessType, setAccessType] = useState<AccessType | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle photo input
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(
      0,
      MAX_PHOTOS - (photos.length + existingPhotos.length),
    );
    setPhotos((prev) => [
      ...prev,
      ...files.map((file, i) => ({
        file,
        preview: URL.createObjectURL(file),
        caption: "",
        isPrimary: prev.length === 0 && existingPhotos.length === 0 && i === 0, // First photo is primary if none yet
      })),
    ]);
    e.target.value = ""; // Reset input
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const newPhotos = prev.filter((_, i) => i !== index);
      // Ensure at least one is primary if no existing photos are primary
      if (
        !newPhotos.some((p) => p.isPrimary) &&
        !existingPhotos.some((p) => p.isPrimary) &&
        newPhotos[0]
      ) {
        newPhotos[0].isPrimary = true;
      }
      return newPhotos;
    });
  }

  function removeExistingPhoto(filename: string) {
    setExistingPhotos((prev) => {
      const newPhotos = prev.filter((p) => p.filename !== filename);
      // Ensure at least one is primary
      if (
        !newPhotos.some((p) => p.isPrimary) &&
        !photos.some((p) => p.isPrimary) &&
        newPhotos[0]
      ) {
        newPhotos[0].isPrimary = true;
      }
      return newPhotos;
    });
    setPhotosToDelete((prev) => [...prev, filename]);
  }

  function updatePhotoCaption(index: number, caption: string) {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[index].caption = caption;
      return newPhotos;
    });
  }

  function updateExistingPhotoCaption(filename: string, caption: string) {
    setExistingPhotos((prev) => {
      return prev.map((photo) =>
        photo.filename === filename ? { ...photo, caption } : photo,
      );
    });
  }

  function setPrimaryPhoto(index: number) {
    setPhotos((prev) => prev.map((p, i) => ({ ...p, isPrimary: i === index })));
    setExistingPhotos((prev) => prev.map((p) => ({ ...p, isPrimary: false })));
  }

  function setExistingPrimaryPhoto(filename: string) {
    setExistingPhotos((prev) =>
      prev.map((p) => ({ ...p, isPrimary: p.filename === filename })),
    );
    setPhotos((prev) => prev.map((p) => ({ ...p, isPrimary: false })));
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Prepare and send metadata (no images)
      const formData = new FormData(e.currentTarget);

      formData.append("features", JSON.stringify(selectedFeatures));
      formData.append("openHours", JSON.stringify(openHours));

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

      // Remove any photo fields from formData (if present)
      Array.from(formData.keys()).forEach((key) => {
        if (
          key.startsWith("photo") ||
          key.startsWith("caption") ||
          key.startsWith("isPrimary") ||
          key === "photoCount"
        ) {
          formData.delete(key);
        }
      });

      // 2. PUT metadata to API
      const response = await fetch(
        `/api/playgrounds?id=${encodeURIComponent(playground.id)}`,
        {
          method: "PUT",
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update playground");
      }

      // 3. Delete photos that were marked for deletion
      for (const filename of photosToDelete) {
        const deleteRes = await fetch(
          `/api/playgrounds/photos?playgroundId=${playground.id}&filename=${encodeURIComponent(filename)}`,
          {
            method: "DELETE",
          },
        );

        if (!deleteRes.ok) {
          console.error(`Failed to delete photo ${filename}`);
        }
      }

      // 4. Update existing photos metadata
      for (const photo of existingPhotos) {
        const updateRes = await fetch("/api/playgrounds/photos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playgroundId: playground.id,
            filename: photo.filename,
            caption: photo.caption,
            isPrimary: photo.isPrimary,
          }),
        });

        if (!updateRes.ok) {
          console.error(
            `Failed to update photo metadata for ${photo.filename}`,
          );
        }
      }

      // 5. Upload new photos
      for (const photo of photos) {
        // Generate a unique filename
        const uuid = crypto.randomUUID();
        const ext = photo.file.name.split(".").pop() || "jpg";
        const filename = `${playground.id}/${uuid}.${ext}`;
        const fullFilename = `${PHOTOS_BUCKET_NAME}/${filename}`;

        // Upload to Supabase Storage
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from(PHOTOS_BUCKET_NAME)
          .upload(filename, photo.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Photo upload failed: ${uploadError.message}`);
        }

        // POST photo metadata to API
        const metaRes = await fetch("/api/playgrounds/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playgroundId: playground.id,
            filename: fullFilename,
            caption: photo.caption,
            isPrimary: photo.isPrimary,
          }),
        });

        if (!metaRes.ok) {
          const metaErr = await metaRes.json();
          throw new Error(metaErr.error || "Failed to save photo metadata");
        }
      }

      setSuccess(String(playground.id));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(
          err.message || "An error occurred while updating the playground",
        );
      } else {
        setError("An error occurred while updating the playground");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close dialog and redirect
  const handleClose = () => {
    setOpen(false);
    router.push(`/playground/${playground.id}`);
  };

  useEffect(() => {
    setName(playground.name);
    setDescription(playground.description || "");
    setLatitude(String(playground.latitude));
    setLongitude(String(playground.longitude));
    setAddress(playground.address || "");
    setCity(playground.city || "");
    setState(playground.state || "");
    setZipCode(playground.zipCode || "");
    setExistingPhotos(
      playground.photos.map((photo) => ({
        filename: photo.filename,
        caption: photo.caption || "",
        isPrimary: photo.isPrimary,
        createdAt: photo.createdAt,
      })),
    );
    setPhotos([]);
    setPhotosToDelete([]);
    setSelectedAgeGroups(
      AGE_GROUPS.filter(
        (group) =>
          playground.ageMin !== undefined &&
          playground.ageMax !== undefined &&
          group.min >= playground.ageMin &&
          group.max <= playground.ageMax,
      ).map((group) => group.key),
    );
    setSelectedFeatures(playground.features as FeatureType[]);
    setOpenHours(playground.openHours);
    setAccessType(playground.accessType);
    setIsApproved(playground.isApproved);
    setSuccess(null);
    setError(null);
  }, [open, playground]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Edit className="h-4 w-4" />
          <span className="hidden sm:block">Edit</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="h-full w-full max-w-none overflow-y-auto rounded-none sm:h-auto sm:max-h-[80vh] sm:rounded-lg">
        {success ? (
          <>
            <DialogHeader className="flex flex-col items-center">
              <DialogTitle>Success!</DialogTitle>
              <DialogDescription>
                The playground has been successfully updated!
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-2 text-center">
              <div className="rounded-md bg-green-100 p-2 text-green-700">
                Your changes have been saved successfully.
              </div>
              <Link href={`/playground/${success}`} className="mt-2">
                <Button onClick={handleClose}>View playground</Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Edit playground</DialogTitle>
              <DialogDescription>
                Make changes to the playground information below.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div className="rounded-md bg-red-100 p-2 text-red-700">
                {error}
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
                    disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                          "pointer-events-none opacity-50": isSubmitting,
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
                          "pointer-events-none opacity-50": isSubmitting,
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
                          "pointer-events-none opacity-50": isSubmitting,
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

                {/* Approval status */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="isApproved" className="text-right">
                    Approval Status
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="checkbox"
                      id="isApproved"
                      name="isApproved"
                      checked={isApproved}
                      onChange={(e) => setIsApproved(e.target.checked)}
                      className="h-4 w-4"
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="isApproved" className="cursor-pointer">
                      Approved
                    </Label>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="features" className="text-right">
                    Photos (optional, max {MAX_PHOTOS})
                  </Label>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      {/* Existing photos */}
                      {existingPhotos.map((photo) => (
                        <div
                          key={photo.filename}
                          className="relative h-34 w-34 overflow-hidden rounded-md border border-gray-300"
                        >
                          <Image
                            src={photo.filename}
                            alt={photo.caption || "Playground photo"}
                            className="h-full w-full object-cover"
                            width={300}
                            height={300}
                          />
                          <div className="absolute inset-0 flex flex-col justify-between bg-black/40 p-2 opacity-0 transition-opacity hover:opacity-100">
                            <div className="flex justify-end space-x-1">
                              <button
                                type="button"
                                onClick={() =>
                                  removeExistingPhoto(photo.filename)
                                }
                                className="rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                disabled={isSubmitting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={photo.caption}
                                onChange={(e) =>
                                  updateExistingPhotoCaption(
                                    photo.filename,
                                    e.target.value,
                                  )
                                }
                                placeholder="Caption"
                                className="w-full rounded border border-gray-300 bg-white/90 px-2 py-1 text-xs"
                                disabled={isSubmitting}
                              />
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  id={`primary-${photo.filename}`}
                                  name="primaryPhoto"
                                  checked={photo.isPrimary}
                                  onChange={() =>
                                    setExistingPrimaryPhoto(photo.filename)
                                  }
                                  className="text-primary focus:ring-primary h-3 w-3 border-gray-300"
                                  disabled={isSubmitting}
                                />
                                <label
                                  htmlFor={`primary-${photo.filename}`}
                                  className="ml-1 text-xs text-white"
                                >
                                  Primary
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* New photos */}
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
                                disabled={isSubmitting}
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
                                disabled={isSubmitting}
                              />
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  id={`primary-new-${index}`}
                                  name="primaryPhoto"
                                  checked={photo.isPrimary}
                                  onChange={() => setPrimaryPhoto(index)}
                                  className="text-primary focus:ring-primary h-3 w-3 border-gray-300"
                                  disabled={isSubmitting}
                                />
                                <label
                                  htmlFor={`primary-new-${index}`}
                                  className="ml-1 text-xs text-white"
                                >
                                  Primary
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Upload button */}
                      {photos.length + existingPhotos.length < MAX_PHOTOS && (
                        <div className="flex h-34 w-34 items-center justify-center rounded-md border border-dashed border-gray-300 hover:border-gray-400">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handlePhotoSelect}
                            accept="image/*"
                            className="hidden"
                            multiple
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-muted-foreground flex h-full w-full cursor-pointer flex-col items-center justify-center space-y-1 outline-none hover:text-gray-700"
                            disabled={isSubmitting}
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
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
