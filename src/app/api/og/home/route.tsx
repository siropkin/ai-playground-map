import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ICON } from "@/lib/constants";
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
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
            fontFamily: "sans-serif",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Background pattern overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundSize: "40px 40px",
              backgroundImage:
                "radial-gradient(circle, rgba(255, 255, 255, 0.25) 2px, transparent 2px)",
              opacity: 0.5,
            }}
          />
          {/* Accent shapes */}
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.1)",
              filter: "blur(60px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -100,
              left: -100,
              width: 400,
              height: 400,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.1)",
              filter: "blur(60px)",
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
                  fontSize: 100,
                  marginBottom: 20,
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))",
                }}
              >
                {SITE_ICON}
              </div>
              <div
                style={{
                  fontSize: 80,
                  fontWeight: 900,
                  color: "#ffffff",
                  marginBottom: 20,
                  textAlign: "center",
                  lineHeight: 1,
                  textShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
                  letterSpacing: "-0.02em",
                }}
              >
                {SITE_NAME}
              </div>
              <div
                style={{
                  fontSize: 36,
                  color: "rgba(255, 255, 255, 0.98)",
                  fontWeight: 600,
                  marginBottom: 24,
                  textAlign: "center",
                  maxWidth: 900,
                  lineHeight: 1.3,
                  textShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
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
                  title: "Search Near You",
                  icon: "🗺️",
                  color: "#3b82f6",
                },
                {
                  title: "AI Insights",
                  icon: "✨",
                  color: "#8b5cf6",
                },
                {
                  title: "Real Photos",
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
                    padding: "28px 20px",
                    backgroundColor: "rgba(255, 255, 255, 0.98)",
                    borderRadius: 20,
                    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.2)",
                    width: "30%",
                    border: "2px solid rgba(255, 255, 255, 0.5)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 56,
                      marginBottom: 12,
                      filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))",
                    }}
                  >
                    {feature.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#1e293b",
                      textAlign: "center",
                      lineHeight: 1.2,
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
