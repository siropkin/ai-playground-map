import { NextRequest, NextResponse } from "next/server";

import { PlaygroundSubmitData } from "@/types/playground";
import { createPlayground } from "@/data/playgrounds";
import { parseSubmitPlaygroundFormData } from "@/lib/utils";

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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 },
    );
  }
}
