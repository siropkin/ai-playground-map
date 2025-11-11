import { ImageResponse } from "next/og";
import { SITE_ICON } from "@/lib/constants";

// Image metadata
export const size = {
  width: 192,
  height: 192,
};

export const contentType = "image/png";

// Image generation
export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 150,
          background: "white",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {SITE_ICON}
      </div>
    ),
    {
      ...size,
    },
  );
}
