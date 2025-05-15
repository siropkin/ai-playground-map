import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
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
              backgroundSize: "30px 30px",
              backgroundImage:
                "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
              opacity: 0.4,
            }}
          />

          {/* Main content */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              padding: "60px",
              boxSizing: "border-box",
              zIndex: 10,
            }}
          >
            {/* Logo and Title Section */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginBottom: 40,
              }}
            >
              <div
                style={{
                  fontSize: 96,
                  marginBottom: 20,
                }}
              >
                🛝
              </div>
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 800,
                  color: "#0f172a",
                  marginBottom: 16,
                  textAlign: "center",
                  lineHeight: 1.1,
                }}
              >
                {SITE_NAME}
              </div>
              <div
                style={{
                  fontSize: 32,
                  color: "#334155",
                  fontWeight: 500,
                  marginBottom: 20,
                  textAlign: "center",
                  maxWidth: 800,
                  lineHeight: 1.3,
                }}
              >
                {SITE_DESCRIPTION}
              </div>
            </div>

            {/* Feature Cards */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 24,
                width: "100%",
                maxWidth: 1000,
              }}
            >
              {[
                {
                  title: "Discover local playgrounds",
                  icon: "🔍",
                  color: "#3b82f6",
                },
                {
                  title: "AI-powered search",
                  icon: "🤖",
                  color: "#8b5cf6",
                },
                {
                  title: "Explore playground photos",
                  icon: "📸",
                  color: "#f59e0b",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "32px 24px",
                    backgroundColor: "rgba(255, 255, 255, 0.85)",
                    borderRadius: 16,
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
                    width: "33%",
                  }}
                >
                  <div
                    style={{
                      fontSize: 40,
                      marginBottom: 16,
                    }}
                  >
                    {feature.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 600,
                      color: "#1e293b",
                      textAlign: "center",
                    }}
                  >
                    {feature.title}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer badge */}
            {/*<div*/}
            {/*  style={{*/}
            {/*    marginTop: 48,*/}
            {/*    padding: "12px 24px",*/}
            {/*    borderRadius: 9999,*/}
            {/*    fontSize: 20,*/}
            {/*    fontWeight: 500,*/}
            {/*    color: "#1e293b",*/}
            {/*    background: "rgba(59, 130, 246, 0.1)",*/}
            {/*    border: "1px solid rgba(59, 130, 246, 0.3)",*/}
            {/*    position: "absolute",*/}
            {/*    bottom: 40,*/}
            {/*    left: "50%",*/}
            {/*    transform: "translateX(-50%)",*/}
            {/*    zIndex: 20,*/}
            {/*  }}*/}
            {/*>*/}
            {/*  Start exploring now!*/}
            {/*</div>*/}
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
