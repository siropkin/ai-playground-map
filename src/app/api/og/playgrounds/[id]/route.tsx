import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_ICON, UNNAMED_PLAYGROUND } from "@/lib/constants";
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

    const name = playground.name || UNNAMED_PLAYGROUND;
    const description = playground.description
      ? playground.description.length > 120
        ? playground.description.substring(0, 120) + "..."
        : playground.description
      : "No description available";
    const features = playground.features?.map(formatEnumString) || [];
    const address = playground.address || "Address not available";

    const imageUrl = playground.images?.[0]?.image_url || null;

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: "linear-gradient(to bottom right, #f8fafc, #e2e8f0)",
            fontFamily: "sans-serif",
            overflow: "hidden",
          }}
        >
          {/* Background pattern for visual interest */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundSize: "30px 30px",
              backgroundImage:
                "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
              opacity: 0.4,
            }}
          />

          {/* Main content container */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              padding: "40px",
              boxSizing: "border-box",
            }}
          >
            {/* Left: Details */}
            <div
              style={{
                flex: "1",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "20px 40px 20px 20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#3b82f6",
                  marginBottom: 16,
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {SITE_ICON} {SITE_NAME}
              </div>

              <div
                style={{
                  fontSize: 56,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 20,
                  lineHeight: 1.1,
                  maxWidth: 600,
                }}
              >
                {name}
              </div>

              <div
                style={{
                  fontSize: 24,
                  color: "#334155",
                  marginBottom: 24,
                  lineHeight: 1.4,
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
                  marginBottom: 24,
                }}
              >
                {features.length > 0 ? (
                  features.slice(0, 5).map((feature) => (
                    <span
                      key={feature}
                      style={{
                        background: "rgba(59, 130, 246, 0.1)",
                        color: "#2563eb",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: 9999,
                        padding: "8px 16px",
                        fontSize: 18,
                        fontWeight: 500,
                      }}
                    >
                      {feature}
                    </span>
                  ))
                ) : (
                  <span style={{ color: "#64748b", fontSize: 18 }}>
                    No features listed
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  color: "#475569",
                  padding: "12px 20px",
                  background: "rgba(255, 255, 255, 0.7)",
                  borderRadius: 12,
                  width: "auto",
                }}
              >
                📍 {address}
              </div>
            </div>

            {/* Right: Image with overlay frame */}
            <div
              style={{
                display: "flex",
                width: "45%",
                position: "relative",
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
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
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#e2e8f0",
                  }}
                >
                  <span
                    style={{
                      color: "#64748b",
                      fontSize: 32,
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    No image available
                  </span>
                </div>
              )}

              {/* Gradient overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  width: "100%",
                  height: "30%",
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
                }}
              />
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
