"use client";

import { useState, useCallback } from "react";
import { useFilters } from "@/contexts/filters-context";
import { usePlaygrounds } from "@/contexts/playgrounds-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Playground, PlaygroundSubmitData } from "@/types/playground";
// We'll use a simple alert instead of toast since sonner isn't available

type ResearchPlayground = {
  osmData: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    tags: Record<string, string>;
  };
  googleData: {
    googleMapsData?: {
      name: string;
      address: string;
      types: string[];
      rating: number | string;
      userRatingsTotal: number | string;
      placeId: string;
    };
    photos?: Array<{
      url: string;
      html_attributions: string[];
      note?: string;
    }>;
    note?: string;
    error?: string;
  };
};

export function PlaygroundResearch() {
  const { mapBounds } = useFilters();
  const { requestFlyTo } = usePlaygrounds();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ResearchPlayground[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlayground, setSelectedPlayground] =
    useState<ResearchPlayground | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingToDatabase, setIsAddingToDatabase] = useState(false);
  console.log("selectedPlayground", selectedPlayground);
  const handleSearch = async () => {
    if (!mapBounds) {
      setError("No map boundaries available. Please adjust the map view.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        south: mapBounds.south.toString(),
        north: mapBounds.north.toString(),
        west: mapBounds.west.toString(),
        east: mapBounds.east.toString(),
        limit: "10", // Limit to 10 results for performance
      });

      const response = await fetch(
        `/api/playgrounds/research?${queryParams.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch playground data");
      }

      const data = await response.json();
      setResults(data.results || []);

      if (data.results.length === 0) {
        setError("No playgrounds found in this area.");
      }
    } catch (err) {
      console.error("Error searching for playgrounds:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlayground = (playground: ResearchPlayground) => {
    setSelectedPlayground(playground);
    setIsDialogOpen(true);
  };

  const handleFlyTo = (latitude: number, longitude: number) => {
    requestFlyTo([longitude, latitude]);
  };

  const preparePlaygroundData = (
    playground: ResearchPlayground,
  ): PlaygroundSubmitData => {
    // Combine OSM and Google data to create a playground submission
    const { osmData, googleData } = playground;

    // Extract city, state, zip from Google address if available
    let city = "";
    let state = "";
    let zipCode = "";

    // Try to extract location information from Google address if available
    if (googleData.googleMapsData?.address) {
      try {
        const addressParts = googleData.googleMapsData.address.split(", ");
        if (addressParts.length >= 3) {
          city = addressParts[addressParts.length - 3];

          // Handle state and zip which are often in the format "State ZIP"
          const stateZipPart = addressParts[addressParts.length - 2];
          if (stateZipPart) {
            const stateZipMatch = stateZipPart.match(
              /([A-Z]{2})\s+(\d{5}(-\d{4})?)/,
            );
            if (stateZipMatch) {
              state = stateZipMatch[1];
              zipCode = stateZipMatch[2];
            } else {
              state = stateZipPart;
            }
          }
        }
      } catch (error) {
        console.error("Error parsing address:", error);
        // Use default empty values if parsing fails
      }
    }

    // Map OSM tags to features if possible
    const features = [];
    if (osmData.tags) {
      if (osmData.tags.swing) features.push("swings");
      if (osmData.tags.slide) features.push("slides");
      if (osmData.tags.climbing) features.push("climbing_wall");
      if (osmData.tags.sand) features.push("sandpit");
      if (osmData.tags.water) features.push("water_play");
      if (osmData.tags.seesaw) features.push("see_saw");
      if (osmData.tags.toilet || osmData.tags.toilets)
        features.push("restrooms");
      if (osmData.tags.parking) features.push("parking_lot");
      if (osmData.tags.bench || osmData.tags.benches) features.push("benches");
      if (osmData.tags.wheelchair) features.push("wheelchair_accessible");
    }

    // Create default open hours structure
    const openHours = {
      monday: { open: "09:00", close: "18:00" },
      tuesday: { open: "09:00", close: "18:00" },
      wednesday: { open: "09:00", close: "18:00" },
      thursday: { open: "09:00", close: "18:00" },
      friday: { open: "09:00", close: "18:00" },
      saturday: { open: "09:00", close: "18:00" },
      sunday: { open: "09:00", close: "18:00" },
    };

    // Map OSM tags to features if possible, ensuring they match FeatureType
    const mappedFeatures = [] as (
      | "swings"
      | "slides"
      | "climbing_wall"
      | "sandpit"
      | "water_play"
      | "see_saw"
      | "restrooms"
      | "parking_lot"
      | "benches"
      | "wheelchair_accessible"
    )[];

    if (osmData.tags) {
      if (osmData.tags.swing) mappedFeatures.push("swings");
      if (osmData.tags.slide) mappedFeatures.push("slides");
      if (osmData.tags.climbing) mappedFeatures.push("climbing_wall");
      if (osmData.tags.sand) mappedFeatures.push("sandpit");
      if (osmData.tags.water) mappedFeatures.push("water_play");
      if (osmData.tags.seesaw) mappedFeatures.push("see_saw");
      if (osmData.tags.toilet || osmData.tags.toilets)
        mappedFeatures.push("restrooms");
      if (osmData.tags.parking) mappedFeatures.push("parking_lot");
      if (osmData.tags.bench || osmData.tags.benches)
        mappedFeatures.push("benches");
      if (osmData.tags.wheelchair) mappedFeatures.push("wheelchair_accessible");
    }

    return {
      name:
        osmData.name !== "Unnamed Playground"
          ? osmData.name
          : googleData.googleMapsData?.name || "Unnamed Playground",
      description: `Imported from OpenStreetMap (ID: ${osmData.id})${
        googleData.googleMapsData?.rating &&
        googleData.googleMapsData.rating !== "N/A"
          ? ` - Google Rating: ${googleData.googleMapsData.rating}/5`
          : ""
      }`,
      latitude: osmData.latitude,
      longitude: osmData.longitude,
      address: googleData.googleMapsData?.address || "",
      city,
      state,
      zipCode,
      ageMin: 0,
      ageMax: 12,
      openHours,
      accessType: "public",
      surfaceType:
        osmData.tags?.surface === "sand"
          ? "sand"
          : osmData.tags?.surface === "grass"
            ? "grass"
            : osmData.tags?.surface === "rubber"
              ? "poured_rubber"
              : osmData.tags?.surface === "asphalt"
                ? "asphalt"
                : osmData.tags?.surface === "concrete"
                  ? "concrete"
                  : "mulch",
      features: mappedFeatures,
      // We'll handle photo uploads separately after playground creation
      // We'll handle photo uploads separately after playground creation
      photos: [],
      isApproved: false,
    };
  };

  return (
    <div className="flex flex-col gap-4 px-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Research Playgrounds</h2>
        <Button
          onClick={handleSearch}
          disabled={isLoading || !mapBounds}
          size="sm"
        >
          {isLoading ? "Searching..." : "Search Current Area"}
          {!isLoading && <Search className="ml-2 h-4 w-4" />}
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="grid max-h-[400px] gap-2 overflow-y-auto">
          {results.map((playground) => (
            <Card
              key={playground.osmData.id}
              className="flex justify-between p-3"
            >
              <div>
                <div className="font-medium">
                  {playground.osmData.name !== "Unnamed Playground"
                    ? playground.osmData.name
                    : playground.googleData.googleMapsData?.name ||
                      "Unnamed Playground"}
                </div>
                <div className="text-muted-foreground max-w-[200px] truncate text-sm">
                  {playground.googleData.googleMapsData?.address ||
                    `${playground.osmData.latitude.toFixed(6)}, ${playground.osmData.longitude.toFixed(6)}`}
                </div>
                {playground.googleData.googleMapsData?.rating &&
                  playground.googleData.googleMapsData.rating !== "N/A" && (
                    <Badge variant="outline" className="mt-1">
                      Rating: {playground.googleData.googleMapsData.rating}/5
                    </Badge>
                  )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="mb-1 flex flex-wrap justify-end gap-1">
                  {playground.googleData.googleMapsData &&
                    !playground.googleData.error && (
                      <Badge variant="outline" className="text-xs">
                        Google data
                      </Badge>
                    )}

                  {playground.googleData.photos &&
                    playground.googleData.photos.length > 0 &&
                    !("note" in playground.googleData.photos[0]) && (
                      <Badge variant="secondary" className="text-xs">
                        {playground.googleData.photos.length} photos
                      </Badge>
                    )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleFlyTo(
                        playground.osmData.latitude,
                        playground.osmData.longitude,
                      )
                    }
                    title="Fly to this playground"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSelectPlayground(playground)}
                    title="View details and add to database"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {selectedPlayground?.osmData.name !== "Unnamed Playground"
                ? selectedPlayground?.osmData.name
                : selectedPlayground?.googleData.googleMapsData?.name ||
                  "Unnamed Playground"}
            </DialogTitle>
          </DialogHeader>

          {selectedPlayground && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-medium">OpenStreetMap Data</h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-medium">ID:</span>{" "}
                      {selectedPlayground.osmData.id}
                    </p>
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedPlayground.osmData.name}
                    </p>
                    <p>
                      <span className="font-medium">Coordinates:</span>{" "}
                      {selectedPlayground.osmData.latitude.toFixed(6)},{" "}
                      {selectedPlayground.osmData.longitude.toFixed(6)}
                    </p>

                    {Object.keys(selectedPlayground.osmData.tags || {}).length >
                      0 && (
                      <div>
                        <p className="mt-2 font-medium">Tags:</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(selectedPlayground.osmData.tags).map(
                            ([key, value]) => (
                              <Badge
                                key={key}
                                variant="secondary"
                                className="text-xs"
                              >
                                {key}: {value}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPlayground.googleData.googleMapsData && (
                  <div>
                    <h3 className="mb-2 font-medium">Google Maps Data</h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Name:</span>{" "}
                        {selectedPlayground.googleData.googleMapsData.name}
                      </p>
                      <p>
                        <span className="font-medium">Address:</span>{" "}
                        {selectedPlayground.googleData.googleMapsData.address}
                      </p>
                      <p>
                        <span className="font-medium">Rating:</span>{" "}
                        {selectedPlayground.googleData.googleMapsData.rating}/5
                        (
                        {
                          selectedPlayground.googleData.googleMapsData
                            .userRatingsTotal
                        }{" "}
                        reviews)
                      </p>

                      {selectedPlayground.googleData.googleMapsData.types && (
                        <div>
                          <p className="mt-2 font-medium">Types:</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {selectedPlayground.googleData.googleMapsData.types.map(
                              (type) => (
                                <Badge
                                  key={type}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {type.replace(/_/g, " ")}
                                </Badge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Google Maps data status */}
              <div className="bg-muted mb-4 rounded-md p-2">
                <h3 className="mb-1 text-sm font-medium">
                  Google Maps Information
                </h3>
                <div className="text-muted-foreground text-xs">
                  {selectedPlayground.googleData.error ? (
                    <>
                      <p className="font-medium text-amber-600">
                        ⚠ Error: {selectedPlayground.googleData.error}
                      </p>
                      <p className="mt-1">
                        Google Maps data could not be retrieved. Basic
                        information from OpenStreetMap will be used.
                      </p>
                    </>
                  ) : selectedPlayground.googleData.googleMapsData ? (
                    <>
                      <p className="font-medium text-green-600">
                        ✓ Google Maps data available
                      </p>
                      <p className="mt-1">
                        Additional information from Google Maps has been
                        retrieved for this playground.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-amber-600">
                        ⚠ No Google Maps data available
                      </p>
                      <p className="mt-1">
                        Only basic information from OpenStreetMap will be used.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Photo status information */}
              {selectedPlayground.googleData.photos && (
                <div className="bg-muted mb-4 rounded-md p-2">
                  <h3 className="mb-1 text-sm font-medium">
                    Photo Information
                  </h3>
                  <div className="text-muted-foreground text-xs">
                    {selectedPlayground.googleData.photos.length > 0 &&
                    !("note" in selectedPlayground.googleData.photos[0]) ? (
                      <>
                        <p className="font-medium text-green-600">
                          ✓ {selectedPlayground.googleData.photos.length} photos
                          available
                        </p>
                        <p className="mt-1">
                          Photos are provided by Google Maps and will be
                          displayed below.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-amber-600">
                          ⚠{" "}
                          {selectedPlayground.googleData.photos?.length > 0 &&
                          "note" in selectedPlayground.googleData.photos[0]
                            ? selectedPlayground.googleData.photos[0].note
                            : "No photos available"}
                        </p>
                        <p className="mt-1">
                          You can add photos after adding this playground to the
                          database.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Display photos if available */}
              {selectedPlayground.googleData.photos &&
                selectedPlayground.googleData.photos.length > 0 &&
                selectedPlayground.googleData.photos.some(
                  (photo) => photo.url,
                ) && (
                  <div>
                    <h3 className="mb-2 font-medium">Photos</h3>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {selectedPlayground.googleData.photos
                        .filter((photo) => photo.url) // Only include photos with URLs
                        .map((photo, index) => (
                          <div
                            key={index}
                            className="relative aspect-square overflow-hidden rounded-md"
                          >
                            <img
                              src={photo.url}
                              alt={`Playground photo ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {selectedPlayground.googleData.photos
                        .filter(
                          (photo) =>
                            photo.url && photo.html_attributions?.length > 0,
                        )
                        .flatMap((photo) =>
                          photo.html_attributions.map((attribution, i) => (
                            <div
                              key={`${i}-${photo.url}`}
                              dangerouslySetInnerHTML={{ __html: attribution }}
                            />
                          )),
                        )}
                    </div>
                  </div>
                )}

              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedPlayground) return;

                    setIsAddingToDatabase(true);
                    try {
                      // Prepare the playground data
                      const playgroundData =
                        preparePlaygroundData(selectedPlayground);

                      // Create a FormData object to submit
                      const formData = new FormData();
                      formData.append("name", playgroundData.name);
                      formData.append(
                        "description",
                        playgroundData.description,
                      );
                      formData.append(
                        "latitude",
                        playgroundData.latitude.toString(),
                      );
                      formData.append(
                        "longitude",
                        playgroundData.longitude.toString(),
                      );
                      formData.append("address", playgroundData.address);
                      formData.append("city", playgroundData.city);
                      formData.append("state", playgroundData.state);
                      formData.append("zipCode", playgroundData.zipCode);
                      formData.append(
                        "ageMin",
                        playgroundData.ageMin.toString(),
                      );
                      formData.append(
                        "ageMax",
                        playgroundData.ageMax.toString(),
                      );
                      formData.append("accessType", playgroundData.accessType);
                      formData.append(
                        "surfaceType",
                        playgroundData.surfaceType,
                      );
                      formData.append(
                        "features",
                        JSON.stringify(playgroundData.features),
                      );
                      formData.append(
                        "openHours",
                        JSON.stringify(playgroundData.openHours),
                      );

                      // Submit to the API
                      const response = await fetch("/api/playgrounds", {
                        method: "POST",
                        body: formData,
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(
                          errorData.error || "Failed to add playground",
                        );
                      }

                      const result = await response.json();

                      // If we have photos from Google, let the user know they can be added later
                      if (
                        selectedPlayground.googleData.photos &&
                        selectedPlayground.googleData.photos.length > 0 &&
                        !("note" in selectedPlayground.googleData.photos[0])
                      ) {
                        alert(
                          "Playground added successfully! Note: Photos from Google Maps need to be manually added to comply with attribution requirements.",
                        );
                      } else {
                        alert("Playground added successfully!");
                      }
                      setIsDialogOpen(false);

                      // Optionally fly to the new playground
                      handleFlyTo(
                        selectedPlayground.osmData.latitude,
                        selectedPlayground.osmData.longitude,
                      );
                    } catch (err) {
                      console.error("Error adding playground:", err);
                      alert(
                        err instanceof Error
                          ? err.message
                          : "Failed to add playground",
                      );
                    } finally {
                      setIsAddingToDatabase(false);
                    }
                  }}
                  disabled={isAddingToDatabase}
                >
                  {isAddingToDatabase ? "Adding..." : "Add to Database"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
