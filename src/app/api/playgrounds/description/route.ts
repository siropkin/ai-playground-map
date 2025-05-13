import { NextRequest, NextResponse } from "next/server";
import { fetchPlaygroundDescription } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body as { address: string };

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Valid address is required" },
        { status: 400 }
      );
    }

    // Fetch the description using OpenAI
    const description = await fetchPlaygroundDescription(address);

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Error generating playground description:", error);
    return NextResponse.json(
      { error: "Failed to generate playground description" },
      { status: 500 }
    );
  }
}