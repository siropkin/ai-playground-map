import { NextRequest, NextResponse } from "next/server";
import { fetchPlaygroundDescription } from "@/lib/openai";

export async function POST(request: NextRequest) {
  // Get the AbortSignal from the request
  const signal = request.signal;
  
  try {
    // Check if the request has been aborted
    if (signal?.aborted) {
      return NextResponse.json(
        { error: "Request aborted" },
        { status: 499 }
      );
    }
    
    const body = await request.json();
    const { address } = body as { address: string };

    if (!address || typeof address !== "string") {
      return NextResponse.json(
        { error: "Valid address is required" },
        { status: 400 }
      );
    }

    // Fetch the description using OpenAI with the AbortSignal
    const description = await fetchPlaygroundDescription(address, signal);

    // Check if the request has been aborted after the fetch
    if (signal?.aborted) {
      return NextResponse.json(
        { error: "Request aborted" },
        { status: 499 }
      );
    }

    return NextResponse.json({ description });
  } catch (error) {
    // Handle aborted requests
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Request aborted" },
        { status: 499 }
      );
    }
    
    console.error("Error generating playground description:", error);
    return NextResponse.json(
      { error: "Failed to generate playground description" },
      { status: 500 }
    );
  }
}