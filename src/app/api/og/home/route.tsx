import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/constants";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
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
            backgroundColor: "#f5f5f5",
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
            {/* Slide Emoji */}
            <div
              style={{
                fontSize: 80,
                marginBottom: 24,
              }}
            >
              🛝
            </div>

            {/* Site name */}
            <div
              style={{
                fontSize: 64,
                fontWeight: "bold",
                color: "#000000",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {SITE_NAME}
            </div>

            {/* Tagline */}
            <div
              style={{
                fontSize: 32,
                color: "#333333",
                fontWeight: "500",
                marginBottom: 32,
                textAlign: "center",
              }}
            >
              Find good playgrounds for kids near you
            </div>

            {/* Features */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 24,
                marginBottom: 16,
              }}
            >
              {[
                "Discover local playgrounds",
                "Filter by age & features",
                "Find opening hours",
              ].map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: "#e5e5e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#000000",
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                  >
                    ✓
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      color: "#333333",
                    }}
                  >
                    {feature}
                  </div>
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
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
