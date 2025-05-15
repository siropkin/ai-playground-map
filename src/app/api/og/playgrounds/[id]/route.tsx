import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { SITE_NAME, UNNAMED_PLAYGROUND } from "@/lib/constants";
import { formatEnumString } from "@/lib/utils";
import { fetchPlaygroundByIdWithCache } from "@/lib/api/server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const runtime = "edge";

export async function GET(_: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Playground ID is required" },
        { status: 400 },
      );
    }

    const playground = await fetchPlaygroundByIdWithCache(id);

    if (!playground) {
      return NextResponse.json(
        { error: "Playground not found" },
        { status: 404 },
      );
    }

    // Use the same fallback values as the playground detail page
    const name = playground.name || UNNAMED_PLAYGROUND;
    const description =
      playground.description && playground.description.length > 100
        ? playground.description.substring(0, 100) + "..."
        : playground.description || "No description available";
    const features =
      playground.features && playground.features.length > 0
        ? playground.features.map(formatEnumString)
        : [];
    const address = playground.address || "Address not available";

    // Use the first image if available
    const imageUrl =
      playground.images && playground.images.length > 0
        ? playground.images[0].image_url
        : null;

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            height: "100%",
            background: "#f5f5f5",
            fontFamily: "sans-serif",
          }}
        >
          {/* Left: Image */}
          <div
            style={{
              width: "45%",
              height: "100%",
              background: "#e5e5e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderTopLeftRadius: 24,
              borderBottomLeftRadius: 24,
              overflow: "hidden",
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={`${name} photo`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <span
                style={{
                  color: "#888",
                  fontSize: 32,
                  textAlign: "center",
                  width: "100%",
                }}
              >
                No image
              </span>
            )}
          </div>
          {/* Right: Details */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              padding: "48px 40px",
              background: "#fff",
              borderTopRightRadius: 24,
              borderBottomRightRadius: 24,
              height: "100%",
              boxSizing: "border-box",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#222",
                marginBottom: 8,
              }}
            >
              {SITE_NAME}
            </div>
            <div
              style={{
                fontSize: 44,
                fontWeight: 800,
                color: "#111",
                marginBottom: 18,
                lineHeight: 1.1,
                maxWidth: 600,
              }}
              title={name}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 22,
                color: "#444",
                marginBottom: 18,
                maxWidth: 600,
              }}
            >
              {description}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 18,
              }}
            >
              {features.length > 0 ? (
                features.slice(0, 5).map((feature) => (
                  <span
                    key={feature}
                    style={{
                      background: "#f1f5f9",
                      color: "#2563eb",
                      border: "1px solid #dbeafe",
                      borderRadius: 9999,
                      padding: "6px 18px",
                      fontSize: 16,
                      fontWeight: 500,
                    }}
                  >
                    {feature}
                  </span>
                ))
              ) : (
                <span
                  style={{
                    color: "#888",
                    fontSize: 16,
                  }}
                >
                  No features listed
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 16,
                color: "#666",
              }}
            >
              <b>Address:</b> {address}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
