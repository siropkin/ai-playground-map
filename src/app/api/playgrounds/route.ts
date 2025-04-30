import { NextRequest, NextResponse } from "next/server";

import {
  PlaygroundSubmitData,
  AccessType,
  SurfaceType,
} from "@/types/playground";
import { createPlayground } from "@/data/playgrounds";

// Parse multipart form data for playground submissions
export async function parseSubmitPlaygroundFormData(
  req: NextRequest,
): Promise<PlaygroundSubmitData> {
  const formData = await req.formData();

  // Extract basic playground data
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const state = formData.get("state") as string;
  const zipCode = formData.get("zipCode") as string;
  const ageMin = parseInt(formData.get("ageMin") as string);
  const ageMax = parseInt(formData.get("ageMax") as string);
  const accessType = (formData.get("accessType") || null) as AccessType;
  const surfaceType = (formData.get("surfaceType") || null) as SurfaceType;

  // Parse features (comes as a JSON string)
  const featuresStr = formData.get("features") as string;
  const features = featuresStr ? JSON.parse(featuresStr) : [];

  // Parse open hours (comes as a JSON string)
  const openHoursStr = formData.get("openHours") as string;
  const openHours = openHoursStr ? JSON.parse(openHoursStr) : {};

  // Extract photos
  const photos = [];
  const photoCount = parseInt(formData.get("photoCount") as string) || 0;

  for (let i = 0; i < photoCount; i++) {
    const file = formData.get(`photo${i}`);
    const caption = (formData.get(`caption${i}`) as string) || "";
    const isPrimary = formData.get(`isPrimary${i}`) === "true";

    // Check if file exists and is a Blob or File (both have size property)
    if (file && typeof file === "object" && "size" in file) {
      photos.push({
        file: file as File,
        caption,
        isPrimary,
      });
    }
  }

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
    photos,
  };
}

export async function POST(req: NextRequest) {
  try {
    const playground: PlaygroundSubmitData =
      await parseSubmitPlaygroundFormData(req);

    const result = await createPlayground(playground);

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
