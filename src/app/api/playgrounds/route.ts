import { NextRequest, NextResponse } from "next/server";

import { APP_ADMIN_ROLE } from "@/lib/constants";
import {
  PlaygroundSubmitData,
  AccessType,
  SurfaceType,
} from "@/types/playground";
import {
  createPlaygroundMetadata,
  deletePlayground,
  updatePlaygroundMetadata,
} from "@/data/playgrounds";
import { createClient } from "@/lib/supabase/server";

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

  const isApproved = formData.get("isApproved") === "on";

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
    isApproved,
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

export async function PUT(req: NextRequest) {
  try {
    // Get the playground ID from the URL
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Playground ID is required" },
        { status: 400 },
      );
    }

    // Check if user is admin
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (!data?.user || data.user.role !== APP_ADMIN_ROLE) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    // Parse the rest of the form data
    const playground: PlaygroundSubmitData =
      await parseSubmitPlaygroundFormData(req);

    // Update the playground
    const result = await updatePlaygroundMetadata(Number(id), playground);

    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 });
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

export async function DELETE(req: NextRequest) {
  try {
    // Get the playground ID from the URL
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Playground ID is required" },
        { status: 400 },
      );
    }

    // Check if user is admin
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (!data?.user || data.user.role !== APP_ADMIN_ROLE) {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 },
      );
    }

    // Delete the playground
    const result = await deletePlayground(id);

    if (result.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
