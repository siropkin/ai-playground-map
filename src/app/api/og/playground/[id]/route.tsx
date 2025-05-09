import { ImageResponse } from "next/og";
import { getPlaygroundById } from "@/data/playgrounds";
import { SITE_NAME } from "@/lib/constants";
import { formatEnumString, getAgeRange } from "@/lib/utils";

export const runtime = "edge";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const playground = await getPlaygroundById(params.id);

    if (!playground) {
      return new Response("Playground not found", { status: 404 });
    }

    // Get a short description (truncate if too long)
    const description = playground.description
      ? playground.description.length > 100
        ? playground.description.substring(0, 100) + "..."
        : playground.description
      : `Explore this playground's features and location`;

    // Get access type and age range
    const accessType = playground.accessType
      ? formatEnumString(playground.accessType)
      : null;
    const ageRange = getAgeRange(playground.ageMin, playground.ageMax);
    // Create a simple but attractive OG image
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#f4f4f5",
            padding: 40,
            fontFamily: "sans-serif",
            position: "relative",
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage:
                "radial-gradient(circle at 25px 25px, #e4e4e7 2px, transparent 0)",
              backgroundSize: "50px 50px",
              opacity: 0.3,
            }}
          />

          {/* Content container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "white",
              borderRadius: 16,
              padding: 40,
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
              width: "90%",
              maxWidth: 1000,
              zIndex: 10,
            }}
          >
            {/* Site name */}
            <div
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#6366f1",
                marginBottom: 8,
              }}
            >
              {SITE_NAME}
            </div>

            {/* Playground name */}
            <div
              style={{
                fontSize: 48,
                fontWeight: "bold",
                color: "#18181b",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {playground.name}
            </div>

            {/* Access type and age range */}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {accessType && (
                <div
                  style={{
                    backgroundColor: "#e0e7ff",
                    color: "#4f46e5",
                    padding: "6px 12px",
                    borderRadius: 9999,
                    fontSize: 18,
                    fontWeight: 500,
                  }}
                >
                  {accessType}
                </div>
              )}

              {ageRange && (
                <div
                  style={{
                    backgroundColor: "#dcfce7",
                    color: "#16a34a",
                    padding: "6px 12px",
                    borderRadius: 9999,
                    fontSize: 18,
                    fontWeight: 500,
                  }}
                >
                  {ageRange}
                </div>
              )}
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: 24,
                color: "#52525b",
                textAlign: "center",
                marginBottom: 32,
                maxWidth: 800,
              }}
            >
              {description}
            </div>

            {/* Features */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 12,
                maxWidth: 800,
              }}
            >
              {playground.features.slice(0, 5).map((feature, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "#e0e7ff",
                    color: "#4f46e5",
                    padding: "8px 16px",
                    borderRadius: 9999,
                    fontSize: 18,
                    fontWeight: 500,
                  }}
                >
                  {feature
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.error(e);
    return new Response("Failed to generate image", { status: 500 });
  }
}
