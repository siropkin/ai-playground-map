import { NextRequest, NextResponse } from "next/server";

import {
  PlaygroundSubmitData,
  AccessType,
  SurfaceType,
} from "@/types/playground";
import { createPlaygroundMetadata } from "@/data/playgrounds";

// Parse multipart form data for playground submissions
async function parseSubmitPlaygroundFormData(
  req: NextRequest,
): Promise<PlaygroundSubmitData> {
  const formData = await req.formData();

  // Extract and validate required fields
  const name = formData.get("name") as string;
  if (!name || name.trim() === "") {
    throw new Error("Playground name is required");
  }

  const description = formData.get("description") as string;
  if (!description || description.trim() === "") {
    throw new Error("Description is required");
  }

  // Parse and validate coordinates
  const latitudeStr = formData.get("latitude") as string;
  const longitudeStr = formData.get("longitude") as string;

  if (!latitudeStr || !longitudeStr) {
    throw new Error("Latitude and longitude are required");
  }

  const latitude = parseFloat(latitudeStr);
  const longitude = parseFloat(longitudeStr);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Invalid latitude or longitude values");
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Latitude or longitude values out of range");
  }

  // Extract optional fields
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const zipCode = formData.get("zipCode") as string;

  // Parse age ranges with validation
  const ageMinStr = formData.get("ageMin") as string;
  const ageMaxStr = formData.get("ageMax") as string;
  const ageMin = ageMinStr ? parseInt(ageMinStr) : 0;
  const ageMax = ageMaxStr ? parseInt(ageMaxStr) : 100;

  if (isNaN(ageMin) || isNaN(ageMax) || ageMin < 0 || ageMax < ageMin) {
    throw new Error("Invalid age range values");
  }

  const accessType = (formData.get("accessType") || null) as AccessType;
  const surfaceType = (formData.get("surfaceType") || null) as SurfaceType;

  // Parse features with validation
  const featuresStr = formData.get("features") as string;
  let features = [];
  try {
    features = featuresStr ? JSON.parse(featuresStr) : [];
    if (!Array.isArray(features)) {
      throw new Error("Features must be an array");
    }
  } catch {
    throw new Error("Invalid features format");
  }

  // Parse open hours with validation
  const openHoursStr = formData.get("openHours") as string;
  const openHours = openHoursStr ? JSON.parse(openHoursStr) : {};

  return {
    name,
    description,
    latitude,
    longitude,
    address,
    city,
    state,
    zipCode,
    ageMin,
    ageMax,
    openHours,
    accessType,
    surfaceType,
    features,
    photos: [], // No photos here
  };
}

export async function POST(req: NextRequest) {
  try {
    const playground: PlaygroundSubmitData =
      await parseSubmitPlaygroundFormData(req);

    const result = await createPlaygroundMetadata(playground);

    if (result.success) {
      return NextResponse.json({ id: result.id }, { status: 201 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
