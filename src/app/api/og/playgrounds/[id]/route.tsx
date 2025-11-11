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

    // Truncate name to fit 2 lines (roughly 40 chars at 60px font)
    const name = playground.name || UNNAMED_PLAYGROUND;
    const truncatedName = name.length > 40 ? name.substring(0, 37) + "..." : name;

    const description = playground.description
      ? playground.description.length > 120
        ? playground.description.substring(0, 120) + "..."
        : playground.description
      : "No description available";
    const features = playground.features?.map(formatEnumString) || [];

    // Shorten long addresses - keep main parts, remove verbose state/country info
    const rawAddress = playground.address || "Address not available";
    const address = rawAddress.length > 80
      ? rawAddress.split(',').slice(0, 3).join(',')
      : rawAddress;

    const imageUrl = playground.images?.[0]?.image_url || null;

    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: imageUrl
              ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
                "radial-gradient(circle, rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
              opacity: 0.6,
            }}
          />

          {/* Main content container */}
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              padding: "50px",
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
                  fontSize: 22,
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.7)",
                  marginBottom: 20,
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {SITE_ICON} {SITE_NAME}
              </div>

              <div
                style={{
                  fontSize: 60,
                  fontWeight: 800,
                  color: "#ffffff",
                  marginBottom: 24,
                  lineHeight: 1.05,
                  maxWidth: 600,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {truncatedName}
              </div>

              <div
                style={{
                  fontSize: 22,
                  color: "rgba(255, 255, 255, 0.85)",
                  marginBottom: 28,
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
                  gap: 12,
                  marginBottom: 28,
                }}
              >
                {features.length > 0 ? (
                  features.slice(0, 4).map((feature) => (
                    <span
                      key={feature}
                      style={{
                        background: "rgba(255, 255, 255, 0.15)",
                        color: "#ffffff",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        borderRadius: 9999,
                        padding: "10px 20px",
                        fontSize: 18,
                        fontWeight: 500,
                      }}
                    >
                      {feature}
                    </span>
                  ))
                ) : null}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: 18,
                  color: "rgba(255, 255, 255, 0.8)",
                  padding: "14px 24px",
                  background: "rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  width: "auto",
                }}
              >
                📍 {address}
              </div>
            </div>

            {/* Right: Image with overlay frame */}
            {imageUrl && (
              <div
                style={{
                  display: "flex",
                  width: "48%",
                  position: "relative",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  border: "2px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`${name} photo`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />

                {/* Gradient overlay */}
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    width: "100%",
                    height: "40%",
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
                  }}
                />
              </div>
            )}
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
